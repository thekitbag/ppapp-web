import React from 'react'
import type { RecommendationItem } from '../api/recommendations'
import type { TaskStatus } from '../types'

export default function NextBestCard({ rec, onDone, onSnooze }: { rec: RecommendationItem; onDone: (id: string, status: TaskStatus) => void; onSnooze: (id: string) => void }) {
  const t = rec.task
  return (
    <div className="p-4 bg-white rounded-2xl shadow-md border border-blue-100">
      <div className="flex items-start justify-between">
        <div>
          <div className="inline-flex items-center gap-2 mb-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600 text-white">Recommended</span>
            <span className="text-xs text-gray-500">Score {Math.round(rec.score)}</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">{t.title}</h2>
          <p className="text-sm text-gray-600 mt-1">{rec.why}</p>
          {t.tags?.length ? (
            <div className="flex flex-wrap gap-1 mt-2">
              {t.tags.map((tag, i) => (
                <span key={`${tag}-${i}`} className="text-xs rounded-full px-2 py-1 bg-blue-100 text-blue-700">{tag}</span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={() => onDone(t.id, 'done')} className="px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700">Mark done</button>
        <button onClick={() => onSnooze(t.id)} className="px-3 py-1.5 rounded-lg border">Snooze / Override</button>
      </div>
    </div>
  )
}