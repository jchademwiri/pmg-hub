'use client';

import * as React from 'react';
import { acceptQuoteAction, declineQuoteAction } from '@/app/actions/quote-actions';
import { Loader2, Check, X, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

interface QuoteActionsClientProps {
  quoteId: string;
}

export function QuoteActionsClient({ quoteId }: QuoteActionsClientProps) {
  const [isPending, startTransition] = React.useTransition();
  const [showAcceptModal, setShowAcceptModal] = React.useState(false);
  const [showDeclineModal, setShowDeclineModal] = React.useState(false);
  const [declineReason, setDeclineReason] = React.useState('');

  async function handleAccept() {
    startTransition(async () => {
      const res = await acceptQuoteAction(quoteId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Quote accepted successfully!');
        setShowAcceptModal(false);
      }
    });
  }

  async function handleDecline(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      const res = await declineQuoteAction(quoteId, declineReason);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Quote declined.');
        setShowDeclineModal(false);
      }
    });
  }

  return (
    <div className="flex items-center gap-3 print:hidden">
      {/* Accept Button */}
      <button
        type="button"
        disabled={isPending}
        onClick={() => setShowAcceptModal(true)}
        className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
      >
        <Check className="size-4" />
        <span>Accept Quote</span>
      </button>

      {/* Decline Button */}
      <button
        type="button"
        disabled={isPending}
        onClick={() => setShowDeclineModal(true)}
        className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-lg transition-all active:scale-[0.98] disabled:opacity-50"
      >
        <X className="size-4" />
        <span>Decline Quote</span>
      </button>

      {/* Custom Accept Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0a0f1d] p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-left">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Check className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Accept Quotation</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Are you sure you want to accept this quotation? This will notify our billing department to convert it to an invoice and begin scheduling.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setShowAcceptModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleAccept}
                className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isPending && <Loader2 className="size-3.5 animate-spin" />}
                <span>Confirm & Accept</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0a0f1d] p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-left">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
                <ShieldAlert className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Decline Quotation</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Please let us know why you are declining this quotation (optional).
                </p>
              </div>
            </div>

            <form onSubmit={handleDecline} className="mt-4 space-y-4">
              <textarea
                placeholder="Reason for declining..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                disabled={isPending}
                className="w-full min-h-[100px] rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-white placeholder-muted-foreground/50 outline-none transition-all focus:border-blue-500/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50 resize-none"
              />

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setShowDeclineModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isPending && <Loader2 className="size-3.5 animate-spin" />}
                  <span>Decline Quote</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
