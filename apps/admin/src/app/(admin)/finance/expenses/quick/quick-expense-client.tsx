'use client';

import React, { useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { Camera, CheckCircle2, ArrowLeft, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createExpense } from '@/actions/expenses/expenses';

const QUICK_CHIPS = [
  'Stationery',
  'Printing',
  'Transport',
  'Shipment',
  'Hosting',
  'Equipment',
] as const;

interface QuickExpenseClientProps {
  divisions: { id: string; name: string }[];
  defaultDivisionId: string;
  categories: string[];
  todayStr: string;
}

export function QuickExpenseClient({
  divisions,
  defaultDivisionId,
  categories,
  todayStr,
}: QuickExpenseClientProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(() => {
    const firstMatch = QUICK_CHIPS.find((chip) =>
      categories.some((c) => c.toLowerCase().includes(chip.toLowerCase())),
    );
    if (firstMatch) {
      return (
        categories.find((c) => c.toLowerCase().includes(firstMatch.toLowerCase())) ?? firstMatch
      );
    }
    return categories[0] ?? 'Stationery';
  });
  const [divisionId, setDivisionId] = useState(defaultDivisionId);
  const [date, setDate] = useState(todayStr);
  const [description, setDescription] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  const chipCategories = useMemo(() => {
    return QUICK_CHIPS.map((chip) => {
      const matched = categories.find((c) => c.toLowerCase().includes(chip.toLowerCase()));
      return { label: chip, value: matched ?? chip };
    });
  }, [categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error('Enter a valid amount greater than R0.');
      return;
    }
    if (!divisionId) {
      toast.error('Select a division.');
      return;
    }

    const fd = new FormData();
    fd.set('date', date);
    fd.set('divisionId', divisionId);
    fd.set('category', category);
    fd.set('amount', numericAmount.toFixed(2));
    if (description.trim()) fd.set('description', description.trim());
    if (receiptFile) fd.set('receipt', receiptFile);

    startTransition(async () => {
      const res = await createExpense(fd);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Logged R ${numericAmount.toFixed(2)} (${category}) and posted to GL.`);
        setSavedCount((c) => c + 1);
        setAmount('');
        setDescription('');
        setReceiptFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-lg flex flex-col gap-4 pb-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/finance/expenses">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> All Expenses
          </Link>
        </Button>
        {savedCount > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> {savedCount} logged this session
          </span>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Receipt Snap</CardTitle>
          <CardDescription>
            Snap a slip at the counter, pick a category, and auto-post to the ledger in seconds.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Receipt Camera / File Capture */}
            <div className="space-y-2">
              <Label>Receipt Photo / PDF (SARS 5-Year Retention)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                className="hidden"
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`w-full rounded-xl border-2 border-dashed p-5 flex flex-col items-center justify-center gap-2 transition-colors ${
                  receiptFile
                    ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
                    : 'border-border hover:border-primary/50 hover:bg-muted/30 text-muted-foreground'
                }`}
              >
                {receiptFile ? (
                  <>
                    <CheckCircle2 className="h-7 w-7" />
                    <span className="text-sm font-medium truncate max-w-full px-2">
                      {receiptFile.name}
                    </span>
                    <span className="text-xs opacity-80">Tap to retake or replace</span>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Camera className="h-6 w-6" />
                      <Upload className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      Tap to Snap Receipt or Upload Slip
                    </span>
                    <span className="text-xs">JPG, PNG, WebP, or PDF (uploads to R2)</span>
                  </>
                )}
              </button>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="quick-amount">Amount (ZAR) *</Label>
              <Input
                id="quick-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-2xl font-mono h-12"
                required
              />
            </div>

            {/* Quick Category Chips */}
            <div className="space-y-2">
              <Label>Category *</Label>
              <div className="flex flex-wrap gap-1.5">
                {chipCategories.map((chip) => {
                  const active = category === chip.value;
                  return (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => setCategory(chip.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-muted border-border text-foreground'
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
              {categories.length > 0 && (
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Or pick any category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="quick-desc">Vendor / Description</Label>
              <Input
                id="quick-desc"
                placeholder="e.g. PostNet printing, Uber to briefing, Makro paper"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Division & Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Division</Label>
                <Select value={divisionId} onValueChange={setDivisionId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quick-date">Date</Label>
                <Input
                  id="quick-date"
                  type="date"
                  value={date}
                  max={todayStr}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={isPending}>
              {isPending ? 'Uploading & Posting…' : 'Save Expense & Post to GL'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
