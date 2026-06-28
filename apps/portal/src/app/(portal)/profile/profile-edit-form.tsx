'use client';

import * as React from 'react';
import { updateClientProfileAction } from '@/app/actions/profile-actions';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileEditFormProps {
  initialClient: {
    name: string;
    phone: string | null;
  };
}

export function ProfileEditForm({ initialClient }: ProfileEditFormProps) {
  const [isPending, startTransition] = React.useTransition();
  const [name, setName] = React.useState(initialClient.name);
  const [phone, setPhone] = React.useState(initialClient.phone || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const res = await updateClientProfileAction({ name, phone });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Profile updated successfully!');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-white/5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-name" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            Contact Person
          </label>
          <input
            id="contact-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-muted-foreground/50 outline-none transition-all focus:border-blue-500/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50"
          />
        </div>

        <div>
          <label htmlFor="contact-phone" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            Phone Number
          </label>
          <input
            id="contact-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isPending}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-muted-foreground/50 outline-none transition-all focus:border-blue-500/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          <span>Save Changes</span>
        </button>
      </div>
    </form>
  );
}
