import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listTasks, patchTask } from '../api/tasks';
import { Task, TaskStatus } from '../types';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';

const STATUS_ORDER: TaskStatus[] = ['backlog', 'week', 'today', 'doing', 'waiting', 'done'];

function TaskCard({ task }: { task: Task }) {
  const ref = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return combine(
      draggable({
        element: el,
        getInitialData: () => ({ task }),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      })
    );
  }, [task]);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div
      ref={ref}
      className={`bg-white p-3 rounded-lg shadow-sm border ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <p className="font-medium text-sm">{task.title}</p>
      <div className="text-xs text-gray-500 mt-2 space-y-1">
        {task.project_id && <div>Project: {task.project_id}</div>}
        {task.goal_id && <div>Goal: {task.goal_id}</div>}
        {task.soft_due_at && <div>Soft due: {formatDate(task.soft_due_at)}</div>}
        {task.hard_due_at && (
          <div className="font-semibold text-red-600">
            Due: {formatDate(task.hard_due_at)} (hard)
          </div>
        )}
      </div>
    </div>
  );
}

function TaskColumn({ status, tasks, onTaskDrop }: { status: TaskStatus; tasks: Task[]; onTaskDrop: (task: Task, newStatus: TaskStatus) => void; }) {
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
      className={`bg-gray-100 rounded-xl p-4 flex-1 min-w-[250px] ${
        isDraggedOver ? 'bg-gray-200' : ''
      }`}
    >
      <h3 className="font-semibold capitalize mb-4 px-1">
        {status} ({tasks.length})
      </h3>
      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

export default function TaskBoard() {
  const qc = useQueryClient();
  const tasksQ = useQuery({
    queryKey: ['tasks', STATUS_ORDER],
    queryFn: () => listTasks(STATUS_ORDER),
    select: (data) => data.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
  });

  const tasks = tasksQ.data || [];

  const columns = useMemo(() => {
    const grouped = new Map<TaskStatus, Task[]>();
    STATUS_ORDER.forEach((s) => grouped.set(s, []));
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', STATUS_ORDER] });
    },
  });

  function handleTaskDrop(task: Task, newStatus: TaskStatus) {
    const oldStatus = task.status;
    if (oldStatus === newStatus) return;

    const tasksInNewCol = columns.get(newStatus) || [];
    const newSortOrder = (tasksInNewCol[tasksInNewCol.length - 1]?.sort_order || 0) + 1000;

    patchM.mutate({
      id: task.id,
      status: newStatus,
      sort_order: newSortOrder,
    });
  }

  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      {Array.from(columns.entries()).map(([status, tasks]) => (
        <TaskColumn key={status} status={status} tasks={tasks} onTaskDrop={handleTaskDrop} />
      ))}
    </div>
  );
}
