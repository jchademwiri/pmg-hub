'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db, clients, clientOnboardings, leads, eq } from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';
import { sendPortalInvitation } from './clients';

export async function convertOnboardingToClient(
  onboardingId: string,
  options?: { sendPortalInvite?: boolean },
): Promise<{ error?: string; clientId?: string }> {
  try {
    const session = await getSessionOrRedirect();

    const result = await db.transaction(async (tx) => {
      // 1. Lock the onboarding row to avoid concurrent conversion
      const [onboarding] = await tx
        .select()
        .from(clientOnboardings)
        .where(eq(clientOnboardings.id, onboardingId))
        .for('update');

      if (!onboarding) {
        throw new Error('Onboarding submission not found.');
      }
      if (onboarding.status === 'converted') {
        throw new Error('This submission is already converted.');
      }

      // 2. Check if client with this email already exists
      if (onboarding.email) {
        const [existing] = await tx
          .select({ id: clients.id, name: clients.name })
          .from(clients)
          .where(eq(clients.email, onboarding.email));

        if (existing) {
          throw new Error(
            `A client with the email "${onboarding.email}" already exists (${existing.name}).`,
          );
        }
      }

      // 3. Insert into clients table
      const [newClient] = await tx
        .insert(clients)
        .values({
          name: onboarding.contactName,
          businessName: onboarding.companyName,
          email: onboarding.email,
          phone: onboarding.phone,
          divisionId: onboarding.divisionId ?? null,
          registrationNumber: onboarding.registrationNumber ?? null,
          isActive: true,
          isRetainer: false,
          excludeFromAutoStatements: false,
        })
        .returning({ id: clients.id });

      if (!newClient) {
        throw new Error('Failed to create client record.');
      }

      // 4. Update the onboarding status to converted
      await tx
        .update(clientOnboardings)
        .set({
          status: 'converted',
          convertedClientId: newClient.id,
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(clientOnboardings.id, onboardingId));

      // 5. If linked to an originating lead, update lead status as converted
      if (onboarding.leadId) {
        await tx
          .update(leads)
          .set({
            status: 'converted',
            updatedAt: new Date(),
          })
          .where(eq(leads.id, onboarding.leadId));
      }

      return newClient;
    });

    // 6. Optional: Dispatch client portal invitation
    if (options?.sendPortalInvite && result.id) {
      try {
        await sendPortalInvitation(result.id);
      } catch (inviteErr) {
        console.error('Portal invitation dispatch failed during onboarding conversion:', inviteErr);
      }
    }

    revalidatePath('/relationships/onboarding');
    revalidatePath('/relationships/clients');
    revalidatePath('/relationships/leads');
    revalidatePath('/dashboard');

    return { clientId: result.id };
  } catch (err) {
    console.error('convertOnboardingToClient error:', err);
    return {
      error: err instanceof Error ? err.message : 'Failed to convert onboarding to client.',
    };
  }
}

export async function updateOnboardingStatus(
  id: string,
  status: 'pending' | 'converted' | 'rejected' | 'archived',
  notes?: string,
): Promise<{ error?: string }> {
  try {
    const session = await getSessionOrRedirect();

    await db
      .update(clientOnboardings)
      .set({
        status,
        notes: notes ?? undefined,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(clientOnboardings.id, id));

    revalidatePath('/relationships/onboarding');
    return {};
  } catch {
    return { error: 'Failed to update onboarding status.' };
  }
}

export async function deleteOnboarding(id: string): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();
    await db.delete(clientOnboardings).where(eq(clientOnboardings.id, id));
    revalidatePath('/relationships/onboarding');
    return {};
  } catch {
    return { error: 'Failed to delete onboarding submission.' };
  }
}
