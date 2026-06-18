'use client'

import * as React from 'react'
import Link from 'next/link'
import { formatZAR, fmtDate } from '@/lib/format'
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  PieChart,
  ArrowUpRight,
} from 'lucide-react'

interface FinanceOverviewClientProps {
  summary: {
    revenue: number
    expenses: number
    pmgShare: number
    profitPool: number
  }
  revenueByDivision: Array<{ divisionName: string; total: number }>
  expensesByCategory: Array<{ category: string; total: number }>
  recentIncome: Array<{ id: string; date: string; description: string | null; amount: number; divisionName: string }>
  recentExpenses: Array<{ id: string; date: string; description: string | null; amount: number; category: string }>
}

export function FinanceOverviewClient({
  summary,
  revenueByDivision,
  expensesByCategory,
  recentIncome,
  recentExpenses,
}: FinanceOverviewClientProps) {
  const isProfitable = summary.profitPool >= 0
  const totalIncomeCount = recentIncome.length
  const totalExpenseCount = recentExpenses.length

  return (
    <div className="flex flex-col gap-6">
      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Revenue</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 tabular-nums text-emerald-600">{formatZAR(summary.revenue)}</p>
          <p className="text-xs text-muted-foreground mt-1">{totalIncomeCount} income entries</p>
        </div>

        <div className="rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Expenses</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
              <TrendingDown className="h-4 w-4 text-red-600" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 tabular-nums text-red-600">{formatZAR(summary.expenses)}</p>
          <p className="text-xs text-muted-foreground mt-1">{totalExpenseCount} expense entries</p>
        </div>

        <div className="rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Profit Pool</p>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isProfitable ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
              <DollarSign className={`h-4 w-4 ${isProfitable ? 'text-emerald-600' : 'text-red-600'}`} />
            </div>
          </div>
          <p className={`text-2xl font-bold mt-2 tabular-nums ${isProfitable ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatZAR(summary.profitPool)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Revenue − Expenses − PMG Share
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">PMG Share</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
              <PieChart className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 tabular-nums">{formatZAR(summary.pmgShare)}</p>
          <p className="text-xs text-muted-foreground mt-1">25% of revenue</p>
        </div>
      </div>

      {/* Division Revenue + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue by Division */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Revenue by Division</h3>
            <Link href="/finance/income" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {revenueByDivision.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">No revenue recorded.</div>
          ) : (
            <div className="divide-y">
              {revenueByDivision.map((div) => {
                const pct = summary.revenue > 0 ? (div.total / summary.revenue) * 100 : 0
                return (
                  <div key={div.divisionName} className="px-5 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{div.divisionName}</span>
                      <span className="text-sm font-semibold tabular-nums text-emerald-600">{formatZAR(div.total)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.max(pct, 1)}%` }} />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{pct.toFixed(1)}% of total</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Expenses by Category */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Expenses by Category</h3>
            <Link href="/finance/expenses" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {expensesByCategory.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">No expenses recorded.</div>
          ) : (
            <div className="divide-y">
              {expensesByCategory.map((cat) => {
                const pct = summary.expenses > 0 ? (cat.total / summary.expenses) * 100 : 0
                return (
                  <div key={cat.category} className="px-5 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium capitalize">{cat.category.replace(/_/g, ' ')}</span>
                      <span className="text-sm font-semibold tabular-nums text-red-600">{formatZAR(cat.total)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${Math.max(pct, 1)}%` }} />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{pct.toFixed(1)}% of total</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Income */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recent Income</h3>
            <Link href="/finance/income" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {recentIncome.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">No income recorded yet.</div>
          ) : (
            <div className="divide-y">
              {recentIncome.map((inc) => (
                <div key={inc.id} className="px-5 py-3 flex items-start justify-between hover:bg-muted/20 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{inc.description || 'Income entry'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{fmtDate(inc.date)}</span>
                      <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-600">
                        {inc.divisionName}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-medium tabular-nums text-emerald-600 shrink-0 ml-4">{formatZAR(inc.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Expenses */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recent Expenses</h3>
            <Link href="/finance/expenses" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {recentExpenses.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">No expenses recorded yet.</div>
          ) : (
            <div className="divide-y">
              {recentExpenses.map((exp) => (
                <div key={exp.id} className="px-5 py-3 flex items-start justify-between hover:bg-muted/20 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{exp.description || 'Expense entry'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{fmtDate(exp.date)}</span>
                      <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-red-500/10 text-red-600">
                        {exp.category}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-medium tabular-nums text-red-600 shrink-0 ml-4">{formatZAR(exp.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Modules</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href: '/finance/income', label: 'Income', description: 'Track payments received', color: 'bg-emerald-500/10 text-emerald-600' },
            { href: '/finance/expenses', label: 'Expenses', description: 'Record business costs', color: 'bg-red-500/10 text-red-600' },
            { href: '/finance/categories', label: 'Categories', description: 'Manage expense categories', color: 'bg-amber-500/10 text-amber-600' },
            { href: '/finance/distributions', label: 'Distributions', description: 'Allocate profit to buckets', color: 'bg-blue-500/10 text-blue-600' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center gap-3 rounded-xl border bg-card p-3.5 hover:bg-muted/30 hover:shadow-sm transition-all duration-200"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${link.color}`}>
                <span className="text-sm font-bold">{link.label.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium group-hover:underline underline-offset-2">{link.label}</p>
                <p className="text-[11px] text-muted-foreground truncate">{link.description}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-x-1 group-hover:translate-x-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
