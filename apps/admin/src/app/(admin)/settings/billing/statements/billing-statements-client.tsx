'use client';

import { useRef, useState, useTransition, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldContent, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SettingsSection } from '@/components/settings/settings-section';
import type { DivisionBillingSettings } from '@pmg/db';

interface Division {
  id: string;
  name: string;
}

interface BillingSettingsClientProps {
  divisions: Division[];
  allSettings: Record<string, DivisionBillingSettings>;
  saveAction: (divisionId: string, formData: FormData) => Promise<{ error?: string }>;
}

function HiddenPreserveInputs({ settings }: { settings: DivisionBillingSettings | null }) {
  if (!settings) return null;
  return (
    <>
      {settings.defaultVatRate ? <input type="hidden" name="defaultVatRate" value={settings.defaultVatRate} /> : null}
      {settings.paymentTermsDays != null ? <input type="hidden" name="paymentTermsDays" value={settings.paymentTermsDays} /> : null}
      {settings.bankName ? <input type="hidden" name="bankName" value={settings.bankName} /> : null}
      {settings.bankAccountName ? <input type="hidden" name="bankAccountName" value={settings.bankAccountName} /> : null}
      {settings.bankAccountNumber ? <input type="hidden" name="bankAccountNumber" value={settings.bankAccountNumber} /> : null}
      {settings.bankBranchCode ? <input type="hidden" name="bankBranchCode" value={settings.bankBranchCode} /> : null}
      {settings.invoiceNotes ? <input type="hidden" name="invoiceNotes" value={settings.invoiceNotes} /> : null}
      {settings.quoteNotes ? <input type="hidden" name="quoteNotes" value={settings.quoteNotes} /> : null}
      {settings.salesRepName ? <input type="hidden" name="salesRepName" value={settings.salesRepName} /> : null}
      {settings.salesRepPhone ? <input type="hidden" name="salesRepPhone" value={settings.salesRepPhone} /> : null}
      {settings.salesRepEmail ? <input type="hidden" name="salesRepEmail" value={settings.salesRepEmail} /> : null}
      {settings.divisionWebsite ? <input type="hidden" name="divisionWebsite" value={settings.divisionWebsite} /> : null}
      {settings.creditExpiryMonths != null ? <input type="hidden" name="creditExpiryMonths" value={settings.creditExpiryMonths} /> : null}
      {settings.autoApplyCredits ? <input type="hidden" name="autoApplyCredits" value="on" /> : null}
    </>
  );
}

function DivisionStatementsForm({
  division,
  currentSettings,
  saveAction,
}: {
  division: Division;
  currentSettings: DivisionBillingSettings | null;
  saveAction: (divisionId: string, formData: FormData) => Promise<{ error?: string }>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const s = currentSettings;
  const [autoSendStatements, setAutoSendStatements] = useState<boolean>(s?.autoSendStatements ?? false);
  const [statementCycleDay, setStatementCycleDay] = useState<string | number>(s?.statementCycleDay ?? 1);
  const [statementType, setStatementType] = useState<string>(s?.statementType ?? 'outstanding');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const fd = new FormData(formRef.current!);
      if (autoSendStatements) fd.append('autoSendStatements', 'on');
      const result = await saveAction(division.id, fd);
      if (result.error) {
        setError(result.error);
      } else {
        setIsDirty(false);
        toast.success(`${division.name} automated statements policy saved.`);
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} onChange={() => setIsDirty(true)} className="flex flex-col gap-6">
      <HiddenPreserveInputs settings={s} />

      <SettingsSection
        title={`Automated Statements for ${division.name}`}
        description="Configure rules for automatically emailing monthly account statements to clients who have an outstanding balance. Note: Clients with a $0 balance are automatically skipped."
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Field orientation="horizontal" className="items-end pb-1 sm:col-span-2">
            <Switch
              checked={autoSendStatements}
              onCheckedChange={(checked) => {
                setAutoSendStatements(checked);
                setIsDirty(true);
              }}
              disabled={isPending}
            />
            <FieldContent>
              <FieldLabel>Enable Automated Statements</FieldLabel>
              <p className="text-xs text-muted-foreground">
                If enabled, a daily background job will check if today matches your cycle day and sweep all active clients.
              </p>
            </FieldContent>
          </Field>

          {autoSendStatements && (
            <>
              <Field>
                <FieldLabel>Cycle Day</FieldLabel>
                <Input
                  name="statementCycleDay"
                  type="number"
                  min="1"
                  max="31"
                  value={statementCycleDay}
                  onChange={(e) => setStatementCycleDay(e.target.value)}
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">Day of the month to send (e.g., 1 for the 1st of the month).</p>
              </Field>

              <Field>
                <FieldLabel>Statement Type</FieldLabel>
                <input type="hidden" name="statementType" value={statementType} />
                <Select value={statementType} onValueChange={(val) => { setStatementType(val); setIsDirty(true); }} disabled={isPending}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outstanding">Outstanding Invoices Only (Open Item)</SelectItem>
                    <SelectItem value="activity">All Activity for Period (Balance Forward)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">The format of the attached PDF statement.</p>
              </Field>
            </>
          )}
        </div>
      </SettingsSection>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Could not save automated statements policy</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-lg border bg-background/95 p-3.5 shadow-sm backdrop-blur">
        <p className="text-sm text-muted-foreground">
          {isDirty ? 'Unsaved changes' : `${division.name} policy saved`}
        </p>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save Statement Policy'}
        </Button>
      </div>
    </form>
  );
}

export function BillingStatementsClient({ divisions, allSettings, saveAction }: BillingSettingsClientProps) {
  const [activeId, setActiveId] = useState<string>(divisions[0]?.id ?? '');
  const activeDivision = divisions.find((d) => d.id === activeId) ?? divisions[0];

  if (!activeDivision) return null;

  return (
    <div className="flex flex-col gap-6">
      <Tabs value={activeDivision.id} onValueChange={setActiveId}>
        <div className="sticky top-13 z-20 bg-background/95 py-2 backdrop-blur-sm sm:top-14">
          <TabsList className="w-full justify-start rounded-lg bg-muted/40 p-1 overflow-x-auto">
            {divisions.map((division) => (
              <TabsTrigger key={division.id} value={division.id} className="gap-2">
                {division.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {divisions.map((division) => (
          <TabsContent key={division.id} value={division.id} className="mt-4">
            <DivisionStatementsForm
              key={division.id}
              division={division}
              currentSettings={allSettings[division.id] ?? null}
              saveAction={saveAction}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
