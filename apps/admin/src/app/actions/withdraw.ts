'use server';

import { insertWithdrawal } from '@pmg/db';

export async function recordWithdrawal(amount: number): Promise<{ error?: string }> {
  try {
    const date = new Date().toISOString().split('T')[0];
    await insertWithdrawal(amount, date);
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { error: message };
  }
}
