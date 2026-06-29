'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Clock,
  AlertTriangle,
  CheckSquare,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TenderScheduleEntry } from '@pmg/db';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DivisionSummary {
  id: string;
  name: string;
}

interface ProgressItem {
  id: string;
  sectionId: string;
  task: string;
  isCompleted: boolean;
  completedAt: Date | null;
  sortOrder: number;
}

interface ProgressSection {
  id: string;
  tenderId: string;
  title: string;
  sortOrder: number;
  items: ProgressItem[];
}

interface ProjectDetailsClientProps {
  project: TenderScheduleEntry;
  divisions: DivisionSummary[];
  initialChecklist: any[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
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

export function ProjectDetailsClient({
  project,
  divisions,
  initialChecklist,
}: ProjectDetailsClientProps) {
  const checklist = initialChecklist.map((s) => ({
    ...s,
    items: s.items.map((i: any) => ({
      ...i,
      completedAt: i.completedAt ? new Date(i.completedAt) : null,
    })),
  }));

  const division = divisions.find((d) => d.id === project.divisionId);
  const status = STATUS_CONFIG[project.status] || { label: project.status, className: '' };

  // Checklist Calculations
  const totalItems = checklist.reduce((acc, s) => acc + s.items.length, 0);
  const completedItems = checklist.reduce(
    (acc, s) => acc + s.items.filter((i: any) => i.isCompleted).length,
    0,
  );
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Header / Breadcrumb */}
      <div className="flex flex-col gap-2 border-b pb-5 border-white/5">
        <Link
          href="/projects"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors w-fit"
        >
          <ArrowLeft className="size-3.5" /> Back to My Projects
        </Link>
        <div className="flex flex-wrap items-center gap-3 mt-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {project.tenderReference}
          </h1>
          <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 ${status.className}`}>
            {status.label}
          </Badge>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Checklists, Notes & Blockers */}
        <div className="lg:col-span-2 space-y-6">
          {/* Checklist Board */}
          <Card className="bg-[#0a0f1d] border-white/5 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="size-4 text-emerald-400" />
                <CardTitle className="text-sm font-semibold text-white">Project Checklist</CardTitle>
              </div>
              {totalItems > 0 && (
                <Badge variant="secondary" className="text-xs font-medium bg-white/5 text-white border-white/5">
                  {completedItems}/{totalItems} Completed
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Overall Progress Bar */}
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4 flex flex-col gap-2">
                <div className="flex justify-between text-xs font-medium text-muted-foreground">
                  <span>Project Completion</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Checklist Sections */}
              <div className="space-y-5">
                {checklist.map((section) => (
                  <div
                    key={section.id}
                    className="border border-white/5 rounded-lg p-4 space-y-3 bg-white/[0.01]"
                  >
                    {/* Section Header */}
                    <div className="border-b border-white/5 pb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {section.title}
                      </h3>
                    </div>

                    {/* Section Items */}
                    <ul className="space-y-2">
                      {section.items.map((item: any) => (
                        <li
                          key={item.id}
                          className="flex items-start gap-3 text-xs py-1 px-2 rounded-md hover:bg-white/[0.01] transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={item.isCompleted}
                            disabled
                            className="size-4 mt-0.5 rounded border-white/10 text-emerald-500 bg-transparent cursor-not-allowed opacity-70"
                          />
                          <span
                            className={`text-xs flex-1 ${
                              item.isCompleted
                                ? 'text-muted-foreground line-through decoration-muted-foreground/45'
                                : 'text-white font-medium'
                            }`}
                          >
                            {item.task}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                {checklist.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground text-xs border border-dashed border-white/5 rounded-lg flex flex-col items-center justify-center gap-2">
                    <CheckSquare className="size-8 text-muted-foreground/20" />
                    <span>No checklist items have been added to this project yet.</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes & Blockers (Read-only) */}
          {(project.notes || project.blockers) && (
            <Card className="bg-[#0a0f1d] border-white/5 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-blue-400" />
                  <CardTitle className="text-sm font-semibold text-white">Project Notes & Updates</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs leading-relaxed text-muted-foreground">
                {project.blockers && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/10 bg-amber-500/5 p-3 text-amber-400">
                    <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-semibold text-[11px] uppercase tracking-wider">Active Blocker</span>
                      <p className="text-xs">{project.blockers}</p>
                    </div>
                  </div>
                )}

                {project.notes && (
                  <div className="space-y-1.5">
                    <span className="font-semibold text-white">Notes</span>
                    <div className="bg-white/[0.01] border border-white/5 rounded-lg p-4 whitespace-pre-wrap font-sans text-muted-foreground">
                      {project.notes}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column — Sidebar Metadata */}
        <div className="space-y-6">
          <Card className="bg-[#0a0f1d] border-white/5 shadow-md">
            <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Clock className="size-4 text-blue-400" /> Project Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              {/* Dates Timeline */}
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground font-medium">Project Start Date</span>
                  <div className="flex items-center gap-1.5 text-white font-semibold">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    <span>{formatDate(project.startDate)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 pt-1 border-t border-white/5">
                  <span className="text-muted-foreground font-medium">Target Completion Date (Internal)</span>
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    <span>{formatDate(project.targetCompletionDate)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 pt-1 border-t border-white/5">
                  <span className="text-muted-foreground font-medium">Tender Closing Date (Submission)</span>
                  <div className="flex items-center gap-1.5 text-red-400 font-semibold">
                    <Calendar className="size-3.5" />
                    <span>{formatDate(project.closingDate)}</span>
                  </div>
                </div>
              </div>

              {/* Effort & Buffer */}
              <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground font-medium">Planned Effort</span>
                  <span className="text-sm font-bold text-white">{project.effortDays} days</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground font-medium">Buffer Margin</span>
                  <span className="text-sm font-bold text-white">{project.bufferDays} days</span>
                </div>
              </div>

              {/* Additional Metadata */}
              <div className="space-y-3 border-t border-white/5 pt-4">
                {division && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Division</span>
                    <span className="font-semibold text-white">{division.name}</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Priority</span>
                  <Badge
                    variant="outline"
                    className="capitalize text-[10px] px-2 py-0.5 border-white/10 text-muted-foreground bg-white/5"
                  >
                    {project.priority}
                  </Badge>
                </div>

                {(project.status === 'completed' || project.status === 'submitted') && (
                  <>
                    <div className="flex justify-between items-center border-t border-white/5 pt-3">
                      <span className="text-muted-foreground font-medium">Actual Effort</span>
                      <span className="font-semibold text-white">
                        {project.actualEffortDays ? `${project.actualEffortDays} days` : '—'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">Outcome</span>
                      <Badge
                        variant="outline"
                        className={`capitalize text-[10px] px-2 py-0.5 font-semibold ${
                          project.outcome === 'won'
                            ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
                            : project.outcome === 'lost'
                              ? 'text-red-400 border-red-500/20 bg-red-500/5'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {project.outcome ?? 'Pending'}
                      </Badge>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
