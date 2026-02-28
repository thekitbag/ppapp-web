import { useState, useEffect } from 'react'
import { Zap, Clock, ChevronLeft, X } from 'lucide-react'
import { getNextRecommendations, type EnergyLevel, type RecommendationItem } from '../api/recommendations'

type Step = 'energy' | 'time' | 'results'

interface TimeWindowOption {
  label: string
  minutes: number
}

const ENERGY_OPTIONS: { level: EnergyLevel; label: string; description: string; color: string }[] = [
  { level: 'low', label: 'Low', description: 'Need something easy', color: '#4ADE80' },
  { level: 'medium', label: 'Medium', description: 'Ready for a challenge', color: 'var(--color-secondary)' },
  { level: 'high', label: 'High', description: 'Firing on all cylinders', color: 'var(--color-primary)' },
]

const TIME_WINDOWS: TimeWindowOption[] = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: '4h+', minutes: 240 },
]

function SkeletonCard() {
  return (
    <div
      className="rounded-xl border-3 border-black p-4 animate-pulse"
      style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-subtle)' }}
      aria-hidden="true"
    >
      <div className="h-4 rounded-md mb-3 w-3/4" style={{ background: 'var(--color-border)' }} />
      <div
        className="pl-3"
        style={{ borderLeft: '3px solid var(--color-border)' }}
      >
        <div className="space-y-2">
          <div className="h-3 rounded-md w-full" style={{ background: 'var(--color-border)' }} />
          <div className="h-3 rounded-md w-5/6" style={{ background: 'var(--color-border)' }} />
          <div className="h-3 rounded-md w-2/3" style={{ background: 'var(--color-border)' }} />
        </div>
      </div>
    </div>
  )
}

function RecommendationCard({ item, onSelect }: { item: RecommendationItem; onSelect: () => void }) {
  return (
    <div
      className="rounded-xl border-3 border-black p-4"
      style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-subtle)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <p
          className="font-bold text-base"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
        >
          {item.task.title}
        </p>
        <button
          onClick={onSelect}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg border-2 border-black text-sm font-bold transition-all hover:translate-y-[-2px]"
          style={{
            background: 'var(--color-primary)',
            color: 'white',
            boxShadow: '2px 2px 0px var(--color-border)',
            fontFamily: 'var(--font-display)',
          }}
          aria-label={`Start ${item.task.title}`}
        >
          Start
        </button>
      </div>
      <div
        className="pl-3"
        style={{ borderLeft: '3px solid var(--color-primary)' }}
      >
        <p
          className="text-sm leading-relaxed"
          style={{ color: 'var(--color-text)' }}
        >
          {item.why}
        </p>
      </div>
    </div>
  )
}

export default function TaskSuggestionModal({
  open,
  onClose,
  onSelectTask,
}: {
  open: boolean
  onClose: () => void
  onSelectTask: (taskId: string) => void
}) {
  const [step, setStep] = useState<Step>('energy')
  const [energy, setEnergy] = useState<EnergyLevel | null>(null)
  const [timeWindow, setTimeWindow] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [results, setResults] = useState<RecommendationItem[] | null>(null)

  // Reset all state when modal opens
  useEffect(() => {
    if (open) {
      setStep('energy')
      setEnergy(null)
      setTimeWindow(null)
      setIsLoading(false)
      setIsError(false)
      setResults(null)
    }
  }, [open])

  const fetchSuggestions = async (selectedEnergy: EnergyLevel, selectedTimeWindow: number) => {
    setIsLoading(true)
    setIsError(false)
    setResults(null)
    try {
      const data = await getNextRecommendations({ energy: selectedEnergy, time_window: selectedTimeWindow })
      setResults(data)
    } catch {
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEnergySelect = (level: EnergyLevel) => {
    setEnergy(level)
    setStep('time')
  }

  const handleTimeSelect = (minutes: number) => {
    setTimeWindow(minutes)
    setStep('results')
    fetchSuggestions(energy!, minutes)
  }

  const handleRetry = () => {
    if (energy !== null && timeWindow !== null) {
      fetchSuggestions(energy, timeWindow)
    }
  }

  const handleSelect = (taskId: string) => {
    onSelectTask(taskId)
    onClose()
  }

  const handleBack = () => {
    if (step === 'time') {
      setStep('energy')
      setEnergy(null)
    } else if (step === 'results') {
      setStep('time')
      setTimeWindow(null)
      setResults(null)
      setIsError(false)
    }
  }

  if (!open) return null

  const selectedEnergy = ENERGY_OPTIONS.find(o => o.level === energy)
  const selectedTime = TIME_WINDOWS.find(t => t.minutes === timeWindow)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Suggest Task"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        className="w-full max-w-lg rounded-xl border-3 border-black flex flex-col"
        style={{ background: 'var(--color-background)', boxShadow: 'var(--shadow-brutal)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b-3 border-black"
          style={{ background: 'var(--color-surface)' }}
        >
          <div className="flex items-center gap-3">
            {step !== 'energy' && (
              <button
                onClick={handleBack}
                className="p-1.5 rounded-md border-2 border-black transition-all hover:translate-y-[-2px]"
                style={{ background: 'var(--color-background)', boxShadow: '2px 2px 0px var(--color-border)' }}
                aria-label="Back"
              >
                <ChevronLeft size={16} style={{ color: 'var(--color-text)' }} />
              </button>
            )}
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center border-2 border-black"
              style={{ background: 'var(--color-primary)' }}
            >
              <Zap size={18} style={{ color: 'white' }} />
            </div>
            <h2
              className="text-xl font-bold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
            >
              Suggest Task
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md border-2 border-black transition-all hover:translate-y-[-2px]"
            style={{ background: 'var(--color-background)', boxShadow: '2px 2px 0px var(--color-border)' }}
            aria-label="Close"
          >
            <X size={16} style={{ color: 'var(--color-text)' }} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Step 1: Energy */}
          {step === 'energy' && (
            <div>
              <p
                className="text-lg font-bold mb-1"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
              >
                How are you feeling?
              </p>
              <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>
                We'll match you with the right kind of task.
              </p>
              <div className="space-y-3">
                {ENERGY_OPTIONS.map(({ level, label, description, color }) => (
                  <button
                    key={level}
                    onClick={() => handleEnergySelect(level)}
                    className="w-full flex items-center gap-4 rounded-xl border-3 border-black px-5 py-4 text-left transition-all hover:translate-y-[-2px]"
                    style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-subtle)' }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg border-2 border-black flex-shrink-0"
                      style={{ background: color }}
                    />
                    <div>
                      <div
                        className="font-bold"
                        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
                      >
                        {label}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Time window */}
          {step === 'time' && (
            <div>
              <p
                className="text-lg font-bold mb-1"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
              >
                How big is your time window?
              </p>
              {selectedEnergy && (
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Energy:
                  </span>
                  <span
                    className="text-sm font-bold px-2 py-0.5 rounded-md border-2 border-black"
                    style={{ background: selectedEnergy.color, color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}
                  >
                    {selectedEnergy.label}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-5 gap-2">
                {TIME_WINDOWS.map(({ label, minutes }) => (
                  <button
                    key={minutes}
                    onClick={() => handleTimeSelect(minutes)}
                    className="flex flex-col items-center justify-center rounded-xl border-3 border-black py-4 font-bold transition-all hover:translate-y-[-2px]"
                    style={{
                      fontFamily: 'var(--font-display)',
                      background: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      boxShadow: 'var(--shadow-subtle)',
                    }}
                  >
                    <Clock size={16} className="mb-1" style={{ color: 'var(--color-text-muted)' }} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Results */}
          {step === 'results' && (
            <div>
              {/* Summary pills */}
              <div className="flex items-center gap-2 mb-5 flex-wrap">
                {selectedEnergy && (
                  <span
                    className="text-sm font-bold px-3 py-1 rounded-md border-2 border-black"
                    style={{ background: selectedEnergy.color, color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}
                  >
                    {selectedEnergy.label} energy
                  </span>
                )}
                {selectedTime && (
                  <span
                    className="text-sm font-bold px-3 py-1 rounded-md border-2 border-black"
                    style={{ background: 'var(--color-secondary)', color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}
                  >
                    {selectedTime.label}
                  </span>
                )}
              </div>

              {/* Loading — skeleton cards */}
              {isLoading && (
                <div role="status" aria-label="Loading suggestions">
                  <span className="sr-only">Finding your best tasks...</span>
                  <div className="space-y-3">
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </div>
                </div>
              )}

              {/* Error */}
              {isError && !isLoading && (
                <div className="rounded-xl border-3 border-black p-8 text-center" role="alert">
                  <div className="text-4xl mb-3" aria-hidden="true">⚠️</div>
                  <p
                    className="font-bold mb-4"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
                  >
                    Failed to load suggestions
                  </p>
                  <button
                    onClick={handleRetry}
                    className="btn-brutal px-5 py-2 rounded-lg font-bold text-white"
                    style={{ background: 'var(--color-primary)', fontFamily: 'var(--font-display)' }}
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Empty */}
              {!isLoading && !isError && results?.length === 0 && (
                <div className="rounded-xl border-3 border-black p-8 text-center">
                  <Zap size={40} className="mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
                  <p
                    className="font-bold"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
                  >
                    No suggestions right now
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    Try a different energy level or time window.
                  </p>
                </div>
              )}

              {/* Results list */}
              {!isLoading && !isError && results && results.length > 0 && (
                <div className="space-y-3">
                  {results.map((item, i) => (
                    <RecommendationCard
                      key={item.task.id ?? i}
                      item={item}
                      onSelect={() => handleSelect(item.task.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
