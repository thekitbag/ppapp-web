import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from '../lib/queryKeys';
import { listTasks, patchTask } from '../api/tasks';
import { Task, TaskStatus } from '../types';
import { BUCKETS, midpoint } from '../constants';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';

function TaskCard({ task, project, goal, index, isPending, onTaskDrop }: { task: Task, project: any, goal: any, index: number, isPending?: boolean, onTaskDrop: (task: Task, newStatus: TaskStatus, targetIndex: number) => void }) {
  const ref = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

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

  return (
    <div className="relative">
      {dropPosition === 'before' && (
        <div className="absolute -top-1 left-0 right-0 h-0.5 bg-blue-400 rounded z-10" />
      )}
      <div
        ref={ref}
        className={`bg-white p-3 rounded-lg shadow-sm border transition-all ${
          isDragging ? 'opacity-50' : ''
        } ${isPending ? 'opacity-75 border-blue-300' : ''} ${
          dropPosition ? 'ring-2 ring-blue-200' : ''
        }`}
      >
        <p className="font-medium text-sm">
          {task.title}
          {isPending && <span className="ml-2 text-xs text-blue-500">Reordering…</span>}
        </p>
        <div className="text-xs text-gray-500 mt-2 space-y-1">
          {project && <div>Project: {project.name}</div>}
          {goal && <div>Goal: {goal.title}</div>}
          {task.soft_due_at && <div>Soft due: {formatDate(task.soft_due_at)}</div>}
          {task.hard_due_at && (
            <div className="font-semibold text-red-600">
              Due: {formatDate(task.hard_due_at)} (hard)
            </div>
          )}
        </div>
      </div>
      {dropPosition === 'after' && (
        <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-400 rounded z-10" />
      )}
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
      className={`h-20 border-2 border-dashed rounded-lg flex items-center justify-center text-sm transition-all ${
        isDraggedOver ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-gray-300 text-gray-500'
      }`}
    >
      Drop tasks here
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
      className={`h-3 transition-all ${
        isDraggedOver ? 'bg-blue-400 h-1 rounded' : ''
      }`}
    />
  );
}

function TaskColumn({ status, tasks, onTaskDrop, projectsById, goalsById, patchMutation }: { status: TaskStatus; tasks: Task[]; onTaskDrop: (task: Task, newStatus: TaskStatus, targetIndex?: number) => void; projectsById: any, goalsById: any, patchMutation: any }) {

  return (
    <div
      className="bg-gray-100 rounded-xl p-4 flex-1 min-w-[250px]"
    >
      <h3 className="font-semibold capitalize mb-4 px-1">
        {status} ({tasks.length})
      </h3>
      <div className="space-y-3">
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
  const tasksQ = useQuery({
    queryKey: qk.tasks.byStatuses(BUCKETS),
    queryFn: () => listTasks(BUCKETS),
    select: (data) => data.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
  });
  const projectsQ = useQuery({ queryKey: qk.projects.all, queryFn: listProjects });
  const goalsQ = useQuery({ queryKey: qk.goals.all, queryFn: listGoals });

  const projectsById = useMemo(() => {
    if (!projectsQ.data) return {};
    return projectsQ.data.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
  }, [projectsQ.data]);
  const goalsById = useMemo(() => {
    if (!goalsQ.data) return {};
    return goalsQ.data.reduce((acc, g) => ({ ...acc, [g.id]: g }), {});
  }, [goalsQ.data]);

  const tasks = tasksQ.data || [];

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
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTasks) {
        qc.setQueryData(qk.tasks.byStatuses(BUCKETS), context.previousTasks);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.tasks.byStatuses(BUCKETS) });
    },
  });

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
    <div className="flex gap-6 overflow-x-auto pb-4">
      {Array.from(columns.entries()).map(([status, tasks]) => (
        <TaskColumn 
          key={status} 
          status={status} 
          tasks={tasks} 
          onTaskDrop={handleTaskDrop} 
          projectsById={projectsById} 
          goalsById={goalsById}
          patchMutation={patchM}
        />
      ))}
    </div>
  );
}
