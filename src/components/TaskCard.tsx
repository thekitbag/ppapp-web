import { useState, useEffect, useRef } from 'react';
import { Task, TaskStatus } from '../types';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { Calendar, Flag, Target, Edit, Check, X, CheckCircle } from 'lucide-react';
import TaskEditDrawer from './TaskEditDrawer';
import { useTaskUpdateMutation } from '../hooks/useTaskMutation';
import InfoBadge from './InfoBadge';

export default function TaskCard({ task, goal, index, isPending, onTaskDrop, onComplete, density = 'comfortable' }: { task: Task, goal: any, index: number, isPending?: boolean, onTaskDrop: (task: Task, newStatus: TaskStatus, targetIndex: number) => void, onComplete: (taskId: string) => void, density?: 'comfortable' | 'compact' }) {
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

  // Check if task has 'request' tag
  const hasRequestTag = task.tags.some(tag => tag.toLowerCase() === 'request');

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
        className={`rounded-lg border-3 transition-all flex flex-col ${
          density === 'compact' ? 'p-3 gap-2' : 'p-4 gap-3'
        } ${
          isDragging ? 'opacity-40 scale-95' : ''
        } ${isPending ? 'opacity-75' : ''} ${
          dropPosition ? 'ring-4 ring-offset-2 ring-teal-500' : ''
        } ${
          hasRequestTag ? 'border-orange-500' : 'border-black'
        }`}
        style={{
          background: hasRequestTag ? 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)' : 'var(--color-surface)',
          boxShadow: isDragging ? 'var(--shadow-subtle)' : hasRequestTag ? '4px 4px 0px #FB923C' : 'var(--shadow-brutal)',
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
                  title="Complete task"
                  aria-label="Complete task"
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
                  aria-label="Edit task"
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

        {/* Tags Row */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {task.tags.map((tag, idx) => {
              const isRequest = tag.toLowerCase() === 'request';
              return (
                <span
                  key={idx}
                  className={`text-xs px-2 py-1 rounded-md font-medium border-2 ${
                    isRequest
                      ? 'bg-orange-100 text-orange-800 border-orange-400'
                      : 'bg-blue-100 text-blue-800 border-blue-300'
                  }`}
                  style={{
                    fontFamily: 'var(--font-body)',
                    boxShadow: isRequest ? '1px 1px 0px #FB923C' : '1px 1px 0px #3B82F6'
                  }}
                >
                  {tag}
                </span>
              );
            })}
          </div>
        )}

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
