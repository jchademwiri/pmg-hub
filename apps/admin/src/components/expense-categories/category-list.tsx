'use client';

import * as React from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
} from '@/app/actions/expense-categories';
import { confirm } from '@/components/ui/confirm-dialog';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export interface CategoryListItem {
  id: string;
  name: string;
  chartAccountId?: string | null;
  chartAccountCode?: string | null;
  chartAccountName?: string | null;
}

export interface ExpenseAccountOption {
  id: string;
  code: string;
  name: string;
}

interface CategoryListProps {
  initialCategories: CategoryListItem[];
  expenseAccounts?: ExpenseAccountOption[];
}

export function CategoryList({ initialCategories, expenseAccounts = [] }: CategoryListProps) {
  const [categories, setCategories] = React.useState(initialCategories);
  const [isAdding, setIsAdding] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newChartAccountId, setNewChartAccountId] = React.useState<string>('auto');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editChartAccountId, setEditChartAccountId] = React.useState<string>('auto');
  const [isSaving, startTransition] = React.useTransition();

  React.useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('name', newName.trim());
      fd.set('chartAccountId', newChartAccountId === 'auto' ? '' : newChartAccountId);
      const res = await createExpenseCategory(fd);
      if (res.error) toast.error(res.error);
      else {
        toast.success('Category created');
        setNewName('');
        setNewChartAccountId('auto');
        setIsAdding(false);
      }
    });
  };

  const handleUpdate = (c: CategoryListItem) => {
    if (!editName.trim()) return;
    const nextChartAccountId = editChartAccountId === 'auto' ? null : editChartAccountId;
    const nameChanged = c.name !== editName.trim();
    const accountChanged = (c.chartAccountId ?? null) !== nextChartAccountId;

    if (!nameChanged && !accountChanged) {
      setEditingId(null);
      return;
    }

    const executeUpdate = () => {
      startTransition(async () => {
        const fd = new FormData();
        fd.set('name', editName.trim());
        fd.set('chartAccountId', nextChartAccountId ?? '');
        const res = await updateExpenseCategory(c.id, fd);
        if (res.error) toast.error(res.error);
        else {
          toast.success('Category updated');
          setEditingId(null);
        }
      });
    };

    if (!nameChanged) {
      executeUpdate();
      return;
    }

    confirm({
      title: 'Modify Category Name?',
      description:
        'Renaming this category will update all historical expenses linked to it. Future auto-postings will use the selected General Ledger account.',
      confirmText: 'Rename',
      variant: 'destructive',
    }).then((confirmed) => {
      if (!confirmed) return;
      executeUpdate();
    });
  };

  const handleDelete = (id: string, name: string) => {
    confirm({
      title: `Delete "${name}"?`,
      description: 'Are you sure you want to delete this category? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    }).then((confirmed) => {
      if (!confirmed) return;
      startTransition(async () => {
        const res = await deleteExpenseCategory(id);
        if (res.error) toast.error(res.error);
        else toast.success('Category deleted');
      });
    });
  };

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Expense Categories</h2>
          <p className="text-sm text-muted-foreground">
            Manage expense allocation categories and items
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsAdding(true)} disabled={isSaving} size="sm">
            <Plus className="h-4 w-4 mr-2" /> Add Category
          </Button>

          <Dialog open={isAdding} onOpenChange={setIsAdding}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Expense Category</DialogTitle>
                <DialogDescription>
                  Create a new financial allocation category for categorizing business expenses.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4 mt-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Category Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    autoFocus
                    placeholder="e.g. Software & Subscriptions"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    disabled={isSaving}
                  />
                </div>

                {expenseAccounts.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      GL Expense Account (5xxx)
                    </label>
                    <Select
                      value={newChartAccountId}
                      onValueChange={setNewChartAccountId}
                      disabled={isSaving}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Auto-match by category name" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto-match by keyword</SelectItem>
                        {expenseAccounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.code} · {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <DialogFooter className="mt-2">
                  <Button variant="outline" onClick={() => setIsAdding(false)} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={!newName.trim() || isSaving}>
                    {isSaving ? 'Creating…' : 'Create Category'}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category Name</TableHead>
            <TableHead>GL Account</TableHead>
            <TableHead className="w-[150px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.length === 0 && !isAdding ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                No categories found. Add one to get started.
              </TableCell>
            </TableRow>
          ) : (
            categories.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  {editingId === c.id ? (
                    <Input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdate(c)}
                      disabled={isSaving}
                    />
                  ) : (
                    c.name
                  )}
                </TableCell>
                <TableCell>
                  {editingId === c.id ? (
                    <Select
                      value={editChartAccountId}
                      onValueChange={setEditChartAccountId}
                      disabled={isSaving}
                    >
                      <SelectTrigger className="w-[260px]">
                        <SelectValue placeholder="Auto-match by keyword" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto-match by keyword</SelectItem>
                        {expenseAccounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.code} · {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : c.chartAccountCode ? (
                    <Badge variant="secondary" className="font-mono text-xs font-normal">
                      {c.chartAccountCode} · {c.chartAccountName}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Auto-match</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {editingId === c.id ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(c)}
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
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingId(c.id);
                          setEditName(c.name);
                          setEditChartAccountId(c.chartAccountId ?? 'auto');
                        }}
                        disabled={isSaving}
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(c.id, c.name)}
                        disabled={isSaving}
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
  );
}
