'use client';

import * as React from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  CheckCircle2,
  PlayCircle,
  HelpCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type BucketType = 'backlog' | 'in_progress' | 'completed';

interface SubTask {
  id: string;
  sectionId: string;
  task: string;
  isCompleted: boolean;
  completedAt: Date | null;
  sortOrder: number;
}

interface MainTask {
  id: string;
  projectId: string;
  title: string;
  status: BucketType;
  sortOrder: number;
  items: SubTask[];
}

interface TaskListViewReadOnlyProps {
  sections: MainTask[];
}

export function TaskListViewReadOnly({ sections }: TaskListViewReadOnlyProps) {
  // Expansion state: { [columnId]: taskId }
  const [expandedTasks, setExpandedTasks] = React.useState<Record<BucketType, string | null>>({
    backlog: null,
    in_progress: null,
    completed: null,
  });

  const toggleExpand = (columnId: BucketType, taskId: string) => {
    setExpandedTasks((prev) => ({
      ...prev,
      [columnId]: prev[columnId] === taskId ? null : taskId,
    }));
  };

  const buckets: { id: BucketType; title: string; colorClass: string; icon: React.ReactNode }[] = [
    { 
      id: 'backlog', 
      title: 'Backlog', 
      colorClass: 'border-l-4 border-l-sky-500 bg-sky-500/5',
      icon: <HelpCircle className="size-4 text-sky-400" />
    },
    { 
      id: 'in_progress', 
      title: 'In Progress', 
      colorClass: 'border-l-4 border-l-blue-500 bg-blue-500/5',
      icon: <PlayCircle className="size-4 text-blue-400" />
    },
    { 
      id: 'completed', 
      title: 'Completed', 
      colorClass: 'border-l-4 border-l-emerald-500 bg-emerald-500/5',
      icon: <CheckCircle2 className="size-4 text-emerald-400" />
    },
  ];

  return (
    <div className="space-y-8">
      {buckets.map(bucket => {
        const bucketTasks = sections.filter(s => s.status === bucket.id);
        const expandedTaskId = expandedTasks[bucket.id];

        return (
          <div
            key={bucket.id}
            className={`flex flex-col rounded-xl border border-white/5 p-5 transition-all ${bucket.colorClass}`}
          >
            {/* Bucket Header */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                {bucket.icon}
                <h3 className="text-sm font-bold text-white">{bucket.title}</h3>
              </div>
              <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 border-white/10 text-muted-foreground bg-white/5">
                {bucketTasks.length} Task{bucketTasks.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {/* Tasks List */}
            <div className="space-y-3">
              {bucketTasks.map(task => {
                const isExpanded = expandedTaskId === task.id;
                const totalSub = task.items.length;
                const completedSub = task.items.filter(i => i.isCompleted).length;
                const pct = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;

                return (
                  <div
                    key={task.id}
                    className="flex flex-col border border-white/5 rounded-lg bg-white/[0.01] shadow-sm hover:shadow transition-all"
                  >
                    {/* Task Header */}
                    <div 
                      className="flex items-center gap-3 p-4 cursor-pointer select-none"
                      onClick={() => toggleExpand(bucket.id, task.id)}
                    >
                      <span className="text-sm font-bold text-white flex-1 truncate">
                        {task.title}
                      </span>
                      
                      {totalSub > 0 && (
                        <span className="text-xs font-medium text-muted-foreground bg-white/5 px-2.5 py-0.5 rounded-full shrink-0">
                          {completedSub}/{totalSub} Sub-tasks ({pct}%)
                        </span>
                      )}

                      <div className="text-muted-foreground shrink-0">
                        {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      </div>
                    </div>

                    {/* Expandable Sub-tasks section */}
                    {isExpanded && (
                      <div className="border-t border-white/5 p-4 bg-white/[0.01] space-y-3 animate-in slide-in-from-top-1 duration-150">
                        {/* Sub-tasks checklist */}
                        <ul className="space-y-2.5">
                          {task.items.map(item => (
                            <li key={item.id} className="flex items-start gap-2.5 text-sm py-0.5">
                              <input
                                type="checkbox"
                                checked={item.isCompleted}
                                disabled
                                className="size-3.5 mt-0.5 rounded border-white/10 text-emerald-500 bg-transparent cursor-not-allowed opacity-70"
                              />
                              <span
                                className={`text-sm flex-1 truncate ${
                                  item.isCompleted 
                                    ? 'text-muted-foreground line-through decoration-muted-foreground/45' 
                                    : 'text-white font-medium'
                                }`}
                              >
                                {item.task}
                              </span>
                            </li>
                          ))}

                          {task.items.length === 0 && (
                            <p className="text-xs text-muted-foreground italic py-1 text-center">
                              No sub-tasks.
                            </p>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}

              {bucketTasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 border border-dashed border-white/5 rounded-lg text-muted-foreground/30 text-xs">
                  <span>No tasks in this bucket.</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
