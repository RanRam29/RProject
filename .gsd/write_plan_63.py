import sys

content = r"""# Phase 6.3 — Unscheduled Tasks & @dnd-kit Drag-and-Drop

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** (1) Make unscheduled tasks visible with a "click to schedule" ghost state and out-of-range chip indicator, and (2) Replace the Framer Motion drag (broken in scroll containers) with a working @dnd-kit implementation that shows a real-time delta-days badge during drag.

**Architecture:**
- `GanttGrid.tsx` gains three improvements: ghost state polish, out-of-range chip, and a `DndContext`+`DragOverlay` wrapper.
- `GanttTaskBar.tsx` drops Framer Motion `drag` props entirely and adds `useDraggable` from `@dnd-kit/core`.
- `GanttWidget/index.tsx` gets optimistic cache updates in `timelineMutation` so the bar moves instantly on drag-end.

**Tech Stack:** `@dnd-kit/core` (already installed v6.1.0), `framer-motion` (kept for `whileHover` only), `lucide-react` (CalendarX icon), React Query `onMutate` optimistic pattern.

---

## [UX/UI] Visual Spec

| State | Visual |
|-------|--------|
| Task row — no dates (default) | Row empty in timeline, ghost box hidden |
| Task row — no dates (hover) | Dashed accent rounded box, opacity 1.0, CalendarX icon + "No dates · click to schedule" |
| Task row — dates outside current view | Small chip at right/left edge: "→ Mar 15" or "Jan 5 ←", muted, pointer-events:none |
| Task bar — drag disabled (Month/Qtr/Year) | cursor: pointer, normal opacity |
| Task bar — drag enabled (Day/Week), idle | cursor: grab, normal opacity |
| Task bar — while dragging (original) | opacity: 0.3, stays in place (ghost of origin) |
| DragOverlay — floating bar | Full opacity, shadow-drag, cursor: grabbing, delta badge: "+3d" (green) or "-2d" (red) |
| After drag settles | Bar jumps immediately (optimistic update), API call confirms |

---

## Codebase Snapshot

| File | Key lines |
|------|-----------|
| `GanttGrid.tsx` | L86-89 pxPerDay; L168-189 barRects; L192-200 old handleDragEnd; L471-558 bar loop |
| `GanttTaskBar.tsx` | Full file — Framer Motion drag='x' to remove |
| `GanttWidget/index.tsx` | L60-93 timelineMutation |
| `ganttGridHelpers.ts` | addDays, format, differenceInDays re-exports |

---

## Task 1 — Ghost State Polish + Out-of-Range Indicator

**Files:**
- Modify: `packages/client/src/components/widgets/GanttWidget/GanttGrid.tsx`
- Create: `packages/client/src/components/widgets/GanttWidget/GanttGrid.unscheduled.test.tsx`

### Step 1 — Write failing tests

Create `GanttGrid.unscheduled.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GanttGrid } from './GanttGrid';
import type { TaskDTO, TaskStatusDTO } from '@pm/shared';

const base: TaskDTO = {
  id: 't1', title: 'Task One', statusId: 's1', projectId: 'p1',
  assigneeId: null, assignee: null, priority: 'MEDIUM',
  startDate: null, dueDate: null, estimatedHours: null,
  progressPercentage: 0, isMilestone: false, sortOrder: 0,
  labels: [], comments: [], blockedBy: [], subtasks: [],
  createdAt: '2026-01-01', updatedAt: '2026-01-01', completedAt: null,
};
const scheduled: TaskDTO = { ...base, id: 't2', title: 'Scheduled', startDate: '2026-02-10', dueDate: '2026-02-14' };
const outOfRange: TaskDTO = { ...base, id: 't3', title: 'Far Future', startDate: '2027-06-01', dueDate: '2027-06-15' };
const statuses: TaskStatusDTO[] = [{ id: 's1', name: 'TODO', color: '#888', isFinal: false, sortOrder: 0, projectId: 'p1' }];

function makeGrid(tasks: TaskDTO[]) {
  return render(
    <GanttGrid tasks={tasks} statuses={statuses} view="week" year={2026}
      isDragEnabled={false} onTaskClick={vi.fn()} onTimelineUpdate={vi.fn()} />
  );
}

describe('Unscheduled ghost', () => {
  it('renders ghost for no-date task', () => {
    makeGrid([base]);
    expect(screen.getByTestId('gantt-ghost-t1')).toBeInTheDocument();
  });
  it('ghost contains "No dates" text', () => {
    makeGrid([base]);
    expect(screen.getByTestId('gantt-ghost-t1')).toHaveTextContent('No dates');
  });
  it('ghost calls onTaskClick on click', () => {
    const spy = vi.fn();
    render(<GanttGrid tasks={[base]} statuses={statuses} view="week" year={2026}
      isDragEnabled={false} onTaskClick={spy} onTimelineUpdate={vi.fn()} />);
    fireEvent.click(screen.getByTestId('gantt-ghost-t1'));
    expect(spy).toHaveBeenCalledWith(base);
  });
  it('does NOT render ghost for scheduled task', () => {
    makeGrid([scheduled]);
    expect(screen.queryByTestId('gantt-ghost-t2')).not.toBeInTheDocument();
  });
});

describe('Out-of-range chip', () => {
  it('renders chip for task with dates outside current view', () => {
    makeGrid([outOfRange]);
    expect(screen.getByTestId('gantt-oor-t3')).toBeInTheDocument();
  });
  it('chip text contains arrow', () => {
    makeGrid([outOfRange]);
    expect(screen.getByTestId('gantt-oor-t3').textContent).toMatch(/[→←]/);
  });
  it('does NOT render chip for in-view task', () => {
    makeGrid([scheduled]);
    expect(screen.queryByTestId('gantt-oor-t2')).not.toBeInTheDocument();
  });
});
```

### Step 2 — Run to confirm FAIL

```bash
cd packages/client && pnpm vitest run src/components/widgets/GanttWidget/GanttGrid.unscheduled.test.tsx
```
Expected: FAIL — `gantt-ghost-t1` not found.

### Step 3 — Implement ghost state in GanttGrid.tsx

Add `CalendarX` import at the top of `GanttGrid.tsx`:
```ts
import { CalendarX } from 'lucide-react';
```

Replace the **entire `if (!hasDate)` branch** inside the bar-rendering loop with:
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
          display: 'flex', alignItems: 'center', gap: 5,
          height: 24, padding: '0 10px',
          borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--color-accent)',
          opacity: 0.45,
          cursor: 'pointer',
          transition: 'opacity 0.15s',
          width: '100%', maxWidth: 280,
        }}
        onClick={() => onTaskClick(task)}
        title="No dates set — click to schedule"
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.45'; }}
      >
        <CalendarX size={11} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
        <span style={{
          fontSize: 11, color: 'var(--color-text-secondary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          No dates · click to schedule
        </span>
      </div>
    </div>,
  );
```

### Step 4 — Implement out-of-range chip in GanttGrid.tsx

Replace the **`if (rawEnd < 0 || rawStart >= totalDays) { ri++; continue; }` block** with:
```tsx
if (rawEnd < 0 || rawStart >= totalDays) {
  const isFuture = rawStart >= totalDays;
  const refDate = isFuture ? safeDate(task.startDate) : safeDate(task.dueDate);
  const chipDate = refDate ? format(refDate, 'MMM d') : '?';
  bars.push(
    <div
      key={task.id}
      data-testid={`gantt-oor-${task.id}`}
      style={{
        position: 'absolute',
        top: rowTop + 10, height: 24,
        [isFuture ? 'right'
