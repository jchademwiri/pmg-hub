'use server';

import { getMonthlyFinancialsForYear, getActiveRates } from '@pmg/db';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export async function exportFinancialsCsv(
  year: number
): Promise<string | { error: string }> {
  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    return { error: 'Invalid year' };
  }

  try {
    const rows = await getMonthlyFinancialsForYear(year);

    // Build a lookup map from 'YYYY-MM' → { revenue, expenses }
    const dataByMonth = new Map<string, { revenue: number; expenses: number }>();
    for (const row of rows) {
      dataByMonth.set(row.month, { revenue: row.revenue, expenses: row.expenses });
    }

    const rates = await getActiveRates();
    const header = 'Month,Revenue,Expenses,PMG Share,Profit Pool,Salary,Reinvest,Reserve,Flex';
    const dataRows = MONTH_NAMES.map((name, i) => {
      const monthKey = `${year}-${String(i + 1).padStart(2, '0')}`;
      const { revenue, expenses } = dataByMonth.get(monthKey) ?? { revenue: 0, expenses: 0 };

      const pmgShare   = revenue * rates.pmg_share;
      const profitPool = revenue - expenses - pmgShare;
      const salary     = profitPool * 0.35;
      const reinvest   = profitPool * 0.30;
      const reserve    = profitPool * 0.30;
      const flex       = profitPool * 0.05;

      return `${name},${revenue},${expenses},${pmgShare},${profitPool},${salary},${reinvest},${reserve},${flex}`;
    });

    return [header, ...dataRows].join('\n');
  } catch (err) {
    return { error: (err as Error).message };
  }
}

import { gateway, generateText } from 'ai'
import { formatZAR } from '@/lib/format'

export type CommentaryResult = {
  text: string
  isAi: boolean
}

type CommentaryInput = { metric: string; current: number; previous: number }

type CommentaryContext = {
  currentMonthLabel?: string
  previousMonthLabel?: string
}

type VarianceRow = CommentaryInput & {
  diff: number
  pct: number | null
  direction: 'up' | 'down' | 'flat'
  percentText: string
}

function getVarianceRows(momData: CommentaryInput[]): VarianceRow[] {
  return momData.map((item) => {
    const diff = item.current - item.previous
    const direction = Math.abs(diff) < 0.01 ? 'flat' : diff > 0 ? 'up' : 'down'
    const pct = item.previous !== 0 ? (diff / Math.abs(item.previous)) * 100 : null
    const percentText = pct === null
      ? item.current === 0 ? '0.0%' : 'not comparable from a zero base'
      : `${diff >= 0 ? '+' : ''}${pct.toFixed(1)}%`

    return { ...item, diff, pct, direction, percentText }
  })
}

function signedCurrency(value: number): string {
  if (Math.abs(value) < 0.01) return formatZAR(0)
  return `${value > 0 ? '+' : '-'}${formatZAR(Math.abs(value))}`
}

function findMetric(rows: VarianceRow[], metric: string): VarianceRow | undefined {
  return rows.find((row) => row.metric === metric)
}

function buildFallbackCommentary(
  rows: VarianceRow[],
  context: CommentaryContext,
): string {
  const revenue = findMetric(rows, 'Revenue')
  const expenses = findMetric(rows, 'Expenses')
  const profitPool = findMetric(rows, 'Profit Pool')

  if (!revenue || !expenses || !profitPool) {
    return 'No sufficient data to generate commentary.'
  }

  const currentLabel = context.currentMonthLabel ?? 'the current period'
  const previousLabel = context.previousMonthLabel ?? 'the previous period'
  const revenuePhrase = revenue.direction === 'flat'
    ? 'was flat'
    : revenue.direction === 'up' ? 'increased' : 'decreased'
  const expensePhrase = expenses.direction === 'flat'
    ? 'were flat'
    : expenses.direction === 'up' ? 'increased' : 'decreased'
  const profitPhrase = profitPool.direction === 'flat'
    ? 'held steady'
    : profitPool.direction === 'up' ? 'improved' : 'weakened'

  return `${currentLabel} revenue was ${formatZAR(revenue.current)}, ${revenuePhrase} by ${signedCurrency(revenue.diff)} (${revenue.percentText}) versus ${previousLabel}. Expenses were ${formatZAR(expenses.current)}, ${expensePhrase} by ${signedCurrency(expenses.diff)} (${expenses.percentText}). Profit/Loss ${profitPhrase} to ${formatZAR(profitPool.current)}, a ${signedCurrency(profitPool.diff)} (${profitPool.percentText}) movement from ${formatZAR(profitPool.previous)}.`
}

export async function generateCommentaryAction(
  momData: CommentaryInput[],
  context: CommentaryContext = {},
): Promise<CommentaryResult> {
  const apiKey = process.env.AI_GATEWAY_API_KEY
  const rows = getVarianceRows(momData)

  if (!apiKey) {
    return { text: buildFallbackCommentary(rows, context), isAi: false }
  }

  try {
    const currentLabel = context.currentMonthLabel ?? 'Current period'
    const previousLabel = context.previousMonthLabel ?? 'Previous period'
    const prompt = `Write executive commentary using only these actual Month-over-Month figures.

Comparison: ${currentLabel} vs ${previousLabel}
${rows.map((row) => `- ${row.metric}: ${currentLabel} = ${formatZAR(row.current)}; ${previousLabel} = ${formatZAR(row.previous)}; variance = ${signedCurrency(row.diff)}; percent variance = ${row.percentText}; direction = ${row.direction}.`).join('\n')}

Requirements:
- Use the exact supplied numbers and percentage variances.
- Explain Revenue, Expenses, and Profit Pool / Profit-Loss.
- Do not invent causes, clients, categories, or operational drivers not present in the figures.
- Keep it under 150 words.
- Write one professional paragraph with no markdown bullets or greeting.`

    const { text } = await generateText({
      model: gateway('openai/gpt-4o-mini'),
      system: 'You are a careful financial controller. Ground every statement in the provided figures and avoid unsupported causal claims.',
      prompt,
      temperature: 0.2,
    })

    return { text, isAi: true }
  } catch (err) {
    console.error('AI Gateway commentary generation failed:', err)
    return { text: 'AI Gateway generation failed. Please check your AI_GATEWAY_API_KEY configuration.', isAi: false }
  }
}

