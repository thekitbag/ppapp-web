import React, { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listTasks, patchTask } from '../api/tasks'
import { Task, TaskStatus } from '../types'
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const STATUS_ORDER: TaskStatus[] = ['backlog', 'week', 'today', 'doing', 'waiting', 'done']

function TaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="bg-white p-3 rounded-lg shadow-sm border">
      <p className="font-medium text-sm">{task.title}</p>
      <div className="text-xs text-gray-500 mt-2 space-y-1">
        {task.project_id && <div>Project: {task.project_id}</div>}
        {task.goal_id && <div>Goal: {task.goal_id}</div>}
        {task.soft_due_at && <div>Soft due: {formatDate(task.soft_due_at)}</div>}
        {task.hard_due_at && <div className="font-semibold text-red-600">Due: {formatDate(task.hard_due_at)} (hard)</div>}
      </div>
    </div>
  )
}

function TaskColumn({ status, tasks }: { status: TaskStatus; tasks: Task[] }) {
  const { setNodeRef } = useSortable({ id: status, data: { type: 'container' } })
  const taskIds = useMemo(() => tasks.map(t => t.id), [tasks])

  return (
    <div ref={setNodeRef} className="bg-gray-100 rounded-xl p-4 flex-1 min-w-[250px]">
      <h3 className="font-semibold capitalize mb-4 px-1">{status} ({tasks.length})</h3>
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {tasks.map(task => <TaskCard key={task.id} task={task} />)}
        </div>
      </SortableContext>
    </div>
  )
}

export default function TaskBoard() {
  const qc = useQueryClient()
  const tasksQ = useQuery({
    queryKey: ['tasks'],
    queryFn: () => listTasks(STATUS_ORDER),
    select: (data) => data.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
  })

  const tasks = tasksQ.data || []

  const columns = useMemo(() => {
    const grouped = new Map<TaskStatus, Task[]>()
    STATUS_ORDER.forEach(s => grouped.set(s, []))
    tasks.forEach(task => {
      grouped.get(task.status)?.push(task)
    })
    return grouped
  }, [tasks])

  const patchM = useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<Task>) => patchTask(id, input),
    onMutate: async (variables) => {
      await qc.cancelQueries({ queryKey: ['tasks'] })
      const previousTasks = qc.getQueryData<Task[]>(['tasks'])
      qc.setQueryData<Task[]>(['tasks'], old =>
        old!.map(t => t.id === variables.id ? { ...t, ...variables } : t)
      )
      return { previousTasks }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTasks) {
        qc.setQueryData(['tasks'], context.previousTasks)
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeTask = tasks.find(t => t.id === active.id)
    if (!activeTask) return

    const overContainerId = over.data.current?.sortable.containerId || over.id
    const newStatus = STATUS_ORDER.find(s => s === overContainerId)

    const itemsInNewCol = columns.get(newStatus!) || []
    const overIndex = itemsInNewCol.findIndex(t => t.id === over.id)

    let newSortOrder: number;
    if (overIndex === -1) { // Dropped on column, not on a specific item
        const lastTask = itemsInNewCol[itemsInNewCol.length -1]
        newSortOrder = (lastTask?.sort_order || 0) + 1000
    } else {
        const afterTask = itemsInNewCol[overIndex]
        const beforeTask = itemsInNewCol[overIndex - 1]
        const afterOrder = afterTask?.sort_order || 0

        if (!beforeTask) { // Dropped at the beginning
            newSortOrder = afterOrder - 1000
        } else { // Dropped in the middle
            newSortOrder = (beforeTask.sort_order + afterOrder) / 2
        }
    }

    patchM.mutate({
      id: active.id as string,
      status: newStatus,
      sort_order: newSortOrder,
    })
  }

  return (
    <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
      <div className="flex gap-6 overflow-x-auto pb-4">
        {Array.from(columns.entries()).map(([status, tasks]) => (
          <TaskColumn key={status} status={status} tasks={tasks} />
        ))}
      </div>
    </DndContext>
  )
}
