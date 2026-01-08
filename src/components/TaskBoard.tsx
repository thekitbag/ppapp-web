import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from '../lib/queryKeys';
import { listTasks, patchTask, type TaskFilters } from '../api/tasks';
import { Task, TaskStatus } from '../types';
import { BUCKETS, midpoint } from '../constants';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import { Calendar, Flag, Target, Upload, Edit, Check, X, CheckCircle } from 'lucide-react';
import TrelloImportModal from './TrelloImportModal';
import TaskEditDrawer from './TaskEditDrawer';
import TaskFiltersComponent from './TaskFilters';
import { useTaskUpdateMutation } from '../hooks/useTaskMutation';
import { useOptimisticCreate } from '../hooks/useOptimisticCreate';
import QuickAdd from './QuickAdd';
import OptimisticTaskCard from './OptimisticTaskCard';
import confetti from 'canvas-confetti';

function InfoBadge({ icon: Icon, label, colorClass }: { icon: React.ElementType, label: string, colorClass?: string }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border-2 border-black font-medium ${colorClass || 'bg-gray-200 text-gray-700'}`}
         style={{ fontFamily: 'var(--font-body)', boxShadow: '1px 1px 0px var(--color-border)' }}>
      <Icon size={14} />
      <span>{label}</span>
    </div>
  );
}


function TaskCard({ task, goal, index, isPending, onTaskDrop, onComplete, density = 'comfortable' }: { task: Task, goal: any, index: number, isPending?: boolean, onTaskDrop: (task: Task, newStatus: TaskStatus, targetIndex: number) => void, onComplete: (taskId: string) => void, density?: 'comfortable' | 'compact' }) {
  const ref = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  const [isQuickEditing, setIsQuickEditing] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [quickEditTitle, setQuickEditTitle] = useState(task.title);
  const [quickEditDate, setQuickEditDate] = useState(
    task.soft_due_at ? new Date(task.soft_due_at).toISOString().slice(0, 16) : ''
  );
  const [isHardDeadlineToggle, setIsHardDeadlineToggle] = useState(!!task.hard_due_at);
  
  const updateMutation = useTaskUpdateMutation();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return combine(
      draggable({
        element: el,
        getInitialData: () => ({ task, index }),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      }),
      dropTargetForElements({
        element: el,
        getData: ({ input, element }) => {
          const rect = element.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          const insertBefore = input.clientY < midY;
          return {
            task,
            index,
            insertBefore
          };
        },
        onDragEnter: ({ self, source }) => {
          if (source.data.task === task) return; // Don't show indicator for self
          const insertBefore = self.data.insertBefore;
          setDropPosition(insertBefore ? 'before' : 'after');
        },
        onDragLeave: () => setDropPosition(null),
        onDrop: ({ source, self }) => {
          const draggedTask = source.data.task as Task;
          if (draggedTask.id === task.id) return; // Don't drop on self
          
          const insertBefore = self.data.insertBefore;
          const targetIndex = insertBefore ? index : index + 1;
          
          onTaskDrop(draggedTask, task.status, targetIndex);
          setDropPosition(null);
        },
      })
    );
  }, [task, index, onTaskDrop]);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const handleQuickEditSave = () => {
    if (!quickEditTitle.trim()) return;
    
    const patch = {
      title: quickEditTitle.trim(),
      soft_due_at: quickEditDate ? new Date(quickEditDate).toISOString() : null,
      hard_due_at: isHardDeadlineToggle && quickEditDate 
        ? new Date(quickEditDate).toISOString() 
        : null,
    };
    
    updateMutation.mutate({ id: task.id, patch }, {
      onSuccess: () => {
        setIsQuickEditing(false);
      },
      onError: () => {
        // Reset to original values on error
        setQuickEditTitle(task.title);
        setQuickEditDate(task.soft_due_at ? new Date(task.soft_due_at).toISOString().slice(0, 16) : '');
        setIsHardDeadlineToggle(!!task.hard_due_at);
      }
    });
  };

  const handleQuickEditCancel = () => {
    setQuickEditTitle(task.title);
    setQuickEditDate(task.soft_due_at ? new Date(task.soft_due_at).toISOString().slice(0, 16) : '');
    setIsHardDeadlineToggle(!!task.hard_due_at);
    setIsQuickEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleQuickEditSave();
    } else if (e.key === 'Escape') {
      handleQuickEditCancel();
    }
  };

  // Update local state when task changes
  useEffect(() => {
    setQuickEditTitle(task.title);
    setQuickEditDate(task.soft_due_at ? new Date(task.soft_due_at).toISOString().slice(0, 16) : '');
    setIsHardDeadlineToggle(!!task.hard_due_at);
  }, [task.title, task.soft_due_at, task.hard_due_at]);

  return (
    <div className="relative">
      {dropPosition === 'before' && (
        <div className="absolute -top-2 left-0 right-0 h-1 rounded-full z-10"
             style={{ background: 'var(--color-primary)' }} />
      )}
      <div
        ref={ref}
        className={`rounded-lg border-3 border-black transition-all flex flex-col ${
          density === 'compact' ? 'p-3 gap-2' : 'p-4 gap-3'
        } ${
          isDragging ? 'opacity-40 scale-95' : ''
        } ${isPending ? 'opacity-75' : ''} ${
          dropPosition ? 'ring-4 ring-offset-2 ring-teal-500' : ''
        }`}
        style={{
          background: 'var(--color-surface)',
          boxShadow: isDragging ? 'var(--shadow-subtle)' : 'var(--shadow-brutal)',
          transform: isDragging ? 'rotate(-2deg)' : undefined
        }}
      >
        {/* Title Row - Always visible with wrapping */}
        <div className="flex items-start justify-between gap-3">
          {isQuickEditing ? (
            <div className="flex-1">
              <input
                type="text"
                value={quickEditTitle}
                onChange={(e) => setQuickEditTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full font-semibold text-base border-2 border-black rounded-md px-3 py-2 focus:outline-none"
                style={{
                  background: 'var(--color-background)',
                  color: 'var(--color-text)',
                  fontFamily: 'var(--font-body)'
                }}
                autoFocus
              />
            </div>
          ) : (
            <h3
              className="font-semibold leading-snug break-words flex-1 cursor-pointer transition-colors overflow-hidden"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: density === 'compact' ? 2 : 3,
                WebkitBoxOrient: 'vertical',
                fontFamily: 'var(--font-body)',
                color: 'var(--color-text)'
              }}
              onClick={(e) => {
                e.stopPropagation();
                setIsQuickEditing(true);
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text)'}
              title={`${task.title} (Click to edit)`}
            >
              {task.title}
              {isPending && <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-accent)' }}>Updating...</span>}
            </h3>
          )}
          
          <div className="flex items-center gap-1 flex-shrink-0">
            {isQuickEditing ? (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickEditSave();
                  }}
                  className="p-1.5 rounded-md border-2 border-black transition-all hover:translate-y-[-2px]"
                  style={{ background: 'var(--color-accent)', boxShadow: '2px 2px 0px var(--color-border)' }}
                  title="Save changes"
                  disabled={updateMutation.isPending}
                >
                  <Check size={16} color="white" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickEditCancel();
                  }}
                  className="p-1.5 rounded-md border-2 border-black transition-all hover:translate-y-[-2px]"
                  style={{ background: 'var(--color-surface)', boxShadow: '2px 2px 0px var(--color-border)', color: 'var(--color-text-muted)' }}
                  title="Cancel editing"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onComplete(task.id);
                  }}
                  className="p-1.5 rounded-md border-2 border-black transition-all hover:translate-y-[-2px]"
                  style={{ background: 'var(--color-surface)', boxShadow: '2px 2px 0px var(--color-border)' }}
                  title="Mark as done"
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-accent)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-surface)'}
                >
                  <CheckCircle size={16} style={{ color: 'var(--color-text-muted)' }} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditDrawerOpen(true);
                  }}
                  className="p-1.5 rounded-md border-2 border-black transition-all hover:translate-y-[-2px]"
                  style={{ background: 'var(--color-surface)', boxShadow: '2px 2px 0px var(--color-border)' }}
                  title="Edit task"
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-surface)'}
                >
                  <Edit size={16} style={{ color: 'var(--color-text-muted)' }} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Metadata Row - Goal chips */}
        {(() => {
          // Create a unique list of goals, combining goal_id and goals array
          const allGoals: { id: string; title: string }[] = [];

          // Add goal from goal_id if it exists
          if (goal) {
            allGoals.push({ id: goal.id, title: goal.title });
          }

          // Add goals from goals array, but only if they're not already included
          if (task.goals && task.goals.length > 0) {
            task.goals.forEach(g => {
              if (!allGoals.find(existing => existing.id === g.id)) {
                allGoals.push(g);
              }
            });
          }

          return allGoals.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {allGoals.slice(0, density === 'compact' ? 1 : 2).map(g => (
                <InfoBadge key={g.id} icon={Target} label={g.title} colorClass="bg-purple-100 text-purple-800" />
              ))}
              {allGoals.length > (density === 'compact' ? 1 : 2) && (
                <InfoBadge
                  icon={Target}
                  label={`+${allGoals.length - (density === 'compact' ? 1 : 2)}`}
                  colorClass="bg-purple-100 text-purple-800"
                />
              )}
            </div>
          );
        })()}

        {(task.soft_due_at || task.hard_due_at || isQuickEditing) && (
          <div className="border-t border-gray-200/80 pt-3 flex flex-col gap-2">
            {isQuickEditing ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  <input
                    type="datetime-local"
                    value={quickEditDate}
                    onChange={(e) => setQuickEditDate(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Set due date"
                  />
                </div>
                {quickEditDate && (
                  <div className="flex items-center gap-2 ml-6">
                    <input
                      type="checkbox"
                      id={`hard-deadline-${task.id}`}
                      checked={isHardDeadlineToggle}
                      onChange={(e) => setIsHardDeadlineToggle(e.target.checked)}
                      className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                    />
                    <label htmlFor={`hard-deadline-${task.id}`} className="text-sm text-gray-700">
                      Hard deadline
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <>
                {task.soft_due_at && (
                  <div 
                    className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsQuickEditing(true);
                    }}
                    title="Click to edit due date"
                  >
                    <Calendar size={16} />
                    <span>{formatDate(task.soft_due_at)} (soft)</span>
                  </div>
                )}
                {task.hard_due_at && (
                  <div 
                    className="flex items-center gap-2 text-sm font-semibold text-red-600 cursor-pointer hover:text-red-700 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsQuickEditing(true);
                    }}
                    title="Click to edit due date"
                  >
                    <Flag size={16} />
                    <span>{formatDate(task.hard_due_at)} (hard)</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
      {dropPosition === 'after' && (
        <div className="absolute -bottom-2 left-0 right-0 h-1 rounded-full z-10"
             style={{ background: 'var(--color-primary)' }} />
      )}

      <TaskEditDrawer
        task={task}
        isOpen={isEditDrawerOpen}
        onClose={() => setIsEditDrawerOpen(false)}
      />
    </div>
  );
}

function EmptyColumnDropZone({ status, onTaskDrop }: { status: TaskStatus, onTaskDrop: (task: Task, newStatus: TaskStatus, targetIndex?: number) => void }) {
  const ref = useRef(null);
  const [isDraggedOver, setIsDraggedOver] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return dropTargetForElements({
      element: el,
      getData: () => ({ status }),
      onDragEnter: () => setIsDraggedOver(true),
      onDragLeave: () => setIsDraggedOver(false),
      onDrop: ({ source }) => {
        onTaskDrop(source.data.task as Task, status);
        setIsDraggedOver(false);
      },
    });
  }, [status, onTaskDrop]);

  const getEmptyStateContent = () => {
    switch (status) {
      case 'week':
        return {
          title: 'Your week awaits',
          subtitle: 'Drag tasks here from Backlog to plan your week'
        }
      case 'doing':
        return {
          title: 'Ready to focus?',
          subtitle: 'Move a task here when you start working on it'
        }
      default:
        return {
          title: 'Drop task here',
          subtitle: null
        }
    }
  }

  const content = getEmptyStateContent()

  return (
    <div
      ref={ref}
      className={`h-full border-3 border-dashed rounded-lg flex flex-col items-center justify-center text-center p-6 transition-all min-h-[120px] ${
        isDraggedOver ? '' : ''
      }`}
      style={{
        borderColor: isDraggedOver ? 'var(--color-primary)' : 'var(--color-border-light)',
        background: isDraggedOver ? 'rgba(255, 107, 88, 0.1)' : 'transparent',
        color: isDraggedOver ? 'var(--color-primary)' : 'var(--color-text-muted)'
      }}
    >
      <div className="text-sm font-bold mb-1" style={{ fontFamily: 'var(--font-display)' }}>{content.title}</div>
      {content.subtitle && (
        <div className="text-xs opacity-75">{content.subtitle}</div>
      )}
    </div>
  );
}

function EndOfListDropZone({ status, index, onTaskDrop }: { status: TaskStatus, index: number, onTaskDrop: (task: Task, newStatus: TaskStatus, targetIndex: number) => void }) {
  const ref = useRef(null);
  const [isDraggedOver, setIsDraggedOver] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return dropTargetForElements({
      element: el,
      getData: () => ({ status, targetIndex: index }),
      onDragEnter: () => setIsDraggedOver(true),
      onDragLeave: () => setIsDraggedOver(false),
      onDrop: ({ source }) => {
        onTaskDrop(source.data.task as Task, status, index);
        setIsDraggedOver(false);
      },
    });
  }, [status, index, onTaskDrop]);

  return (
    <div
      ref={ref}
      className={`h-2 transition-all rounded-full ${
        isDraggedOver ? 'h-1' : ''
      }`}
      style={{ background: isDraggedOver ? 'var(--color-primary)' : 'transparent' }}
    />
  );
}

function StickyHeaderDropZone({ status, onTaskDrop }: { status: TaskStatus, onTaskDrop: (task: Task, newStatus: TaskStatus, targetIndex?: number) => void }) {
  const ref = useRef(null);
  const [isDraggedOver, setIsDraggedOver] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return dropTargetForElements({
      element: el,
      getData: () => ({ status, targetIndex: 0 }),
      onDragEnter: () => setIsDraggedOver(true),
      onDragLeave: () => setIsDraggedOver(false),
      onDrop: ({ source }) => {
        onTaskDrop(source.data.task as Task, status, 0);
        setIsDraggedOver(false);
      },
    });
  }, [status, onTaskDrop]);

  return (
    <div
      ref={ref}
      className={`w-full transition-all ${
        isDraggedOver ? 'h-12 mb-3' : 'h-0'
      }`}
      style={{
        background: isDraggedOver ? 'var(--color-primary)' : 'transparent',
        opacity: isDraggedOver ? 0.3 : 0,
        borderRadius: '8px',
        border: isDraggedOver ? '3px dashed var(--color-border)' : 'none'
      }}
    />
  );
}

function TaskColumn({
  status,
  tasks,
  onTaskDrop,
  goalsById,
  patchMutation,
  onShowImport,
  density = 'comfortable',
  onQuickAdd,
  onOptimisticRetry,
  onOptimisticCancel
}: {
  status: TaskStatus;
  tasks: Task[];
  onTaskDrop: (task: Task, newStatus: TaskStatus, targetIndex?: number) => void;
  goalsById: any,
  patchMutation: any,
  onShowImport?: () => void,
  density?: 'comfortable' | 'compact',
  onQuickAdd?: (status: TaskStatus, title: string) => void,
  onOptimisticRetry?: (tempId: string) => void,
  onOptimisticCancel?: (tempId: string) => void
}) {
  const columnRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Enable auto-scroll for the column's vertical scroll
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    return autoScrollForElements({
      element: el,
    });
  }, []);

  const handleComplete = (taskId: string) => {
    // Trigger confetti animation
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    patchMutation.mutate({ id: taskId, status: 'done' as TaskStatus })
  }

  const handleQuickAdd = (title: string) => {
    onQuickAdd?.(status, title)
  }

  return (
    <div
      ref={columnRef}
      className="rounded-xl p-4 flex flex-col flex-shrink-0 w-80 border-3 border-black relative"
      style={{
        background: 'var(--color-background)',
        boxShadow: 'var(--shadow-brutal)'
      }}
    >
      {/* Sticky header with drop zone */}
      <div className="sticky top-0 z-10"
           style={{ background: 'var(--color-background)' }}>
        <div className="flex items-center justify-between px-2 py-2 mb-3">
          <h3 className="font-bold capitalize text-xl"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
            {status === 'week' ? 'This Week' : status}
          </h3>
          <div className="flex items-center gap-2">
            {status === 'backlog' && onShowImport && (
              <button
                onClick={onShowImport}
                className="p-1.5 rounded-md border-2 border-black transition-all hover:translate-y-[-2px]"
                style={{ background: 'var(--color-surface)', boxShadow: '2px 2px 0px var(--color-border)' }}
                title="Import from Trello"
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-accent)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-surface)'}
              >
                <Upload size={16} style={{ color: 'var(--color-text)' }} />
              </button>
            )}
            <span className="text-sm font-bold rounded-md px-3 py-1 border-2 border-black"
                  style={{
                    background: 'var(--color-secondary)',
                    color: 'var(--color-text)',
                    fontFamily: 'var(--font-display)'
                  }}>
              {tasks.length}
            </span>
          </div>
        </div>

        {/* Drop zone that expands when dragging over */}
        <StickyHeaderDropZone status={status} onTaskDrop={onTaskDrop} />
      </div>

      {/* Quick Add Component */}
      {onQuickAdd && (
        <div className="px-1 mb-3">
          <QuickAdd status={status} onSubmit={handleQuickAdd} />
        </div>
      )}

      <div ref={scrollContainerRef} className="space-y-3 p-1 overflow-y-auto h-full custom-scrollbar">
        {tasks.length === 0 && !onQuickAdd && (
          <EmptyColumnDropZone status={status} onTaskDrop={onTaskDrop} />
        )}
        {tasks.map((task, index) => {
          // Handle optimistic tasks separately
          if (task.__optimistic) {
            return (
              <OptimisticTaskCard
                key={task.id}
                task={task}
                onRetry={onOptimisticRetry || (() => {})}
                onCancel={onOptimisticCancel || (() => {})}
                density={density}
              />
            )
          }

          // Regular tasks
          return (
            <TaskCard
              key={task.id}
              task={task}
              goal={goalsById[task.goal_id!]}
              index={index}
              isPending={patchMutation.isPending && patchMutation.variables?.id === task.id}
              onTaskDrop={onTaskDrop}
              onComplete={handleComplete}
              density={density}
            />
          )
        })}
        {(tasks.length === 0 && onQuickAdd) && (
          <EmptyColumnDropZone status={status} onTaskDrop={onTaskDrop} />
        )}
        {tasks.length > 0 && (
          <EndOfListDropZone status={status} index={tasks.length} onTaskDrop={onTaskDrop} />
        )}
      </div>
    </div>
  );
}

import { listGoals } from '../api/goals';

export default function TaskBoard() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<TaskFilters>({ statuses: BUCKETS });
  const [debouncedFilters, setDebouncedFilters] = useState<TaskFilters>({ statuses: BUCKETS });
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const horizontalScrollRef = useRef<HTMLDivElement>(null);

  // Optimistic creation hook
  const optimisticCreate = useOptimisticCreate();

  // Enable auto-scroll for horizontal scrolling between columns
  useEffect(() => {
    const el = horizontalScrollRef.current;
    if (!el) return;

    return autoScrollForElements({
      element: el,
    });
  }, []);

  // Debounce the filters to prevent re-renders during typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters]);
  
  const tasksQ = useQuery({
    queryKey: ['tasks', 'filtered', debouncedFilters],
    queryFn: () => listTasks(debouncedFilters),
    select: (data) => data.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
  });
  
  const handleFiltersChange = useCallback((newFilters: TaskFilters) => {
    setFilters(newFilters);
  }, []);
  const goalsQ = useQuery({ queryKey: qk.goals.all, queryFn: listGoals });

  const goalsById = useMemo(() => {
    if (!goalsQ.data || !Array.isArray(goalsQ.data)) return {};
    return goalsQ.data.reduce((acc, g) => ({ ...acc, [g.id]: g }), {});
  }, [goalsQ.data]);

  const tasks = tasksQ.data || [];

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    tasks.forEach(task => {
      task.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [tasks]);

  const columns = useMemo(() => {
    const grouped = new Map<TaskStatus, Task[]>();
    BUCKETS.forEach((s) => grouped.set(s, []));
    tasks.forEach((task) => {
      const taskStatus = task.status || 'backlog';
      if (!grouped.has(taskStatus)) {
        grouped.set(taskStatus, []);
      }
      grouped.get(taskStatus)!.push(task);
    });
    return grouped;
  }, [tasks]);

  const patchM = useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<Task>) => patchTask(id, input),
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await qc.cancelQueries({ queryKey: qk.tasks.byStatuses(BUCKETS) });
      
      // Snapshot the previous value
      const previousTasks = qc.getQueryData(qk.tasks.byStatuses(BUCKETS));
      
      // Optimistically update to the new value
      qc.setQueryData(qk.tasks.byStatuses(BUCKETS), (old: Task[] | undefined) => {
        if (!old) return old;
        return old.map(task => 
          task.id === variables.id ? { ...task, ...variables } : task
        );
      });
      
      // Return a context object with the snapshotted value
      return { previousTasks };
    },
    onError: (_err, _variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTasks) {
        qc.setQueryData(qk.tasks.byStatuses(BUCKETS), context.previousTasks);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tasks', 'filtered'] });
      qc.invalidateQueries({ queryKey: qk.tasks.byStatuses(BUCKETS) });
      qc.invalidateQueries({ queryKey: qk.tasks.byStatuses(['archived']) });
    },
  });

  // Modal state and functionality
  const [showImportModal, setShowImportModal] = useState(false);

  const handleQuickAdd = (status: TaskStatus, title: string) => {
    optimisticCreate.quickAdd(status, title, debouncedFilters);
  };

  const handleOptimisticRetry = (tempId: string) => {
    optimisticCreate.retry(tempId);
  };

  const handleOptimisticCancel = (tempId: string) => {
    optimisticCreate.cancel(tempId);
  };

  function handleTaskDrop(task: Task, newStatus: TaskStatus, targetIndex?: number) {
    const oldStatus = task.status;
    const tasksInNewCol = columns.get(newStatus) || [];

    // Trigger confetti if moving to 'done' status
    if (oldStatus !== 'done' && newStatus === 'done') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    // If no targetIndex provided, it's a legacy column drop (append to end)
    if (targetIndex === undefined) {
      if (oldStatus === newStatus) return;
      const newSortOrder = (tasksInNewCol[tasksInNewCol.length - 1]?.sort_order || 0) + 1000;

      patchM.mutate({
        id: task.id,
        status: newStatus,
        sort_order: newSortOrder,
      });
      return;
    }

    // Within-column or cross-column with specific positioning
    let newSortOrder: number;
    const prevTask = tasksInNewCol[targetIndex - 1];
    const nextTask = tasksInNewCol[targetIndex];

    newSortOrder = midpoint(prevTask?.sort_order, nextTask?.sort_order);

    // If same column and same position, no need to update
    if (oldStatus === newStatus) {
      const currentIndex = tasksInNewCol.findIndex(t => t.id === task.id);
      if (currentIndex === targetIndex || currentIndex === targetIndex - 1) {
        return;
      }
    }

    patchM.mutate({
      id: task.id,
      ...(oldStatus !== newStatus && { status: newStatus }),
      sort_order: newSortOrder,
    });
  }

  if (tasksQ.isLoading || goalsQ.isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Filters & Weekly Goals */}
      <TaskFiltersComponent
        filters={filters}
        onFiltersChange={handleFiltersChange}
        goals={goalsQ.data || []}
        allTags={allTags}
        density={density}
        onDensityChange={setDensity}
        taskCount={tasks.length}
        isLoading={tasksQ.isLoading}
      />

      {/* Task columns */}
      <div ref={horizontalScrollRef} className="overflow-x-auto flex-1 custom-scrollbar">
        <div className="min-w-[1200px] grid grid-flow-col auto-cols-[320px] gap-5 pb-6 h-full">
          {Array.from(columns.entries()).map(([status, tasks]) => (
          <TaskColumn
            key={status}
            status={status}
            tasks={tasks}
            onTaskDrop={handleTaskDrop}
            goalsById={goalsById}
            patchMutation={patchM}
            onShowImport={status === 'backlog' ? () => setShowImportModal(true) : undefined}
            onQuickAdd={handleQuickAdd}
            onOptimisticRetry={handleOptimisticRetry}
            onOptimisticCancel={handleOptimisticCancel}
            density={density}
          />
          ))}
        </div>
      </div>

      {/* Trello Import Modal */}
      <TrelloImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </div>
  );
}
