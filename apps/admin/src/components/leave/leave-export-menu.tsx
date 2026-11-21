'use client';

import * as React from 'react';
import { ChevronDown, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { LeaveEntry } from '@pmg/db';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  getAvailableLeaveFinancialYears,
  getFYEndYearForDate,
  type LeaveReportScope,
} from '@/lib/leave';

interface LeaveExportMenuProps {
  entries: LeaveEntry[];
  todayDate: string;
}

export function LeaveExportMenu({ entries, todayDate }: LeaveExportMenuProps) {
  const availableFYs = React.useMemo(
    () => getAvailableLeaveFinancialYears(entries, todayDate),
    [entries, todayDate],
  );
  const [selectedFyEndYear, setSelectedFyEndYear] = React.useState<number>(() =>
    getFYEndYearForDate(todayDate),
  );

  const selectedFy =
    availableFYs.find((fy) => fy.fyEndYear === selectedFyEndYear) ?? availableFYs[0]!;

  const triggerDownload = (format: 'pdf' | 'csv', scope: LeaveReportScope) => {
    const params = new URLSearchParams({
      format,
      scope,
      fy: String(selectedFy.fyEndYear),
    });
    const url = `/api/leave/export?${params.toString()}`;
    const link = document.createElement('a');
    link.href = url;
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();

    toast.success(
      `Downloading ${selectedFy.label} ${format.toUpperCase()} (${
        scope === 'taken' ? 'Taken Only' : 'Full Statement'
      })...`,
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="size-4" />
          <span>Export</span>
          <ChevronDown className="size-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-xs font-semibold flex items-center justify-between">
          <span>{selectedFy.label} Statement</span>
          <span className="text-[10px] font-normal text-muted-foreground">Mar–Feb</span>
        </DropdownMenuLabel>

        {availableFYs.length > 1 && (
          <>
            <div className="px-2 py-1.5 flex flex-wrap gap-1">
              {availableFYs.map((fy) => (
                <button
                  key={fy.fyEndYear}
                  type="button"
                  onClick={() => setSelectedFyEndYear(fy.fyEndYear)}
                  className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                    fy.fyEndYear === selectedFy.fyEndYear
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {fy.label}
                </button>
              ))}
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem
          onSelect={() => triggerDownload('pdf', 'all')}
          className="gap-2 cursor-pointer text-xs"
        >
          <FileText className="size-4 text-rose-500 shrink-0" />
          <div className="flex flex-col">
            <span className="font-medium">PDF — Full Statement</span>
            <span className="text-[10px] text-muted-foreground">
              Balances + taken &amp; planned logs
            </span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={() => triggerDownload('pdf', 'taken')}
          className="gap-2 cursor-pointer text-xs"
        >
          <FileText className="size-4 text-amber-500 shrink-0" />
          <div className="flex flex-col">
            <span className="font-medium">PDF — Taken Leave Only</span>
            <span className="text-[10px] text-muted-foreground">
              HR reconciliation (completed days)
            </span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={() => triggerDownload('csv', 'all')}
          className="gap-2 cursor-pointer text-xs"
        >
          <FileSpreadsheet className="size-4 text-emerald-500 shrink-0" />
          <div className="flex flex-col">
            <span className="font-medium">CSV — Full History</span>
            <span className="text-[10px] text-muted-foreground">Excel / Google Sheets</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={() => triggerDownload('csv', 'taken')}
          className="gap-2 cursor-pointer text-xs"
        >
          <FileSpreadsheet className="size-4 text-sky-500 shrink-0" />
          <div className="flex flex-col">
            <span className="font-medium">CSV — Taken Leave Only</span>
            <span className="text-[10px] text-muted-foreground">Completed leave days only</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
