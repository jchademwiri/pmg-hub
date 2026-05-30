'use server';

import { revalidatePath } from 'next/cache';
import { getDb, invoices, income, clients, paymentAllocations, eq, and, sql, desc, asc, divisions, divisionBillingSettings } from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';
import { isPeriodClosed, getMinAllowedDate, getMinDateErrorMessage } from '@/lib/date-rules';

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
    const today = new Date().toISOString().split('T')[0]!;
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
    const finalDescription = data.description 
      ? `${data.description} - ${clientLabel}`
      : `Payment received - ${clientLabel}`;

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

    // 3. Execute database operations sequentially
    // A. Create the core payment row in income table
    const [incomeRow] = await db
      .insert(income)
      .values({
        date: data.date,
        divisionId: finalDivisionId,
        clientId: data.clientId,
        description: finalDescription,
        amount: String(data.amount),
      })
      .returning({ id: income.id });

    if (!incomeRow) throw new Error('Failed to record cash receipt.');

    const allocatedInvoicesInfo: { documentNumber: string, amount: string }[] = [];

    // B. Insert allocations and transition invoice statuses
    for (const alloc of data.allocations) {
      if (alloc.amount <= 0) continue;

      // Insert allocation link
      await db.insert(paymentAllocations).values({
        incomeId: incomeRow.id,
        invoiceId: alloc.invoiceId,
        amount: String(alloc.amount),
      });

      // Fetch invoice document number for thank you email
      const [invDoc] = await db
        .select({ documentNumber: invoices.documentNumber })
        .from(invoices)
        .where(eq(invoices.id, alloc.invoiceId))
        .limit(1);

      if (invDoc) {
        allocatedInvoicesInfo.push({
          documentNumber: invDoc.documentNumber,
          amount: `R ${Number(alloc.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        });
      }

      // Sum allocations for this invoice
      const [sumAgg] = await db
        .select({ sum: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)` })
        .from(paymentAllocations)
        .where(eq(paymentAllocations.invoiceId, alloc.invoiceId));

      const [invoiceRow] = await db
        .select({ total: invoices.total })
        .from(invoices)
        .where(eq(invoices.id, alloc.invoiceId));

      if (invoiceRow) {
        const invoiceTotal = parseFloat(invoiceRow.total);
        const totalAllocated = parseFloat(sumAgg?.sum ?? '0');

        if (totalAllocated >= invoiceTotal) {
          await db
            .update(invoices)
            .set({
              status: 'paid',
              paidAt: new Date(),
              incomeId: incomeRow.id, // Legacy backwards compatibility
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
      }
    }

    // 4. Revalidate cache
    revalidatePath('/billing/invoices');
    revalidatePath('/finance/income');
    revalidatePath('/dashboard');

    // 5. Asynchronously trigger Payment Thank You email receipt via Resend
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

          const { createEmailClient, PaymentThankYouEmail, DEFAULT_REPLY_TO, DEFAULT_EMAIL_FROM, resolveDivisionAdminEmail } = await import('@pmg/emails');

          const defaultFrom = process.env.EMAIL_FROM_ADDRESS || DEFAULT_EMAIL_FROM;
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

          const emailProps = {
            clientName: client.businessName || client.name,
            amountPaid: `R ${Number(data.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
            paymentDate: new Date(data.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }),
            paymentDescription: data.description || undefined,
            allocations: allocatedInvoicesInfo,
            companyName: divRow?.name || 'Playhouse Media Group',
            primaryColor: '#1d4ed8',
            websiteUrl: billingConfig?.divisionWebsite || undefined,
            logoUrl: billingConfig?.logoUrl || undefined,
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

    // 4. Revalidate cache
    revalidatePath('/billing/invoices');
    revalidatePath('/finance/income');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (err) {
    console.error('Failed to adjust client payment:', err);
    return { error: 'Failed to adjust payment.' };
  }
}
