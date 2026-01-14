import type { Goal, GoalNode, GoalStatus, GoalCadence } from '../types'

export type SortOption = 'title' | 'end_date' | 'status' | 'type' | 'created_at'

// Priority orders for sorting
const TYPE_ORDER: Record<GoalCadence, number> = {
  annual: 0,
  quarterly: 1,
  weekly: 2
}

const STATUS_ORDER: Record<GoalStatus, number> = {
  on_target: 0,
  at_risk: 1,
  off_target: 2
}

/**
 * Get all goal IDs that are in the focused goal's tree
 * (ancestors + descendants + the focused goal itself)
 */
export function getTreeMemberIds(
  focusedGoalId: string,
  goalTree: GoalNode[]
): Set<string> {
  const memberIds = new Set<string>()

  // Find the focused goal node and collect its tree
  function findAndCollectTree(nodes: GoalNode[], parentChain: string[] = []): boolean {
    for (const node of nodes) {
      const currentChain = [...parentChain, node.id]

      if (node.id === focusedGoalId) {
        // Found it! Add all ancestors
        currentChain.forEach(id => memberIds.add(id))
        // Add all descendants
        collectDescendants(node)
        return true
      }

      // Recursively search children
      if (node.children.length > 0) {
        if (findAndCollectTree(node.children, currentChain)) {
          return true
        }
      }
    }
    return false
  }

  function collectDescendants(node: GoalNode) {
    memberIds.add(node.id)
    node.children.forEach(child => collectDescendants(child))
  }

  findAndCollectTree(goalTree)
  return memberIds
}

/**
 * Sort goal nodes recursively while maintaining tree structure
 */
export function sortGoalNodes(
  nodes: GoalNode[],
  sortBy: SortOption,
  sortOrder: 'asc' | 'desc'
): GoalNode[] {
  const sorted = [...nodes].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'title':
        comparison = a.title.localeCompare(b.title)
        break

      case 'end_date':
        // Push null dates to end
        if (!a.end_date && !b.end_date) comparison = 0
        else if (!a.end_date) comparison = 1
        else if (!b.end_date) comparison = -1
        else {
          const dateA = new Date(a.end_date).getTime()
          const dateB = new Date(b.end_date).getTime()
          comparison = dateA - dateB
        }
        break

      case 'status':
        // Push null status to end
        if (!a.status && !b.status) comparison = 0
        else if (!a.status) comparison = 1
        else if (!b.status) comparison = -1
        else {
          comparison = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
        }
        break

      case 'type':
        // Push null type to end
        if (!a.type && !b.type) comparison = 0
        else if (!a.type) comparison = 1
        else if (!b.type) comparison = -1
        else {
          comparison = TYPE_ORDER[a.type] - TYPE_ORDER[b.type]
        }
        break

      case 'created_at':
        const createdA = new Date(a.created_at).getTime()
        const createdB = new Date(b.created_at).getTime()
        comparison = createdA - createdB
        break
    }

    // Apply sort order
    return sortOrder === 'asc' ? comparison : -comparison
  })

  // Recursively sort children
  return sorted.map(node => ({
    ...node,
    children: node.children.length > 0
      ? sortGoalNodes(node.children, sortBy, sortOrder)
      : node.children
  }))
}

/**
 * Flatten goal tree into a flat array of goals
 * Useful for mutations that work with flat structure
 */
export function flattenGoalTree(tree: GoalNode[]): Goal[] {
  const flat: Goal[] = []

  function traverse(node: GoalNode) {
    // Extract base Goal properties (without children and taskCount)
    const { children, taskCount, ...goal } = node
    flat.push(goal as Goal)

    // Recursively traverse children
    children.forEach(child => traverse(child))
  }

  tree.forEach(node => traverse(node))
  return flat
}

/**
 * Find a goal node by ID in the tree
 */
export function findGoalInTree(
  goalId: string,
  tree: GoalNode[]
): GoalNode | undefined {
  for (const node of tree) {
    if (node.id === goalId) return node
    if (node.children.length > 0) {
      const found = findGoalInTree(goalId, node.children)
      if (found) return found
    }
  }
  return undefined
}
