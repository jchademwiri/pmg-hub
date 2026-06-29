'use client';

import * as React from 'react';
import { useOptimistic, useTransition } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Check, 
  X, 
  Trash2, 
  Edit2, 
  CheckCircle2,
  PlayCircle,
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  addProgressSectionAction,
  deleteProgressSectionAction,
  renameProgressSectionAction,
  addProgressItemAction,
  deleteProgressItemAction,
  toggleProgressItemAction,
  updateProgressItemTextAction,
} from '@/app/actions/project-progress';

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

interface TaskListViewProps {
  projectId: string;
  initialSections: MainTask[];
}

export function TaskListView({ projectId, initialSections }: TaskListViewProps) {
  const [isPending, startTransition] = useTransition();

  // Optimistic UI state
  const [optimisticSections, setOptimisticSections] = useOptimistic(
    initialSections,
    (state, action: { type: string; payload: any }) => {
      switch (action.type) {
        case 'MOVE_TASK': {
          const { taskId, toStatus } = action.payload;
          return state.map(t => t.id === taskId ? { ...t, status: toStatus } : t);
        }
        case 'ADD_TASK': {
          const { newTask } = action.payload;
          return [...state, newTask];
        }
        case 'RENAME_TASK': {
          const { taskId, newTitle } = action.payload;
          return state.map(t => t.id === taskId ? { ...t, title: newTitle } : t);
        }
        case 'DELETE_TASK': {
          const { taskId } = action.payload;
          return state.filter(t => t.id !== taskId);
        }
        case 'ADD_SUBTASK': {
          const { sectionId, newSubTask } = action.payload;
          return state.map(t => {
            if (t.id === sectionId) {
              return { ...t, items: [...t.items, newSubTask] };
            }
            return t;
          });
        }
        case 'TOGGLE_SUBTASK': {
          const { itemId, isCompleted } = action.payload;
          return state.map(t => ({
            ...t,
            items: t.items.map(item => item.id === itemId ? { ...item, isCompleted } : item)
          }));
        }
        case 'RENAME_SUBTASK': {
          const { itemId, newTaskText } = action.payload;
          return state.map(t => ({
            ...t,
            items: t.items.map(item => item.id === itemId ? { ...item, task: newTaskText } : item)
          }));
        }
        case 'DELETE_SUBTASK': {
          const { sectionId, itemId } = action.payload;
          return state.map(t => {
            if (t.id === sectionId) {
              return { ...t, items: t.items.filter(item => item.id !== itemId) };
            }
            return t;
          });
        }
        default:
          return state;
      }
    }
  );

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

  // Local state for new task inputs per column
  const [newMainTaskTitles, setNewMainTaskTitles] = React.useState<Record<BucketType, string>>({
    backlog: '',
    in_progress: '',
    completed: '',
  });

  // Local state for new sub-task inputs per section
  const [newSubTaskTexts, setNewSubTaskTexts] = React.useState<Record<string, string>>({});

  // Inline editing states
  const [editingSectionId, setEditingSectionId] = React.useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = React.useState<string>('');
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const [editingItemText, setEditingItemText] = React.useState<string>('');

  // Mutators
  const handleAddMainTask = async (columnId: BucketType) => {
    const title = newMainTaskTitles[columnId];
    if (!title.trim()) return;

    setNewMainTaskTitles(prev => ({ ...prev, [columnId]: '' }));

    const tempId = crypto.randomUUID();
    const tempTask: MainTask = {
      id: tempId,
      projectId,
      title: title.trim(),
      status: columnId,
      sortOrder: optimisticSections.length + 1,
      items: [],
    };

    startTransition(async () => {
      setOptimisticSections({ type: 'ADD_TASK', payload: { newTask: tempTask } });
      const res = await addProgressSectionAction(projectId, title);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Task card added');
      }
    });
  };

  const handleRenameMainTask = async (taskId: string) => {
    if (!editingSectionTitle.trim()) return;
    setEditingSectionId(null);

    startTransition(async () => {
      setOptimisticSections({ type: 'RENAME_TASK', payload: { taskId, newTitle: editingSectionTitle } });
      const res = await renameProgressSectionAction(taskId, editingSectionTitle);
      if (res.error) {
        toast.error(res.error);
      }
    });
  };

  const handleDeleteMainTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task card? All sub-tasks will be lost.')) return;

    startTransition(async () => {
      setOptimisticSections({ type: 'DELETE_TASK', payload: { taskId } });
      const res = await deleteProgressSectionAction(taskId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Task card deleted');
      }
    });
  };

  const handleAddSubTask = async (sectionId: string) => {
    const text = newSubTaskTexts[sectionId];
    if (!text?.trim()) return;

    setNewSubTaskTexts(prev => ({ ...prev, [sectionId]: '' }));

    const tempId = crypto.randomUUID();
    const tempSub: SubTask = {
      id: tempId,
      sectionId,
      task: text.trim(),
      isCompleted: false,
      completedAt: null,
      sortOrder: 1,
    };

    startTransition(async () => {
      setOptimisticSections({ type: 'ADD_SUBTASK', payload: { sectionId, newSubTask: tempSub } });
      const res = await addProgressItemAction(sectionId, text);
      if (res.error) {
        toast.error(res.error);
      }
    });
  };

  const handleToggleSubTask = async (itemId: string, isCompleted: boolean) => {
    startTransition(async () => {
      setOptimisticSections({ type: 'TOGGLE_SUBTASK', payload: { itemId, isCompleted } });
      const res = await toggleProgressItemAction(itemId, isCompleted);
      if (res.error) {
        toast.error(res.error);
      }
    });
  };

  const handleRenameSubTask = async (itemId: string) => {
    if (!editingItemText.trim()) return;
    setEditingItemId(null);

    startTransition(async () => {
      setOptimisticSections({ type: 'RENAME_SUBTASK', payload: { itemId, newTaskText: editingItemText } });
      const res = await updateProgressItemTextAction(itemId, editingItemText);
      if (res.error) {
        toast.error(res.error);
      }
    });
  };

  const handleDeleteSubTask = async (sectionId: string, itemId: string) => {
    startTransition(async () => {
      setOptimisticSections({ type: 'DELETE_SUBTASK', payload: { sectionId, itemId } });
      const res = await deleteProgressItemAction(itemId);
      if (res.error) {
        toast.error(res.error);
      }
    });
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
        const bucketTasks = optimisticSections.filter(s => s.status === bucket.id);
        const expandedTaskId = expandedTasks[bucket.id];

        return (
          <div
            key={bucket.id}
            className={`flex flex-col rounded-xl border border-border/40 p-5 transition-all ${bucket.colorClass}`}
          >
            {/* Bucket Header */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/20">
              <div className="flex items-center gap-2">
                {bucket.icon}
                <h3 className="text-sm font-bold text-foreground">{bucket.title}</h3>
              </div>
              <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5 bg-muted">
                {bucketTasks.length} Task{bucketTasks.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {/* Tasks List */}
            <div className="space-y-3">
              {bucketTasks.map(task => {
                const isExpanded = expandedTaskId === task.id;
                const totalSub = task.items.length;
                const completedSub = task.items.filter((i: SubTask) => i.isCompleted).length;
                const pct = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;

                return (
                  <div
                    key={task.id}
                    className={`flex flex-col border border-border/50 rounded-lg bg-card shadow-sm hover:shadow transition-all group ${
                      isPending ? 'opacity-70' : ''
                    }`}
                  >
                    {/* Task Header */}
                    <div 
                      className="flex items-center gap-3 p-4 cursor-pointer select-none"
                      onClick={() => toggleExpand(bucket.id, task.id)}
                    >
                      {editingSectionId === task.id ? (
                        <div className="flex items-center gap-1.5 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                          <Input
                            className="h-8 text-xs flex-1"
                            value={editingSectionTitle}
                            onChange={(e) => setEditingSectionTitle(e.target.value)}
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleRenameMainTask(task.id);
                              else if (e.key === 'Escape') setEditingSectionId(null);
                            }}
                          />
                          <Button size="icon" className="size-8 shrink-0" onClick={() => handleRenameMainTask(task.id)}>
                            <Check className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => setEditingSectionId(null)}>
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-bold text-foreground flex-1 truncate">
                            {task.title}
                          </span>
                          
                          {totalSub > 0 && (
                            <span className="text-xs font-medium text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full shrink-0">
                              {completedSub}/{totalSub} Sub-tasks ({pct}%)
                            </span>
                          )}

                          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1" onClick={e => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setEditingSectionId(task.id);
                                setEditingSectionTitle(task.title);
                              }}
                            >
                              <Edit2 className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-destructive/85 hover:text-destructive hover:bg-destructive/5"
                              onClick={() => handleDeleteMainTask(task.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>

                          <div className="text-muted-foreground shrink-0">
                            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Expandable Sub-tasks section */}
                    {isExpanded && (
                      <div className="border-t border-border/20 p-4 bg-muted/15 space-y-4 animate-in slide-in-from-top-1 duration-150">
                        {/* Sub-tasks checklist */}
                        <ul className="space-y-3">
                          {task.items.map((item: SubTask) => (
                            <li key={item.id} className="flex items-center justify-between gap-3 text-sm group/sub">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Checkbox
                                  checked={item.isCompleted}
                                  onCheckedChange={(checked) => handleToggleSubTask(item.id, !!checked)}
                                  className="cursor-pointer shrink-0"
                                />
                                {editingItemId === item.id ? (
                                  <div className="flex items-center gap-1.5 flex-1">
                                    <Input
                                      className="h-8 text-xs py-0 flex-1"
                                      value={editingItemText}
                                      onChange={(e) => setEditingItemText(e.target.value)}
                                      autoFocus
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') handleRenameSubTask(item.id);
                                        else if (e.key === 'Escape') setEditingItemId(null);
                                      }}
                                    />
                                    <Button size="icon" className="size-8 shrink-0" onClick={() => handleRenameSubTask(item.id)}>
                                      <Check className="size-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => setEditingItemId(null)}>
                                      <X className="size-3.5" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span
                                    className={`text-sm flex-1 truncate ${
                                      item.isCompleted 
                                        ? 'text-muted-foreground line-through decoration-muted-foreground/45' 
                                        : 'text-foreground font-medium'
                                    }`}
                                    onDoubleClick={() => {
                                      setEditingItemId(item.id);
                                      setEditingItemText(item.task);
                                    }}
                                  >
                                    {item.task}
                                  </span>
                                )}
                              </div>
                              
                              {editingItemId !== item.id && (
                                <div className="flex items-center gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-6 text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                      setEditingItemId(item.id);
                                      setEditingItemText(item.task);
                                    }}
                                  >
                                    <Edit2 className="size-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-6 text-destructive/80 hover:text-destructive hover:bg-destructive/5"
                                    onClick={() => handleDeleteSubTask(task.id, item.id)}
                                  >
                                    <Trash2 className="size-3" />
                                  </Button>
                                </div>
                              )}
                            </li>
                          ))}

                          {task.items.length === 0 && (
                            <p className="text-xs text-muted-foreground italic py-1 text-center">
                              No sub-tasks. Add one below.
                            </p>
                          )}
                        </ul>

                        {/* Add Sub-task form */}
                        <div className="flex gap-2 pt-3 border-t border-border/10">
                          <Input
                            placeholder="Add sub-task..."
                            className="h-8 text-xs flex-1"
                            value={newSubTaskTexts[task.id] || ''}
                            onChange={(e) => setNewSubTaskTexts(prev => ({ ...prev, [task.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSubTask(task.id);
                              }
                            }}
                          />
                          <Button 
                            size="sm" 
                            className="h-8 text-xs px-3"
                            onClick={() => handleAddSubTask(task.id)}
                          >
                            <Plus className="size-3.5 mr-1" /> Add
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {bucketTasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 border border-dashed border-border/30 rounded-lg text-muted-foreground/40 text-xs">
                  <span>No task cards in this bucket.</span>
                </div>
              )}
            </div>

            {/* Add Main Task Input */}
            <div className="flex gap-2 pt-4 mt-3 border-t border-border/20">
              <Input
                placeholder={`Add task card to ${bucket.title}...`}
                className="h-9 text-xs flex-1"
                value={newMainTaskTitles[bucket.id]}
                onChange={(e) => setNewMainTaskTitles(prev => ({ ...prev, [bucket.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMainTask(bucket.id);
                  }
                }}
              />
              <Button 
                size="sm" 
                className="h-9 text-xs px-3"
                onClick={() => handleAddMainTask(bucket.id)}
              >
                <Plus className="size-4 mr-1" /> Add Card
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
