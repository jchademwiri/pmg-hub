'use server';

import {
  getTotalRevenue,
  getTotalExpenses,
  getAllRecurringInvoices,
  getAllRecurringExpenses,
  getClientAgingReport,
} from '@pmg/db';
import { getSASTParts, formatZAR } from '@/lib/format';
import { gateway, generateText } from 'ai';

export interface GrowthAdvisorResult {
  isAi: boolean;
  modelUsed: string;
  executiveSummary: string;
  cashflowRunway: {
    mrr: number;
    softwareBurn: number;
    netMonthlyBaseline: number;
    openAR: number;
    projected30DayCash: number;
    projected60DayCash: number;
    projected90DayCash: number;
  };
  clientProfitability: {
    clientName: string;
    totalRevenue: number;
    status: string;
  }[];
  growthRecommendations: {
    title: string;
    impact: 'high' | 'medium' | 'low';
    category: 'cashflow' | 'pricing' | 'subscriptions' | 'retainers';
    description: string;
  }[];
}

/**
 * Direct Google Gemini API caller (100% Free tier via Google AI Studio).
 */
async function callGeminiDirect(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string | null> {
  const models = ['gemini-3.6-flash', 'gemini-flash-latest'];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1000,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      } else {
        console.warn(`Gemini model ${model} returned status ${res.status}`);
      }
    } catch (err) {
      console.warn(`Direct Gemini call failed on model ${model}:`, err);
    }
  }

  return null;
}

/**
 * Analyzes business financials, client retainers, and software burn to generate
 * an executive growth forecast and cashflow runway report.
 */
export async function generateGrowthAdvisoryReport(): Promise<GrowthAdvisorResult> {
  const { year, month } = getSASTParts();
  const fiscalYear = month < 2 ? year - 1 : year;

  // Gather business intelligence data
  const [totalRevenue, totalExpenses, recurringInvoices, recurringExpenses, agingReport] =
    await Promise.all([
      getTotalRevenue(),
      getTotalExpenses(),
      getAllRecurringInvoices({ status: 'active' }),
      getAllRecurringExpenses({ status: 'active' }),
      getClientAgingReport({ year: fiscalYear }),
    ]);

  const mrr = recurringInvoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0);
  const softwareBurn = recurringExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  const netMonthlyBaseline = mrr - softwareBurn;
  const openAR = agingReport.reduce((sum, r) => sum + r.totalOutstanding, 0);

  // Projected cumulative cash from recurring baseline + AR collection
  const projected30DayCash = netMonthlyBaseline + openAR * 0.7;
  const projected60DayCash = netMonthlyBaseline * 2 + openAR * 0.85;
  const projected90DayCash = netMonthlyBaseline * 3 + openAR * 0.95;

  const clientProfitability = agingReport.slice(0, 5).map((c) => ({
    clientName: c.businessName || c.clientName,
    totalRevenue: c.totalOutstanding,
    status: c.bucket_61_plus > 0 ? 'Overdue Risk' : 'Current',
  }));

  // Deterministic Base Recommendations
  const baseRecommendations: GrowthAdvisorResult['growthRecommendations'] = [
    {
      title: 'Retainer Expansion (Hosting & Care Plans)',
      impact: 'high',
      category: 'retainers',
      description: `Current MRR is ${formatZAR(mrr)}. Converting 2 additional project clients into R1,500/mo maintenance retainers will boost recurring revenue by R36,000 annually.`,
    },
    {
      title: 'Accelerate Overdue AR Inflow',
      impact: openAR > 10000 ? 'high' : 'medium',
      category: 'cashflow',
      description: `There is currently ${formatZAR(openAR)} in unpaid accounts receivable. Issuing automatic reminder statements on the 25th will accelerate cash collections.`,
    },
    {
      title: 'Software & Cloud Overhead Ratio',
      impact: softwareBurn > mrr * 0.4 ? 'high' : 'low',
      category: 'subscriptions',
      description: `Committed software & server burn is ${formatZAR(softwareBurn)}/mo against ${formatZAR(mrr)}/mo MRR (${mrr > 0 ? Math.round((softwareBurn / mrr) * 100) : 0}% of MRR).`,
    },
  ];

  // AI Prompt Payload
  const financialDataSummary = `
Financial Summary:
- Historical Revenue: ${formatZAR(totalRevenue)}
- Historical Expenses: ${formatZAR(totalExpenses)}
- Monthly Inbound Retainers (MRR): ${formatZAR(mrr)} (${recurringInvoices.length} clients)
- Monthly Outbound Software & VPS Burn: ${formatZAR(softwareBurn)} (${recurringExpenses.length} subscriptions, e.g. Claude, Antigravity, Hetzner)
- Net Monthly Baseline Surplus: ${formatZAR(netMonthlyBaseline)}
- Outstanding Accounts Receivable: ${formatZAR(openAR)}
- Top Client Balances: ${agingReport.map((c) => `${c.businessName || c.clientName}: ${formatZAR(c.totalOutstanding)} (Current: ${formatZAR(c.current)}, 60+ Days: ${formatZAR(c.bucket_61_plus)})`).join('; ')}
`;

  const systemPrompt = `You are a strategic Chief Financial Officer (CFO) and Growth Advisor for Playhouse Media Group (a digital agency and technology consultancy in South Africa).
Analyze the business numbers provided and produce an insightful, executive summary of financial health, recurring baseline runway, and 2-3 specific growth recommendations.
Ground all statements strictly in the supplied ZAR figures. Do not invent numbers. Keep the tone sharp, professional, and actionable.`;

  const userPrompt = `Review this agency financial snapshot and provide an executive summary:\n${financialDataSummary}`;

  // 1. Try Google Gemini Free Tier (`GOOGLE_GENERATIVE_AI_API_KEY`)
  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (geminiKey) {
    const aiText = await callGeminiDirect(geminiKey, systemPrompt, userPrompt);
    if (aiText) {
      return {
        isAi: true,
        modelUsed: 'Google Gemini Flash (Free Tier)',
        executiveSummary: aiText,
        cashflowRunway: {
          mrr,
          softwareBurn,
          netMonthlyBaseline,
          openAR,
          projected30DayCash,
          projected60DayCash,
          projected90DayCash,
        },
        clientProfitability,
        growthRecommendations: baseRecommendations,
      };
    }
  }

  // 2. Try Vercel AI Gateway (`AI_GATEWAY_API_KEY`)
  const gatewayKey = process.env.AI_GATEWAY_API_KEY;
  if (gatewayKey) {
    try {
      const { text } = await generateText({
        model: gateway('google/gemini-2.0-flash'),
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.2,
      });

      if (text) {
        return {
          isAi: true,
          modelUsed: 'Vercel AI Gateway (Gemini 2.0 Flash)',
          executiveSummary: text,
          cashflowRunway: {
            mrr,
            softwareBurn,
            netMonthlyBaseline,
            openAR,
            projected30DayCash,
            projected60DayCash,
            projected90DayCash,
          },
          clientProfitability,
          growthRecommendations: baseRecommendations,
        };
      }
    } catch (e) {
      console.warn('AI Gateway call failed, falling back to deterministic summary:', e);
    }
  }

  // 3. Fallback Deterministic Summary
  const fallbackSummary = `Monthly recurring revenue stands at ${formatZAR(mrr)} against ${formatZAR(softwareBurn)} in committed software and hosting subscriptions, producing a net monthly baseline surplus of ${formatZAR(netMonthlyBaseline)}. There is currently ${formatZAR(openAR)} in open accounts receivable. With consistent retainer billing on the 25th and timely invoice collections, projected 90-day operating cashflow surplus is estimated at ${formatZAR(projected90DayCash)}.`;

  return {
    isAi: false,
    modelUsed: 'Standard Financial Rule Engine (Configure GOOGLE_GENERATIVE_AI_API_KEY for AI)',
    executiveSummary: fallbackSummary,
    cashflowRunway: {
      mrr,
      softwareBurn,
      netMonthlyBaseline,
      openAR,
      projected30DayCash,
      projected60DayCash,
      projected90DayCash,
    },
    clientProfitability,
    growthRecommendations: baseRecommendations,
  };
}
