import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { qk } from '../lib/queryKeys'
import { getGoal, createKR, linkTasksToGoal, type CreateKRInput } from '../api/goals'
import { listTasks } from '../api/tasks'
import { listProjects } from '../api/projects'
import { ArrowLeft, Plus, Target, Link, TrendingUp } from 'lucide-react'
import { BUCKETS } from '../constants'

interface KRFormData {
  name: string
  target_value: string
  unit: string
  baseline_value: string
}

function KRModal({ 
  open, 
  onClose, 
  onSubmit, 
  isLoading 
}: { 
  open: boolean
  onClose: () => void
  onSubmit: (data: CreateKRInput) => void
  isLoading?: boolean
}) {
  const [formData, setFormData] = useState<KRFormData>({
    name: '',
    target_value: '',
    unit: '',
    baseline_value: ''
  })

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.target_value) return

    onSubmit({
      name: formData.name.trim(),
      target_value: parseFloat(formData.target_value),
      unit: formData.unit.trim(),
      baseline_value: formData.baseline_value ? parseFloat(formData.baseline_value) : null
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-2xl p-6 w-full max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kr-modal-title"
      >
        <h2 id="kr-modal-title" className="text-xl font-semibold mb-4">Add Key Result</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="kr-name" className="block text-sm font-medium text-gray-700 mb-1">
              Key Result Name *
            </label>
            <input
              id="kr-name"
              type="text"
              required
              className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Increase NPS from 45 → 55"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="target-value" className="block text-sm font-medium text-gray-700 mb-1">
                Target Value *
              </label>
              <input
                id="target-value"
                type="number"
                step="any"
                required
                className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="55"
                value={formData.target_value}
                onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
              />
            </div>
            
            <div>
              <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
                Unit
              </label>
              <input
                id="unit"
                type="text"
                className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="NPS, %, users"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label htmlFor="baseline-value" className="block text-sm font-medium text-gray-700 mb-1">
              Baseline Value (optional)
            </label>
            <input
              id="baseline-value"
              type="number"
              step="any"
              className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder="45"
              value={formData.baseline_value}
              onChange={(e) => setFormData({ ...formData, baseline_value: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.name.trim() || !formData.target_value || isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Adding...' : 'Add KR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TaskLinkModal({ 
  open, 
  onClose, 
  linkedTaskIds,
  onSubmit, 
  isLoading 
}: { 
  open: boolean
  onClose: () => void
  linkedTaskIds: string[]
  onSubmit: (taskIds: string[]) => void
  isLoading?: boolean
}) {
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])

  const tasksQ = useQuery({ 
    queryKey: qk.tasks.byStatuses(BUCKETS), 
    queryFn: () => listTasks(BUCKETS) 
  })
  const projectsQ = useQuery({ 
    queryKey: qk.projects.all, 
    queryFn: listProjects 
  })

  if (!open) return null

  const tasks = tasksQ.data || []
  const projects = projectsQ.data || []
  const projectsById = projects.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as any)

  // Filter out tasks that are already linked
  const availableTasks = tasks.filter(task => !linkedTaskIds.includes(task.id))

  const handleTaskToggle = (taskId: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  const handleSubmit = () => {
    if (selectedTaskIds.length > 0) {
      onSubmit(selectedTaskIds)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-link-modal-title"
      >
        <h2 id="task-link-modal-title" className="text-xl font-semibold mb-4">Link Tasks to Goal</h2>
        
        <div className="flex-1 overflow-auto border border-gray-200 rounded-lg mb-4">
          {availableTasks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              All tasks are already linked to this goal
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {availableTasks.map(task => (
                <label key={task.id} className="flex items-start gap-3 p-4 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTaskIds.includes(task.id)}
                    onChange={() => handleTaskToggle(task.id)}
                    className="mt-1.5 h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 mb-1">{task.title}</div>
                    <div className="flex items-center gap-2 text-sm">
                      {task.project_id && projectsById[task.project_id] && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {projectsById[task.project_id].name}
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs ${{
                        'backlog': 'bg-gray-100 text-gray-800',
                        'week': 'bg-blue-100 text-blue-800',
                        'today': 'bg-green-100 text-green-800',
                        'doing': 'bg-yellow-100 text-yellow-800',
                        'waiting': 'bg-orange-100 text-orange-800',
                        'done': 'bg-purple-100 text-purple-800'
                      }[task.status] || 'bg-gray-100 text-gray-800'}`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-gray-600">
            {selectedTaskIds.length > 0 ? `${selectedTaskIds.length} task${selectedTaskIds.length === 1 ? '' : 's'} selected` : 'No tasks selected'}
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={selectedTaskIds.length === 0 || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Linking...' : `Link ${selectedTaskIds.length} Task${selectedTaskIds.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GoalDetailPage({ 
  goalId, 
  onBack 
}: { 
  goalId: string
  onBack: () => void 
}) {
  const qc = useQueryClient()
  const [showKRModal, setShowKRModal] = useState(false)
  const [showTaskLinkModal, setShowTaskLinkModal] = useState(false)

  const goalDetailQ = useQuery({
    queryKey: qk.goals.detail(goalId),
    queryFn: () => getGoal(goalId)
  })

  const createKRM = useMutation({
    mutationFn: (input: CreateKRInput) => createKR(goalId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.goals.detail(goalId) })
      setShowKRModal(false)
    }
  })

  const linkTasksM = useMutation({
    mutationFn: (taskIds: string[]) => linkTasksToGoal(goalId, taskIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.goals.detail(goalId) })
      qc.invalidateQueries({ queryKey: qk.tasks.byStatuses(BUCKETS) })
      setShowTaskLinkModal(false)
    }
  })

  if (goalDetailQ.isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">Loading goal details...</div>
      </div>
    )
  }

  if (goalDetailQ.error || !goalDetailQ.data) {
    return (
      <div className="p-6">
        <div className="text-red-600">Error loading goal details</div>
      </div>
    )
  }

  const { goal, krs, tasks } = goalDetailQ.data

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
          Back to Goals
        </button>
      </div>

      {/* Goal Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">{goal.title}</h1>
            {goal.description && (
              <p className="text-gray-600 mb-3">{goal.description}</p>
            )}
            {goal.type && (
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${{
                'annual': 'bg-purple-100 text-purple-800',
                'quarterly': 'bg-blue-100 text-blue-800',
                'weekly': 'bg-green-100 text-green-800'
              }[goal.type] || 'bg-gray-100 text-gray-800'}`}>
                {goal.type}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Key Results Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Key Results</h2>
          <button
            onClick={() => setShowKRModal(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
          >
            <Plus size={16} />
            Add KR
          </button>
        </div>

        {krs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No KRs yet</p>
            <p>Add a key result to measure progress toward this goal</p>
          </div>
        ) : (
          <div className="space-y-3">
            {krs.map(kr => (
              <div key={kr.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">{kr.name}</h3>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-blue-600">
                      {kr.target_value} {kr.unit}
                    </div>
                    {kr.baseline_value && (
                      <div className="text-sm text-gray-500">
                        from {kr.baseline_value} {kr.unit}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Linked Tasks Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Linked Tasks</h2>
          <button
            onClick={() => setShowTaskLinkModal(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
          >
            <Link size={16} />
            Link Tasks
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Target size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No tasks linked</p>
            <p>Link tasks from your backlog to connect them to this goal</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map(task => (
              <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">{task.title}</h3>
                  <div className="flex items-center gap-2">
                    {task.project_id && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        Project
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs ${{
                      'backlog': 'bg-gray-100 text-gray-800',
                      'week': 'bg-blue-100 text-blue-800',
                      'today': 'bg-green-100 text-green-800',
                      'doing': 'bg-yellow-100 text-yellow-800',
                      'waiting': 'bg-orange-100 text-orange-800',
                      'done': 'bg-purple-100 text-purple-800'
                    }[task.status] || 'bg-gray-100 text-gray-800'}`}>
                      {task.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <KRModal
        open={showKRModal}
        onClose={() => setShowKRModal(false)}
        onSubmit={(data) => createKRM.mutate(data)}
        isLoading={createKRM.isPending}
      />

      <TaskLinkModal
        open={showTaskLinkModal}
        onClose={() => setShowTaskLinkModal(false)}
        linkedTaskIds={tasks.map(t => t.id)}
        onSubmit={(taskIds) => linkTasksM.mutate(taskIds)}
        isLoading={linkTasksM.isPending}
      />
    </div>
  )
}