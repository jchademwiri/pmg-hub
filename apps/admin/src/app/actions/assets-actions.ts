'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import {
  createAsset as createAssetRow,
  updateAsset as updateAssetRow,
  disposeAsset as disposeAssetRow,
  reactivateAsset as reactivateAssetRow,
  deleteAsset as deleteAssetRow,
  hasAssetHistory,
} from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';

// ── Schema ────────────────────────────────────────────────────────────────────

const AssetSchema = z
  .object({
    kind: z.enum(['fixed_asset', 'investment']),
    name: z.string().min(1, 'Name is required').max(200),
    category: z.string().min(1, 'Category is required'),
    acquisitionDate: z.string().min(10, 'Acquisition date is required'),
    cost: z.coerce.number().min(0, 'Cost cannot be negative'),
    currentValue: z.coerce.number().min(0, 'Current value cannot be negative').optional().nullable(),
    notes: z.string().optional().nullable(),
    serialNumber: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    assignedTo: z.string().optional().nullable(),
    quantity: z.coerce.number().min(0, 'Quantity cannot be negative').optional().nullable(),
    unitType: z.string().optional().nullable(),
  })
  .refine((d) => d.kind !== 'investment' || (d.quantity != null && !!d.unitType?.trim()), {
    message: 'Quantity and unit type are required for investments.',
    path: ['quantity'],
  });

type AssetInput = z.infer<typeof AssetSchema>;

// ── createAsset ───────────────────────────────────────────────────────────────

export async function createAsset(data: AssetInput): Promise<{ error?: string; id?: string }> {
  try {
    await getSessionOrRedirect();

    const parsed = AssetSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Validation error' };
    }
    // Investments are sourced live from Luno — the register never creates
    // investment rows, so force the kind here regardless of what the client sends.
    const v = { ...parsed.data, kind: 'fixed_asset' as const };

    const created = await createAssetRow({
      kind: 'fixed_asset',
      name: v.name,
      category: v.category,
      acquisitionDate: v.acquisitionDate,
      cost: String(v.cost.toFixed(2)),
      currentValue: v.currentValue != null ? String(v.currentValue.toFixed(2)) : null,
      notes: v.notes ?? null,
      serialNumber: v.serialNumber ?? null,
      location: v.location ?? null,
      assignedTo: v.assignedTo ?? null,
      quantity: null,
      unitType: null,
    });

    revalidatePath('/assets');
    return { id: created.id };
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

// ── updateAsset ───────────────────────────────────────────────────────────────

export async function updateAsset(id: string, data: AssetInput): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();

    const parsed = AssetSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Validation error' };
    }
    const v = parsed.data;

    await updateAssetRow(id, {
      kind: v.kind,
      name: v.name,
      category: v.category,
      acquisitionDate: v.acquisitionDate,
      cost: String(v.cost.toFixed(2)),
      currentValue: v.currentValue != null ? String(v.currentValue.toFixed(2)) : null,
      notes: v.notes ?? null,
      serialNumber: v.kind === 'fixed_asset' ? (v.serialNumber ?? null) : null,
      location: v.kind === 'fixed_asset' ? (v.location ?? null) : null,
      assignedTo: v.kind === 'fixed_asset' ? (v.assignedTo ?? null) : null,
      quantity: v.kind === 'investment' && v.quantity != null ? String(v.quantity) : null,
      unitType: v.kind === 'investment' ? (v.unitType ?? null) : null,
    });

    revalidatePath('/assets');
    revalidatePath(`/assets/${id}`);
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

// ── disposeAsset ──────────────────────────────────────────────────────────────

export async function disposeAsset(id: string, disposalNotes?: string): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();
    await disposeAssetRow(id, disposalNotes);
    revalidatePath('/assets');
    revalidatePath(`/assets/${id}`);
    return {};
  } catch {
    return { error: 'Failed to dispose asset. Please try again.' };
  }
}

// ── reactivateAsset ───────────────────────────────────────────────────────────

export async function reactivateAsset(id: string): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();
    await reactivateAssetRow(id);
    revalidatePath('/assets');
    revalidatePath(`/assets/${id}`);
    return {};
  } catch {
    return { error: 'Failed to restore asset. Please try again.' };
  }
}

// ── deleteAsset ───────────────────────────────────────────────────────────────

export async function deleteAsset(id: string): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();

    if (await hasAssetHistory(id)) {
      return { error: 'This asset has recorded valuations or deposits/withdrawals. Dispose it instead of deleting, so that history is preserved.' };
    }

    await deleteAssetRow(id);
    revalidatePath('/assets');
    return {};
  } catch {
    return { error: 'Failed to delete. Please try again.' };
  }
}

