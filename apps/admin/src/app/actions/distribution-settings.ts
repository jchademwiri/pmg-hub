'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getDb, distributionSettings, eq, and, desc, getAllDistributionSettings } from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';

// ── Validation ────────────────────────────────────────────────────────────────

const RATE_KEYS = ['pmg_share', 'salary', 'reinvest', 'reserve', 'flex'] as const;

const UpdateRateSchema = z.object({
  rateKey: z.enum(RATE_KEYS),
  rateValue: z.coerce.number().min(0).max(1),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  description: z.string().max(255).optional().nullable(),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DistributionSettingRow {
  id: string;
  rateKey: string;
  rateValue: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── updateDistributionRate ────────────────────────────────────────────────────
// Creates a new rate entry with the given effective date.
// If an existing active rate for the same key has no effective_to,
// sets its effective_to to the day before the new rate takes effect.

export async function updateDistributionRate(formData: FormData): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();

    const raw = {
      rateKey: formData.get('rateKey') as string,
      rateValue: formData.get('rateValue') as string,
      effectiveFrom: formData.get('effectiveFrom') as string,
      description: (formData.get('description') as string) || null,
    };

    const parsed = UpdateRateSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Validation error' };
    }

    const { rateKey, rateValue, effectiveFrom, description } = parsed.data;
    const db = getDb();

    // Find currently active rate for this key
    const [currentActive] = await db
      .select()
      .from(distributionSettings)
      .where(
        and(
          eq(distributionSettings.rateKey, rateKey),
          eq(distributionSettings.isActive, true),
        )
      )
      .orderBy(desc(distributionSettings.effectiveFrom))
      .limit(1);

    // If there's an existing active rate, close it (set effective_to to day before new rate)
    if (currentActive) {
      const effectiveFromDate = new Date(effectiveFrom);
      const dayBefore = new Date(effectiveFromDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      const closeDateStr = dayBefore.toISOString().slice(0, 10);

      // Only close if the new effective date is after the current one
      const currentEffectiveStr = currentActive.effectiveFrom instanceof Date
        ? currentActive.effectiveFrom.toISOString().slice(0, 10)
        : String(currentActive.effectiveFrom);

      if (effectiveFrom > currentEffectiveStr) {
        await db
          .update(distributionSettings)
          .set({
            effectiveTo: new Date(closeDateStr),
            isActive: false,
            updatedAt: new Date(),
          })
          .where(eq(distributionSettings.id, currentActive.id));
      } else {
        // New rate is same date or earlier — deactivate current active
        await db
          .update(distributionSettings)
          .set({
            isActive: false,
            updatedAt: new Date(),
          })
          .where(eq(distributionSettings.id, currentActive.id));
      }
    }

    // Insert the new rate
    await db.insert(distributionSettings).values({
      rateKey,
      rateValue: String(rateValue),
      effectiveFrom: new Date(effectiveFrom),
      description: description || `Updated to ${(rateValue * 100).toFixed(1)}%`,
      isActive: true,
    });

    revalidatePath('/finance/distributions');
    return {};
  } catch (err) {
    console.error('Failed to update distribution rate:', err);
    return { error: 'Failed to save rate. Please try again.' };
  }
}

// ── getAllDistributionSettingsForUI ────────────────────────────────────────────
// Fetches all settings rows for the admin UI, ordered by rate key then effective date.

export async function getAllDistributionSettingsForUI(): Promise<DistributionSettingRow[]> {
  try {
    await getSessionOrRedirect();
    const rows = await getAllDistributionSettings();

    return rows.map((row) => ({
      id: row.id,
      rateKey: row.rateKey,
      rateValue: parseFloat(row.rateValue),
      effectiveFrom: row.effectiveFrom instanceof Date
        ? row.effectiveFrom.toISOString().slice(0, 10)
        : String(row.effectiveFrom),
      effectiveTo: row.effectiveTo instanceof Date
        ? row.effectiveTo.toISOString().slice(0, 10)
        : row.effectiveTo ? String(row.effectiveTo) : null,
      description: row.description,
      isActive: row.isActive,
      createdAt: row.createdAt?.toISOString() ?? '',
      updatedAt: row.updatedAt?.toISOString() ?? '',
    }));
  } catch (err) {
    console.error('Failed to fetch distribution settings:', err);
    return [];
  }
}


