import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '../../test/utils'
import { TaskColumn } from '../TaskBoard'
import { Task, TaskStatus } from '../../types'

// ---- Shared mock state --------------------------------------------------------
// vi.hoisted ensures the registry is available inside vi.mock factory closures
const dropReg = vi.hoisted(() => {
  const registry: Array<{
    element: Element
    getData?: () => Record<string, unknown>
    onDragEnter?: (args: any) => void
    onDropTargetChange?: (args: any) => void
    onDragLeave?: (args?: any) => void
    onDrop?: (args: any) => void
  }> = []
  return { registry }
})

vi.mock('@atlaskit/pragmatic-drag-and-drop/element/adapter', () => ({
  draggable: () => () => {},
  dropTargetForElements: (config: any) => {
    dropReg.registry.push(config)
    return () => {
      const i = dropReg.registry.indexOf(config)
      if (i > -1) dropReg.registry.splice(i, 1)
    }
  },
}))

vi.mock('@atlaskit/pragmatic-drag-and-drop-auto-scroll/element', () => ({
  autoScrollForElements: () => () => {},
}))

vi.mock('canvas-confetti', () => ({ default: vi.fn() }))

vi.mock('../TaskCard', () => ({
  default: ({ task }: { task: Task }) => (
    <div data-testid={`task-card-${task.id}`}>{task.title}</div>
  ),
}))

vi.mock('../QuickAdd', () => ({
  default: () => <div data-testid="quick-add">QuickAdd</div>,
}))

vi.mock('../OptimisticTaskCard', () => ({
  default: ({ task }: { task: Task }) => <div data-testid={`opt-task-${task.id}`}>{task.title}</div>,
}))

// ---- Helpers -----------------------------------------------------------------

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test task',
    status: 'backlog' as TaskStatus,
    sort_order: 10,
    size: 1,
    tags: [],
    goal_id: null,
    __optimistic: false,
    ...overrides,
  } as Task
}

/** Returns the drop registration whose element matches the column scroll container */
function getColumnBodyReg(status: string) {
  const el = screen.getByTestId(`column-scroll-${status}`)
  const reg = dropReg.registry.find(r => r.element === el)
  return { el, reg }
}

/** Build a location object simulating the column body as the innermost target */
function columnBodyLocation(el: Element) {
  return { current: { dropTargets: [{ element: el }] } }
}

/** Build a location object simulating a card as the innermost target (column body is outer) */
function cardLocation(cardEl: Element, columnEl: Element) {
  return { current: { dropTargets: [{ element: cardEl }, { element: columnEl }] } }
}

// ---- Tests -------------------------------------------------------------------

describe('TaskBoard column-wide drop zone', () => {
  beforeEach(() => {
    dropReg.registry.length = 0
  })

  it('1. non-empty column whitespace drop — appends to end', () => {
    const onTaskDrop = vi.fn()
    const sourceTask = makeTask({ id: 'src-1', status: 'backlog' as TaskStatus })
    const existingTask = makeTask({ id: 'existing-1', title: 'Existing', status: 'today' as TaskStatus, sort_order: 100 })

    render(
      <TaskColumn
        status="today"
        tasks={[existingTask]}
        onTaskDrop={onTaskDrop}
        goalsById={{}}
        patchMutation={{ isPending: false, variables: undefined, mutate: vi.fn() }}
      />
    )

    const { el, reg } = getColumnBodyReg('today')
    expect(reg).toBeDefined()

    // Drop with column body as innermost target
    reg!.onDrop!({
      source: { data: { task: sourceTask } },
      location: columnBodyLocation(el),
    })

    // Should append at index = tasks.length = 1
    expect(onTaskDrop).toHaveBeenCalledWith(sourceTask, 'today', 1)
  })

  it('2. empty column drop — same append semantics', () => {
    const onTaskDrop = vi.fn()
    const sourceTask = makeTask({ id: 'src-2', status: 'backlog' as TaskStatus })

    render(
      <TaskColumn
        status="week"
        tasks={[]}
        onTaskDrop={onTaskDrop}
        goalsById={{}}
        patchMutation={{ isPending: false, variables: undefined, mutate: vi.fn() }}
      />
    )

    const { el, reg } = getColumnBodyReg('week')
    expect(reg).toBeDefined()

    reg!.onDrop!({
      source: { data: { task: sourceTask } },
      location: columnBodyLocation(el),
    })

    // tasks.length = 0, so targetIndex = 0
    expect(onTaskDrop).toHaveBeenCalledWith(sourceTask, 'week', 0)
  })

  it('3. card-level target takes precedence — column body does not fire onTaskDrop', () => {
    const onTaskDrop = vi.fn()
    const sourceTask = makeTask({ id: 'src-3', status: 'backlog' as TaskStatus })
    const existingTask = makeTask({ id: 'card-1', title: 'Card', status: 'today' as TaskStatus, sort_order: 50 })

    render(
      <TaskColumn
        status="today"
        tasks={[existingTask]}
        onTaskDrop={onTaskDrop}
        goalsById={{}}
        patchMutation={{ isPending: false, variables: undefined, mutate: vi.fn() }}
      />
    )

    const { el, reg } = getColumnBodyReg('today')
    expect(reg).toBeDefined()

    // Simulate drop where a card is the innermost target (card element ≠ column el)
    const fakeCardEl = document.createElement('div')
    reg!.onDrop!({
      source: { data: { task: sourceTask } },
      location: cardLocation(fakeCardEl, el),
    })

    // Column body handler should be a no-op; card handler fires separately
    expect(onTaskDrop).not.toHaveBeenCalled()
  })

  it('4. visual state — column highlight applies on drag enter and clears on leave', () => {
    const onTaskDrop = vi.fn()
    const existingTask = makeTask({ id: 'vis-1', title: 'Vis task', status: 'today' as TaskStatus, sort_order: 10 })

    render(
      <TaskColumn
        status="today"
        tasks={[existingTask]}
        onTaskDrop={onTaskDrop}
        goalsById={{}}
        patchMutation={{ isPending: false, variables: undefined, mutate: vi.fn() }}
      />
    )

    const { el, reg } = getColumnBodyReg('today')
    expect(reg).toBeDefined()

    // Initially no highlight
    expect(el).toHaveAttribute('data-column-drag-over', 'false')

    // Drag enters with column as innermost target
    act(() => {
      reg!.onDragEnter!({ location: columnBodyLocation(el) })
    })
    expect(el).toHaveAttribute('data-column-drag-over', 'true')

    // Drag leaves
    act(() => {
      reg!.onDragLeave!()
    })
    expect(el).toHaveAttribute('data-column-drag-over', 'false')
  })

  it('5. same-column whitespace drop — no duplicate or invalid reorder', () => {
    const onTaskDrop = vi.fn()
    // Single task already at end; dropping it into whitespace = same position
    const task = makeTask({ id: 'same-1', title: 'Same col task', status: 'today' as TaskStatus, sort_order: 10 })

    render(
      <TaskColumn
        status="today"
        tasks={[task]}
        onTaskDrop={onTaskDrop}
        goalsById={{}}
        patchMutation={{ isPending: false, variables: undefined, mutate: vi.fn() }}
      />
    )

    const { el, reg } = getColumnBodyReg('today')
    expect(reg).toBeDefined()

    // Drop the same task onto the column body whitespace
    reg!.onDrop!({
      source: { data: { task } },
      location: columnBodyLocation(el),
    })

    // handleTaskDrop receives (task, 'today', 1)
    // Same-column check: currentIndex=0, targetIndex=1 => currentIndex === targetIndex-1 => no-op
    // The onTaskDrop prop IS called here (column fires it), but handleTaskDrop inside TaskBoard
    // is responsible for the no-op. We verify the column correctly surfaces targetIndex=tasks.length.
    expect(onTaskDrop).toHaveBeenCalledWith(task, 'today', 1)
  })
})
