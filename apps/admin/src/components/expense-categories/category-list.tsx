'use client'

import * as React from 'react'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createCategory, updateCategory, deleteCategory } from '@/app/actions/expense-categories'

interface CategoryListProps {
  initialCategories: { id: string; name: string }[]
}

export function CategoryList({ initialCategories }: CategoryListProps) {
  const [categories, setCategories] = React.useState(initialCategories)
  const [isAdding, setIsAdding] = React.useState(false)
  const [newName, setNewName] = React.useState('')
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editName, setEditName] = React.useState('')
  const [isSaving, startTransition] = React.useTransition()

  React.useEffect(() => {
    setCategories(initialCategories)
  }, [initialCategories])

  const handleCreate = () => {
    if (!newName.trim()) return
    startTransition(async () => {
      const fd = new FormData()
      fd.set('name', newName.trim())
      const res = await createCategory(fd)
      if (res.error) toast.error(res.error)
      else {
        toast.success('Category created')
        setNewName('')
        setIsAdding(false)
      }
    })
  }

  const handleUpdate = (id: string) => {
    if (!editName.trim()) return
    startTransition(async () => {
      const fd = new FormData()
      fd.set('name', editName.trim())
      const res = await updateCategory(id, fd)
      if (res.error) toast.error(res.error)
      else {
        toast.success('Category updated')
        setEditingId(null)
      }
    })
  }

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return
    startTransition(async () => {
      const res = await deleteCategory(id)
      if (res.error) toast.error(res.error)
      else toast.success('Category deleted')
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
        <h2 className="text-lg font-medium">Manage Categories</h2>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding || isSaving}>
          <Plus className="h-4 w-4 mr-2" /> Add Category
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
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
                    <Button size="sm" variant="outline" onClick={() => { setIsAdding(false); setNewName(''); }} disabled={isSaving}>
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
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdate(c.id)}
                        disabled={isSaving}
                      />
                    ) : (
                      c.name
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === c.id ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={() => handleUpdate(c.id)} disabled={!editName.trim() || isSaving}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)} disabled={isSaving}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingId(c.id); setEditName(c.name); }} disabled={isSaving}>
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id, c.name)} disabled={isSaving}>
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
  )
}
