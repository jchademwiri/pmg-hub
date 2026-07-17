'use client';

import { useState, useTransition } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addClientComplianceRecord, updateClientComplianceRecord, deleteClientComplianceRecord } from '@/app/actions/compliance';

const DEFAULT_TYPES = [
  'SARS Tax Clearance PIN',
  'B-BBEE Affidavit / Certificate',
  'CIPC Annual Returns',
  'COIDA / Letter of Good Standing',
  'CIDB Registration (Annual & 3-Year Renewals)',
  'CUSTOM',
];

export function ComplianceClient({ records }: { records: any[] }) {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [documentType, setDocumentType] = useState('');
  const [customName, setCustomName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const today = new Date();

  function handleOpenAdd() {
    setEditId(null);
    setDocumentType('');
    setCustomName('');
    setExpiryDate('');
    setOpen(true);
  }

  function handleOpenEdit(record: any) {
    setEditId(record.id);
    setDocumentType(record.documentType);
    setCustomName(record.customName || '');
    setExpiryDate(record.expiryDate);
    setOpen(true);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!documentType || !expiryDate) {
      toast.error('Please select a document type and expiry date');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('documentType', documentType);
      if (customName) formData.append('customName', customName);
      formData.append('expiryDate', expiryDate);

      let result;
      if (editId) {
        result = await updateClientComplianceRecord(editId, formData);
      } else {
        result = await addClientComplianceRecord(formData);
      }

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Compliance document ${editId ? 'updated' : 'added'} successfully`);
        setDocumentType('');
        setCustomName('');
        setExpiryDate('');
        setEditId(null);
        setOpen(false);
      }
    });
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to remove this tracking record?')) {
      startTransition(async () => {
        const result = await deleteClientComplianceRecord(id);
        if (result.error) toast.error(result.error);
        else toast.success('Record removed');
      });
    }
  };


  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-8">
      {/* Header and Add Button in the same row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Compliance Documents</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage and track the expiry dates of your important business documents.</p>
        </div>
        <Button variant="default" onClick={handleOpenAdd}>Add Document</Button>
      </div>
      
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" className="w-full max-w-[425px] bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-xl relative" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-6">
              {editId ? 'Edit Compliance Document' : 'Add Compliance Document'}
            </h2>
            <button type="button" onClick={() => setOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Document Type</label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger className="bg-slate-950 border-slate-800">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    {DEFAULT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {documentType === 'CUSTOM' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-200">Custom Document Name</label>
                  <Input 
                    className="bg-slate-950 border-slate-800 text-slate-200" 
                    placeholder="e.g. Industry License" 
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Expiry Date</label>
                <Input 
                  type="date" 
                  className="bg-slate-950 border-slate-800 text-slate-200" 
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
              
              <Button type="submit" disabled={isPending} className="w-full mt-4">
                {isPending ? 'Saving...' : (editId ? 'Update Document' : 'Save Document')}
              </Button>
            </form>
          </div>
        </div>
      )}

      <div>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/10 hover:bg-transparent">
              <TableHead className="text-muted-foreground font-semibold h-12">Document</TableHead>
              <TableHead className="text-muted-foreground font-semibold h-12">Expiry Date</TableHead>
              <TableHead className="text-muted-foreground font-semibold h-12">Status</TableHead>
              <TableHead className="w-[100px] h-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 && (
              <TableRow className="border-b border-white/10 hover:bg-transparent">
                <TableCell colSpan={4} className="text-center text-muted-foreground h-32">
                  No compliance documents found. Add one to get automated reminders.
                </TableCell>
              </TableRow>
            )}
            {records.map((record) => {
              const expiryDateObj = new Date(`${record.expiryDate}T00:00:00`);
              
              // Calculate difference in calendar days
              const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const expiryMidnight = new Date(expiryDateObj.getFullYear(), expiryDateObj.getMonth(), expiryDateObj.getDate());
              const daysLeft = Math.round((expiryMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
              
              let badgeClassName = "bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20";
              let statusText = `${daysLeft} days left`;
              
              if (daysLeft < 0) {
                badgeClassName = "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20";
                statusText = "Expired";
              } else if (daysLeft <= 30) {
                badgeClassName = "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20";
                statusText = `Expiring (${daysLeft} days)`;
              }

              return (
                <TableRow key={record.id} className="border-b border-white/10 hover:bg-white/[0.02]">
                  <TableCell className="font-medium text-slate-200 py-4">
                    {record.documentType === 'CUSTOM' ? record.customName : record.documentType}
                  </TableCell>
                  <TableCell className="text-slate-300 py-4">{formatDate(expiryDateObj)}</TableCell>
                  <TableCell className="py-4">
                    <Badge variant="outline" className={badgeClassName}>{statusText}</Badge>
                  </TableCell>
                  <TableCell className="text-right py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="icon" className="bg-slate-900 border-slate-700 hover:bg-slate-800" disabled={isPending} onClick={() => handleOpenEdit(record)}>
                        <Pencil className="size-4 text-slate-300 hover:text-blue-400" />
                      </Button>
                      <Button variant="outline" size="icon" className="bg-slate-900 border-slate-700 hover:bg-slate-800" disabled={isPending} onClick={() => handleDelete(record.id)}>
                        <Trash2 className="size-4 text-slate-300 hover:text-red-400" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
