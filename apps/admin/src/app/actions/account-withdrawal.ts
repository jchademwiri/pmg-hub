'use server';

import { createLedgerEntry } from './ledger';

export async function recordAccountWithdrawal(formData: FormData): Promise<{ error?: string }> {
  const account = formData.get('account') as string;
  if (!['salary', 'reinvest', 'reserve', 'flex', 'pmg_share'].includes(account)) {
    return { error: 'Invalid ledger allocation type.' };
  }

  const ledgerForm = new FormData();
  ledgerForm.append('allocationType', account);
  ledgerForm.append('entryType', 'spend');
  if (formData.has('amount'))      ledgerForm.append('amount',      formData.get('amount')      as string);
  if (formData.has('date'))        ledgerForm.append('date',        formData.get('date')        as string);
  if (formData.has('description')) ledgerForm.append('description', formData.get('description') as string);

  return createLedgerEntry(ledgerForm);
}
