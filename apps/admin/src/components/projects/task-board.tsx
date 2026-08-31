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
  GripVertical,
  CheckCircle2,
  Circle,
  PlayCircle,
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  addProgressSectionAction,
  deleteProgressSectionAction,
  renameProgressSectionAction,
  addProgressItemAction,
  deleteProgressItemAction,
  toggleProgressItemAction,
  updateProgressItemTextAction,
  updateProgressSectionStatusAction
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

interface TaskBoardProps {
  projectId: string;
  initialSections: MainTask[];
  onProgressChange?: (completed: number, total: number, sections: MainTask[]) => void;
}

export function TaskBoard({ projectId, initialSections, onProgressChange }: TaskBoardProps) {
  const [sections, setSections] = React.useState<MainTask[]>(initialSections);
  const [draggedSectionId, setDraggedSectionId] = React.useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Inputs for adding new main tasks in each column
  const [newMainTaskTitles, setNewMainTaskTitles] = React.useState<Record<BucketType, string>>({
    backlog: '',
    in_progress: '',
    completed: '',
  });

  // Input for adding sub-tasks inside expanded main tasks
  const [newSubTaskTexts, setNewSubTaskTexts] = React.useState<Record<string, string>>({});

  // Editing states for Main Tasks and Sub-tasks
  const [editingSectionId, setEditingSectionId] = React.useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = React.useState('');
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const [editingItemText, setEditingItemText] = React.useState('');

  // Expanded task tracking: Exactly 1 expanded task ID per column/bucket
  const [expandedTasks, setExpandedTasks] = React.useState<Record<BucketType, string | null>>({
    backlog: null,
    in_progress: null,
    completed: null,
  });

  // Sync state with props
  React.useEffect(() => {
    setSections(initialSections);
  }, [initialSections]);

  // Report progress changes to parent if needed
  React.useEffect(() => {
    if (onProgressChange) {
      const total = sections.reduce((acc, s) => acc + s.items.length, 0);
      const completed = sections.reduce((acc, s) => acc + s.items.filter(i => i.isCompleted).length, 0);
      onProgressChange(completed, total, sections);
    }
  }, [sections, onProgressChange]);

  // React 19 Optimistic State for sections (handling additions, deletions, checkbox toggling & drag-drop)
  const [optimisticSections, setOptimisticSections] = useOptimistic(
    sections,
    (state, action: 
      | { type: 'MOVE_TASK'; taskId: string; targetStatus: BucketType }
      | { type: 'ADD_MAIN_TASK'; newTask: MainTask }
      | { type: 'DELETE_MAIN_TASK'; sectionId: string }
      | { type: 'RENAME_MAIN_TASK'; sectionId: string; title: string }
      | { type: 'ADD_SUB_TASK'; sectionId: string; newItem: SubTask }
      | { type: 'DELETE_SUB_TASK'; sectionId: string; itemId: string }
      | { type: 'TOGGLE_SUB_TASK'; itemId: string; isCompleted: boolean }
      | { type: 'RENAME_SUB_TASK'; itemId: string; task: string }
    ) => {
      switch (action.type) {
        case 'MOVE_TASK':
          return state.map(s => {
            if (s.id === action.taskId) {
              return {
                ...s,
                status: action.targetStatus,
                items: action.targetStatus === 'completed'
                  ? s.items.map(i => ({ ...i, isCompleted: true, completedAt: new Date() }))
                  : s.items.map(i => ({ ...i, isCompleted: false, completedAt: null }))
              };
            }
            return s;
          });
        case 'ADD_MAIN_TASK':
          return [...state, action.newTask];
        case 'DELETE_MAIN_TASK':
          return state.filter(s => s.id !== action.sectionId);
        case 'RENAME_MAIN_TASK':
          return state.map(s => s.id === action.sectionId ? { ...s, title: action.title } : s);
        case 'ADD_SUB_TASK':
          return state.map(s => {
            if (s.id === action.sectionId) {
              return {
                ...s,
                // If section was completed, it now moves to in_progress because a new uncompleted sub-task is added
                status: s.status === 'completed' ? 'in_progress' as const : s.status,
                items: [...s.items, action.newItem]
              };
            }
            return s;
          });
        case 'DELETE_SUB_TASK':
          return state.map(s => {
            if (s.id === action.sectionId) {
              const remaining = s.items.filter(i => i.id !== action.itemId);
              const total = remaining.length;
              const completed = remaining.filter(i => i.isCompleted).length;
              let nextStatus = s.status;
              if (total === 0) nextStatus = 'backlog';
              else if (completed === total) nextStatus = 'completed';
              return { ...s, status: nextStatus, items: remaining };
            }
            return s;
          });
        case 'TOGGLE_SUB_TASK':
          return state.map(s => {
            const hasItem = s.items.some(i => i.id === action.itemId);
            if (!hasItem) return s;

            const updatedItems = s.items.map(i => 
              i.id === action.itemId 
                ? { ...i, isCompleted: action.isCompleted, completedAt: action.isCompleted ? new Date() : null } 
                : i
            );

            const total = updatedItems.length;
            const completed = updatedItems.filter(i => i.isCompleted).length;
            let nextStatus: BucketType = 'in_progress';
            if (completed === total && total > 0) nextStatus = 'completed';

            return { ...s, status: nextStatus, items: updatedItems };
          });
        case 'RENAME_SUB_TASK':
          return state.map(s => {
            if (s.items.some(i => i.id === action.itemId)) {
              return {
                ...s,
                items: s.items.map(i => i.id === action.itemId ? { ...i, task: action.task } : i)
              };
            }
            return s;
          });
        default:
          return state;
      }
    }
  );

  const toggleExpand = (bucket: BucketType, taskId: string) => {
    setExpandedTasks(prev => ({
      ...prev,
      [bucket]: prev[bucket] === taskId ? null : taskId,
    }));
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, sectionId: string) => {
    setDraggedSectionId(sectionId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: BucketType) => {
    e.preventDefault();
    if (!draggedSectionId) return;

    const taskId = draggedSectionId;
    setDraggedSectionId(null);

    // If already in that status, do nothing
    const currentSection = sections.find(s => s.id === taskId);
    if (currentSection?.status === targetStatus) return;

    startTransition(async () => {
      // 1. Trigger Optimistic UI
      setOptimisticSections({ type: 'MOVE_TASK', taskId, targetStatus });

      // 2. Perform Server Action
      const res = await updateProgressSectionStatusAction(taskId, targetStatus);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Task moved to ${targetStatus.replace('_', ' ')}`);
        // Update actual state
        setSections(prev => prev.map(s => {
          if (s.id === taskId) {
            return { 
              ...s, 
              status: targetStatus,
              items: targetStatus === 'completed' 
                ? s.items.map(i => ({ ...i, isCompleted: true, completedAt: new Date() })) 
                : s.items.map(i => ({ ...i, isCompleted: false, completedAt: null }))
            };
          }
          return s;
        }));
      }
    });
  };

  // Add Main Task (Section)
  const handleAddMainTask = async (bucket: BucketType) => {
    const title = newMainTaskTitles[bucket].trim();
    if (!title) return;

    const tempId = crypto.randomUUID();
    const tempTask: MainTask = {
      id: tempId,
      projectId,
      title,
      status: bucket,
      sortOrder: sections.length + 1,
      items: [],
    };

    // Clear input
    setNewMainTaskTitles(prev => ({ ...prev, [bucket]: '' }));

    startTransition(async () => {
      setOptimisticSections({ type: 'ADD_MAIN_TASK', newTask: tempTask });
      const res = await addProgressSectionAction(projectId, title);
      if (res.error) {
        toast.error(res.error);
      } else if (res.section) {
        // If it was added to a non-backlog status, update its status
        if (bucket !== 'backlog') {
          await updateProgressSectionStatusAction(res.section.id, bucket);
        }
        
        setSections(prev => [...prev, { 
          ...res.section, 
          status: bucket, 
          items: [] 
        } as MainTask]);
        
        // Auto-expand the newly created task
        setExpandedTasks(prev => ({ ...prev, [bucket]: res.section.id }));
        toast.success('Task added');
      }
    });
  };

  // Delete Main Task
  const handleDeleteMainTask = async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this task and all its sub-tasks?')) return;

    startTransition(async () => {
      setOptimisticSections({ type: 'DELETE_MAIN_TASK', sectionId });
      const res = await deleteProgressSectionAction(sectionId);
      if (res.error) {
        toast.error(res.error);
      } else {
        setSections(prev => prev.filter(s => s.id !== sectionId));
        toast.success('Task deleted');
      }
    });
  };

  // Rename Main Task
  const handleRenameMainTask = async (sectionId: string) => {
    const title = editingSectionTitle.trim();
    if (!title) return;

    setEditingSectionId(null);

    startTransition(async () => {
      setOptimisticSections({ type: 'RENAME_MAIN_TASK', sectionId, title });
      const res = await renameProgressSectionAction(sectionId, title);
      if (res.error) {
        toast.error(res.error);
      } else {
        setSections(prev => prev.map(s => s.id === sectionId ? { ...s, title } : s));
        toast.success('Task renamed');
      }
    });
  };

  // Add Sub-task (Item)
  const handleAddSubTask = async (sectionId: string) => {
    const text = newSubTaskTexts[sectionId]?.trim();
    if (!text) return;

    const tempId = crypto.randomUUID();
    const tempItem: SubTask = {
      id: tempId,
      sectionId,
      task: text,
      isCompleted: false,
      completedAt: null,
      sortOrder: 1,
    };

    // Clear input
    setNewSubTaskTexts(prev => ({ ...prev, [sectionId]: '' }));

    startTransition(async () => {
      setOptimisticSections({ type: 'ADD_SUB_TASK', sectionId, newItem: tempItem });
      const res = await addProgressItemAction(sectionId, text);
      if (res.error) {
        toast.error(res.error);
      } else if (res.item) {
        setSections(prev => prev.map(s => {
          if (s.id === sectionId) {
            const nextStatus = s.status === 'completed' ? 'in_progress' as const : s.status;
            return {
              ...s,
              status: nextStatus,
              items: [...s.items.filter(i => i.id !== tempId), res.item as SubTask]
            };
          }
          return s;
        }));
        toast.success('Sub-task added');
      }
    });
  };

  // Delete Sub-task
  const handleDeleteSubTask = async (sectionId: string, itemId: string) => {
    startTransition(async () => {
      setOptimisticSections({ type: 'DELETE_SUB_TASK', sectionId, itemId });
      const res = await deleteProgressItemAction(itemId);
      if (res.error) {
        toast.error(res.error);
      } else {
        setSections(prev => prev.map(s => {
          if (s.id === sectionId) {
            const remaining = s.items.filter(i => i.id !== itemId);
            const total = remaining.length;
            const completed = remaining.filter(i => i.isCompleted).length;
            let nextStatus = s.status;
            if (total === 0) nextStatus = 'backlog';
            else if (completed === total) nextStatus = 'completed';
            return { ...s, status: nextStatus, items: remaining };
          }
          return s;
        }));
        toast.success('Sub-task deleted');
      }
    });
  };

  // Toggle Sub-task Completion
  const handleToggleSubTask = async (itemId: string, isCompleted: boolean) => {
    startTransition(async () => {
      setOptimisticSections({ type: 'TOGGLE_SUB_TASK', itemId, isCompleted });
      const res = await toggleProgressItemAction(itemId, isCompleted);
      if (res.error) {
        toast.error(res.error);
      } else if (res.item) {
        // Fetch fresh state from DB to sync everything correctly
        setSections(prev => prev.map(s => {
          const hasItem = s.items.some(i => i.id === itemId);
          if (!hasItem) return s;

          const updatedItems = s.items.map(i => 
            i.id === itemId 
              ? { ...i, isCompleted, completedAt: isCompleted ? new Date() : null } 
              : i
          );

          const total = updatedItems.length;
          const completed = updatedItems.filter(i => i.isCompleted).length;
          let nextStatus: BucketType = 'in_progress';
          if (completed === total && total > 0) nextStatus = 'completed';

          return { ...s, status: nextStatus, items: updatedItems };
        }));
      }
    });
  };

  // Rename Sub-task
  const handleRenameSubTask = async (itemId: string) => {
    const text = editingItemText.trim();
    if (!text) return;

    setEditingItemId(null);

    startTransition(async () => {
      setOptimisticSections({ type: 'RENAME_SUB_TASK', itemId, task: text });
      const res = await updateProgressItemTextAction(itemId, text);
      if (res.error) {
        toast.error(res.error);
      } else {
        setSections(prev => prev.map(s => {
          if (s.items.some(i => i.id === itemId)) {
            return {
              ...s,
              items: s.items.map(i => i.id === itemId ? { ...i, task: text } : i)
            };
          }
          return s;
        }));
        toast.success('Sub-task updated');
      }
    });
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
          const colTasks = optimisticSections.filter(s => s.status === col.id);
          const expandedTaskId = expandedTasks[col.id];

          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex flex-col min-h-[500px] rounded-xl border border-border/40 p-4 transition-all ${col.colorClass}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/20">
                <div className="flex items-center gap-2">
                  {col.icon}
                  <h3 className="text-sm font-bold text-foreground">{col.title}</h3>
                </div>
                <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5 bg-muted">
                  {colTasks.length}
                </Badge>
              </div>

              {/* Tasks List */}
              <div className="flex-1 space-y-3 overflow-y-auto mb-4">
                {colTasks.map(task => {
                  const isExpanded = expandedTaskId === task.id;
                  const totalSub = task.items.length;
                  const completedSub = task.items.filter(i => i.isCompleted).length;
                  const pct = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;

                  return (
                    <div
                      key={task.id}
                      draggable={!isPending}
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className={`flex flex-col border border-border/50 rounded-lg bg-card shadow-sm hover:shadow transition-all group ${
                        isPending ? 'opacity-70' : ''
                      }`}
                    >
                      {/* Task Header */}
                      <div 
                        className="flex items-center gap-2 p-3 cursor-pointer select-none"
                        onClick={() => toggleExpand(col.id, task.id)}
                      >
                        <div className="text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing p-1 -ml-1">
                          <GripVertical className="size-3.5" />
                        </div>

                        {editingSectionId === task.id ? (
                          <div className="flex items-center gap-1.5 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                            <Input
                              className="h-7 text-xs flex-1"
                              value={editingSectionTitle}
                              onChange={(e) => setEditingSectionTitle(e.target.value)}
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleRenameMainTask(task.id);
                                else if (e.key === 'Escape') setEditingSectionId(null);
                              }}
                            />
                            <Button size="icon" className="size-7 shrink-0" onClick={() => handleRenameMainTask(task.id)}>
                              <Check className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => setEditingSectionId(null)}>
                              <X className="size-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className="text-xs font-bold text-foreground flex-1 truncate">
                              {task.title}
                            </span>
                            
                            {totalSub > 0 && (
                              <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full shrink-0">
                                {completedSub}/{totalSub} ({pct}%)
                              </span>
                            )}

                            {task.status !== 'completed' && (
                               <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-0.5" onClick={e => e.stopPropagation()}>
                                 <Button
                                   variant="ghost"
                                   size="icon"
                                   className="size-6 text-muted-foreground hover:text-foreground"
                                   onClick={() => {
                                     setEditingSectionId(task.id);
                                     setEditingSectionTitle(task.title);
                                   }}
                                 >
                                   <Edit2 className="size-3" />
                                 </Button>
                                 <Button
                                   variant="ghost"
                                   size="icon"
                                   className="size-6 text-destructive/85 hover:text-destructive hover:bg-destructive/5"
                                   onClick={() => handleDeleteMainTask(task.id)}
                                 >
                                   <Trash2 className="size-3" />
                                 </Button>
                                </div>
                             )}

                            <div className="text-muted-foreground shrink-0 ml-1">
                              {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Expandable Sub-tasks section */}
                      {isExpanded && (
                        <div className="border-t border-border/20 p-3 bg-muted/10 space-y-3 animate-in slide-in-from-top-1 duration-150">
                          {/* Sub-tasks checklist */}
                          <ul className="space-y-2">
                            {task.items.map(item => (
                              <li key={item.id} className="flex items-center justify-between gap-2 text-xs group/sub">
                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={item.isCompleted}
                                    onChange={(e) => handleToggleSubTask(item.id, e.target.checked)}
                                    className="size-3.5 rounded border-border text-emerald-600 focus:ring-emerald-500/30 cursor-pointer shrink-0"
                                  />
                                  {editingItemId === item.id ? (
                                    <div className="flex items-center gap-1.5 flex-1">
                                      <Input
                                        className="h-7 text-xs py-0 flex-1"
                                        value={editingItemText}
                                        onChange={(e) => setEditingItemText(e.target.value)}
                                        autoFocus
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') handleRenameSubTask(item.id);
                                          else if (e.key === 'Escape') setEditingItemId(null);
                                        }}
                                      />
                                      <Button size="icon" className="size-7 shrink-0" onClick={() => handleRenameSubTask(item.id)}>
                                        <Check className="size-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => setEditingItemId(null)}>
                                        <X className="size-3.5" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <span
                                      className={`text-xs flex-1 truncate ${
                                        item.isCompleted 
                                          ? 'text-muted-foreground line-through decoration-muted-foreground/45' 
                                          : 'text-foreground font-medium'
                                      }`}
                                      onDoubleClick={() => {
                                        if (task.status !== 'completed') {
                                          setEditingItemId(item.id);
                                          setEditingItemText(item.task);
                                        }
                                      }}
                                    >
                                      {item.task}
                                    </span>
                                  )}
                                </div>
                                
                                {editingItemId !== item.id && task.status !== 'completed' && (
                                  <div className="flex items-center gap-0.5 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-5.5 text-muted-foreground hover:text-foreground"
                                      onClick={() => {
                                        setEditingItemId(item.id);
                                        setEditingItemText(item.task);
                                      }}
                                    >
                                      <Edit2 className="size-2.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-5.5 text-destructive/80 hover:text-destructive hover:bg-destructive/5"
                                      onClick={() => handleDeleteSubTask(task.id, item.id)}
                                    >
                                      <Trash2 className="size-2.5" />
                                    </Button>
                                  </div>
                                )}
                              </li>
                            ))}

                            {task.items.length === 0 && (
                              <p className="text-[10px] text-muted-foreground italic py-1 text-center">
                                {task.status === 'completed' ? 'No sub-tasks.' : 'No sub-tasks. Add one below.'}
                              </p>
                            )}
                          </ul>

                          {/* Add Sub-task form */}
                          {task.status !== 'completed' && (
                            <div className="flex gap-1.5 pt-2 border-t border-border/10">
                              <Input
                                placeholder="New sub-task..."
                                className="h-7 text-[11px] flex-1"
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
                                className="h-7 text-[11px] px-2.5"
                                onClick={() => handleAddSubTask(task.id)}
                              >
                                <Plus className="size-3 mr-1" /> Add
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {colTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 border border-dashed border-border/30 rounded-lg text-muted-foreground/40 text-xs">
                    <span>Drop tasks here</span>
                  </div>
                )}
              </div>

              {/* Add Main Task Input */}
              {col.id !== 'completed' && (
                <div className="flex gap-2 pt-3 border-t border-border/20">
                  <Input
                    placeholder="Add task card..."
                    className="h-8 text-xs flex-1"
                    value={newMainTaskTitles[col.id]}
                    onChange={(e) => setNewMainTaskTitles(prev => ({ ...prev, [col.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMainTask(col.id);
                      }
                    }}
                  />
                  <Button 
                    size="sm" 
                    className="h-8 text-xs px-2.5"
                    onClick={() => handleAddMainTask(col.id)}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
