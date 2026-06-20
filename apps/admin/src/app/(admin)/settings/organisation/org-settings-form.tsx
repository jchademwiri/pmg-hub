'use client';

import { useRef, useTransition, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Field, FieldLabel } from '@/components/ui/field';
import { SettingsSection } from '@/components/settings/settings-section';
import type { OrganisationSettings } from '@pmg/db';

interface OrgSettingsFormProps {
  settings: OrganisationSettings | null;
  saveAction: (formData: FormData) => Promise<{ error?: string }>;
}

export function OrgSettingsForm({ settings, saveAction }: OrgSettingsFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const fd = new FormData(formRef.current!);
      const result = await saveAction(fd);
      if (result.error) {
        setError(result.error);
      } else {
        setIsDirty(false);
        toast.success('Organisation settings saved.');
      }
    });
  }

  const s = settings;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onChange={() => setIsDirty(true)}
      className="flex flex-col gap-6"
    >
      {/* Company identity */}
      <SettingsSection
        title="Company Identity"
        description="Your registered company name and legal identifiers."
      >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2">
                <FieldLabel>Company Name</FieldLabel>
                <Input
                  name="companyName"
                  defaultValue={s?.companyName ?? ''}
                  placeholder="e.g. Playhouse Media Group"
                  disabled={isPending}
                />
              </Field>
              <Field>
                <FieldLabel>Registration Number</FieldLabel>
                <Input
                  name="registrationNumber"
                  defaultValue={s?.registrationNumber ?? ''}
                  placeholder="e.g. 2018/123456/07"
                  disabled={isPending}
                />
              </Field>
              <Field>
                <FieldLabel>VAT Number</FieldLabel>
                <Input
                  name="vatNumber"
                  defaultValue={s?.vatNumber ?? ''}
                  placeholder="e.g. 4560123456"
                  disabled={isPending}
                />
              </Field>
            </div>
      </SettingsSection>

      <Separator />

      {/* Contact details */}
      <SettingsSection
        title="Contact Details"
        description="How clients can reach you. Appears in document footers."
      >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input
                  name="email"
                  type="email"
                  defaultValue={s?.email ?? ''}
                  placeholder="billing@example.co.za"
                  disabled={isPending}
                />
              </Field>
              <Field>
                <FieldLabel>Phone</FieldLabel>
                <Input
                  name="phone"
                  defaultValue={s?.phone ?? ''}
                  placeholder="+27 21 000 0000"
                  disabled={isPending}
                />
              </Field>
              <Field>
                <FieldLabel>Website</FieldLabel>
                <Input
                  name="website"
                  defaultValue={s?.website ?? ''}
                  placeholder="www.example.co.za"
                  disabled={isPending}
                />
              </Field>
            </div>
      </SettingsSection>

      <Separator />

      {/* Address */}
      <SettingsSection
        title="Address"
        description="Physical or postal address printed on documents."
      >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2">
                <FieldLabel>Street Address</FieldLabel>
                <Input
                  name="addressStreet"
                  defaultValue={s?.addressStreet ?? ''}
                  placeholder="12 Media Park, Century City"
                  disabled={isPending}
                />
              </Field>
              <Field>
                <FieldLabel>City</FieldLabel>
                <Input
                  name="addressCity"
                  defaultValue={s?.addressCity ?? ''}
                  placeholder="Cape Town"
                  disabled={isPending}
                />
              </Field>
              <Field>
                <FieldLabel>Postal Code</FieldLabel>
                <Input
                  name="addressPostal"
                  defaultValue={s?.addressPostal ?? ''}
                  placeholder="7441"
                  disabled={isPending}
                />
              </Field>
              <Field>
                <FieldLabel>Province</FieldLabel>
                <Input
                  name="addressProvince"
                  defaultValue={s?.addressProvince ?? ''}
                  placeholder="Western Cape"
                  disabled={isPending}
                />
              </Field>
              <Field>
                <FieldLabel>Country</FieldLabel>
                <Input
                  name="country"
                  defaultValue={s?.country ?? 'South Africa'}
                  disabled={isPending}
                />
              </Field>
            </div>
      </SettingsSection>

      <Separator />

      {/* Logo - upload deferred to v2 */}
      <SettingsSection
        title="Logo"
        description="Displayed on invoices, quotes, and statements."
      >
            <div className="flex items-center gap-4">
              <div className="flex size-20 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-xs text-muted-foreground">
                No logo
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="outline" size="sm" disabled type="button" title="Coming soon">
                  Upload Logo
                </Button>
                <p className="text-xs text-muted-foreground">PNG or SVG, max 2 MB - coming soon</p>
              </div>
            </div>
      </SettingsSection>

      {/* Save */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Could not save organisation settings</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-lg border bg-background/95 p-3 shadow-sm backdrop-blur">
        <p className="text-sm text-muted-foreground">
          {isDirty ? 'Unsaved changes' : 'All organisation changes are saved'}
        </p>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
