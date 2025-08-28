import React from 'react'
import TaskList from './components/TaskList'
import Toaster, { useToaster } from './components/Toaster'

export default function App() {
  const t = useToaster()
  return (
    <div className="min-h-dvh bg-gray-100">
      <header className="px-6 py-4 border-b bg-primary text-white shadow">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="text-lg font-semibold">Personal Chief of Staff</div>
          <nav className="text-sm">Alpha — Day-3</nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-6 space-y-8">
        <TaskList onToast={t.push} />
      </main>
      <Toaster toasts={t.toasts} onClose={t.remove} />
      <footer className="mt-8 py-4 border-t text-center text-sm text-gray-500">© 2025 Personal Productivity App</footer>
    </div>
  )
}
