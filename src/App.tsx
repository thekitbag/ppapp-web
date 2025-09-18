import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import Toaster, { useToaster } from './components/Toaster'
import TaskBoard from './components/TaskBoard'
import TaskEditor from './components/TaskEditor'
import ProjectsPage from './components/ProjectsPage'
import GoalsPage from './components/GoalsPage'
import GoalDetailPage from './components/GoalDetailPage'
import ArchivePage from './components/ArchivePage'
import LoginPage from './components/LoginPage'
export default function App() {
  // All hooks must be called before any early returns
  const { isAuthenticated, isLoading, user, logout, requiresLogin, login, devLogin } = useAuth()
  const [currentView, setCurrentView] = useState<'tasks' | 'projects' | 'goals' | 'archive'>('tasks')
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const [showGlobalTaskEditor, setShowGlobalTaskEditor] = useState(false)
  const t = useToaster()

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
            
            <button
              onClick={() => window.location.href = '/api/v1/auth/google/login'}
              className="w-full px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
            >
              Sign in with Google
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
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/80">
                  {user?.name || user?.email}
                </span>
                {user?.provider && (
                  <span className="text-xs px-2 py-1 bg-white/20 rounded-full text-white/70">
                    {user.provider === 'microsoft' ? 'MS' : user.provider === 'google' ? 'Google' : 'Dev'}
                  </span>
                )}
              </div>
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Task Board</h2>
              <button
                onClick={() => setShowGlobalTaskEditor(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add Task
              </button>
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
      
      {/* Global Task Editor */}
      <TaskEditor
        isOpen={showGlobalTaskEditor}
        defaultStatus="week"
        onClose={() => setShowGlobalTaskEditor(false)}
        onSuccess={() => {
          t.push('Task created')
          setShowGlobalTaskEditor(false)
        }}
      />
      
      <footer className="mt-8 py-4 border-t text-center text-sm text-gray-500">© 2025 Personal Productivity App</footer>
    </div>
  )
}
