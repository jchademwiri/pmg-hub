'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { confirm } from '@/components/ui/confirm-dialog';
import { deleteSavingsGoal } from '@/app/actions/savings';

export function DeleteGoalButton({
  goalId,
  goalName,
  redirectTo,
}: {
  goalId: string;
  goalName: string;
  /** If set, navigate here after deleting (used from the goal detail page). */
  redirectTo?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  async function handleDelete() {
    const ok = await confirm({
      title: `Delete "${goalName}"?`,
      description: 'This removes the goal and its full contribution history. This cannot be undone.',
      confirmText: 'Delete goal',
      variant: 'destructive',
    });
    if (!ok) return;

    startTransition(async () => {
      const res = await deleteSavingsGoal(goalId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`"${goalName}" deleted.`);
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-destructive hover:text-destructive"
      onClick={handleDelete}
      disabled={isPending}
    >
      <Trash2 className="size-4" /> Delete
    </Button>
  );
}
