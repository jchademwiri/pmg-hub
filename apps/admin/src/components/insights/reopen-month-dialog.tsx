'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Eye, EyeOff, KeyRound, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { reopenMonth } from '@/app/actions/snapshots';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ReopenMonthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  period: string;
  periodLabel: string;
}

export function ReopenMonthDialog({
  open,
  onOpenChange,
  period,
  periodLabel,
}: ReopenMonthDialogProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClose = () => {
    setPassword('');
    setShowPassword(false);
    setError(null);
    onOpenChange(false);
  };

  const handleReopen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Admin password is required.');
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await reopenMonth(period, password);
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        toast.success(`Period ${periodLabel} reopened successfully.`);
        handleClose();
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!isPending ? handleClose() : undefined)}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 mb-1">
            <Lock className="size-5" />
            <DialogTitle>Reopen Accounting Period</DialogTitle>
          </div>
          <DialogDescription>
            You are requesting to reopen{' '}
            <span className="font-semibold text-foreground">{periodLabel}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleReopen} className="flex flex-col gap-4 py-2">
          <Alert
            variant="destructive"
            className="border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 [&>svg]:text-amber-600"
          >
            <AlertTriangle className="size-4" />
            <AlertTitle className="text-xs font-semibold">Important Security Notice</AlertTitle>
            <AlertDescription className="text-xs text-amber-700/90 dark:text-amber-300/90 leading-relaxed">
              Reopening removes the locked financial snapshot and restores live tracking. Journals
              and transactions can once again be posted to this period.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col gap-2">
            <Label htmlFor="admin-password" className="text-xs font-medium">
              Admin Password
            </Label>
            <div className="relative">
              <Input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter admin authorization password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isPending}
                autoFocus
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {error && <p className="text-xs text-destructive font-medium">{error}</p>}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isPending || !password}
              className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <KeyRound className="size-4" />
                  Verify & Reopen
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
