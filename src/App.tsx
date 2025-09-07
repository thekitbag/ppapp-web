import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { qk } from './lib/queryKeys'
import { STATUS_ORDER } from './constants'
import { useAuth } from './hooks/useAuth'
import Toaster, { useToaster } from './components/Toaster'
import TaskBoard from './components/TaskBoard'
import TaskForm, { TaskFormValues } from './components/TaskForm'
import ProjectsPage from './components/ProjectsPage'
import GoalsPage from './components/GoalsPage'
import GoalDetailPage from './components/GoalDetailPage'
import ArchivePage from './components/ArchivePage'
import LoginPage from './components/LoginPage'
import { createTask } from './api/tasks'

export default function App() {
  // All hooks must be called before any early returns
  const { isAuthenticated, isLoading, user, logout, requiresLogin, login, devLogin } = useAuth()
  const [currentView, setCurrentView] = useState<'tasks' | 'projects' | 'goals' | 'archive'>('tasks')
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const t = useToaster()
  const qc = useQueryClient()
  
  const createM = useMutation({
    mutationFn: (vals: TaskFormValues) => {
      const tags = vals.tags.split(',').map(s => s.trim()).filter(Boolean)
      return createTask({
        title: vals.title,
        tags,
        project_id: vals.project_id,
        goal_id: vals.goal_id,
        hard_due_at: vals.hard_due_at ? new Date(vals.hard_due_at).toISOString() : null,
        soft_due_at: vals.soft_due_at ? new Date(vals.soft_due_at).toISOString() : null,
        status: 'week',
      })
    },
    onSuccess: () => {
      t.push('Task created')
      qc.invalidateQueries({ queryKey: qk.tasks.byStatuses(STATUS_ORDER) })
    },
    onError: () => t.push('Failed to create task', 'error'),
  })

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show login page if not authenticated and login is required
  if (!isAuthenticated && requiresLogin) {
    return <LoginPage />
  }

  // Show login options if not authenticated but login is optional (local dev)
  if (!isAuthenticated && !requiresLogin) {
    const isLocalDev = import.meta.env.DEV
    
    
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 w-full max-w-md text-center shadow-lg">
          <h1 className="text-2xl font-semibold mb-6">EigenTask</h1>
          <p className="text-gray-600 mb-6">You are not authenticated. Choose an option to continue:</p>
          
          <div className="space-y-4">
            <button
              onClick={login}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              Sign in with Microsoft
            </button>
            
            {isLocalDev && (
              <button
                onClick={devLogin}
                className="w-full px-4 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors"
              >
                Dev Login (Local Only)
              </button>
            )}
            
            <p className="text-sm text-gray-500 mt-4">
              {isLocalDev ? 'Local development mode' : 'Production mode'}
            </p>
            <p className="text-xs text-gray-400 mt-2">API: /api/v1</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-gray-100 font-sans">
      <header className="px-6 py-4 border-b bg-primary text-white shadow">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold">EigenTask</div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-white/80">
                {user?.name || user?.email}
              </span>
              <button
                onClick={logout}
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
          
          <nav className="flex space-x-1">
            <button
              onClick={() => setCurrentView('tasks')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentView === 'tasks' 
                  ? 'bg-white/20 text-white' 
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Tasks
            </button>
            <button
              onClick={() => setCurrentView('projects')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentView === 'projects' 
                  ? 'bg-white/20 text-white' 
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Projects
            </button>
            <button
              onClick={() => {
                setCurrentView('goals')
                setSelectedGoalId(null)
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentView === 'goals' 
                  ? 'bg-white/20 text-white' 
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Goals
            </button>
            <button
              onClick={() => setCurrentView('archive')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentView === 'archive' 
                  ? 'bg-white/20 text-white' 
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Archive
            </button>
          </nav>
        </div>
      </header>
      
      <main className="p-6 space-y-8">
        {currentView === 'tasks' ? (
          <>
            <div>
              <h2 className="text-xl font-semibold mb-3">Add a new task</h2>
              <TaskForm onSubmit={(v) => createM.mutate(v)} disabled={createM.isPending} />
            </div>
            <div className="max-w-7xl mx-auto">
              <TaskBoard />
            </div>
          </>
        ) : currentView === 'projects' ? (
          <ProjectsPage />
        ) : currentView === 'archive' ? (
          <ArchivePage />
        ) : currentView === 'goals' && selectedGoalId ? (
          <GoalDetailPage 
            goalId={selectedGoalId} 
            onBack={() => setSelectedGoalId(null)} 
          />
        ) : (
          <GoalsPage 
            selectedGoalId={selectedGoalId}
            onSelectGoal={setSelectedGoalId}
          />
        )}
      </main>
      
      <Toaster toasts={t.toasts} onClose={t.remove} />
      <footer className="mt-8 py-4 border-t text-center text-sm text-gray-500">© 2025 Personal Productivity App</footer>
    </div>
  )
}
