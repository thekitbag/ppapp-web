import { useMemo, useRef, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { sortGoalNodes, type SortOption } from '../../lib/goalTreeUtils'
import GoalCard from './GoalCard'
import type { GoalNode, Task } from '../../types'

interface CardPosition {
  goalId: string
  x: number
  y: number
  width: number
  height: number
}

interface BucketRow {
  annualGoal?: GoalNode
  quarterlyGoal?: GoalNode
  weeklyGoal?: GoalNode
}

interface GoalTreeVisualizationProps {
  goals: GoalNode[]
  onStatusChange: (goalId: string, status: string) => void
  onEndDateChange: (goalId: string, date: string) => void
  onEdit?: (goal: GoalNode) => void
  onClose?: (goal: GoalNode) => void
  onDelete?: (goal: GoalNode) => void
  onCreateGoal?: (type: 'annual' | 'quarterly' | 'weekly', parentId?: string) => void
  onTaskClick?: (task: Task) => void
  onChangePriority?: (goalId: string, direction: 'up' | 'down') => void
  isReordering?: boolean
  // Focus mode props
  focusedGoalId?: string | null
  treeMemberIds?: Set<string>
  onGoalClick?: (goal: GoalNode) => void
  // Sorting props
  sortBy?: SortOption
  sortOrder?: 'asc' | 'desc'
}

export default function GoalTreeVisualization({
  goals,
  onStatusChange,
  onEndDateChange,
  onEdit,
  onClose,
  onDelete,
  onCreateGoal,
  onTaskClick,
  onChangePriority,
  isReordering = false,
  focusedGoalId,
  treeMemberIds,
  onGoalClick,
  sortBy = 'type',
  sortOrder = 'asc'
}: GoalTreeVisualizationProps) {
  // Sort goals
  const sortedGoals = useMemo(() => {
    return sortGoalNodes(goals, sortBy, sortOrder)
  }, [goals, sortBy, sortOrder])

  // Flatten into columns and build parent-child map
  const { annualGoals, quarterlyGoals, weeklyGoals, parentChildMap } = useMemo(() => {
    const annual: GoalNode[] = []
    const quarterly: GoalNode[] = []
    const weekly: GoalNode[] = []
    const parentMap = new Map<string, string>() // child ID -> parent ID

    function traverse(node: GoalNode, parentId?: string) {
      if (parentId) {
        parentMap.set(node.id, parentId)
      }

      if (node.type === 'annual') {
        annual.push(node)
      } else if (node.type === 'quarterly') {
        quarterly.push(node)
      } else if (node.type === 'weekly') {
        weekly.push(node)
      }

      // Recursively traverse children
      node.children.forEach(child => traverse(child, node.id))
    }

    sortedGoals.forEach(node => traverse(node))

    return {
      annualGoals: annual,
      quarterlyGoals: quarterly,
      weeklyGoals: weekly,
      parentChildMap: parentMap
    }
  }, [sortedGoals])

  // Get children of a goal
  const getChildren = (goalId: string, fromList: GoalNode[]) => {
    return fromList.filter(goal => parentChildMap.get(goal.id) === goalId)
  }

  // Build buckets: each annual goal gets a bucket with rows
  const buckets = useMemo(() => {
    return annualGoals.map(annualGoal => {
      const rows: BucketRow[] = []
      const quarterlyChildren = getChildren(annualGoal.id, quarterlyGoals)

      if (quarterlyChildren.length === 0) {
        // Annual goal with no quarterly children
        rows.push({
          annualGoal: annualGoal,
          quarterlyGoal: undefined,
          weeklyGoal: undefined
        })
      } else {
        let isFirstRow = true
        quarterlyChildren.forEach(qGoal => {
          const weeklyChildren = getChildren(qGoal.id, weeklyGoals)

          if (weeklyChildren.length === 0) {
            // Quarterly goal with no weekly children
            rows.push({
              annualGoal: isFirstRow ? annualGoal : undefined,
              quarterlyGoal: qGoal,
              weeklyGoal: undefined
            })
            isFirstRow = false
          } else {
            // Quarterly goal with weekly children - one row per weekly goal
            let isFirstQRow = true
            weeklyChildren.forEach(wGoal => {
              rows.push({
                annualGoal: isFirstRow ? annualGoal : undefined,
                quarterlyGoal: isFirstQRow ? qGoal : undefined,
                weeklyGoal: wGoal
              })
              isFirstRow = false
              isFirstQRow = false
            })
          }
        })
      }

      return { annualGoal, rows }
    })
  }, [annualGoals, quarterlyGoals, weeklyGoals, parentChildMap])

  // Check if goal is in tree
  const isInTree = (goalId: string) => {
    return !focusedGoalId || treeMemberIds?.has(goalId)
  }

  const isFocused = (goalId: string) => {
    return goalId === focusedGoalId
  }

  // Get parent of a goal
  const getParent = (goalId: string, fromList: GoalNode[]) => {
    const parentId = parentChildMap.get(goalId)
    return fromList.find(goal => goal.id === parentId)
  }

  // Track card positions for drawing connectors
  const containerRef = useRef<HTMLDivElement>(null)
  const [cardPositions, setCardPositions] = useState<Map<string, CardPosition>>(new Map())

  // Update card positions after render
  useEffect(() => {
    if (!containerRef.current) return

    const updatePositions = () => {
      const container = containerRef.current
      if (!container) return

      const containerRect = container.getBoundingClientRect()
      const newPositions = new Map<string, CardPosition>()

      // Find all goal cards
      const cards = container.querySelectorAll('[data-goal-id]')
      cards.forEach((card) => {
        const goalId = card.getAttribute('data-goal-id')
        if (!goalId) return

        const rect = card.getBoundingClientRect()
        newPositions.set(goalId, {
          goalId,
          x: rect.left - containerRect.left,
          y: rect.top - containerRect.top,
          width: rect.width,
          height: rect.height
        })
      })

      setCardPositions(newPositions)
    }

    // Update positions after initial render and on resize
    updatePositions()
    const observer = new ResizeObserver(updatePositions)
    observer.observe(containerRef.current)

    return () => observer.disconnect()
  }, [buckets])

  // Generate connector lines
  const connectorLines = useMemo(() => {
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number; visible: boolean }> = []

    // Connect quarterly to annual
    quarterlyGoals.forEach(goal => {
      const parent = getParent(goal.id, annualGoals)
      if (!parent) return

      const childPos = cardPositions.get(goal.id)
      const parentPos = cardPositions.get(parent.id)

      if (childPos && parentPos) {
        // From parent's right edge center to child's left edge center
        lines.push({
          x1: parentPos.x + parentPos.width,
          y1: parentPos.y + parentPos.height / 2,
          x2: childPos.x,
          y2: childPos.y + childPos.height / 2,
          visible: !!(isInTree(goal.id) && isInTree(parent.id))
        })
      }
    })

    // Connect weekly to quarterly
    weeklyGoals.forEach(goal => {
      const parent = getParent(goal.id, quarterlyGoals)
      if (!parent) return

      const childPos = cardPositions.get(goal.id)
      const parentPos = cardPositions.get(parent.id)

      if (childPos && parentPos) {
        lines.push({
          x1: parentPos.x + parentPos.width,
          y1: parentPos.y + parentPos.height / 2,
          x2: childPos.x,
          y2: childPos.y + childPos.height / 2,
          visible: !!(isInTree(goal.id) && isInTree(parent.id))
        })
      }
    })

    return lines
  }, [cardPositions, annualGoals, quarterlyGoals, weeklyGoals, parentChildMap, focusedGoalId, treeMemberIds])

  return (
    <div ref={containerRef} className="h-full overflow-auto p-6 relative">
      {/* SVG overlay for connector lines */}
      <svg
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0 }}
      >
        {connectorLines.map((line, index) => (
          line.visible && (
            <line
              key={index}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="var(--color-accent)"
              strokeWidth="2"
              strokeDasharray="5,5"
              opacity="0.6"
            />
          )
        ))}
      </svg>

      {/* Header row with column titles */}
      <div className="flex gap-6 mb-4" style={{ zIndex: 1, position: 'relative' }}>
        <div className="flex-1 min-w-[320px]">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-lg font-bold"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
              Annual Goals
            </h2>
            <button
              onClick={() => onCreateGoal?.('annual')}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold rounded-lg border-2 border-black transition-all hover:translate-y-[-1px]"
              style={{
                background: 'var(--color-surface)',
                boxShadow: 'var(--shadow-subtle)',
                fontFamily: 'var(--font-display)'
              }}
            >
              <Plus size={14} />
              Add
            </button>
          </div>
        </div>
        <div className="flex-1 min-w-[320px]">
          <h2 className="text-lg font-bold px-2"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
            Quarterly Goals
          </h2>
        </div>
        <div className="flex-1 min-w-[320px]">
          <h2 className="text-lg font-bold px-2"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
            Weekly Goals
          </h2>
        </div>
      </div>

      {/* Buckets - each annual goal and its descendants */}
      <div className="flex flex-col gap-8" style={{ zIndex: 1, position: 'relative' }}>
        {buckets.length === 0 ? (
          <div className="text-center py-12"
               style={{ color: 'var(--color-text-muted)' }}>
            <p className="text-lg mb-4 font-bold" style={{ fontFamily: 'var(--font-display)' }}>
              No annual goals yet
            </p>
            <button
              onClick={() => onCreateGoal?.('annual')}
              className="px-6 py-3 text-sm font-bold rounded-lg border-3 border-black transition-all hover:translate-y-[-2px]"
              style={{
                background: 'var(--color-accent)',
                color: 'white',
                boxShadow: 'var(--shadow-brutal)',
                fontFamily: 'var(--font-display)'
              }}
            >
              Create First Annual Goal
            </button>
          </div>
        ) : (
          buckets.map((bucket) => {
            const annualGoal = bucket.annualGoal
            return (
              <div key={annualGoal.id} className="flex flex-col gap-3">
                {bucket.rows.map((row, rowIdx) => (
                  <div key={`${annualGoal.id}-row-${rowIdx}`} className="flex gap-6">
                    {/* Annual column cell */}
                    <div className="flex-1 min-w-[320px]">
                      {row.annualGoal && (() => {
                        const goal = row.annualGoal
                        const annualIndex = annualGoals.findIndex(g => g.id === goal.id)
                        return (
                          <div
                            className="relative"
                            data-goal-id={goal.id}
                          >
                            <div
                              className={`transition-all ${
                                !isInTree(goal.id) ? 'opacity-30 blur-[1px] pointer-events-none' : ''
                              } ${
                                isFocused(goal.id) ? 'ring-3 ring-offset-2' : ''
                              }`}
                              style={{
                                ...(isFocused(goal.id) && {
                                  '--tw-ring-color': 'var(--color-accent)'
                                } as React.CSSProperties)
                              }}
                              onClick={() => isInTree(goal.id) && onGoalClick?.(goal)}
                            >
                              <GoalCard
                                goal={goal}
                                onStatusChange={onStatusChange}
                                onEndDateChange={onEndDateChange}
                                onEdit={() => onEdit?.(goal)}
                                onClose={() => onClose?.(goal)}
                                onDelete={() => onDelete?.(goal)}
                                onTaskClick={onTaskClick}
                                showTasks={true}
                                childCount={getChildren(goal.id, quarterlyGoals).length}
                                onIncreasePriority={() => onChangePriority?.(goal.id, 'up')}
                                onDecreasePriority={() => onChangePriority?.(goal.id, 'down')}
                                canMoveUp={annualIndex > 0}
                                canMoveDown={annualIndex < annualGoals.length - 1}
                                isReordering={isReordering}
                              />

                              {/* Add Quarterly Goal button */}
                              {isInTree(goal.id) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onCreateGoal?.('quarterly', goal.id)
                                  }}
                                  className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border-2 border-black transition-all hover:translate-y-[-1px]"
                                  style={{
                                    background: 'var(--color-accent)',
                                    color: 'white',
                                    boxShadow: '1px 1px 0px var(--color-border)',
                                    fontFamily: 'var(--font-body)'
                                  }}
                                >
                                  <Plus size={12} />
                                  Quarterly
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })()}
                    </div>

                    {/* Quarterly column cell */}
                    <div className="flex-1 min-w-[320px]">
                      {row.quarterlyGoal && (() => {
                        const goal = row.quarterlyGoal
                        const quarterlyIndex = quarterlyGoals.findIndex(g => g.id === goal.id)
                        return (
                          <div
                            className="relative"
                            data-goal-id={goal.id}
                          >
                            <div
                              className={`transition-all ${
                                !isInTree(goal.id) ? 'opacity-30 blur-[1px] pointer-events-none' : ''
                              } ${
                                isFocused(goal.id) ? 'ring-3 ring-offset-2' : ''
                              }`}
                              style={{
                                ...(isFocused(goal.id) && {
                                  '--tw-ring-color': 'var(--color-accent)'
                                } as React.CSSProperties)
                              }}
                              onClick={() => isInTree(goal.id) && onGoalClick?.(goal)}
                            >
                              <GoalCard
                                goal={goal}
                                onStatusChange={onStatusChange}
                                onEndDateChange={onEndDateChange}
                                onEdit={() => onEdit?.(goal)}
                                onClose={() => onClose?.(goal)}
                                onDelete={() => onDelete?.(goal)}
                                onTaskClick={onTaskClick}
                                showTasks={true}
                                childCount={getChildren(goal.id, weeklyGoals).length}
                                onIncreasePriority={() => onChangePriority?.(goal.id, 'up')}
                                onDecreasePriority={() => onChangePriority?.(goal.id, 'down')}
                                canMoveUp={quarterlyIndex > 0}
                                canMoveDown={quarterlyIndex < quarterlyGoals.length - 1}
                                isReordering={isReordering}
                              />

                              {/* Add Weekly Goal button */}
                              {isInTree(goal.id) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onCreateGoal?.('weekly', goal.id)
                                  }}
                                  className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border-2 border-black transition-all hover:translate-y-[-1px]"
                                  style={{
                                    background: 'var(--color-accent)',
                                    color: 'white',
                                    boxShadow: '1px 1px 0px var(--color-border)',
                                    fontFamily: 'var(--font-body)'
                                  }}
                                >
                                  <Plus size={12} />
                                  Weekly
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })()}
                    </div>

                    {/* Weekly column cell */}
                    <div className="flex-1 min-w-[320px]">
                      {row.weeklyGoal && (() => {
                        const goal = row.weeklyGoal
                        const weeklyIndex = weeklyGoals.findIndex(g => g.id === goal.id)
                        return (
                          <div
                            className="relative"
                            data-goal-id={goal.id}
                          >
                            <div
                              className={`transition-all ${
                                !isInTree(goal.id) ? 'opacity-30 blur-[1px] pointer-events-none' : ''
                              } ${
                                isFocused(goal.id) ? 'ring-3 ring-offset-2' : ''
                              }`}
                              style={{
                                ...(isFocused(goal.id) && {
                                  '--tw-ring-color': 'var(--color-accent)'
                                } as React.CSSProperties)
                              }}
                              onClick={() => isInTree(goal.id) && onGoalClick?.(goal)}
                            >
                              <GoalCard
                                goal={goal}
                                onStatusChange={onStatusChange}
                                onEndDateChange={onEndDateChange}
                                onEdit={() => onEdit?.(goal)}
                                onClose={() => onClose?.(goal)}
                                onDelete={() => onDelete?.(goal)}
                                onTaskClick={onTaskClick}
                                showTasks={true}
                                childCount={0}
                                onIncreasePriority={() => onChangePriority?.(goal.id, 'up')}
                                onDecreasePriority={() => onChangePriority?.(goal.id, 'down')}
                                canMoveUp={weeklyIndex > 0}
                                canMoveDown={weeklyIndex < weeklyGoals.length - 1}
                                isReordering={isReordering}
                              />
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
