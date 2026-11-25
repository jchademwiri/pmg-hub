'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableClientSelect } from '@/components/billing/searchable-client-select';
import { addComplianceRecord } from '@/app/actions/compliance';

const COMPLIANCE_DOCUMENT_TYPES = [
  'SARS Tax Clearance PIN',
  'B-BBEE Affidavit / Certificate',
  'CIPC Annual Returns',
  'COIDA / Letter of Good Standing',
  'CIDB Registration (Annual & 3-Year Renewals)',
  'CUSTOM',
] as const;

interface AddComplianceRecordDialogProps {
  clients: Array<{ id: string; name: string; businessName: string | null }>;
}

export function AddComplianceRecordDialog({ clients }: AddComplianceRecordDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [clientId, setClientId] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [customName, setCustomName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  function resetForm() {
    setClientId('');
    setDocumentType('');
    setCustomName('');
    setExpiryDate('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) {
      toast.error('Please select a client');
      return;
    }
    if (!documentType || !expiryDate) {
      toast.error('Please select a document type and expiry date');
      return;
    }
    if (documentType === 'CUSTOM' && !customName.trim()) {
      toast.error('Please enter a custom document name');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('clientId', clientId);
      formData.append('documentType', documentType);
      if (documentType === 'CUSTOM' && customName.trim()) {
        formData.append('customName', customName.trim());
      }
      formData.append('expiryDate', expiryDate);

      const result = await addComplianceRecord(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Compliance record added');
        resetForm();
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1.5" /> Add Compliance Record
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Client Compliance Record</DialogTitle>
          <DialogDescription>
            Track an expiring certificate or statutory document for any client.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Client *</Label>
            <SearchableClientSelect
              clients={clients}
              value={clientId}
              onValueChange={setClientId}
              placeholder="Search and select client..."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Document Type *</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {COMPLIANCE_DOCUMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {documentType === 'CUSTOM' && (
            <div className="space-y-1.5">
              <Label>Custom Document Name *</Label>
              <Input
                placeholder="e.g. PSIRA Certificate, Industry License"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Expiry Date *</Label>
            <Input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Record'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
