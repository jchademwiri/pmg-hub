'use client';

import * as React from 'react';
import { Check, Pencil, Plus, Power, PowerOff, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { confirm } from '@/components/ui/confirm-dialog';
import {
  createComplianceDocumentType,
  updateComplianceDocumentType,
  toggleComplianceDocumentTypeActive,
  deleteComplianceDocumentType,
} from '@/app/actions/compliance';
import type { ComplianceDocumentTypeRow } from '@pmg/db';

interface ComplianceTypesManagerProps {
  initialTypes: ComplianceDocumentTypeRow[];
}

export function ComplianceTypesManager({ initialTypes }: ComplianceTypesManagerProps) {
  const [types, setTypes] = React.useState(initialTypes);
  const [isAdding, setIsAdding] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState('');
  const [isSaving, startTransition] = React.useTransition();

  React.useEffect(() => {
    setTypes(initialTypes);
  }, [initialTypes]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('name', newName.trim());
      const res = await createComplianceDocumentType(fd);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Compliance document type added');
        setNewName('');
        setIsAdding(false);
      }
    });
  };

  const handleRename = (item: ComplianceDocumentTypeRow) => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    if (trimmed === item.name) {
      setEditingId(null);
      return;
    }

    const execute = () => {
      startTransition(async () => {
        const fd = new FormData();
        fd.set('name', trimmed);
        const res = await updateComplianceDocumentType(item.id, fd);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success('Document type renamed');
          setEditingId(null);
        }
      });
    };

    if (item.usageCount === 0) {
      execute();
      return;
    }

    confirm({
      title: 'Rename Compliance Document Type?',
      description: `Renaming "${item.name}" to "${trimmed}" will also update ${item.usageCount} existing client compliance record${item.usageCount === 1 ? '' : 's'}.`,
      confirmText: 'Rename',
    }).then((ok) => {
      if (ok) execute();
    });
  };

  const handleToggleActive = (item: ComplianceDocumentTypeRow) => {
    startTransition(async () => {
      const res = await toggleComplianceDocumentTypeActive(item.id, !item.isActive);
      if (res.error) toast.error(res.error);
      else toast.success(item.isActive ? 'Document type disabled' : 'Document type enabled');
    });
  };

  const handleDelete = (item: ComplianceDocumentTypeRow) => {
    confirm({
      title: `Delete "${item.name}"?`,
      description: 'This removes the document type from all compliance dropdowns.',
      confirmText: 'Delete',
      variant: 'destructive',
    }).then((ok) => {
      if (!ok) return;
      startTransition(async () => {
        const res = await deleteComplianceDocumentType(item.id);
        if (res.error) toast.error(res.error);
        else toast.success('Document type deleted');
      });
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Compliance Document Types</h2>
          <p className="text-sm text-muted-foreground">
            Manage predefined certificates &amp; statutory documents available across Admin and the
            Client Portal. Any new custom document added on Compliance Radar is also saved here
            automatically.
          </p>
        </div>
        <Button
          onClick={() => setIsAdding(true)}
          disabled={isSaving}
          size="sm"
          className="shrink-0"
        >
          <Plus className="h-4 w-4 mr-1.5" /> Add Document Type
        </Button>
      </div>

      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Compliance Document Type</DialogTitle>
            <DialogDescription>
              Add a reusable certificate or compliance document name for all clients.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Document Name <span className="text-destructive">*</span>
              </label>
              <Input
                autoFocus
                placeholder="e.g. CSD Registration Report, NHBRC Certificate"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                disabled={isSaving}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAdding(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!newName.trim() || isSaving}>
                {isSaving ? 'Adding…' : 'Add Type'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document Name</TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
              <TableHead className="w-[100px] text-right">In Use</TableHead>
              <TableHead className="w-[150px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {types.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No compliance document types configured yet.
                </TableCell>
              </TableRow>
            ) : (
              types.map((item) => (
                <TableRow key={item.id} className={!item.isActive ? 'opacity-60' : ''}>
                  <TableCell>
                    {editingId === item.id ? (
                      <Input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRename(item)}
                        disabled={isSaving}
                      />
                    ) : (
                      <span className="font-medium text-sm">{item.name}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.isActive ? 'secondary' : 'outline'} className="text-xs">
                      {item.isActive ? 'Active' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums">
                    {item.usageCount}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === item.id ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          onClick={() => handleRename(item)}
                          disabled={!editName.trim() || isSaving}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(null)}
                          disabled={isSaving}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Rename"
                          onClick={() => {
                            setEditingId(item.id);
                            setEditName(item.name);
                          }}
                          disabled={isSaving}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={item.isActive ? 'Disable' : 'Enable'}
                          onClick={() => handleToggleActive(item)}
                          disabled={isSaving}
                        >
                          {item.isActive ? (
                            <PowerOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Power className="h-4 w-4 text-emerald-600" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={
                            item.usageCount > 0
                              ? 'In use by client records (disable or rename instead)'
                              : 'Delete'
                          }
                          onClick={() => handleDelete(item)}
                          disabled={isSaving || item.usageCount > 0}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
