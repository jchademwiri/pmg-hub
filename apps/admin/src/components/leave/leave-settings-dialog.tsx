'use client';

import * as React from 'react';
import { RotateCcw, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import type { LeaveSettings } from '@pmg/db';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resetLeaveSettings, updateLeaveSettings } from '@/actions/leave';

interface LeaveSettingsDialogProps {
  settings: LeaveSettings;
}

export function LeaveSettingsDialog({ settings }: LeaveSettingsDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [annualOpeningBalance, setAnnualOpeningBalance] = React.useState(
    String(settings.annualOpeningBalance),
  );
  const [annualMonthlyAccrual, setAnnualMonthlyAccrual] = React.useState(
    String(settings.annualMonthlyAccrual),
  );
  const [annualMaxCarryOver, setAnnualMaxCarryOver] = React.useState(
    String(settings.annualMaxCarryOver),
  );
  const [sickOpeningBalance, setSickOpeningBalance] = React.useState(
    String(settings.sickOpeningBalance),
  );
  const [familyOpeningBalance, setFamilyOpeningBalance] = React.useState(
    String(settings.familyOpeningBalance),
  );
  const [isPending, startTransition] = React.useTransition();

  // Sync local form state whenever the modal opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setAnnualOpeningBalance(String(settings.annualOpeningBalance));
      setAnnualMonthlyAccrual(String(settings.annualMonthlyAccrual));
      setAnnualMaxCarryOver(String(settings.annualMaxCarryOver));
      setSickOpeningBalance(String(settings.sickOpeningBalance));
      setFamilyOpeningBalance(String(settings.familyOpeningBalance));
    }
    setOpen(nextOpen);
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateLeaveSettings({
        annualOpeningBalance: Number(annualOpeningBalance),
        annualMonthlyAccrual: Number(annualMonthlyAccrual),
        annualMaxCarryOver: Number(annualMaxCarryOver),
        sickOpeningBalance: Number(sickOpeningBalance),
        familyOpeningBalance: Number(familyOpeningBalance),
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success('Leave baseline settings saved.');
      setOpen(false);
    });
  };

  const handleReset = () => {
    startTransition(async () => {
      const res = await resetLeaveSettings();
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success('Reset to October 31, 2026 baseline.');
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Settings2 className="size-4" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Leave Baseline Settings</DialogTitle>
          <DialogDescription>
            Configure opening balances as of 31 October 2026, accrual rate, and February 28
            carry-over cap.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cfg-annual-opening" className="text-xs">
                31 Oct Annual Balance
              </Label>
              <Input
                id="cfg-annual-opening"
                type="number"
                step="0.01"
                value={annualOpeningBalance}
                onChange={(e) => setAnnualOpeningBalance(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cfg-annual-accrual" className="text-xs">
                Monthly Accrual (d/mo)
              </Label>
              <Input
                id="cfg-annual-accrual"
                type="number"
                step="0.01"
                min="0"
                value={annualMonthlyAccrual}
                onChange={(e) => setAnnualMonthlyAccrual(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cfg-max-carry" className="text-xs">
                Max Feb 28 Carry-Over
              </Label>
              <Input
                id="cfg-max-carry"
                type="number"
                step="1"
                min="0"
                value={annualMaxCarryOver}
                onChange={(e) => setAnnualMaxCarryOver(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cfg-sick-opening" className="text-xs">
                Sick Remaining (of {settings.sickCycleEntitlement})
              </Label>
              <Input
                id="cfg-sick-opening"
                type="number"
                step="1"
                min="0"
                max={settings.sickCycleEntitlement}
                value={sickOpeningBalance}
                onChange={(e) => setSickOpeningBalance(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="cfg-family-opening" className="text-xs">
                Family Resp. (2026)
              </Label>
              <Input
                id="cfg-family-opening"
                type="number"
                step="1"
                min="0"
                max={settings.familyAnnualEntitlement}
                value={familyOpeningBalance}
                onChange={(e) => setFamilyOpeningBalance(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={handleReset}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3.5" />
              Reset to Oct 31 Baseline
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
