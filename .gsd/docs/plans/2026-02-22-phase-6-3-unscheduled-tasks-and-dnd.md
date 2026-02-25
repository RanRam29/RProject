# Phase 6.3 — Unscheduled Tasks & @dnd-kit Drag-and-Drop

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** (1) Make unscheduled tasks visible with a "click to schedule" ghost state, (2) Add an "out-of-range" indicator for tasks whose dates fall outside the current view, and (3) Replace the broken Framer-Motion drag with a working @dnd-kit implementation that shows real-time date preview during drag.

**Architecture:**
- `GanttGrid.tsx` gains three UI improvements: ghost state polish, out-of-range chip, and a `DndContext`+`DragOverlay` wrapper.  
- `GanttTaskBar.tsx` drops Framer Motion `drag` props entirely and adds `useDraggable` from `@dnd-kit/core`.  
- `GanttWidget/index.tsx` gets optimistic cache updates in `timelineMutation` so the bar moves instantly on drag-end.

**Tech Stack:** `@dnd-kit/core` (already installed), `framer-motion` (kept for `whileHover`), `lucide-react`, React Query optimistic mutations.

---

## Codebase Snapshot (read before coding)

| File | Relevant lines |
|------|----------------|
| `packages/client/src/components/widgets/GanttWidget/GanttGrid.tsx` | L31 `safeDate`, L86–89 `pxPerDay`, L168–189 `barRects`, L192–200 old `handleDragEnd`, L471–558 bar-rendering loop |
| `packages/client/src/components/widgets/GanttWidget/GanttTaskBar.tsx` | Full file — `motion.div` with `drag='x'` must be replaced |
| `packages/client/src/components/widgets/GanttWidget/index.tsx` | L60–93 `timelineMutation` |
| `packages/client/src/components/widgets/GanttWidget/ganttGridHelpers.ts` | `addDays`, `format`, `differenceInDays` re-exports |

---

## Task 1 — Ghost State Polish + Out-of-Range Indicator

**Files:**
- Modify: `packages/client/src/components/widgets/GanttWidget/GanttGrid.tsx`
- Create: `packages/client/src/components/widgets/GanttWidget/GanttGrid.unscheduled.test.tsx`

### Step 1 — Write failing tests

Create `packages/client/src/components/widgets/GanttWidget/GanttGrid.unscheduled.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GanttGrid } from './GanttGrid';
import type { TaskDTO, TaskStatusDTO } from '@pm/shared';

const baseTask: TaskDTO = {
  id: 't1', title: 'Task One', statusId: 's1', projectId: 'p1',
  assigneeId: null, assignee: null, priority: 'MEDIUM',
  startDate: null, dueDate: null, estimatedHours: null,
  progressPercentage: 0, isMilestone: false, sortOrder: 0,
  labels: [], comments: [], blockedBy: [], subtasks: [],
  createdAt: '2026-01-01', updatedAt: '2026-01-01',
  completedAt: null,
};
const scheduledTask: TaskDTO = {
  ...baseTask, id: 't2', title: 'Scheduled', startDate: '2026-02-10', dueDate: '2026-02-14',
};
const outOfRangeTask: TaskDTO = {
  ...baseTask, id: 't3', title: 'Far Future', startDate: '2027-06-01', dueDate: '2027-06-15',
};
const statuses: TaskStatusDTO[] = [{ id: 's1', name: 'TODO', color: '#888', isFinal: false, sortOrder: 0, projectId: 'p1' }];

function renderGrid(tasks: TaskDTO[]) {
  return render(
    <GanttGrid
      tasks={tasks}
      statuses={statuses}
      view="week"
      year={2026}
      isDragEnabled={false}
      onTaskClick={vi.fn()}
      onTimelineUpdate={vi.fn()}
    />
  );
}

describe('Unscheduled task ghost state', () => {
  it('renders ghost element for a task with no dates', () => {
    renderGrid([baseTask]);
    expect(screen.getByTestId('gantt-ghost-t1')).toBeInTheDocument();
  });

  it('ghost shows "No dates" text', () => {
    renderGrid([baseTask]);
    expect(screen.getByTestId('gantt-ghost-t1')).toHaveTextContent('No dates');
  });

  it('ghost calls onTaskClick when clicked', () => {
    const onTaskClick = vi.fn();
    render(
      <GanttGrid tasks={[baseTask]} statuses={statuses} view="week" year={2026}
        isDragEnabled={false} onTaskClick={onTaskClick} onTimelineUpdate={vi.fn()} />
    );
    fireEvent.click(screen.getByTestId('gantt-ghost-t1'));
    expect(onTaskClick).toHaveBeenCalledWith(baseTask);
  });

  it('does NOT render ghost for a scheduled task', () => {
    renderGrid([scheduledTask]);
    expect(screen.queryByTestId('gantt-ghost-t2')).not.toBeInTheDocument();
  });
});

describe('Out-of-range indicator', () => {
  it('renders out-of-range chip for task with dates outside current view', () => {
    renderGrid([outOfRangeTask]);
    expect(screen.getByTestId('gantt-oor-t3')).toBeInTheDocument();
  });

  it('does NOT render out-of-range chip for scheduled task in view', () => {
    renderGrid([scheduledTask]);
    expect(screen.queryByTestId('gantt-oor-t2')).not.toBeInTheDocument();
  });
});
```

### Step 2 — Run to confirm FAIL

```bash
cd packages/client && pnpm vitest run src/components/widgets/GanttWidget/GanttGrid.unscheduled.test.tsx
```
Expected: FAIL — `gantt-ghost-t1` not found, `gantt-oor-t3` not found.

### Step 3 — Implement: Ghost State Polish

In `GanttGrid.tsx`, add `CalendarX` to lucide imports at top:
```ts
import { CalendarX } from 'lucide-react';
```

Replace the **entire `!hasDate` branch** inside the bar-rendering loop (currently lines ~481–517) with:
```tsx
if (!hasDate) {
  bars.push(
    <div
      key={task.id}
      data-testid={`gantt-ghost-${task.id}`}
      style={{
        position: 'absolute',
        left: 0, width: '100%',
        top: rowTop, height: ROW_H,
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          height: 24,
          padding: '0 10px',
          borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--color-accent)',
          opacity: 0.45,
          cursor: 'pointer',
          transition: 'opacity 0.15s',
          width: '100%',
          maxWidth: 280,
        }}
        onClick={() => onTaskClick(task)}
        title="No dates set — click to schedule"
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.45'; }}
      >
        <CalendarX size={11} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
        <span style={{
          fontSize: 11,
          color: 'var(--color-text-secondary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          No dates · click to schedule
        </span>
      </div>
    </div>,
  );
```

### Step 4 — Implement: Out-of-Range Indicator

Replace the **entire `if (rawEnd < 0 || rawStart >= totalDays) { ri++; continue; }` block** (currently line ~524) with:
```tsx
if (rawEnd < 0 || rawStart >= totalDays) {
  // Task has dates but they fall entirely outside the current year's range.
  // Render a small directional chip at the appropriate edge of the timeline.
  const isFuture = rawStart >= totalDays;
  const chipDate = isFuture
    ? format(safeDate(task.startDate)!, 'MMM d')
    : format(safeDate(task.dueDate)!, 'MMM d');
  bars.push(
    <div
      key={task.id}
      data-testid={`gantt-oor-${task.id}`}
      style={{
        position: 'absolute',
        top: rowTop + 10,
        height: 24,
        [isFuture ? 'right' : 'left']: 8,
        zIndex: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        padding: '
