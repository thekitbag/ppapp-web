import React, { useEffect, useState } from 'react'
import type { RecommendationItem } from '../api/recommendations'

export default function SuggestWeekModal({ open, suggestions, onClose, onConfirm }: {
  open: boolean
  suggestions: RecommendationItem[]
  onClose: () => void
  onConfirm: (ids: Array<string | number>) => void
}) {
  const [checked, setChecked] = useState<Record<string | number, boolean>>({})

  useEffect(() => {
    if (open) {
      const initial: Record<string | number, boolean> = {}
      suggestions.forEach(s => { initial[s.task.id] = true })
      setChecked(initial)
    }
  }, [open, suggestions])

  if (!open) return null

  const selectedIds = Object.entries(checked).filter(([, v]) => v).map(([k]) => k)

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-4">
        <h2 className="text-lg font-semibold mb-2">Suggested tasks for this week</h2>
        <div className="max-h-80 overflow-auto divide-y">
          {suggestions.map((s) => (
            <label key={s.task.id} className="flex items-start gap-3 p-2">
              <input
                aria-label={`Select ${s.task.title}`}
                type="checkbox"
                checked={!!checked[s.task.id]}
                onChange={(e) => setChecked((c) => ({ ...c, [s.task.id]: e.target.checked }))}
              />
              <div className="flex-1">
                <div className="font-medium">{s.task.title}</div>
                <div className="text-xs text-gray-600">{s.why}</div>
                {s.task.tags?.length ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {s.task.tags.map((t, i) => (
                      <span key={`${t}-${i}`} className="text-xs rounded-full px-2 py-1 bg-blue-100 text-blue-700">{t}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="px-3 py-1.5 rounded-lg border" onClick={onClose}>Cancel</button>
          <button className="px-3 py-1.5 rounded-lg bg-primary text-white" onClick={() => onConfirm(selectedIds)}>Add to This Week</button>
        </div>
      </div>
    </div>
  )
}
