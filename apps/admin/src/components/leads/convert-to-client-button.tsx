'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { confirm } from '@/components/ui/confirm-dialog';
import { convertLeadToClient } from '@/app/actions/leads';

interface ConvertToClientButtonProps {
  leadId: string;
  leadStatus: string;
}

export function ConvertToClientButton({ leadId, leadStatus }: ConvertToClientButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (leadStatus === 'converted') {
    return (
      <Button className="w-full" variant="outline" disabled>
        Already Converted to Client
      </Button>
    );
  }

  const handleConvert = () => {
    confirm({
      title: 'Convert Lead to Client?',
      description: 'This will automatically create an active client profile using the contact details of this lead. This action cannot be undone.',
      confirmText: 'Convert',
      variant: 'default',
    }).then((confirmed) => {
      if (!confirmed) return;

      startTransition(async () => {
        const result = await convertLeadToClient(leadId);
        if (result.error) {
          toast.error(result.error);
        } else if (result.clientId) {
          toast.success('Lead successfully converted to client.');
          router.push(`/relationships/clients/${result.clientId}`);
        }
      });
    });
  };

  return (
    <Button 
      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
      onClick={handleConvert} 
      disabled={isPending}
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Converting...
        </>
      ) : (
        <>
          <UserPlus className="mr-2 h-4 w-4" />
          Convert to Client
        </>
      )}
    </Button>
  );
}
