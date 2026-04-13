'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Pencil, X, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  updateUserRole,
  revokeUser,
  updateUserName,
  reactivateUser,
  deleteUser,
} from '@/app/actions/users';
import { confirm } from '@/components/ui/confirm-dialog';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

const ROLES = ['super_admin', 'admin', 'viewer'] as const;
type Role = (typeof ROLES)[number];

function roleBadgeVariant(role: string): 'destructive' | 'default' | 'secondary' | 'outline' {
  if (role === 'super_admin') return 'destructive';
  if (role === 'admin') return 'default';
  return 'secondary';
}

function roleLabel(role: string): string {
  if (role === 'super_admin') return 'Super Admin';
  if (role === 'admin') return 'Admin';
  return 'Viewer';
}

function UserTableRow({ user }: { user: UserRow }) {
  const [isRoleChanging, startRoleTransition] = React.useTransition();
  const [isRevoking, startRevokeTransition] = React.useTransition();
  const [isReactivating, startReactivateTransition] = React.useTransition();
  const [isDeleting, startDeleteTransition] = React.useTransition();
  const [isNameSaving, startNameTransition] = React.useTransition();

  const [editingName, setEditingName] = React.useState(false);
  const [nameValue, setNameValue] = React.useState(user.name);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editingName) inputRef.current?.focus();
  }, [editingName]);

  function handleRoleChange(newRole: Role) {
    startRoleTransition(async () => {
      const fd = new FormData();
      fd.set('role', newRole);
      const result = await updateUserRole(user.id, fd);
      if (result.error) toast.error(result.error);
      else toast.success('Role updated');
    });
  }

  function handleRevoke() {
    startRevokeTransition(async () => {
      const result = await revokeUser(user.id);
      if (result.error) toast.error(result.error);
      else toast.success('User revoked');
    });
  }

  function handleReactivate() {
    startReactivateTransition(async () => {
      const result = await reactivateUser(user.id);
      if (result.error) toast.error(result.error);
      else toast.success('User reactivated');
    });
  }

  function handleDelete() {
    confirm({
      title: 'Permanently Delete User',
      description: `Are you sure you want to permanently delete ${user.name}? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'destructive',
    }).then((confirmed) => {
      if (!confirmed) return;
      startDeleteTransition(async () => {
        const result = await deleteUser(user.id);
        if (result.error) toast.error(result.error);
        else toast.success('User deleted');
      });
    });
  }

  function handleNameSave() {
    startNameTransition(async () => {
      const fd = new FormData();
      fd.set('name', nameValue);
      const result = await updateUserName(user.id, fd);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Name updated');
        setEditingName(false);
      }
    });
  }

  function handleNameCancel() {
    setNameValue(user.name);
    setEditingName(false);
  }

  function handleNameKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleNameSave();
    if (e.key === 'Escape') handleNameCancel();
  }

  return (
    <TableRow>
      <TableCell className="font-medium">
        {editingName ? (
          <div className="flex items-center gap-1">
            <Input
              ref={inputRef}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={handleNameKeyDown}
              className="h-7 w-36 text-sm px-2"
              disabled={isNameSaving}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-green-500 hover:text-green-400"
              onClick={handleNameSave}
              disabled={isNameSaving}
            >
              <Check className="size-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground"
              onClick={handleNameCancel}
              disabled={isNameSaving}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 group">
            <span>{nameValue}</span>
            <button
              onClick={() => setEditingName(true)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
              aria-label="Edit name"
            >
              <Pencil className="size-3" />
            </button>
          </div>
        )}
      </TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell>
        <Badge variant={roleBadgeVariant(user.role)}>{roleLabel(user.role)}</Badge>
      </TableCell>
      <TableCell>
        {user.isActive ? (
          <Badge variant="default" className="bg-green-600 text-white hover:bg-green-700">
            Active
          </Badge>
        ) : (
          <Badge variant="secondary">Inactive</Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {user.isActive ? (
            <>
              <Select
                defaultValue={user.role}
                onValueChange={(v) => handleRoleChange(v as Role)}
                disabled={isRoleChanging}
              >
                <SelectTrigger className="w-36 leading-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="destructive" size="sm" onClick={handleRevoke} disabled={isRevoking}>
                {isRevoking ? 'Revoking…' : 'Revoke'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReactivate}
                disabled={isReactivating}
                className="w-[144px]"
              >
                {isReactivating ? 'Reactivating…' : 'Reactivate'}
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting…' : 'Delete'}
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

interface UserTableProps {
  users: UserRow[];
}

export function UserTable({ users }: UserTableProps) {
  if (users.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No users found.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <UserTableRow key={user.id} user={user} />
        ))}
      </TableBody>
    </Table>
  );
}
