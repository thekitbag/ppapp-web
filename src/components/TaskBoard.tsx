import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from '../lib/queryKeys';
import { listTasks, patchTask, promoteTasksToWeek, type TaskFilters } from '../api/tasks';
import { suggestWeek } from '../api/recommendations';
import { Task, TaskStatus } from '../types';
import { BUCKETS, midpoint } from '../constants';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { Calendar, Flag, Target, Sparkles, Archive, Upload, Edit, Check, X } from 'lucide-react';
import SuggestWeekModal from './SuggestWeekModal';
import TrelloImportModal from './TrelloImportModal';
import TaskEditDrawer from './TaskEditDrawer';
import TaskFiltersComponent from './TaskFilters';
import { useTaskUpdateMutation } from '../hooks/useTaskMutation';

function InfoBadge({ icon: Icon, label, colorClass }: { icon: React.ElementType, label: string, colorClass?: string }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${colorClass || 'bg-gray-200 text-gray-700'}`}>
      <Icon size={14} />
      <span>{label}</span>
    </div>
  );
}

function ProjectChip({ project, colorClass }: { project: any, colorClass?: string }) {
  const daysUntilMilestone = project?.milestone_due_at ? 
    Math.ceil((new Date(project.milestone_due_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null

  return (
    <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${colorClass || 'bg-blue-100 text-blue-800'}`}>
      <div 
        className="w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: project?.color || '#3B82F6' }}
      />
      <span>{project?.name || 'Unknown Project'}</span>
      {daysUntilMilestone !== null && daysUntilMilestone <= 14 && daysUntilMilestone >= 0 && (
        <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-full ml-1">
          {daysUntilMilestone === 0 ? 'Today' : 
           daysUntilMilestone === 1 ? '1d' : 
           `${daysUntilMilestone}d`}
        </span>
      )}
    </div>
  );
}

function TaskCard({ task, project, goal, index, isPending, onTaskDrop, onArchive }: { task: Task, project: any, goal: any, index: number, isPending?: boolean, onTaskDrop: (task: Task, newStatus: TaskStatus, targetIndex: number) => void, onArchive: (taskId: string) => void }) {
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
        <div className="absolute -top-1.5 left-0 right-0 h-1 bg-blue-500 rounded-full z-10" />
      )}
      <div
        ref={ref}
        className={`bg-white p-4 rounded-xl shadow-md border border-gray-200/80 transition-all flex flex-col gap-3 ${
          isDragging ? 'opacity-40 scale-95' : ''
        } ${isPending ? 'opacity-75 border-blue-400' : ''} ${
          dropPosition ? 'ring-2 ring-blue-300' : ''
        }`}
      >
        <div className="flex items-start justify-between">
          {isQuickEditing ? (
            <div className="flex-1 mr-2">
              <input
                type="text"
                value={quickEditTitle}
                onChange={(e) => setQuickEditTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full font-semibold text-base text-gray-800 bg-transparent border border-primary rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>
          ) : (
            <p 
              className="font-semibold text-base text-gray-800 leading-tight truncate flex-1 mr-2 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setIsQuickEditing(true);
              }}
              title={task.title.length > 40 ? `${task.title} (Click to edit)` : "Click to edit title"}
            >
              {task.title}
              {isPending && <span className="ml-2 text-xs text-blue-600 font-normal">Updating...</span>}
            </p>
          )}
          
          <div className="flex items-center gap-1 flex-shrink-0">
            {isQuickEditing ? (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickEditSave();
                  }}
                  className="text-green-600 hover:text-green-800 p-1 rounded transition-colors"
                  title="Save changes"
                  disabled={updateMutation.isPending}
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickEditCancel();
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
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
                    setIsEditDrawerOpen(true);
                  }}
                  className="text-gray-400 hover:text-blue-600 p-1 rounded transition-colors"
                  title="Edit task"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive(task.id);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
                  title="Archive task"
                >
                  <Archive size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {project && <ProjectChip project={project} />}
          {goal && <InfoBadge icon={Target} label={goal.title} colorClass="bg-green-100 text-green-800" />}
          {task.goals && task.goals.length > 0 && (
            <div className="flex items-center gap-1">
              {task.goals.slice(0, 1).map(g => (
                <InfoBadge key={g.id} icon={Target} label={g.title} colorClass="bg-purple-100 text-purple-800" />
              ))}
              {task.goals.length > 1 && (
                <InfoBadge icon={Target} label={`+${task.goals.length - 1}`} colorClass="bg-purple-100 text-purple-800" />
              )}
            </div>
          )}
        </div>

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
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar size={16} />
                    <span>{formatDate(task.soft_due_at)} (soft)</span>
                  </div>
                )}
                {task.hard_due_at && (
                  <div className="flex items-center gap-2 text-sm font-semibold text-red-600">
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
        <div className="absolute -bottom-1.5 left-0 right-0 h-1 bg-blue-500 rounded-full z-10" />
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

  return (
    <div
      ref={ref}
      className={`h-full border-2 border-dashed rounded-xl flex items-center justify-center text-sm transition-all ${
        isDraggedOver ? 'border-blue-400 bg-blue-100/50 text-blue-700' : 'border-gray-300/80 text-gray-500'
      }`}
    >
      Drop task here
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
        isDraggedOver ? 'bg-blue-500 h-1' : ''
      }`}
    />
  );
}

function TaskColumn({ status, tasks, onTaskDrop, projectsById, goalsById, patchMutation, onShowImport }: { status: TaskStatus; tasks: Task[]; onTaskDrop: (task: Task, newStatus: TaskStatus, targetIndex?: number) => void; projectsById: any, goalsById: any, patchMutation: any, onShowImport?: () => void }) {
  const handleArchive = (taskId: string) => {
    patchMutation.mutate({ id: taskId, status: 'archived' as TaskStatus })
  }

  return (
    <div
      className="bg-gray-100/80 rounded-2xl p-2 flex flex-col flex-shrink-0 w-80"
    >
      <div className="flex items-center justify-between px-2 py-1 mb-2">
        <h3 className="font-semibold capitalize text-lg text-gray-800">
          {status === 'week' ? 'This Week' : status}
        </h3>
        <div className="flex items-center gap-2">
          {status === 'backlog' && onShowImport && (
            <button
              onClick={onShowImport}
              className="text-gray-600 hover:text-gray-800 p-1 rounded transition-colors"
              title="Import from Trello"
            >
              <Upload size={16} />
            </button>
          )}
          <span className="text-sm font-medium bg-gray-200/80 text-gray-600 rounded-full px-2.5 py-0.5">
            {tasks.length}
          </span>
        </div>
      </div>
      <div className="space-y-3 p-1 overflow-y-auto h-full">
        {tasks.length === 0 && (
          <EmptyColumnDropZone status={status} onTaskDrop={onTaskDrop} />
        )}
        {tasks.map((task, index) => (
          <TaskCard 
            key={task.id}
            task={task} 
            project={projectsById[task.project_id!]} 
            goal={goalsById[task.goal_id!]} 
            index={index}
            isPending={patchMutation.isPending && patchMutation.variables?.id === task.id}
            onTaskDrop={onTaskDrop}
            onArchive={handleArchive}
          />
        ))}
        {tasks.length > 0 && (
          <EndOfListDropZone status={status} index={tasks.length} onTaskDrop={onTaskDrop} />
        )}
      </div>
    </div>
  );
}

import { listProjects } from '../api/projects';
import { listGoals } from '../api/goals';

export default function TaskBoard() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<TaskFilters>({ statuses: BUCKETS });
  const [debouncedFilters, setDebouncedFilters] = useState<TaskFilters>({ statuses: BUCKETS });
  
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
  const projectsQ = useQuery({ queryKey: qk.projects.all, queryFn: listProjects });
  const goalsQ = useQuery({ queryKey: qk.goals.all, queryFn: listGoals });

  const projectsById = useMemo(() => {
    if (!projectsQ.data || !Array.isArray(projectsQ.data)) return {};
    return projectsQ.data.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
  }, [projectsQ.data]);
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
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  const suggestedTasksQ = useQuery({
    queryKey: qk.recs.suggestWeek,
    queryFn: () => suggestWeek(20), // Get more recommendations to choose from
    enabled: showSuggestModal, // Only fetch when modal is open
  });

  const promoteMutation = useMutation({
    mutationFn: promoteTasksToWeek,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', 'filtered'] });
      qc.invalidateQueries({ queryKey: qk.tasks.byStatuses(BUCKETS) });
      qc.invalidateQueries({ queryKey: qk.recs.suggestWeek });
      setShowSuggestModal(false);
      // Could add a toast notification here
    },
    onError: (error) => {
      console.error('Failed to promote tasks:', error);
      // Could add error toast here
    }
  });

  const handleSuggestWeek = () => {
    setShowSuggestModal(true);
  };

  const handlePromoteTasks = (taskIds: string[]) => {
    if (taskIds.length > 0) {
      promoteMutation.mutate(taskIds);
    }
  };

  function handleTaskDrop(task: Task, newStatus: TaskStatus, targetIndex?: number) {
    const oldStatus = task.status;
    const tasksInNewCol = columns.get(newStatus) || [];
    
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

  if (tasksQ.isLoading || projectsQ.isLoading || goalsQ.isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-screen bg-gray-50 flex flex-col">
      {/* Header with Suggest Week button */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Task Board</h1>
        <button 
          onClick={handleSuggestWeek}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Sparkles size={16} />
          Suggest Tasks for Week
        </button>
      </div>

      {/* Filters */}
      <TaskFiltersComponent
        filters={filters}
        onFiltersChange={handleFiltersChange}
        projects={projectsQ.data || []}
        goals={goalsQ.data || []}
        allTags={allTags}
      />

      {/* Task columns */}
      <div className="flex gap-6 flex-1 overflow-x-auto">
        {Array.from(columns.entries()).map(([status, tasks]) => (
          <TaskColumn
            key={status}
            status={status}
            tasks={tasks}
            onTaskDrop={handleTaskDrop}
            projectsById={projectsById}
            goalsById={goalsById}
            patchMutation={patchM}
            onShowImport={status === 'backlog' ? () => setShowImportModal(true) : undefined}
          />
        ))}
      </div>

      {/* Suggest Week Modal */}
      <SuggestWeekModal 
        open={showSuggestModal}
        tasks={suggestedTasksQ.data?.map(item => item.task) || []}
        onClose={() => setShowSuggestModal(false)}
        onConfirm={handlePromoteTasks}
        isLoading={suggestedTasksQ.isLoading}
      />

      {/* Trello Import Modal */}
      <TrelloImportModal 
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </div>
  );
}
