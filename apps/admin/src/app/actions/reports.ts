'use server';

import { getMonthlyFinancialsForYear } from '@pmg/db';

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

    const header = 'Month,Revenue,Expenses,PMG Share,Profit Pool,Salary,Reinvest,Reserve,Flex';
    const dataRows = MONTH_NAMES.map((name, i) => {
      const monthKey = `${year}-${String(i + 1).padStart(2, '0')}`;
      const { revenue, expenses } = dataByMonth.get(monthKey) ?? { revenue: 0, expenses: 0 };

      const pmgShare   = revenue * 0.25;
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

import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { formatZAR } from '@/lib/format'

export type CommentaryResult = {
  text: string
  isAi: boolean
}

export async function generateCommentaryAction(
  momData: { metric: string; current: number; previous: number }[]
): Promise<CommentaryResult> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    const revItem = momData.find((d) => d.metric === 'Revenue')
    const expItem = momData.find((d) => d.metric === 'Expenses')
    const poolItem = momData.find((d) => d.metric === 'Profit Pool')

    if (!revItem || !expItem || !poolItem) {
      return { text: 'No sufficient data to generate commentary.', isAi: false }
    }

    const getDetails = (item: typeof revItem) => {
      const diff = item.current - item.previous
      const pct = item.previous !== 0 ? (diff / item.previous) * 100 : 0
      const isUp = diff > 0
      const isFlat = Math.abs(diff) < 0.01
      return { diff, pct, isUp, isFlat }
    }

    const rev = getDetails(revItem)
    const exp = getDetails(expItem)
    const pool = getDetails(poolItem)

    const text = `Gross Revenue is ${formatZAR(revItem.current)} this period, representing a ${
      rev.isFlat ? 'flat performance' : rev.isUp ? 'growth' : 'contraction'
    } of ${formatZAR(Math.abs(rev.diff))} (${rev.isUp ? '+' : ''}${rev.pct.toFixed(1)}%) against the previous period of ${formatZAR(
      revItem.previous
    )}. Operating expenses rose or fell to ${formatZAR(expItem.current)}. This is a spending ${
      exp.isFlat ? 'change of 0%' : exp.isUp ? 'increase' : 'decrease'
    } of ${formatZAR(Math.abs(exp.diff))} (${exp.isUp ? '+' : ''}${exp.pct.toFixed(1)}%) compared to the previous period's expense load of ${formatZAR(
      expItem.previous
    )}. The Net Profit Pool split is computed at ${formatZAR(poolItem.current)} yielding a net variance of ${formatZAR(
      pool.diff
    )} (${pool.isUp ? '+' : ''}${pool.pct.toFixed(1)}%) relative to last month's yield of ${formatZAR(
      poolItem.previous
    )}. ${pool.isUp ? 'Margin expansion driven by revenue outperformance.' : 'Profit contraction relative to previous period.'}`

    return { text, isAi: false }
  }

  try {
    const prompt = `You are a professional financial controller. Analyze this Month-over-Month (MoM) financial data:
${momData.map((d) => `- ${d.metric}: Current = ${formatZAR(d.current)}, Previous = ${formatZAR(d.previous)}`).join('\n')}

Provide a concise, professional, and clear executive commentary analyzing the variances. Detail the absolute change and percentage change for Revenue, Expenses, and Profit Pool (Net Profit). Make it engaging, and keep it under 150 words. Do not use markdown bullet points, just provide a unified, professional paragraph. Do not start with generic greetings, just write the commentary.`

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
    })

    return { text, isAi: true }
  } catch (err) {
    console.error('AI commentary generation failed:', err)
    return { text: 'AI generation failed. Please check your API configuration.', isAi: false }
  }
}

