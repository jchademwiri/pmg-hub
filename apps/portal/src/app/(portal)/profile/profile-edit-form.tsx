'use client';

import * as React from 'react';
import { updateClientProfileAction } from '@/app/actions/profile-actions';
import { Loader2, Save, Building, MapPin, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileEditFormProps {
  initialClient: {
    name: string;
    phone: string | null;
    registrationNumber?: string | null;
    website?: string | null;
    billingAddress?: string | null;
    city?: string | null;
    postalCode?: string | null;
    province?: string | null;
  };
}

export function ProfileEditForm({ initialClient }: ProfileEditFormProps) {
  const [isPending, startTransition] = React.useTransition();
  const [name, setName] = React.useState(initialClient.name || '');
  const [phone, setPhone] = React.useState(initialClient.phone || '');
  const [registrationNumber, setRegistrationNumber] = React.useState(
    initialClient.registrationNumber || '',
  );
  const [website, setWebsite] = React.useState(initialClient.website || '');
  const [billingAddress, setBillingAddress] = React.useState(initialClient.billingAddress || '');
  const [city, setCity] = React.useState(initialClient.city || '');
  const [postalCode, setPostalCode] = React.useState(initialClient.postalCode || '');
  const [province, setProvince] = React.useState(initialClient.province || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const res = await updateClientProfileAction({
        name,
        phone: phone || undefined,
        registrationNumber: registrationNumber || undefined,
        website: website || undefined,
        billingAddress: billingAddress || undefined,
        city: city || undefined,
        postalCode: postalCode || undefined,
        province: province || undefined,
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Profile details updated successfully!');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pt-4 border-t border-white/5">
      {/* Contact Person & Direct Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="contact-name"
            className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5"
          >
            Contact Person <span className="text-blue-400">*</span>
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
          <label
            htmlFor="contact-phone"
            className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5"
          >
            Phone / WhatsApp Number
          </label>
          <input
            id="contact-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isPending}
            placeholder="+27 82 123 4567"
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-muted-foreground/50 outline-none transition-all focus:border-blue-500/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Registration Number & Website */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="reg-number"
            className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5"
          >
            CIPC Registration Number
          </label>
          <input
            id="reg-number"
            type="text"
            value={registrationNumber}
            onChange={(e) => setRegistrationNumber(e.target.value)}
            disabled={isPending}
            placeholder="e.g. 2024/123456/07"
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white font-mono placeholder-muted-foreground/50 outline-none transition-all focus:border-blue-500/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50"
          />
        </div>

        <div>
          <label
            htmlFor="website-url"
            className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5"
          >
            Company Website
          </label>
          <input
            id="website-url"
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            disabled={isPending}
            placeholder="https://yourcompany.co.za"
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-muted-foreground/50 outline-none transition-all focus:border-blue-500/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Physical / Billing Address */}
      <div className="space-y-4 pt-2 border-t border-white/5">
        <div>
          <label
            htmlFor="billing-address"
            className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5"
          >
            Physical / Invoicing Street Address
          </label>
          <input
            id="billing-address"
            type="text"
            value={billingAddress}
            onChange={(e) => setBillingAddress(e.target.value)}
            disabled={isPending}
            placeholder="e.g. 123 Main Road, Centurion"
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-muted-foreground/50 outline-none transition-all focus:border-blue-500/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label
              htmlFor="city"
              className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5"
            >
              City / Town
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={isPending}
              placeholder="Pretoria"
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-muted-foreground/50 outline-none transition-all focus:border-blue-500/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="postal-code"
              className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5"
            >
              Postal Code
            </label>
            <input
              id="postal-code"
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              disabled={isPending}
              placeholder="0157"
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-muted-foreground/50 outline-none transition-all focus:border-blue-500/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="province"
              className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5"
            >
              Province
            </label>
            <input
              id="province"
              type="text"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              disabled={isPending}
              placeholder="Gauteng"
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-muted-foreground/50 outline-none transition-all focus:border-blue-500/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}
          <span>Save Changes</span>
        </button>
      </div>
    </form>
  );
}
