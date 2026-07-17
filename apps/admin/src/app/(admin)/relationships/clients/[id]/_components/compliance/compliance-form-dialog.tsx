'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addComplianceRecord } from '@/app/actions/compliance';
import { toast } from 'sonner';

const DEFAULT_TYPES = [
  'SARS Tax Clearance PIN',
  'B-BBEE Affidavit / Certificate',
  'CIPC Annual Returns',
  'COIDA / Letter of Good Standing',
  'CIDB Registration (Annual & 3-Year Renewals)',
  'CUSTOM',
];

export function ComplianceFormDialog({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [documentType, setDocumentType] = useState('');
  const [customName, setCustomName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!documentType || !expiryDate) {
      toast.error('Please select a document type and expiry date');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('clientId', clientId);
      formData.append('documentType', documentType);
      if (customName) formData.append('customName', customName);
      formData.append('expiryDate', expiryDate);

      const result = await addComplianceRecord(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Compliance record added successfully');
        setDocumentType('');
        setCustomName('');
        setExpiryDate('');
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">Add Record</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Compliance Record</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Document Type</label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
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
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Expiry Date</label>
            <Input 
              type="date" 
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
          
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? 'Saving...' : 'Save Record'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
