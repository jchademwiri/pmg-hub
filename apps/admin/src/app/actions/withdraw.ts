'use server';

import { insertWithdrawal } from '@pmg/db';
import { revalidatePath } from 'next/cache';

function formatDefaultDescription(date: Date): string {
  return `Salary withdrawal — ${date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}`
}

export async function recordWithdrawal(amount: number, description?: string, account: string = 'salary'): Promise<{ error?: string }> {
  try {
    const now = new Date()
    const date = now.toISOString().split('T')[0]!
    const desc = description?.trim() || formatDefaultDescription(now)
    await insertWithdrawal(amount, date, desc, account)
    revalidatePath('/withdrawals')
    revalidatePath('/accounts')
    revalidatePath('/dashboard')
    return {}
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { error: message }
  }
}
