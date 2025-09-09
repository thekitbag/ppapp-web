import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTask } from '../api/tasks'
import type { Task } from '../types'

type UpdateTaskPayload = {
  id: string
  patch: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>
}

export function useTaskUpdateMutation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, patch }: UpdateTaskPayload) => updateTask(id, patch),
    
    onMutate: async ({ id, patch }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      
      // Snapshot the previous value
      const previousData = queryClient.getQueriesData<Task[]>({ queryKey: ['tasks'] })
      
      // Optimistically update all task queries
      previousData.forEach(([queryKey, data]) => {
        if (!data) return
        
        const updatedData = data.map(task => 
          task.id === id ? { ...task, ...patch } : task
        )
        
        queryClient.setQueryData(queryKey, updatedData)
      })
      
      // Also update individual task query if it exists
      const individualTaskData = queryClient.getQueryData<Task>(['task', id])
      if (individualTaskData) {
        queryClient.setQueryData(['task', id], { ...individualTaskData, ...patch })
      }
      
      return { previousData }
    },
    
    onError: (_error, _variables, context) => {
      // Rollback optimistic updates on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    
    onSuccess: (updatedTask) => {
      // Invalidate and refetch task lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      
      // If task's project changed, invalidate projects
      if (updatedTask.project_id) {
        queryClient.invalidateQueries({ queryKey: ['projects'] })
      }
      
      // If task's goal changed, invalidate goals and goals tree
      if (updatedTask.goal_id) {
        queryClient.invalidateQueries({ queryKey: ['goals'] })
        queryClient.invalidateQueries({ queryKey: ['goals', 'tree'] })
      }
      
      // Update the individual task query
      queryClient.setQueryData(['task', updatedTask.id], updatedTask)
    },
  })
}
