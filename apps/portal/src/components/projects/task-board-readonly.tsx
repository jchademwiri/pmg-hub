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

interface TaskBoardReadOnlyProps {
  sections: MainTask[];
}

export function TaskBoardReadOnly({ sections }: TaskBoardReadOnlyProps) {
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

  const columns: { id: BucketType; title: string; colorClass: string; icon: React.ReactNode }[] = [
    { 
      id: 'backlog', 
      title: 'Backlog', 
      colorClass: 'border-t-2 border-t-sky-500 bg-sky-500/5',
      icon: <HelpCircle className="size-4 text-sky-400" />
    },
    { 
      id: 'in_progress', 
      title: 'In Progress', 
      colorClass: 'border-t-2 border-t-blue-500 bg-blue-500/5',
      icon: <PlayCircle className="size-4 text-blue-400" />
    },
    { 
      id: 'completed', 
      title: 'Completed', 
      colorClass: 'border-t-2 border-t-emerald-500 bg-emerald-500/5',
      icon: <CheckCircle2 className="size-4 text-emerald-400" />
    },
  ];

  return (
    <div className="space-y-6">
      {/* Board Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map(col => {
          const colTasks = sections.filter(s => s.status === col.id);
          const expandedTaskId = expandedTasks[col.id];

          return (
            <div
              key={col.id}
              className={`flex flex-col min-h-[400px] rounded-xl border border-white/5 p-4 transition-all ${col.colorClass}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  {col.icon}
                  <h3 className="text-sm font-bold text-white">{col.title}</h3>
                </div>
                <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 border-white/10 text-muted-foreground bg-white/5">
                  {colTasks.length}
                </Badge>
              </div>

              {/* Tasks List */}
              <div className="flex-1 space-y-3 overflow-y-auto">
                {colTasks.map(task => {
                  const isExpanded = expandedTaskId === task.id;
                  const totalSub = task.items.length;
                  const completedSub = task.items.filter(i => i.isCompleted).length;
                  const pct = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;

                  return (
                    <div
                      key={task.id}
                      className="flex flex-col border border-white/5 rounded-lg bg-white/[0.01] shadow-sm hover:shadow transition-all group"
                    >
                      {/* Task Header */}
                      <div 
                        className="flex items-center gap-2.5 p-3 cursor-pointer select-none"
                        onClick={() => toggleExpand(col.id, task.id)}
                      >
                        <span className="text-xs font-bold text-white flex-1 truncate">
                          {task.title}
                        </span>
                        
                        {totalSub > 0 && (
                          <span className="text-[10px] font-medium text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded-full shrink-0">
                            {completedSub}/{totalSub} ({pct}%)
                          </span>
                        )}

                        <div className="text-muted-foreground shrink-0">
                          {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                        </div>
                      </div>

                      {/* Expandable Sub-tasks section */}
                      {isExpanded && (
                        <div className="border-t border-white/5 p-3 bg-white/[0.01] space-y-2.5 animate-in slide-in-from-top-1 duration-150">
                          {/* Sub-tasks checklist */}
                          <ul className="space-y-2">
                            {task.items.map(item => (
                              <li key={item.id} className="flex items-start gap-2.5 text-xs py-0.5">
                                <input
                                  type="checkbox"
                                  checked={item.isCompleted}
                                  disabled
                                  className="size-3.5 mt-0.5 rounded border-white/10 text-emerald-500 bg-transparent cursor-not-allowed opacity-70"
                                />
                                <span
                                  className={`text-xs flex-1 truncate ${
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
                              <p className="text-[10px] text-muted-foreground italic py-1 text-center">
                                No sub-tasks.
                              </p>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}

                {colTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 border border-dashed border-white/5 rounded-lg text-muted-foreground/30 text-xs">
                    <span>No tasks in this column</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
