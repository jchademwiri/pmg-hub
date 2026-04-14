'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  onConfirm,
}: ConfirmDialogProps) {
  function handleConfirm() {
    onConfirm();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

let openConfirmFn: ((options: ConfirmOptions) => Promise<boolean>) | null = null;

function ConfirmDialogWrapper() {
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState<ConfirmOptions>({
    title: 'Confirm Action',
  });
  const [resolve, setResolve] = React.useState<((value: boolean) => void) | null>(null);

  React.useEffect(() => {
    openConfirmFn = (opts: ConfirmOptions) => {
      return new Promise((res) => {
        setOptions(opts);
        setResolve(() => res);
        setOpen(true);
      });
    };
    return () => {
      openConfirmFn = null;
    };
  }, []);

  function handleConfirm() {
    resolve?.(true);
    setOpen(false);
  }

  function handleCancel() {
    resolve?.(false);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{options.title}</DialogTitle>
          {options.description && <DialogDescription>{options.description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {options.cancelText || 'Cancel'}
          </Button>
          <Button
            variant={options.variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
          >
            {options.confirmText || 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ConfirmDialogWrapper />
    </>
  );
}

export function confirm(options: ConfirmOptions): Promise<boolean> {
  if (!openConfirmFn) {
    console.warn('confirm() called outside of ConfirmProvider');
    return Promise.resolve(false);
  }
  return openConfirmFn(options);
}
