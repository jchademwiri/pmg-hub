'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getDb, organisationSettings, divisionBillingSettings, eq, sql } from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';

// ── Organisation settings ─────────────────────────────────────────────────────

const OrgSettingsSchema = z.object({
  companyName:        z.string().max(200).optional().nullable(),
  registrationNumber: z.string().max(100).optional().nullable(),
  vatNumber:          z.string().max(50).optional().nullable(),
  email:              z.string().email().optional().nullable().or(z.literal('')),
  phone:              z.string().max(50).optional().nullable(),
  website:            z.string().max(200).optional().nullable(),
  addressStreet:      z.string().max(200).optional().nullable(),
  addressCity:        z.string().max(100).optional().nullable(),
  addressPostal:      z.string().max(20).optional().nullable(),
  addressProvince:    z.string().max(100).optional().nullable(),
  country:            z.string().max(100).optional().nullable(),
});

export async function updateOrganisationSettings(
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();

    const raw = Object.fromEntries(formData) as Record<string, string>;
    // Treat empty strings as null
    for (const key of Object.keys(raw)) {
      if (raw[key] === '') raw[key] = null as any;
    }

    const parsed = OrgSettingsSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Validation error' };
    }

    const db = getDb();

    // Upsert - there is always exactly one row. Use a fixed sentinel approach:
    // try to update first; if no rows updated, insert.
    const existing = await db.select({ id: organisationSettings.id }).from(organisationSettings).limit(1);

    if (existing.length > 0) {
      await db
        .update(organisationSettings)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(organisationSettings.id, existing[0]!.id));
    } else {
      await db.insert(organisationSettings).values({
        ...parsed.data,
        updatedAt: new Date(),
      });
    }

    revalidatePath('/settings/organisation');
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

// ── Division billing settings ─────────────────────────────────────────────────

const DivisionBillingSchema = z.object({
  defaultVatRate:    z.coerce.number().min(0).max(100).optional(),
  paymentTermsDays:  z.coerce.number().int().min(0).max(365).optional(),
  bankName:          z.string().max(100).optional().nullable(),
  bankAccountName:   z.string().max(200).optional().nullable(),
  bankAccountNumber: z.string().max(50).optional().nullable(),
  bankBranchCode:    z.string().max(20).optional().nullable(),
  invoiceNotes:      z.string().max(2000).optional().nullable(),
  quoteNotes:        z.string().max(2000).optional().nullable(),
  // Division contact details
  salesRepName:      z.string().max(200).optional().nullable(),
  salesRepPhone:     z.string().max(50).optional().nullable(),
  salesRepEmail:     z.string().email().optional().nullable().or(z.literal('')),
  divisionWebsite:   z.string().max(200).optional().nullable(),
});

export async function saveDivisionBillingSettings(
  divisionId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();

    const raw = Object.fromEntries(formData) as Record<string, string>;
    for (const key of Object.keys(raw)) {
      if (raw[key] === '') raw[key] = null as any;
    }

    const parsed = DivisionBillingSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Validation error' };
    }

    const db = getDb();

    // Upsert on division_id
    const existing = await db
      .select({ id: divisionBillingSettings.id })
      .from(divisionBillingSettings)
      .where(eq(divisionBillingSettings.divisionId, divisionId))
      .limit(1);

    const values = {
      defaultVatRate:    parsed.data.defaultVatRate != null ? String(parsed.data.defaultVatRate) : undefined,
      paymentTermsDays:  parsed.data.paymentTermsDays,
      bankName:          parsed.data.bankName ?? null,
      bankAccountName:   parsed.data.bankAccountName ?? null,
      bankAccountNumber: parsed.data.bankAccountNumber ?? null,
      bankBranchCode:    parsed.data.bankBranchCode ?? null,
      invoiceNotes:      parsed.data.invoiceNotes ?? null,
      quoteNotes:        parsed.data.quoteNotes ?? null,
      salesRepName:      parsed.data.salesRepName ?? null,
      salesRepPhone:     parsed.data.salesRepPhone ?? null,
      salesRepEmail:     parsed.data.salesRepEmail || null,
      divisionWebsite:   parsed.data.divisionWebsite ?? null,
      updatedAt:         new Date(),
    };

    if (existing.length > 0) {
      await db
        .update(divisionBillingSettings)
        .set(values)
        .where(eq(divisionBillingSettings.divisionId, divisionId));
    } else {
      await db.insert(divisionBillingSettings).values({
        divisionId,
        ...values,
      });
    }

    revalidatePath('/settings/billing');
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}
