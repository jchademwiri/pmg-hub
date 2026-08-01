'use client';

import { useRef, useTransition, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { AlertCircle, Building2, Mail, MapPin, Image } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
      <Tabs defaultValue="identity" className="w-full">
        <TabsList className="w-full justify-start rounded-lg bg-muted/40 p-1">
          <TabsTrigger value="identity" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Company Identity
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Contact Details
          </TabsTrigger>
          <TabsTrigger value="address" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Address
          </TabsTrigger>
          <TabsTrigger value="logo" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Brand Logo
          </TabsTrigger>
        </TabsList>

        {/* Company Identity Tab */}
        <TabsContent value="identity" className="mt-4">
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
        </TabsContent>

        {/* Contact Details Tab */}
        <TabsContent value="contact" className="mt-4">
          <SettingsSection
            title="Contact Details"
            description="How clients can reach you. Appears in document footers."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Email Address</FieldLabel>
                <Input
                  name="email"
                  type="email"
                  defaultValue={s?.email ?? ''}
                  placeholder="billing@example.co.za"
                  disabled={isPending}
                />
              </Field>
              <Field>
                <FieldLabel>Phone Number</FieldLabel>
                <Input
                  name="phone"
                  defaultValue={s?.phone ?? ''}
                  placeholder="+27 21 000 0000"
                  disabled={isPending}
                />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel>Website URL</FieldLabel>
                <Input
                  name="website"
                  defaultValue={s?.website ?? ''}
                  placeholder="www.example.co.za"
                  disabled={isPending}
                />
              </Field>
            </div>
          </SettingsSection>
        </TabsContent>

        {/* Address Tab */}
        <TabsContent value="address" className="mt-4">
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
        </TabsContent>

        {/* Brand Logo Tab */}
        <TabsContent value="logo" className="mt-4">
          <SettingsSection
            title="Logo"
            description="Displayed on invoices, quotes, and statements."
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex size-24 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-xs text-muted-foreground font-medium">
                No logo
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="outline" size="sm" disabled type="button" title="Coming soon">
                  Upload Logo
                </Button>
                <p className="text-xs text-muted-foreground">Recommended size: PNG or SVG, transparent background, max 2 MB</p>
              </div>
            </div>
          </SettingsSection>
        </TabsContent>
      </Tabs>

      {/* Save Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Could not save organisation settings</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Sticky Save Bar */}
      <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-lg border bg-background/95 p-3.5 shadow-sm backdrop-blur">
        <p className="text-sm text-muted-foreground">
          {isDirty ? 'Unsaved changes in form' : 'All organisation details are saved'}
        </p>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}

