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

interface CategoryListProps {
  initialCategories: { id: string; name: string }[];
}

export function CategoryList({ initialCategories }: CategoryListProps) {
  const [categories, setCategories] = React.useState(initialCategories);
  const [isAdding, setIsAdding] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState('');
  const [isSaving, startTransition] = React.useTransition();

  React.useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('name', newName.trim());
      const res = await createExpenseCategory(fd);
      if (res.error) toast.error(res.error);
      else {
        toast.success('Category created');
        setNewName('');
        setIsAdding(false);
      }
    });
  };

  const handleUpdate = (id: string, oldName: string) => {
    if (!editName.trim()) return;
    if (oldName === editName.trim()) {
      setEditingId(null);
      return;
    }
    confirm({
      title: 'Modify Category Name?',
      description: 'Renaming this category will update all historical expenses linked to it. Future auto-postings might also use a different general ledger account if the category keywords are affected.',
      confirmText: 'Rename',
      variant: 'destructive',
    }).then((confirmed) => {
      if (!confirmed) return;
      startTransition(async () => {
        const fd = new FormData();
        fd.set('name', editName.trim());
        const res = await updateExpenseCategory(id, fd);
        if (res.error) toast.error(res.error);
        else {
          toast.success('Category updated');
          setEditingId(null);
        }
      });
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
          <p className="text-sm text-muted-foreground">Manage expense allocation categories and items</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsAdding(true)} disabled={isAdding || isSaving} size="sm">
            <Plus className="h-4 w-4 mr-2" /> Add Category
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category Name</TableHead>
            <TableHead className="w-[150px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isAdding && (
            <TableRow className="bg-muted/30">
              <TableCell>
                <Input
                  autoFocus
                  placeholder="New category name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  disabled={isSaving}
                />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button size="sm" onClick={handleCreate} disabled={!newName.trim() || isSaving}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsAdding(false);
                      setNewName('');
                    }}
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}

          {categories.length === 0 && !isAdding ? (
            <TableRow>
              <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
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
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdate(c.id, c.name)}
                      disabled={isSaving}
                    />
                  ) : (
                    c.name
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {editingId === c.id ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(c.id, c.name)}
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
