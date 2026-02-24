# Gantt "Group by Lane" and "Group by Start Week" Design

**Date:** 2026-02-24
**Status:** Approved

## Problem

The Gantt widget has four groupBy modes: Assignee, Status, Priority, and Custom Lanes.
Two useful grouping dimensions are missing:
1. **By Lane** — a clean read-only lane grouping (no management controls) like "By Status"
2. **By Start Week** — group tasks by the week they begin, useful for sprint-style planning

## Goals

Add two new groupBy modes:
- **🗂 By Lane** — groups tasks into swimlanes by their assigned lane (no CRUD controls)
- **📅 By Start Week** — groups tasks into swimlanes by the Monday of their `startDate`

## Scope (Approved)

### By Lane
- Add `'lane'` to the groupBy union type
- Swimlane per lane (sorted by `lane.sortOrder`), "Unassigned" bucket at the bottom for tasks with no `laneId`
- Header: lane color dot + name + task count. No edit/delete/create buttons
- Empty-lanes state: single swimlane with message *"No lanes defined. Use Custom Lanes to create some."*

### By Start Week
- Add `'week'` to the groupBy union type
- Group tasks by the Monday of their `startDate` (ISO week, week starts Monday)
- Display format: `"Week of MMM d"` — e.g., `"Week of Feb 24"`
- Swimlanes in chronological order (earliest week first)
- Tasks with no `startDate` → **"Unscheduled"** swimlane appended at the end
- Uses `date-fns` helpers already imported: `startOfWeek`, `format`, `parseISO`

### "Custom Lanes" mode — unchanged

## Out of Scope
- Renaming "Custom Lanes"
- Drag-to-reassign lane from "By Lane" view
- Grouping by due date or month (could be a future addition)

## Architecture

**Single file change:** `packages/client/src/components/widgets/GanttWidget/GanttTimeline.tsx`

### 1. GroupBy type union (line ~71)
```ts
groupBy: 'assignee' | 'status' | 'priority' | 'lane' | 'week' | 'custom' | null;
```

### 2. Dropdown options (toolbar, ~line 820)
```tsx
<option value="lane">🗂 By Lane</option>
<option value="week">📅 By Start Week</option>
```
Insert after `<option value="priority">⚡ By Priority</option>`, before Custom Lanes.

### 3. Swimlanes memo — `'lane'` case (after priority case)
```ts
if (groupBy === 'lane') {
  if (!lanes || lanes.length === 0) {
    return [{ assigneeId: null, displayName: 'No lanes defined. Use Custom Lanes to create some.', tasks: [] }];
  }
  const laneMap = new Map<string | null, Swimlane>();
  for (const lane of [...lanes].sort((a, b) => a.sortOrder - b.sortOrder)) {
    laneMap.set(lane.id, { assigneeId: null, displayName: lane.name, laneColor: lane.color, laneId: lane.id, tasks: [] });
  }
  laneMap.set(null, { assigneeId: null, displayName: 'Unassigned', laneColor: '#94a3b8', laneId: null, tasks: [] });
  for (const task of sortedTasks) {
    const key = task.laneId != null && laneMap.has(task.laneId) ? task.laneId : null;
    laneMap.get(key)!.tasks.push(task);
  }
  return [...laneMap.values()].filter((l) => l.tasks.length > 0);
}
```

### 4. Swimlanes memo — `'week'` case (after 'lane' case)
```ts
if (groupBy === 'week') {
  const weekMap = new Map<string, Swimlane>();
  const unscheduled: TaskDTO[] = [];
  for (const task of sortedTasks) {
    if (!task.startDate) { unscheduled.push(task); continue; }
    const monday = startOfWeek(parseISO(task.startDate), { weekStartsOn: 1 });
    const key = format(monday, 'yyyy-MM-dd');
    if (!weekMap.has(key)) {
      weekMap.set(key, { assigneeId: null, displayName: `Week of ${format(monday, 'MMM d')}`, tasks: [] });
    }
    weekMap.get(key)!.tasks.push(task);
  }
  const sorted = [...weekMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  if (unscheduled.length > 0) sorted.push({ assigneeId: null, displayName: 'Unscheduled', tasks: unscheduled });
  return sorted;
}
```

### 5. Swimlane header render — no extra changes needed
- `'lane'` headers: color dot renders automatically (laneColor is set); no edit/delete because guard is `groupBy === 'custom'`
- `'week'` headers: plain text label, no color dot (laneColor not set)

## Data Flow

```
lanes (already fetched) ──► 'lane' case in swimlanes memo
tasks (sortedTasks) ──────► 'week' case in swimlanes memo
                                    │
                               buildRowMap
                                    │
                         ┌──────────┴──────────┐
                    Label column           Bar area stripes
```

No new API calls, no new state. `startOfWeek` is already available from `date-fns`.

## Verification

1. `pnpm typecheck` → 0 errors
2. `pnpm --filter @pm/client test` → 162+/163 pass
3. Manual QA:
   - Dropdown shows "🗂 By Lane" and "📅 By Start Week"
   - By Lane: swimlanes match task lane assignments; Unassigned at bottom; no edit/delete buttons
   - By Start Week: tasks grouped by start week in chronological order; tasks without start date in "Unscheduled"
   - "Custom Lanes" mode still shows management controls (unchanged)
