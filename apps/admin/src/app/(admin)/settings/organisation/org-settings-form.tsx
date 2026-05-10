'use client';

import { useRef, useTransition, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import type { OrganisationSettings } from '@pmg/db';

interface OrgSettingsFormProps {
  settings: OrganisationSettings | null;
  saveAction: (formData: FormData) => Promise<{ error?: string }>;
}

export function OrgSettingsForm({ settings, saveAction }: OrgSettingsFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const fd = new FormData(formRef.current!);
      const result = await saveAction(fd);
      if (result.error) {
        setError(result.error);
      } else {
        toast.success('Organisation settings saved.');
      }
    });
  }

  const s = settings;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Company identity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold">Company Identity</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Your registered company name and legal identifiers.
          </p>
        </div>
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-sm font-medium">Company Name</label>
                <Input
                  name="companyName"
                  defaultValue={s?.companyName ?? ''}
                  placeholder="e.g. Playhouse Media Group"
                  disabled={isPending}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Registration Number</label>
                <Input
                  name="registrationNumber"
                  defaultValue={s?.registrationNumber ?? ''}
                  placeholder="e.g. 2018/123456/07"
                  disabled={isPending}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">VAT Number</label>
                <Input
                  name="vatNumber"
                  defaultValue={s?.vatNumber ?? ''}
                  placeholder="e.g. 4560123456"
                  disabled={isPending}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Contact details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold">Contact Details</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            How clients can reach you. Appears in document footers.
          </p>
        </div>
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Email</label>
                <Input
                  name="email"
                  type="email"
                  defaultValue={s?.email ?? ''}
                  placeholder="billing@example.co.za"
                  disabled={isPending}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Phone</label>
                <Input
                  name="phone"
                  defaultValue={s?.phone ?? ''}
                  placeholder="+27 21 000 0000"
                  disabled={isPending}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Website</label>
                <Input
                  name="website"
                  defaultValue={s?.website ?? ''}
                  placeholder="www.example.co.za"
                  disabled={isPending}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Address */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold">Address</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Physical or postal address printed on documents.
          </p>
        </div>
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-sm font-medium">Street Address</label>
                <Input
                  name="addressStreet"
                  defaultValue={s?.addressStreet ?? ''}
                  placeholder="12 Media Park, Century City"
                  disabled={isPending}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">City</label>
                <Input
                  name="addressCity"
                  defaultValue={s?.addressCity ?? ''}
                  placeholder="Cape Town"
                  disabled={isPending}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Postal Code</label>
                <Input
                  name="addressPostal"
                  defaultValue={s?.addressPostal ?? ''}
                  placeholder="7441"
                  disabled={isPending}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Province</label>
                <Input
                  name="addressProvince"
                  defaultValue={s?.addressProvince ?? ''}
                  placeholder="Western Cape"
                  disabled={isPending}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Country</label>
                <Input
                  name="country"
                  defaultValue={s?.country ?? 'South Africa'}
                  disabled={isPending}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Logo — upload deferred to v2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold">Logo</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Displayed on invoices, quotes, and statements.
          </p>
        </div>
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex items-center gap-4">
              <div className="flex size-20 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-xs text-muted-foreground">
                No logo
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="outline" size="sm" disabled type="button" title="Coming soon">
                  Upload Logo
                </Button>
                <p className="text-xs text-muted-foreground">PNG or SVG, max 2 MB — coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save */}
      {error && <p className="text-sm text-destructive text-right">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
