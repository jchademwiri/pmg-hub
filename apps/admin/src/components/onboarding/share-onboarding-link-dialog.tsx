'use client';

import * as React from 'react';
import { Copy, Check, MessageSquare, ExternalLink, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ShareOnboardingLinkDialogProps {
  divisions?: { id: string; name: string }[];
  leadId?: string;
  leadName?: string;
  leadPhone?: string;
  trigger?: React.ReactNode;
}

const DIVISION_CONFIG: Record<
  string,
  { name: string; url: string; defaultPhone: string }
> = {
  pmg: {
    name: 'Playhouse Media Group',
    url: 'https://playhousemedia.co.za/onboard',
    defaultPhone: '27740491433',
  },
  tes: {
    name: 'Tender Edge Solutions',
    url: 'https://tenderedgesolutions.co.za/onboard',
    defaultPhone: '27745017094',
  },
  aws: {
    name: 'Apex Web Solutions',
    url: 'https://apexwebsolutions.co.za/onboard',
    defaultPhone: '27740491433',
  },
};

export function ShareOnboardingLinkDialog({
  divisions = [],
  leadId,
  leadName,
  leadPhone,
  trigger,
}: ShareOnboardingLinkDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedDivision, setSelectedDivision] = React.useState<string>('pmg');
  const [copied, setCopied] = React.useState(false);

  // Derive division-specific target URL
  const activeDivision = DIVISION_CONFIG[selectedDivision] || DIVISION_CONFIG.pmg;
  const queryParams = new URLSearchParams();
  if (leadId) {
    queryParams.set('lead', leadId);
  }
  const queryString = queryParams.toString();
  const fullUrl = queryString ? `${activeDivision.url}?${queryString}` : activeDivision.url;

  // Pre-written WhatsApp invitation copy mentioning the specific brand
  const recipientName = leadName ? ` ${leadName}` : '';
  const whatsAppMessage = `Hi${recipientName}! Please take 10 seconds to confirm your contact and business details for ${activeDivision.name} so we can set up your account: ${fullUrl}`;

  // WhatsApp click-to-chat URL
  const rawDigits = leadPhone ? leadPhone.replace(/[^0-9]/g, '') : '';
  const cleanPhone =
    rawDigits.startsWith('0') && rawDigits.length === 10 ? `27${rawDigits.slice(1)}` : rawDigits;
  const whatsAppUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsAppMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(whatsAppMessage)}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success('Onboarding link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="default" className="gap-2 shadow-sm font-semibold">
            <Link2 className="size-4" />
            <span>Share Onboarding Link</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Link2 className="size-5 text-primary" />
            <span>Send Onboarding Link</span>
          </DialogTitle>
          <DialogDescription>
            Share this link via WhatsApp or copy it to send to a new client or prospect.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Brand/Division Selector */}
          <div className="space-y-1.5">
            <Label htmlFor="brand-select" className="text-xs font-semibold">
              Select Brand / Division
            </Label>
            <Select value={selectedDivision} onValueChange={setSelectedDivision}>
              <SelectTrigger id="brand-select" className="h-9 text-xs">
                <SelectValue placeholder="Select Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pmg">Playhouse Media Group (General)</SelectItem>
                <SelectItem value="tes">Tender Edge Solutions</SelectItem>
                <SelectItem value="aws">Apex Web Solutions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Generated URL field */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Onboarding URL</Label>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={fullUrl}
                className="flex-1 h-9 px-3 rounded-lg border bg-muted/40 text-xs font-mono select-all focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="h-9 px-3 gap-1.5 text-xs font-semibold shrink-0"
              >
                {copied ? (
                  <Check className="size-3.5 text-emerald-500" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>
          </div>

          {/* Pre-written message preview */}
          <div className="rounded-lg bg-muted/30 border p-3 text-xs space-y-1.5">
            <p className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">
              WhatsApp Message Preview:
            </p>
            <p className="text-foreground text-xs italic">"{whatsAppMessage}"</p>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 h-9 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold shadow-sm transition-all active:scale-[0.98]"
            >
              <MessageSquare className="size-4" />
              <span>Send via WhatsApp</span>
            </a>
            <a
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-medium hover:bg-accent transition-colors"
            >
              <span>Test Form</span>
              <ExternalLink className="size-3.5" />
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
