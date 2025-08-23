import React from 'react';
import { useEffect, useState } from 'react'

type Toast = { id: number; message: string; type?: 'success' | 'error' }

export function useToaster() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = (message: string, type: Toast['type'] = 'success') =>
    setToasts((t) => [...t, { id: Date.now() + Math.random(), message, type }])
  const remove = (id: number) => setToasts((t) => t.filter((x) => x.id !== id))
  return { toasts, push, remove }
}

export default function Toaster({ toasts, onClose }: { toasts: Toast[]; onClose: (id: number) => void }) {
  useEffect(() => {
    const timers = toasts.map((t) => setTimeout(() => onClose(t.id), 3000))
    return () => { timers.forEach(clearTimeout) }
  }, [toasts, onClose])

  return (
    <div aria-live="polite" aria-atomic="true" className="fixed top-4 right-4 space-y-2 z-50">
      {toasts.map((t) => (
        <div key={t.id} role="status" className={`rounded-xl px-4 py-2 shadow text-sm ${t.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}