'use server';

import { revalidatePath } from 'next/cache';
import { getDb, invoices, income, clients, paymentAllocations, eq, and, sql, desc, asc, divisions, divisionBillingSettings } from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';
import { isPeriodClosed, getMinAllowedDate, getMinDateErrorMessage } from '@/lib/date-rules';
import { getSASTToday, fmtDateLong } from '@/lib/format';
import { deleteIncome } from './income';
import { postPaymentJournalEntries, updatePaymentJournalEntries, voidPaymentJournalEntries, postBadDebtRecoveryJournalEntry } from '@/lib/accounting/posting';
import { getPortalBaseUrl } from '@/lib/portal-url';

export interface PaymentAllocationInput {
  invoiceId: string;
  amount: number;
}

export interface PaymentInput {
  clientId: string;
  divisionId: string;
  date: string;
  description: string;
  amount: number;
  allocations: PaymentAllocationInput[];
  sendReceiptEmail?: boolean;
}

/**
 * ── getClientOutstandingInvoices ───────────────────────────────────────────────
 * Fetches all invoices for a client that are unpaid or partially paid,
 * aggregating any existing allocations to calculate remaining outstanding balances.
 * Sorted chronologically (oldest first).
 */
export async function getClientOutstandingInvoices(clientId: string) {
  try {
    await getSessionOrRedirect();
    const db = getDb();

    // Query invoices with status in ('issued', 'partially_paid', 'overdue')
    const rows = await db
      .select({
        id: invoices.id,
        documentNumber: invoices.documentNumber,
        invoiceDate: invoices.invoiceDate,
        dueDate: invoices.dueDate,
        total: invoices.total,
        divisionId: invoices.divisionId,
        allocatedAmount: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)`,
      })
      .from(invoices)
      .leftJoin(paymentAllocations, eq(paymentAllocations.invoiceId, invoices.id))
      .where(
        and(
          eq(invoices.clientId, clientId),
          sql`${invoices.status} IN ('issued', 'partially_paid', 'overdue')`
        )
      )
      .groupBy(
        invoices.id,
        invoices.documentNumber,
        invoices.invoiceDate,
        invoices.dueDate,
        invoices.total,
        invoices.divisionId
      )
      .orderBy(asc(invoices.invoiceDate));

    return rows.map((r) => {
      const total = parseFloat(r.total);
      const allocated = parseFloat(r.allocatedAmount);
      const outstanding = Math.max(0, total - allocated);
      return {
        id: r.id,
        documentNumber: r.documentNumber,
        invoiceDate: r.invoiceDate,
        dueDate: r.dueDate,
        total,
        allocated,
        outstanding,
        divisionId: r.divisionId,
      };
    });
  } catch (err) {
    console.error('Failed to fetch client outstanding invoices:', err);
    throw new Error('Failed to load outstanding invoices.');
  }
}

/**
 * ── getClientCreditBalance ─────────────────────────────────────────────────────
 * Calculates the dynamic unallocated credit balance (retainer/deposit) for a client:
 * sum(income.amount) - sum(payment_allocations.amount) for all historical transactions.
 */
export async function getClientCreditBalance(clientId: string): Promise<number> {
  try {
    await getSessionOrRedirect();
    const db = getDb();

    // Sum all income rows
    const [incomeAgg] = await db
      .select({ totalPaid: sql<string>`coalesce(sum(${income.amount}), 0)` })
      .from(income)
      .where(eq(income.clientId, clientId));

    // Sum all allocations for invoices belonging to this client
    const [allocationAgg] = await db
      .select({ totalAllocated: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)` })
      .from(paymentAllocations)
      .innerJoin(invoices, eq(invoices.id, paymentAllocations.invoiceId))
      .where(eq(invoices.clientId, clientId));

    const totalPaid = parseFloat(incomeAgg?.totalPaid ?? '0');
    const totalAllocated = parseFloat(allocationAgg?.totalAllocated ?? '0');

    return Math.max(0, totalPaid - totalAllocated);
  } catch (err) {
    console.error('Failed to calculate client credit balance:', err);
    return 0;
  }
}

/**
 * ── recordClientPayment ────────────────────────────────────────────────────────
 * Transactionally saves a cash payment (income row), maps allocations inside payment_allocations,
 * updates invoice states, and revalidates Next.js page caches.
 */
export async function recordClientPayment(data: PaymentInput): Promise<{ error?: string; success?: boolean }> {
  try {
    await getSessionOrRedirect();
    const db = getDb();

    // 1. Check period lock and future date
    const today = getSASTToday();
    if (data.date > today) {
      return { error: 'Payment date cannot be in the future.' };
    }

    if (await isPeriodClosed(data.date)) {
      const minDate = await getMinAllowedDate();
      return { error: getMinDateErrorMessage(minDate) };
    }

    // 2. Fetch client details
    const [client] = await db
      .select({ name: clients.name, businessName: clients.businessName, email: clients.email })
      .from(clients)
      .where(eq(clients.id, data.clientId));

    if (!client) return { error: 'Client not found.' };
    const clientLabel = client.businessName ?? client.name;

    // Resolve division id (safeguard fallback to first division)
    let finalDivisionId = data.divisionId;
    if (!finalDivisionId) {
      const [firstDiv] = await db.select({ id: divisions.id }).from(divisions).limit(1);
      if (firstDiv) {
        finalDivisionId = firstDiv.id;
      } else {
        return { error: 'No divisions configured in the system.' };
      }
    }

    // 3. Fetch invoice document numbers upfront for auto-reference and email
    const allocatedInvoiceIds = data.allocations.filter((a) => a.amount > 0).map((a) => a.invoiceId);
    const invDocs = allocatedInvoiceIds.length > 0
      ? await db
          .select({ id: invoices.id, documentNumber: invoices.documentNumber })
          .from(invoices)
          .where(sql`${invoices.id} IN ${allocatedInvoiceIds}`)
      : [];
    const invDocMap = new Map(invDocs.map((d) => [d.id, d.documentNumber]));

    const allocatedInvoicesInfo: { documentNumber: string, amount: string }[] = [];
    for (const alloc of data.allocations) {
      if (alloc.amount <= 0) continue;
      const docNum = invDocMap.get(alloc.invoiceId);
      if (docNum) {
        allocatedInvoicesInfo.push({
          documentNumber: docNum,
          amount: `R ${Number(alloc.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        });
      }
    }

    // 4. Generate trusted auto-reference from invoice document numbers
    const totalAllocated = data.allocations.reduce((sum, a) => sum + a.amount, 0);
    const excessAmount = data.amount - totalAllocated;

    let autoReference: string;
    if (allocatedInvoicesInfo.length > 0) {
      const invoiceList = allocatedInvoicesInfo.map((i) => i.documentNumber).join(', ');
      autoReference = `Payment for ${invoiceList}`;
      if (excessAmount > 0) {
        autoReference += `; Unallocated credit R${excessAmount.toFixed(2)}`;
      }
    } else if (data.amount > 0) {
      autoReference = 'Unallocated client credit / deposit';
    } else {
      autoReference = `Payment received - ${clientLabel}`;
    }
    if (data.description?.trim()) {
      autoReference += ` | Bank ref: ${data.description.trim()}`;
    }

    // 5. Execute database operations in a transaction
    const recoveriesToPost: { invoiceId: string; amount: number; documentNumber: string; }[] = [];

    const recordedIncomeId = await db.transaction(async (tx) => {
      // A. Create the core payment row with the trusted auto-reference
      const [incomeRow] = await tx
        .insert(income)
        .values({
          date: data.date,
          divisionId: finalDivisionId,
          clientId: data.clientId,
          description: autoReference,
          amount: String(data.amount),
        })
        .returning({ id: income.id });

      if (!incomeRow) throw new Error('Failed to record cash receipt.');

      // B. Insert allocations and transition invoice statuses
      for (const alloc of data.allocations) {
        if (alloc.amount <= 0) continue;

        // Lock the invoice row first to serialize concurrent updates
        const [invoiceRow] = await tx
          .select({ 
            total: invoices.total, 
            writeOffAmount: invoices.writeOffAmount, 
            documentNumber: invoices.documentNumber,
            clientId: invoices.clientId,
            divisionId: invoices.divisionId 
          })
          .from(invoices)
          .where(eq(invoices.id, alloc.invoiceId))
          .for('update');

        if (!invoiceRow) throw new Error('Invoice not found for allocation.');
        if (invoiceRow.clientId !== data.clientId || invoiceRow.divisionId !== finalDivisionId) {
          throw new Error(`Invoice ${invoiceRow.documentNumber} does not match the payment client or division.`);
        }

        // Verify balance before allocation
        const [sumAggBefore] = await tx
          .select({ sum: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)` })
          .from(paymentAllocations)
          .where(eq(paymentAllocations.invoiceId, alloc.invoiceId));
          
        const totalAllocatedBefore = parseFloat(sumAggBefore?.sum ?? '0');
        const invoiceTotalBefore = parseFloat(invoiceRow.total);
        const outstandingBefore = Math.max(0, invoiceTotalBefore - totalAllocatedBefore);
        
        if (alloc.amount > outstandingBefore + 0.01) {
           throw new Error(`Payment allocation of R${alloc.amount.toFixed(2)} exceeds outstanding balance for invoice ${invoiceRow.documentNumber}`);
        }

        // Insert allocation link
        await tx.insert(paymentAllocations).values({
          incomeId: incomeRow.id,
          invoiceId: alloc.invoiceId,
          amount: String(alloc.amount),
        });

        // Sum allocations for this invoice
        const [sumAgg] = await tx
          .select({ sum: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)` })
          .from(paymentAllocations)
          .where(eq(paymentAllocations.invoiceId, alloc.invoiceId));

        if (invoiceRow) {
          const invoiceTotal = parseFloat(invoiceRow.total);
          const totalAllocated = parseFloat(sumAgg?.sum ?? '0');
          const writeOffAmount = parseFloat(invoiceRow.writeOffAmount || '0');

          if (writeOffAmount > 0) {
            recoveriesToPost.push({
              invoiceId: alloc.invoiceId,
              amount: alloc.amount,
              documentNumber: invoiceRow.documentNumber,
            });
          }

          if (totalAllocated >= invoiceTotal) {
            await tx
              .update(invoices)
              .set({
                status: 'paid',
                paidAt: new Date(),
                incomeId: incomeRow.id, // Legacy backwards compatibility
                updatedAt: new Date(),
              })
              .where(eq(invoices.id, alloc.invoiceId));
          } else if (writeOffAmount > 0 && (invoiceTotal - totalAllocated) >= writeOffAmount) {
            await tx
              .update(invoices)
              .set({
                status: 'written_off',
                paidAt: null,
                incomeId: null,
                updatedAt: new Date(),
              })
              .where(eq(invoices.id, alloc.invoiceId));
          } else {
            await tx
              .update(invoices)
              .set({
                status: 'partially_paid',
                paidAt: null,
                incomeId: null,
                updatedAt: new Date(),
              })
              .where(eq(invoices.id, alloc.invoiceId));
          }
        }
      }
    // C. Post bad debt recovery journal entries
    for (const rec of recoveriesToPost) {
      const recoveryResult = await postBadDebtRecoveryJournalEntry({
        incomeId: incomeRow.id,
        invoiceId: rec.invoiceId,
        amount: rec.amount,
        date: data.date,
        description: `Bad Debt Recovery - ${rec.documentNumber}`,
        divisionId: finalDivisionId,
        tx,
      });
      if (recoveryResult.error) {
        throw new Error(`Bad debt recovery journal failed: ${recoveryResult.error}`);
      }
    }

    // D. Check for overpayment and create credit note
    if (excessAmount > 0) {
      const { createCreditNote } = await import('./credit-management');
      const creditNoteRes = await createCreditNote({
        clientId: data.clientId,
        divisionId: finalDivisionId,
        type: 'overpayment',
        amount: excessAmount,
        reason: data.description ? `Overpayment from: ${data.description}` : 'Client payment overpayment',
        originalPaymentId: incomeRow.id,
        tx,
      });
      if (creditNoteRes.error) {
        throw new Error(`Failed to create credit note for overpayment: ${creditNoteRes.error}`);
      }
    }

    // E. Auto-post double-entry journal entries
    const journalResult = await postPaymentJournalEntries({
      incomeId: incomeRow.id,
      amount: data.amount,
      date: data.date,
      description: autoReference,
      divisionId: finalDivisionId,
      tx,
    });
    if (journalResult.error) {
      throw new Error(`Journal auto-post failed: ${journalResult.error}`);
    }

    return incomeRow.id;
  });

  // 5. Revalidate cache
  revalidatePath('/billing/invoices');
  revalidatePath('/billing/payments');
  revalidatePath('/dashboard');
  revalidatePath('/accounting/journals');
  revalidatePath('/accounting/trial-balance');
  revalidatePath('/accounting/general-ledger');
  revalidatePath('/accounting/profit-and-loss');

  // 6. Asynchronously trigger Payment Thank You email receipt via Resend
    if (data.sendReceiptEmail && client.email) {
      (async () => {
        try {
          // Fetch division billing config and division details
          const [billingConfig] = await db
            .select()
            .from(divisionBillingSettings)
            .where(eq(divisionBillingSettings.divisionId, finalDivisionId));

          const [divRow] = await db
            .select({ name: divisions.name })
            .from(divisions)
            .where(eq(divisions.id, finalDivisionId));

          // Set up environment config for email dispatcher (matching email-delivery.ts)
          const isTes = divRow?.name?.toLowerCase().includes('tender') || false;
          const isAws = divRow?.name?.toLowerCase().includes('apex') || false;
          const apiKey = (isTes ? process.env.TES_RESEND_API_KEY : isAws ? process.env.AWS_RESEND_API_KEY : undefined) 
                         || process.env.PMG_RESEND_API_KEY!;

          const { createEmailClient, PaymentThankYouEmail, DEFAULT_REPLY_TO, resolveDivisionAdminEmail, resolveDefaultFromEmail } = await import('@pmg/emails');

          const defaultFrom = resolveDefaultFromEmail(divRow?.name);
          const fromName = billingConfig?.salesRepName || 'Playhouse Media Group';

          // Resolve info subdomain sender (helper matching email-delivery.ts)
          let fromEmail = defaultFrom;
          if (billingConfig?.divisionWebsite) {
            const domain = billingConfig.divisionWebsite.trim()
              .replace(/^(https?:\/\/)?(www\.)?/, '')
              .split('/')[0]
              .toLowerCase();
            if (domain) {
              fromEmail = domain.startsWith('info.') ? `noreply@${domain}` : `noreply@info.${domain}`;
            }
          }

          // CC the division admin — salesRepEmail takes priority, then brand default
          const adminCc = resolveDivisionAdminEmail(divRow?.name, billingConfig?.salesRepEmail ?? null);

          const emailClient = createEmailClient({
            apiKey,
            from: `${fromName} <${fromEmail}>`,
            adminEmail: fromEmail,
          });

          const portalBaseUrl = getPortalBaseUrl();
          const portalUrl = `${portalBaseUrl}/statements`;

          const emailProps = {
            clientName: client.businessName || client.name,
            amountPaid: `R ${Number(data.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
            paymentDate: fmtDateLong(data.date),
            paymentDescription: data.description || undefined,
            allocations: allocatedInvoicesInfo,
            companyName: divRow?.name || 'Playhouse Media Group',
            primaryColor: '#1d4ed8',
            websiteUrl: billingConfig?.divisionWebsite || undefined,
            logoUrl: billingConfig?.logoUrl || undefined,
            portalUrl,
          };

          const React = await import('react');
          await emailClient({
            to: client.email!,
            cc: adminCc,
            subject: `Payment Receipt Confirmation: Thank you for your payment`,
            react: React.createElement(PaymentThankYouEmail, emailProps),
            replyTo: DEFAULT_REPLY_TO,
          });
        } catch (mailErr) {
          console.error('Failed to send Payment Thank You email:', mailErr);
        }
      })();
    }

    return { success: true };
  } catch (err) {
    console.error('Failed to record client payment:', err);
    return { error: 'Failed to record payment. Please check inputs and try again.' };
  }
}

/**
 * ── adjustClientPayment ────────────────────────────────────────────────────────
 * Adjusts a payment amount.
 * - If adjusted DOWN: Applies LIFO reverse-spread to strip allocations from the newest invoices.
 * - If adjusted UP: Applies FIFO spread to allocate the extra funds to the oldest unpaid invoices.
 */
export async function adjustClientPayment(incomeId: string, newAmount: number): Promise<{ error?: string; success?: boolean }> {
  try {
    await getSessionOrRedirect();
    const db = getDb();

    // 1. Fetch original income record
    const [payment] = await db
      .select()
      .from(income)
      .where(eq(income.id, incomeId));

    if (!payment) return { error: 'Payment not found.' };
    const oldAmount = parseFloat(payment.amount);
    if (oldAmount === newAmount) return { success: true };

    // 2. Check period lock against payment date
    if (await isPeriodClosed(payment.date)) {
      const minDate = await getMinAllowedDate();
      return { error: getMinDateErrorMessage(minDate) };
    }

    // 3. Execute database operations sequentially
    if (newAmount < oldAmount) {
      // ── DOWNWARD ADJUSTMENT (LIFO) ──
      let reductionNeeded = oldAmount - newAmount;

      // Fetch existing allocations sorted newest first (LIFO) based on invoice date
      const allocations = await db
        .select({
          id: paymentAllocations.id,
          invoiceId: paymentAllocations.invoiceId,
          amount: paymentAllocations.amount,
        })
        .from(paymentAllocations)
        .innerJoin(invoices, eq(invoices.id, paymentAllocations.invoiceId))
        .where(eq(paymentAllocations.incomeId, incomeId))
        .orderBy(desc(invoices.invoiceDate));

      for (const alloc of allocations) {
        if (reductionNeeded <= 0) break;

        const allocAmount = parseFloat(alloc.amount);

        if (allocAmount <= reductionNeeded) {
          // Delete this allocation fully
          await db
            .delete(paymentAllocations)
            .where(eq(paymentAllocations.id, alloc.id));

          reductionNeeded -= allocAmount;

          // Recalculate other remaining allocations for this invoice
          const [sumAgg] = await db
            .select({ sum: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)` })
            .from(paymentAllocations)
            .where(eq(paymentAllocations.invoiceId, alloc.invoiceId));

          const totalRemaining = parseFloat(sumAgg?.sum ?? '0');

          if (totalRemaining === 0) {
            await db
              .update(invoices)
              .set({
                status: 'issued', // or check if past due and set to overdue
                paidAt: null,
                incomeId: null,
                updatedAt: new Date(),
              })
              .where(eq(invoices.id, alloc.invoiceId));
          } else {
            await db
              .update(invoices)
              .set({
                status: 'partially_paid',
                paidAt: null,
                incomeId: null,
                updatedAt: new Date(),
              })
              .where(eq(invoices.id, alloc.invoiceId));
          }
        } else {
          // Deduct partially
          const newAllocAmount = allocAmount - reductionNeeded;
          reductionNeeded = 0;

          await db
            .update(paymentAllocations)
            .set({ amount: String(newAllocAmount) })
            .where(eq(paymentAllocations.id, alloc.id));

          await db
            .update(invoices)
            .set({
              status: 'partially_paid',
              paidAt: null,
              incomeId: null,
              updatedAt: new Date(),
            })
            .where(eq(invoices.id, alloc.invoiceId));
        }
      }
    } else {
      // ── UPWARD ADJUSTMENT (FIFO) ──
      let increaseAvailable = newAmount - oldAmount;

      // Fetch client's outstanding invoices (FIFO: oldest first)
      const unpaidInvoices = await getClientOutstandingInvoices(payment.clientId);

      for (const inv of unpaidInvoices) {
        if (increaseAvailable <= 0) break;

        const outstanding = inv.outstanding;
        if (outstanding <= 0) continue;

        // Check if an allocation already exists for this payment and invoice
        const [existingAlloc] = await db
          .select()
          .from(paymentAllocations)
          .where(
            and(
              eq(paymentAllocations.incomeId, incomeId),
              eq(paymentAllocations.invoiceId, inv.id)
            )
          )
          .limit(1);

        const extraAllocAmount = Math.min(outstanding, increaseAvailable);
        increaseAvailable -= extraAllocAmount;

        if (existingAlloc) {
          const currentAllocVal = parseFloat(existingAlloc.amount);
          await db
            .update(paymentAllocations)
            .set({ amount: String(currentAllocVal + extraAllocAmount) })
            .where(eq(paymentAllocations.id, existingAlloc.id));
        } else {
          await db
            .insert(paymentAllocations)
            .values({
              incomeId,
              invoiceId: inv.id,
              amount: String(extraAllocAmount),
            });
        }

        // Check if invoice is now fully paid
        const [sumAgg] = await db
          .select({ sum: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)` })
          .from(paymentAllocations)
          .where(eq(paymentAllocations.invoiceId, inv.id));

        const totalAllocated = parseFloat(sumAgg?.sum ?? '0');

        if (totalAllocated >= inv.total) {
          await db
            .update(invoices)
            .set({
              status: 'paid',
              paidAt: new Date(),
              incomeId,
              updatedAt: new Date(),
            })
            .where(eq(invoices.id, inv.id));
        } else {
          await db
            .update(invoices)
            .set({
              status: 'partially_paid',
              paidAt: null,
              incomeId: null,
              updatedAt: new Date(),
            })
            .where(eq(invoices.id, inv.id));
        }
      }
    }

    // Update the parent income cash amount
    await db
      .update(income)
      .set({ amount: String(newAmount) })
      .where(eq(income.id, incomeId));

    // 4. Update journal entries to reflect new amount
    await updatePaymentJournalEntries({
      incomeId,
      newAmount,
      date: payment.date,
      description: payment.description || 'Payment adjusted',
      divisionId: payment.divisionId,
    });

    // 5. Revalidate cache
    revalidatePath('/billing/invoices');
    revalidatePath('/billing/payments');
    revalidatePath('/dashboard');
    revalidatePath('/accounting/journals');
    revalidatePath('/accounting/trial-balance');
    revalidatePath('/accounting/general-ledger');
    revalidatePath('/accounting/profit-and-loss');

    return { success: true };
  } catch (err) {
    console.error('Failed to adjust client payment:', err);
    return { error: 'Failed to adjust payment.' };
  }
}

/**
 * Helper to fetch client's outstanding invoices (internally bypasses auth redirect overhead)
 */
async function getClientOutstandingInvoicesInternal(clientId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: invoices.id,
      documentNumber: invoices.documentNumber,
      invoiceDate: invoices.invoiceDate,
      total: invoices.total,
      allocatedAmount: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)`,
    })
    .from(invoices)
    .leftJoin(paymentAllocations, eq(paymentAllocations.invoiceId, invoices.id))
    .where(
      and(
        eq(invoices.clientId, clientId),
        sql`${invoices.status} IN ('issued', 'partially_paid', 'overdue')`
      )
    )
    .groupBy(invoices.id, invoices.documentNumber, invoices.invoiceDate, invoices.total)
    .orderBy(asc(invoices.invoiceDate));

  return rows.map((r) => {
    const total = parseFloat(r.total);
    const allocated = parseFloat(r.allocatedAmount);
    return {
      id: r.id,
      total,
      outstanding: Math.max(0, total - allocated),
    };
  });
}

/**
 * Helper to recalculate invoice status, paidAt date and link based on its remaining allocations
 */
async function recalculateInvoiceStatus(invoiceId: string, currentIncomeId?: string) {
  const db = getDb();
  
  // Sum allocations for this invoice
  const [sumAgg] = await db
    .select({ sum: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)` })
    .from(paymentAllocations)
    .where(eq(paymentAllocations.invoiceId, invoiceId));

  const [invoiceRow] = await db
    .select({ total: invoices.total, writeOffAmount: invoices.writeOffAmount })
    .from(invoices)
    .where(eq(invoices.id, invoiceId));

  if (invoiceRow) {
    const invoiceTotal = parseFloat(invoiceRow.total);
    const writeOffAmount = parseFloat(invoiceRow.writeOffAmount || '0');
    const totalAllocated = parseFloat(sumAgg?.sum ?? '0');

    if (totalAllocated >= invoiceTotal) {
      await db
        .update(invoices)
        .set({
          status: 'paid',
          paidAt: new Date(),
          incomeId: currentIncomeId ?? null,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId));
    } else if (writeOffAmount > 0 && (invoiceTotal - totalAllocated) >= writeOffAmount) {
      await db
        .update(invoices)
        .set({
          status: 'written_off',
          paidAt: null,
          incomeId: null,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId));
    } else if (totalAllocated > 0) {
      await db
        .update(invoices)
        .set({
          status: 'partially_paid',
          paidAt: null,
          incomeId: null,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId));
    } else {
      await db
        .update(invoices)
        .set({
          status: 'issued',
          paidAt: null,
          incomeId: null,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId));
    }
  }
}

/**
 * ── updateClientPayment ────────────────────────────────────────────────────────
 * Transactionally updates a payment record (amount, description, date, client, division)
 * and applies cascading invoice status updates:
 * - Client Changed: deletes old client allocations and spreads to new client's outstanding invoices (FIFO).
 * - Amount Changed: adjusts current allocations up (FIFO) or down (LIFO).
 */
export async function updateClientPayment(
  id: string,
  data: {
    date: string;
    divisionId: string;
    clientId: string;
    description: string;
    amount: number;
    allocations?: PaymentAllocationInput[];
  }
): Promise<{ error?: string; success?: boolean }> {
  try {
    await getSessionOrRedirect();
    const db = getDb();

    // 1. Fetch existing payment/income record
    const [existing] = await db.select().from(income).where(eq(income.id, id));
    if (!existing) return { error: 'Payment record not found.' };

    // 2. Validate dates and period lock
    const today = getSASTToday();
    if (data.date > today) return { error: 'Payment date cannot be in the future.' };

    if (await isPeriodClosed(existing.date)) {
      return { error: 'Cannot update payments in a closed financial period.' };
    }
    if (await isPeriodClosed(data.date)) {
      const minDate = await getMinAllowedDate();
      return { error: getMinDateErrorMessage(minDate) };
    }

    const oldClientId = existing.clientId;
    const oldAmount = parseFloat(existing.amount);
    const newAmount = data.amount;

    // 3. Handle allocations update based on client/amount changes
    if (data.allocations) {
      // Strip allocations for the old client's/current invoices
      const oldAllocations = await db
        .select({ invoiceId: paymentAllocations.invoiceId })
        .from(paymentAllocations)
        .where(eq(paymentAllocations.incomeId, id));

      await db.delete(paymentAllocations).where(eq(paymentAllocations.incomeId, id));

      for (const alloc of oldAllocations) {
        await recalculateInvoiceStatus(alloc.invoiceId);
      }

      // Insert new allocations
      for (const alloc of data.allocations) {
        if (alloc.amount <= 0) continue;

        await db.insert(paymentAllocations).values({
          incomeId: id,
          invoiceId: alloc.invoiceId,
          amount: String(alloc.amount),
        });

        await recalculateInvoiceStatus(alloc.invoiceId, id);
      }
    } else if (oldClientId !== data.clientId) {
      // Client changed or was removed
      if (oldClientId) {
        // Strip allocations for the old client's invoices
        const oldAllocations = await db
          .select({ invoiceId: paymentAllocations.invoiceId })
          .from(paymentAllocations)
          .where(eq(paymentAllocations.incomeId, id));

        await db.delete(paymentAllocations).where(eq(paymentAllocations.incomeId, id));

        for (const alloc of oldAllocations) {
          await recalculateInvoiceStatus(alloc.invoiceId);
        }
      }

      if (data.clientId) {
        // Apply FIFO allocation to the new client's outstanding invoices
        let remainingToAllocate = newAmount;
        const unpaidInvoices = await getClientOutstandingInvoicesInternal(data.clientId);

        for (const inv of unpaidInvoices) {
          if (remainingToAllocate <= 0) break;
          const allocAmount = Math.min(inv.outstanding, remainingToAllocate);
          remainingToAllocate -= allocAmount;

          await db.insert(paymentAllocations).values({
            incomeId: id,
            invoiceId: inv.id,
            amount: String(allocAmount),
          });

          await recalculateInvoiceStatus(inv.id, id);
        }
      }
    } else if (data.clientId && newAmount !== oldAmount) {
      // Client stayed the same, but amount changed
      if (newAmount < oldAmount) {
        // Downward adjustment (LIFO)
        let reductionNeeded = oldAmount - newAmount;

        const allocations = await db
          .select({
            id: paymentAllocations.id,
            invoiceId: paymentAllocations.invoiceId,
            amount: paymentAllocations.amount,
          })
          .from(paymentAllocations)
          .innerJoin(invoices, eq(invoices.id, paymentAllocations.invoiceId))
          .where(eq(paymentAllocations.incomeId, id))
          .orderBy(desc(invoices.invoiceDate));

        for (const alloc of allocations) {
          if (reductionNeeded <= 0) break;
          const allocAmount = parseFloat(alloc.amount);

          if (allocAmount <= reductionNeeded) {
            await db.delete(paymentAllocations).where(eq(paymentAllocations.id, alloc.id));
            reductionNeeded -= allocAmount;
            await recalculateInvoiceStatus(alloc.invoiceId);
          } else {
            const newAllocAmount = allocAmount - reductionNeeded;
            reductionNeeded = 0;
            await db
              .update(paymentAllocations)
              .set({ amount: String(newAllocAmount) })
              .where(eq(paymentAllocations.id, alloc.id));
            await recalculateInvoiceStatus(alloc.invoiceId);
          }
        }
      } else {
        // Upward adjustment (FIFO)
        let increaseAvailable = newAmount - oldAmount;
        const unpaidInvoices = await getClientOutstandingInvoicesInternal(data.clientId);

        for (const inv of unpaidInvoices) {
          if (increaseAvailable <= 0) break;
          const outstanding = inv.outstanding;
          if (outstanding <= 0) continue;

          const [existingAlloc] = await db
            .select()
            .from(paymentAllocations)
            .where(
              and(
                eq(paymentAllocations.incomeId, id),
                eq(paymentAllocations.invoiceId, inv.id)
              )
            )
            .limit(1);

          const extraAllocAmount = Math.min(outstanding, increaseAvailable);
          increaseAvailable -= extraAllocAmount;

          if (existingAlloc) {
            const currentAllocVal = parseFloat(existingAlloc.amount);
            await db
              .update(paymentAllocations)
              .set({ amount: String(currentAllocVal + extraAllocAmount) })
              .where(eq(paymentAllocations.id, existingAlloc.id));
          } else {
            await db.insert(paymentAllocations).values({
              incomeId: id,
              invoiceId: inv.id,
              amount: String(extraAllocAmount),
            });
          }

          await recalculateInvoiceStatus(inv.id, id);
        }
      }
    }

    // 4. Update core payment/income row
    const finalDescription = data.description.trim() || 'Payment received';

    await db
      .update(income)
      .set({
        date: data.date,
        divisionId: data.divisionId,
        clientId: data.clientId,
        description: finalDescription,
        amount: String(newAmount),
        updatedAt: new Date(),
      })
      .where(eq(income.id, id));

    // 5. Update journal entries to reflect new amount/description
    await updatePaymentJournalEntries({
      incomeId: id,
      newAmount,
      date: data.date,
      description: finalDescription,
      divisionId: data.divisionId,
    });

    // 6. Revalidate cache
    revalidatePath('/billing/payments');
    revalidatePath('/billing/invoices');
    revalidatePath('/dashboard');
    revalidatePath('/accounting/journals');
    revalidatePath('/accounting/trial-balance');
    revalidatePath('/accounting/general-ledger');
    revalidatePath('/accounting/profit-and-loss');

    return { success: true };
  } catch (err) {
    console.error('Failed to update client payment:', err);
    return { error: 'Failed to update payment record.' };
  }
}

/**
 * ── deleteClientPayment ────────────────────────────────────────────────────────
 * Wraps the existing deleteIncome function to securely delete a payment,
 * clear allocations, and recalculate invoice statuses.
 */
export async function deleteClientPayment(id: string): Promise<{ error?: string }> {
  return deleteIncome(id);
}

/**
 * ── getClientOutstandingInvoicesForEdit ───────────────────────────────────────────────
 * Fetches all invoices for a client that are unpaid or partially paid, plus any invoices
 * that are currently allocated to the specified payment, adjusting their outstanding balances.
 */
export async function getClientOutstandingInvoicesForEdit(clientId: string, currentPaymentId: string) {
  try {
    await getSessionOrRedirect();
    const db = getDb();

    // 1. Fetch outstanding invoices
    const unpaidInvoices = await getClientOutstandingInvoices(clientId);

    // 2. Fetch allocations for the current payment
    const currentAllocations = await db
      .select({
        id: paymentAllocations.id,
        invoiceId: paymentAllocations.invoiceId,
        amount: paymentAllocations.amount,
        invoiceNumber: invoices.documentNumber,
        invoiceDate: invoices.invoiceDate,
        dueDate: invoices.dueDate,
        total: invoices.total,
        divisionId: invoices.divisionId,
      })
      .from(paymentAllocations)
      .innerJoin(invoices, eq(invoices.id, paymentAllocations.invoiceId))
      .where(eq(paymentAllocations.incomeId, currentPaymentId));

    // 3. Create a map of unpaid invoices for quick lookup
    const unpaidMap = new Map<string, typeof unpaidInvoices[0]>();
    for (const inv of unpaidInvoices) {
      unpaidMap.set(inv.id, inv);
    }

    // 4. Merge current allocations into unpaid invoices list
    for (const alloc of currentAllocations) {
      const allocatedAmount = parseFloat(alloc.amount);
      const existingUnpaid = unpaidMap.get(alloc.invoiceId);

      if (existingUnpaid) {
        existingUnpaid.outstanding = parseFloat((existingUnpaid.outstanding + allocatedAmount).toFixed(2));
      } else {
        unpaidInvoices.push({
          id: alloc.invoiceId,
          documentNumber: alloc.invoiceNumber,
          invoiceDate: alloc.invoiceDate,
          dueDate: alloc.dueDate,
          total: parseFloat(alloc.total),
          allocated: 0,
          outstanding: allocatedAmount,
          divisionId: alloc.divisionId,
        });
      }
    }

    return unpaidInvoices.sort((a, b) => a.invoiceDate.localeCompare(b.invoiceDate));
  } catch (err) {
    console.error('Failed to fetch client outstanding invoices for edit:', err);
    throw new Error('Failed to load invoices.');
  }
}

/**
 * ── getClientCreditBalanceForEdit ─────────────────────────────────────────────────────
 * Calculates the unallocated credit balance for a client excluding the specified payment.
 */
export async function getClientCreditBalanceForEdit(clientId: string, currentPaymentId: string): Promise<number> {
  try {
    await getSessionOrRedirect();
    const db = getDb();

    const [incomeAgg] = await db
      .select({ totalPaid: sql<string>`coalesce(sum(${income.amount}), 0)` })
      .from(income)
      .where(and(eq(income.clientId, clientId), sql`${income.id} != ${currentPaymentId}`));

    const [allocationAgg] = await db
      .select({ totalAllocated: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)` })
      .from(paymentAllocations)
      .innerJoin(invoices, eq(invoices.id, paymentAllocations.invoiceId))
      .where(and(eq(invoices.clientId, clientId), sql`${paymentAllocations.incomeId} != ${currentPaymentId}`));

    const totalPaid = parseFloat(incomeAgg?.totalPaid ?? '0');
    const totalAllocated = parseFloat(allocationAgg?.totalAllocated ?? '0');

    return Math.max(0, totalPaid - totalAllocated);
  } catch (err) {
    console.error('Failed to calculate client credit balance for edit:', err);
    return 0;
  }
}

async function enrichIncomeWithAllocations(incomeData: any[]) {
  const { getDb, paymentAllocations, sql } = await import('@pmg/db');
  const db = getDb();
  const incomeIds = incomeData.map(i => i.id);
  
  let allocationSums: { incomeId: string; sum: string }[] = [];
  if (incomeIds.length > 0) {
    const { inArray } = await import('drizzle-orm');
    allocationSums = await db.select({ incomeId: paymentAllocations.incomeId, sum: sql<string>`sum(${paymentAllocations.amount})` })
      .from(paymentAllocations)
      .where(inArray(paymentAllocations.incomeId, incomeIds))
      .groupBy(paymentAllocations.incomeId);
  }

  const allocMap = new Map<string, number>();
  for (const row of allocationSums) {
    allocMap.set(row.incomeId, parseFloat(row.sum));
  }

  return incomeData.map((r) => {
    const amount = parseFloat(r.amount);
    const allocated = allocMap.get(r.id) ?? 0;
    return {
      id: r.id,
      date: r.date,
      divisionId: r.divisionId,
      divisionName: r.divisionName,
      clientName: r.clientName ?? 'General / Non-Client',
      clientId: r.clientId,
      description: r.description ?? '',
      amount,
      allocated,
      credit: Math.max(0, amount - allocated),
    };
  });
}

export async function fetchPaymentsByMonth(year: number, month: number) {
  const { getAllIncome } = await import('@pmg/db');
  const { getClosedPeriodsFromDates } = await import('@/lib/date-rules');
  
  const incomeResult = await getAllIncome(
    { year, month: `${year}-${month.toString().padStart(2, '0')}` },
    { page: 1, pageSize: 1000 }
  );

  const payments = await enrichIncomeWithAllocations(incomeResult.data);
  const closedPeriods = await getClosedPeriodsFromDates(payments.map(p => p.date));

  return { data: payments, closedPeriods };
}

export async function fetchPaymentsByYear(year: number) {
  const { getAllIncome } = await import('@pmg/db');
  const { getClosedPeriodsFromDates } = await import('@/lib/date-rules');
  
  const incomeResult = await getAllIncome(
    { year },
    { page: 1, pageSize: 5000 }
  );

  const payments = await enrichIncomeWithAllocations(incomeResult.data);
  const closedPeriods = await getClosedPeriodsFromDates(payments.map(p => p.date));

  return { data: payments, closedPeriods };
}
