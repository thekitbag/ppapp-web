import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import Toaster, { useToaster } from './components/Toaster'
import TaskBoard from './components/TaskBoard'
import TaskEditor from './components/TaskEditor'
import ProjectsPage from './components/ProjectsPage'
import GoalsPage from './components/GoalsPage'
import GoalDetailPage from './components/GoalDetailPage'
import ArchivePage from './components/ArchivePage'
import ReportingPage from './components/ReportingPage'
import LoginPage from './components/LoginPage'
export default function App() {
  // All hooks must be called before any early returns
  const { isAuthenticated, isLoading, user, logout, requiresLogin, login, devLogin } = useAuth()
  const [currentView, setCurrentView] = useState<'tasks' | 'projects' | 'goals' | 'archive' | 'insights'>('tasks')
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const [showGlobalTaskEditor, setShowGlobalTaskEditor] = useState(false)
  const t = useToaster()

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <div className="text-center z-10">
          <div className="relative inline-block mb-6">
            <div className="w-16 h-16 border-4 border-black rounded-full animate-spin mx-auto"
                 style={{ borderTopColor: 'var(--color-primary)', borderRightColor: 'var(--color-accent)' }}></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-black rounded-full opacity-20"></div>
          </div>
          <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Loading...</p>
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
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <div className="card-brutal p-8 w-full max-w-md text-center animate-slide-in z-10">
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-primary)' }}>
            EigenTask
          </h1>
          <div className="w-16 h-1 mx-auto mb-6" style={{ background: 'var(--color-accent)' }}></div>
          <p className="mb-8 text-lg" style={{ color: 'var(--color-text-muted)' }}>
            Choose your sign-in method
          </p>

          <div className="space-y-4">
            <button
              onClick={login}
              className="btn-brutal w-full px-6 py-4 rounded-lg text-white text-lg"
              style={{ background: 'var(--color-primary)' }}
            >
              Sign in with Microsoft
            </button>

            <button
              onClick={() => window.location.href = '/api/v1/auth/google/login'}
              className="btn-brutal w-full px-6 py-4 rounded-lg text-white text-lg"
              style={{ background: 'var(--color-accent)' }}
            >
              Sign in with Google
            </button>

            {isLocalDev && (
              <button
                onClick={devLogin}
                className="btn-brutal w-full px-6 py-4 rounded-lg text-white text-lg"
                style={{ background: 'var(--color-text)' }}
              >
                Dev Login (Local Only)
              </button>
            )}

            <div className="mt-6 pt-6 border-t-2 border-black/10">
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                {isLocalDev ? 'Local development mode' : 'Production mode'}
              </p>
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>API: /api/v1</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh relative" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="relative z-20 border-b-4 border-black"
              style={{ background: 'var(--color-surface)' }}>
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center border-3 border-black"
                   style={{ background: 'var(--color-primary)' }}>
                <span className="text-2xl">✦</span>
              </div>
              <div className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
                EigenTask
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 rounded-lg border-2 border-black/10"
                   style={{ background: 'var(--color-background)' }}>
                <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  {user?.name || user?.email}
                </span>
                {user?.provider && (
                  <span className="ml-2 text-xs px-2 py-1 rounded-full border border-black"
                        style={{ background: 'var(--color-secondary)', color: 'var(--color-text)' }}>
                    {user.provider === 'microsoft' ? 'MS' : user.provider === 'google' ? 'Google' : 'Dev'}
                  </span>
                )}
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 rounded-lg border-2 border-black font-medium transition-all hover:translate-x-[-2px] hover:translate-y-[-2px]"
                style={{
                  background: 'var(--color-surface)',
                  boxShadow: '2px 2px 0px var(--color-border)',
                  fontFamily: 'var(--font-display)'
                }}
              >
                Sign Out
              </button>
            </div>
          </div>

          <nav className="flex space-x-3">
            <button
              onClick={() => setCurrentView('tasks')}
              className={`px-6 py-3 rounded-lg font-bold transition-all border-3 border-black ${
                currentView === 'tasks'
                  ? 'translate-y-[-2px]'
                  : 'hover:translate-y-[-2px]'
              }`}
              style={{
                fontFamily: 'var(--font-display)',
                background: currentView === 'tasks' ? 'var(--color-primary)' : 'var(--color-surface)',
                color: currentView === 'tasks' ? 'white' : 'var(--color-text)',
                boxShadow: currentView === 'tasks' ? 'var(--shadow-brutal)' : 'var(--shadow-subtle)'
              }}
            >
              Tasks
            </button>
            <button
              onClick={() => {
                setCurrentView('goals')
                setSelectedGoalId(null)
              }}
              className={`px-6 py-3 rounded-lg font-bold transition-all border-3 border-black ${
                currentView === 'goals'
                  ? 'translate-y-[-2px]'
                  : 'hover:translate-y-[-2px]'
              }`}
              style={{
                fontFamily: 'var(--font-display)',
                background: currentView === 'goals' ? 'var(--color-accent)' : 'var(--color-surface)',
                color: currentView === 'goals' ? 'white' : 'var(--color-text)',
                boxShadow: currentView === 'goals' ? 'var(--shadow-brutal)' : 'var(--shadow-subtle)'
              }}
            >
              Goals
            </button>
            <button
              onClick={() => setCurrentView('archive')}
              className={`px-6 py-3 rounded-lg font-bold transition-all border-3 border-black ${
                currentView === 'archive'
                  ? 'translate-y-[-2px]'
                  : 'hover:translate-y-[-2px]'
              }`}
              style={{
                fontFamily: 'var(--font-display)',
                background: currentView === 'archive' ? 'var(--color-secondary)' : 'var(--color-surface)',
                color: currentView === 'archive' ? 'var(--color-text)' : 'var(--color-text)',
                boxShadow: currentView === 'archive' ? 'var(--shadow-brutal)' : 'var(--shadow-subtle)'
              }}
            >
              Archive
            </button>
            <button
              onClick={() => setCurrentView('insights')}
              className={`px-6 py-3 rounded-lg font-bold transition-all border-3 border-black ${
                currentView === 'insights'
                  ? 'translate-y-[-2px]'
                  : 'hover:translate-y-[-2px]'
              }`}
              style={{
                fontFamily: 'var(--font-display)',
                background: currentView === 'insights' ? '#7C3AED' : 'var(--color-surface)',
                color: currentView === 'insights' ? 'white' : 'var(--color-text)',
                boxShadow: currentView === 'insights' ? 'var(--shadow-brutal)' : 'var(--shadow-subtle)'
              }}
            >
              Insights
            </button>
          </nav>
        </div>
      </header>
      
      <main className="p-8 space-y-8 relative z-10">
        {currentView === 'tasks' ? (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
                  Task Board
                </h2>
                <div className="w-24 h-1 rounded-full" style={{ background: 'var(--color-primary)' }}></div>
              </div>
              <button
                onClick={() => setShowGlobalTaskEditor(true)}
                className="btn-brutal flex items-center gap-2 px-6 py-3 text-white rounded-lg"
                style={{ background: 'var(--color-primary)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span style={{ fontFamily: 'var(--font-display)' }}>Add Task</span>
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
        ) : currentView === 'insights' ? (
          <ReportingPage />
        ) : currentView === 'goals' && selectedGoalId ? (
          <GoalDetailPage
            goalId={selectedGoalId}
            onBack={() => setSelectedGoalId(null)}
          />
        ) : (
          <GoalsPage />
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
      
      <footer className="mt-12 py-6 border-t-4 border-black text-center relative z-10"
              style={{ background: 'var(--color-surface)' }}>
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-display)' }}>
          © 2025 EigenTask • Built with focus
        </p>
      </footer>
    </div>
  )
}
