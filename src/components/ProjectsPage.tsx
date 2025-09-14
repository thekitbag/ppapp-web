import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { qk } from '../lib/queryKeys'
import { listProjects, createProject, patchProject, type CreateProjectInput } from '../api/projects'
import { Plus, Calendar, Target, Clock } from 'lucide-react'

interface ProjectFormData {
  name: string
  color: string
  milestone_title: string
  milestone_due_at: string
}

function ProjectModal({ 
  open, 
  onClose, 
  project, 
  onSubmit, 
  isLoading 
}: { 
  open: boolean
  onClose: () => void
  project?: any
  onSubmit: (data: CreateProjectInput) => void
  isLoading?: boolean
}) {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: project?.name || '',
    color: project?.color || '#3B82F6',
    milestone_title: project?.milestone_title || '',
    milestone_due_at: project?.milestone_due_at ? project.milestone_due_at.slice(0, 16) : ''
  })
  
  const [errors, setErrors] = useState<Partial<ProjectFormData>>({})
  
  const nameInputRef = useRef<HTMLInputElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  // Focus management
  useEffect(() => {
    if (open && nameInputRef.current) {
      nameInputRef.current.focus()
    }
  }, [open])

  // Escape key handling
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Backdrop click handling
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) {
      onClose()
    }
  }

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clear previous errors
    setErrors({})
    
    // Validate required fields
    const newErrors: Partial<ProjectFormData> = {}
    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSubmit({
      name: formData.name.trim(),
      color: formData.color || null,
      milestone_title: formData.milestone_title.trim() || null,
      milestone_due_at: formData.milestone_due_at ? new Date(formData.milestone_due_at).toISOString() : null
    })
  }

  const handleInputChange = (field: keyof ProjectFormData, value: string) => {
    setFormData({ ...formData, [field]: value })
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined })
    }
  }

  return (
    <div 
      ref={backdropRef}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-2xl p-6 w-full max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-title" className="text-xl font-semibold mb-4">
          {project ? 'Edit Project' : 'Create New Project'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Project Name *
            </label>
            <input
              id="name"
              ref={nameInputRef}
              type="text"
              required
              className={`w-full border rounded-xl px-3 py-2 focus:ring-2 ${
                errors.name ? 'border-red-300 focus:ring-red-500' : 'focus:ring-blue-500'
              }`}
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
            {errors.name && (
              <div id="name-error" className="text-sm text-red-600 mt-1">
                {errors.name}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">
              Color
            </label>
            <input
              id="color"
              type="color"
              className="w-full border rounded-xl px-3 py-2 h-12 focus:ring-2 focus:ring-blue-500"
              value={formData.color}
              onChange={(e) => handleInputChange('color', e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="milestone-title" className="block text-sm font-medium text-gray-700 mb-1">
              Milestone Title
            </label>
            <input
              id="milestone-title"
              type="text"
              className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
              value={formData.milestone_title}
              onChange={(e) => handleInputChange('milestone_title', e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="milestone-date" className="block text-sm font-medium text-gray-700 mb-1">
              Milestone Date
            </label>
            <input
              id="milestone-date"
              type="datetime-local"
              className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
              value={formData.milestone_due_at}
              onChange={(e) => handleInputChange('milestone_due_at', e.target.value)}
              aria-describedby="date-format"
            />
            <div id="date-format" className="text-xs text-gray-500 mt-1">
              Select date and time for the milestone
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.name.trim() || isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : project ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function formatDaysUntil(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return 'Overdue'
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  return `in ${diffDays} days`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  })
}

export default function ProjectsPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingProject, setEditingProject] = useState<any>(null)

  const projectsQ = useQuery({ 
    queryKey: qk.projects.all, 
    queryFn: listProjects 
  })

  const createM = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.projects.all })
      qc.invalidateQueries({ queryKey: qk.recs.all })
      setShowModal(false)
    }
  })

  const patchM = useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<CreateProjectInput>) => 
      patchProject(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.projects.all })
      qc.invalidateQueries({ queryKey: qk.recs.all })
      setEditingProject(null)
    }
  })

  const sortedProjects = useMemo(() => {
    if (!projectsQ.data) return []
    
    return [...projectsQ.data].sort((a, b) => {
      // Sort by soonest milestone first; null milestones pushed to end, then by name
      if (a.milestone_due_at && b.milestone_due_at) {
        return new Date(a.milestone_due_at).getTime() - new Date(b.milestone_due_at).getTime()
      }
      if (a.milestone_due_at && !b.milestone_due_at) return -1
      if (!a.milestone_due_at && b.milestone_due_at) return 1
      return a.name.localeCompare(b.name)
    })
  }, [projectsQ.data])

  const handleCreateProject = () => {
    setEditingProject(null)
    setShowModal(true)
  }

  const handleEditProject = (project: any) => {
    setEditingProject(project)
  }

  const handleSubmit = (data: CreateProjectInput) => {
    if (editingProject) {
      patchM.mutate({ id: editingProject.id, ...data })
    } else {
      createM.mutate(data)
    }
  }

  if (projectsQ.isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">Loading projects...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Projects</h1>
        <button
          onClick={handleCreateProject}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {sortedProjects.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Target size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">No projects yet</p>
          <p>Create your first project to get started</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-4 font-semibold text-gray-700">Project</th>
                <th className="text-left p-4 font-semibold text-gray-700">Milestone</th>
                <th className="text-left p-4 font-semibold text-gray-700">Due</th>
                <th className="text-right p-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedProjects.map(project => {
                const isUpcoming = project.milestone_due_at && 
                  new Date(project.milestone_due_at).getTime() - new Date().getTime() < 14 * 24 * 60 * 60 * 1000
                
                return (
                  <tr key={project.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: project.color || '#3B82F6' }}
                          title={`Project color: ${project.color || '#3B82F6'}`}
                        />
                        <span className="font-medium">{project.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {project.milestone_title ? (
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-gray-400" />
                          <span>{project.milestone_title}</span>
                          {isUpcoming && (
                            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                              Upcoming
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">No milestone</span>
                      )}
                    </td>
                    <td className="p-4">
                      {project.milestone_due_at ? (
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-gray-400" />
                          <div>
                            <div className="font-medium">
                              {formatDaysUntil(project.milestone_due_at)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatDate(project.milestone_due_at)}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleEditProject(project)}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ProjectModal
        open={showModal || !!editingProject}
        onClose={() => {
          setShowModal(false)
          setEditingProject(null)
        }}
        project={editingProject}
        onSubmit={handleSubmit}
        isLoading={createM.isPending || patchM.isPending}
      />
    </div>
  )
}