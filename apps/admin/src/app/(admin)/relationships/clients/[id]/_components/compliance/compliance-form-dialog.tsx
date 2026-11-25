'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { addComplianceRecord, updateComplianceRecord } from '@/app/actions/compliance';
import { toast } from 'sonner';

const FALLBACK_DOCUMENT_TYPES = [
  'SARS Tax Clearance PIN',
  'B-BBEE Affidavit / Certificate',
  'CIPC Annual Returns',
  'COIDA / Letter of Good Standing',
  'CIDB Registration (Annual & 3-Year Renewals)',
  'CSD Registration Report',
  'NHBRC Certificate',
  'PSIRA Certificate',
  'Public Liability Insurance',
  'ISO 9001 Certificate',
  'Municipal Rates Clearance',
] as const;

export function ComplianceFormDialog({
  clientId,
  record,
  documentTypes,
}: {
  clientId: string;
  record?: any;
  documentTypes?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [documentType, setDocumentType] = useState(record?.documentType || '');
  const [customName, setCustomName] = useState(record?.customName || '');
  const [expiryDate, setExpiryDate] = useState(record?.expiryDate || '');

  const typeOptions = useMemo(() => {
    const base =
      documentTypes && documentTypes.length > 0 ? documentTypes : [...FALLBACK_DOCUMENT_TYPES];
    const list = base.filter((t) => t !== 'CUSTOM');
    if (
      record?.documentType &&
      record.documentType !== 'CUSTOM' &&
      !list.includes(record.documentType)
    ) {
      list.unshift(record.documentType);
    }
    return [...list, 'CUSTOM'];
  }, [documentTypes, record]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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

      let result;
      if (record) {
        result = await updateComplianceRecord(record.id, formData);
      } else {
        result = await addComplianceRecord(formData);
      }

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Compliance record ${record ? 'updated' : 'added'} successfully`);
        if (!record) {
          setDocumentType('');
          setCustomName('');
          setExpiryDate('');
        }
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {record ? (
          <Button variant="ghost" size="icon">
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button variant="default">Add Record</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{record ? 'Edit Compliance Record' : 'Add Compliance Record'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Document Type</label>
              <Link
                href="/settings/compliance"
                className="text-xs text-primary hover:underline"
                onClick={() => setOpen(false)}
              >
                Manage types
              </Link>
            </div>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {documentType === 'CUSTOM' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Custom Document Name</label>
              <Input
                placeholder="e.g. Industry License"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Saved automatically to your document types so you can reuse or edit it later.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Expiry Date</label>
            <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </div>

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? 'Saving...' : 'Save Record'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
