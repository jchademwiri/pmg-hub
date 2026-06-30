'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  ListTodo,
  CheckCircle2,
  CalendarDays,
  List,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ProjectScheduleEntry } from '@pmg/db';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProjectsListClientProps {
  projects: ProjectScheduleEntry[];
  progressMap: Record<string, { total: number; completed: number }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a);
  const db = new Date(b);
  return Math.ceil((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  planned: {
    label: 'Planned',
    className: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  completed: {
    label: 'Completed',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  submitted: {
    label: 'Submitted',
    className: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function ProjectsListClient({ projects, progressMap }: ProjectsListClientProps) {
  const router = useRouter();

  // Summary Calculations
  const total = projects.length;
  const inProgress = projects.filter((p) => p.status === 'in_progress').length;
  const completed = projects.filter((p) => p.status === 'completed' || p.status === 'submitted').length;

  const upcomingDeadlines = projects
    .filter((p) => p.status !== 'completed' && p.status !== 'submitted')
    .sort((a, b) => a.closingDate.localeCompare(b.closingDate));
  
  const nextDeadline = upcomingDeadlines[0];

  // ── Timeline Math ───────────────────────────────────────────────────────────
  const { timelineDays, minDate, totalDays } = React.useMemo(() => {
    if (projects.length === 0) return { timelineDays: [], minDate: new Date(), totalDays: 0 };

    // Find min and max dates
    const startDates = projects.map((p) => new Date(p.startDate).getTime());
    const closingDates = projects.map((p) => new Date(p.closingDate).getTime());
    const minTime = Math.min(...startDates);
    const maxTime = Math.max(...closingDates);

    const start = new Date(minTime);
    start.setDate(start.getDate() - 5); // 5 days buffer at start

    const end = new Date(maxTime);
    end.setDate(end.getDate() + 5); // 5 days buffer at end

    const total = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // Generate days for grid columns (weekly intervals)
    const days: Date[] = [];
    const current = new Date(start);
    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 7); // weekly grid
    }

    return { timelineDays: days, minDate: start, totalDays: total };
  }, [projects]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#0a0f1d] border-white/5 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Projects
            </CardTitle>
            <ListTodo className="size-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{total}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0f1d] border-white/5 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              In Progress
            </CardTitle>
            <Clock className="size-4 text-sky-400 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{inProgress}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0f1d] border-white/5 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Completed
            </CardTitle>
            <CheckCircle2 className="size-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{completed}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0f1d] border-white/5 shadow-md md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-sans">
              Next Deadline
            </CardTitle>
            <Calendar className="size-4 text-red-400" />
          </CardHeader>
          <CardContent>
            {nextDeadline ? (
              <div className="truncate">
                <div className="text-sm font-bold text-white truncate">
                  {nextDeadline.projectReference}
                </div>
                <div className="text-[11px] text-red-400 font-medium mt-0.5">
                  {formatDate(nextDeadline.closingDate)}
                </div>
              </div>
            ) : (
              <div className="text-sm font-medium text-muted-foreground">No pending deadlines</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Workspace Tabs */}
      <Tabs defaultValue="list" className="w-full">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <TabsList className="bg-[#0a0f1d] border border-white/5 p-1">
            <TabsTrigger value="list" className="gap-1.5 text-xs data-state=active:bg-blue-500/10 data-state=active:text-blue-400 cursor-pointer">
              <List className="size-3.5" /> List View
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1.5 text-xs data-state=active:bg-blue-500/10 data-state=active:text-blue-400 cursor-pointer">
              <CalendarDays className="size-3.5" /> Timeline
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Project List View */}
        <TabsContent value="list" className="mt-4 outline-none">
          {projects.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/5 rounded-lg text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
              <ListTodo className="size-8 text-muted-foreground/30" />
              <span>No active projects found.</span>
            </div>
          ) : (
            <div className="rounded-lg border border-white/5 bg-[#0a0f1d] overflow-hidden shadow-md">
              <Table>
                <TableHeader className="bg-[#080c14]/50 border-b border-white/5">
                  <TableRow>
                    <TableHead className="text-muted-foreground font-semibold">Project Reference</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Status</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Task Progress</TableHead>
                    <TableHead className="hidden md:table-cell text-muted-foreground font-semibold">Working Window</TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-right">Deadline</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((p) => {
                    const progress = progressMap[p.id] || { total: 0, completed: 0 };
                    const percent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
                    const status = STATUS_CONFIG[p.status] || { label: p.status, className: '' };

                    return (
                      <TableRow
                        key={p.id}
                        onClick={() => router.push(`/projects/${p.id}`)}
                        className="cursor-pointer hover:bg-white/[0.02] border-b border-white/5 transition-colors group"
                      >
                        <TableCell className="font-medium text-white group-hover:text-blue-400 transition-colors">
                          <div>{p.projectReference}</div>
                          {p.description && (
                            <div className="text-xs text-muted-foreground font-normal line-clamp-1 mt-0.5 max-w-md">
                              {p.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 ${status.className}`}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {progress.total > 0 ? (
                            <div className="flex flex-col gap-1 w-32">
                              <span className="text-[10px] font-medium text-muted-foreground leading-none">
                                {percent}% ({progress.completed}/{progress.total})
                              </span>
                              <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-full rounded-full shadow-[0_0_6px_rgba(16,185,129,0.3)]"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground font-medium">
                          {formatDate(p.startDate)} → {formatDate(p.targetCompletionDate)}
                        </TableCell>
                        <TableCell className="text-xs text-right text-muted-foreground font-semibold">
                          {formatDate(p.closingDate)}
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="size-4 text-muted-foreground/30 group-hover:text-blue-400 transition-colors" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Timeline View */}
        <TabsContent value="timeline" className="mt-4 outline-none">
          {projects.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/5 rounded-lg text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
              <CalendarDays className="size-8 text-muted-foreground/30" />
              <span>No active timelines found.</span>
            </div>
          ) : (
            <Card className="bg-[#0a0f1d] border-white/5 shadow-md">
              <CardContent className="p-0 relative overflow-hidden">
                {/* Horizontal Scroll Area */}
                <div className="overflow-x-auto min-w-full pb-4">
                  <div className="min-w-[800px] relative p-6">
                    {/* Time Grid Header */}
                    <div className="flex border-b border-white/5 pb-2 mb-4 relative z-10 select-none">
                      <div className="w-48 shrink-0 font-semibold text-xs text-muted-foreground">Project</div>
                      <div className="flex-1 flex text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {timelineDays.map((day, idx) => (
                          <div
                            key={idx}
                            className="flex-1 border-l border-white/5 pl-2 truncate"
                          >
                            {day.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Timeline Rows */}
                    <div className="space-y-4 relative z-10">
                      {projects.map((entry) => {
                        const startOffset = daysBetween(
                          minDate.toISOString().split('T')[0],
                          entry.startDate,
                        );
                        const workDays = daysBetween(entry.startDate, entry.targetCompletionDate);
                        const status = STATUS_CONFIG[entry.status] || { label: entry.status, className: '' };
                        const progress = progressMap[entry.id] || { total: 0, completed: 0 };
                        const percent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

                        // Calculate Gantt bar colors
                        let barColor = 'bg-sky-500/20 border-sky-500/40 hover:bg-sky-500/30';
                        if (entry.status === 'in_progress') {
                          barColor = 'bg-blue-600/30 border-blue-500/50 hover:bg-blue-600/45';
                        } else if (entry.status === 'completed' || entry.status === 'submitted') {
                          barColor = 'bg-emerald-500/25 border-emerald-500/40 hover:bg-emerald-500/35';
                        }

                        return (
                          <div
                            key={entry.id}
                            onClick={() => router.push(`/projects/${entry.id}`)}
                            className="flex items-center hover:bg-white/[0.01] py-1.5 rounded-lg transition-all cursor-pointer group"
                          >
                            {/* Project label */}
                            <div className="w-48 shrink-0 pr-4 min-w-0">
                              <p className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                                {entry.projectReference}
                              </p>
                              {progress.total > 0 && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {percent}% Complete
                                </p>
                              )}
                            </div>

                            {/* Gantt row track */}
                            <div className="flex-1 relative h-6 bg-white/[0.01] border border-white/[0.03] rounded-md overflow-hidden">
                              {/* Background grid lines */}
                              <div className="absolute inset-0 flex">
                                {timelineDays.map((_, idx) => (
                                  <div key={idx} className="flex-1 border-l border-white/[0.03]" />
                                ))}
                              </div>

                              {/* Scheduled progress bar */}
                              <div
                                className={`absolute top-0.5 h-5 rounded-md border transition-all shadow-[0_2px_8px_rgba(0,0,0,0.2)] flex items-center justify-end pr-2 ${barColor}`}
                                style={{
                                  left: `${(startOffset / totalDays) * 100}%`,
                                  width: `${(workDays / totalDays) * 100}%`,
                                  minWidth: '6px',
                                }}
                              >
                                {percent > 0 && (
                                  <span className="text-[9px] font-bold text-white/90 select-none hidden sm:inline">
                                    {percent}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Edge Fade Overlay */}
                <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#0a0f1d] to-transparent pointer-events-none z-20 print:hidden" />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
