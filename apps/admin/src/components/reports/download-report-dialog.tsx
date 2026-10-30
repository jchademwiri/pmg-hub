'use client';

import * as React from 'react';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ReportModuleType = 'invoices' | 'payments' | 'expenses';

export interface ReportClientOption {
  id: string;
  name: string;
  businessName?: string | null;
}

export interface ReportDivisionOption {
  id: string;
  name: string;
}

export interface DownloadReportDialogProps {
  defaultReportType: ReportModuleType;
  clients?: ReportClientOption[];
  divisions?: ReportDivisionOption[];
  categories?: string[];
  initialClientId?: string;
  initialDivisionId?: string;
  initialStatus?: string;
  initialCategory?: string;
  triggerLabel?: string;
  triggerVariant?: 'default' | 'outline' | 'secondary' | 'ghost';
  triggerSize?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function DownloadReportDialog({
  defaultReportType,
  initialClientId,
  initialDivisionId,
  initialStatus,
  initialCategory,
  triggerLabel = 'Report',
  triggerVariant = 'outline',
  triggerSize = 'sm',
  className,
}: DownloadReportDialogProps) {
  const params = new URLSearchParams();
  params.set('type', defaultReportType);
  if (initialClientId && initialClientId !== 'all') params.set('clientId', initialClientId);
  if (initialDivisionId && initialDivisionId !== 'all') params.set('divisionId', initialDivisionId);
  if (defaultReportType === 'invoices' && initialStatus && initialStatus !== 'all_active') {
    params.set('status', initialStatus);
  }
  if (defaultReportType === 'expenses' && initialCategory && initialCategory !== 'all') {
    params.set('category', initialCategory);
  }

  const href = `/billing/reports?${params.toString()}`;

  return (
    <Button asChild variant={triggerVariant} size={triggerSize} className={className}>
      <Link href={href}>
        <FileText className="size-4 mr-1.5" />
        {triggerLabel}
      </Link>
    </Button>
  );
}
