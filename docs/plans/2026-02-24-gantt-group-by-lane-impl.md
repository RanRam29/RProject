# Gantt Group by Lane & Start Week — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add two new groupBy swimlane modes to the Gantt — "🗂 By Lane" (groups by task lane, no management controls) and "📅 By Start Week" (groups tasks by their start-date week).

**Architecture:** All changes live in one file (`GanttTimeline.tsx`). The swimlanes `useMemo` already has a case-per-groupBy pattern; we add two more cases. The `lanes` data is already fetched and passed in. `startOfWeek` from `date-fns` needs to be added to the existing import.

**Tech Stack:** React 18, TypeScript, date-fns, Framer Motion (no changes to motion), Tanstack React Query (no new queries)

---

### Task 1: Extend the type + imports

**Files:**
- Modify: `packages/client/src/components/widgets/GanttWidget/GanttTimeline.tsx:30-37` (date-fns import)
- Modify: `packages/client/src/components/widgets/GanttWidget/GanttTimeline.tsx:71` (groupBy type)

**Step 1: Add `startOfWeek` to the date-fns import block (lines 30–37)**

Current:
```ts
import {
  addDays,
  differenceInDays,
  format,
  isValid,
  startOfDay,
  parseISO,
} from 'date-fns';
```

Replace with:
```ts
import {
  addDays,
  differenceInDays,
  format,
  isValid,
  startOfDay,
  startOfWeek,
  parseISO,
} from 'date-fns';
```

**Step 2: Add `'lane' | 'week'` to the groupBy type on line 71**

Current:
```ts
  groupBy: 'assignee' | 'status' | 'priority' | 'custom' | null;
```

Replace with:
```ts
  groupBy: 'assignee' | 'status' | 'priority' | 'lane' | 'week' | 'custom' | null;
```

**Step 3: Run typecheck to verify no regressions so far**

```bash
pnpm --filter @pm/client typecheck
```
Expected: 0 errors (new union values are just types — no logic yet)

**Step 4: Commit**

```bash
git add packages/client/src/components/widgets/GanttWidget/GanttTimeline.tsx
git commit -m "feat(gantt): extend groupBy type with 'lane' and 'week' modes"
```

---

### Task 2: Add swimlane cases to the `swimlanes` memo

**Files:**
- Modify: `packages/client/src/components/widgets/GanttWidget/GanttTimeline.tsx:498` (insert before `if (groupBy === 'custom')`)

**Step 1: Locate the insertion point**

In the `swimlanes` useMemo, find:
```ts
  if (groupBy === 'custom') {
```
This is at line ~498. Insert the two new cases **immediately before** this line.

**Step 2: Insert the `'lane'` case**

```ts
  // ── LANE MODE ──
  if (groupBy === 'lane') {
    if (!lanes || lanes.length === 0) {
      return [
        {
          assigneeId: null,
          displayName: 'No lanes defined. Use Custom Lanes to create some.',
          tasks: [],
        },
      ];
    }
    const laneMap = new Map<string | null, Swimlane>();
    for (const lane of [...lanes].sort((a, b) => a.sortOrder - b.sortOrder)) {
      laneMap.set(lane.id, {
        assigneeId: null,
        displayName: lane.name,
        laneColor: lane.color,
        laneId: lane.id,
        tasks: [],
      });
    }
    laneMap.set(null, {
      assigneeId: null,
      displayName: 'Unassigned',
      laneColor: '#94a3b8',
      laneId: null,
      tasks: [],
    });
    for (const task of sortedTasks) {
      const key =
        task.laneId != null && laneMap.has(task.laneId) ? task.laneId : null;
      laneMap.get(key)!.tasks.push(task);
    }
    return [...laneMap.values()].filter((l) => l.tasks.length > 0);
  }
```

**Step 3: Insert the `'week'` case immediately after the `'lane'` case**

```ts
  // ── START WEEK MODE ──
  if (groupBy === 'week') {
    const weekMap = new Map<string, Swimlane>();
    const unscheduled: TaskDTO[] = [];
    for (const task of sortedTasks) {
      if (!task.startDate) {
        unscheduled.push(task);
        continue;
      }
      const monday = startOfWeek(parseISO(task.startDate), { weekStartsOn: 1 });
      const key = format(monday, 'yyyy-MM-dd');
      if (!weekMap.has(key)) {
        weekMap.set(key, {
          assigneeId: null,
          displayName: `Week of ${format(monday, 'MMM d')}`,
          tasks: [],
        });
      }
      weekMap.get(key)!.tasks.push(task);
    }
    const sorted = [...weekMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
    if (unscheduled.length > 0) {
      sorted.push({ assigneeId: null, displayName: 'Unscheduled', tasks: unscheduled });
    }
    return sorted;
  }
```

**Step 4: Run typecheck**

```bash
pnpm --filter @pm/client typecheck
```
Expected: 0 errors

**Step 5: Run client tests**

```bash
pnpm --filter @pm/client test --run
```
Expected: 162+/163 pass (1 pre-existing `LoginForm` flake is OK)

**Step 6: Commit**

```bash
git add packages/client/src/components/widgets/GanttWidget/GanttTimeline.tsx
git commit -m "feat(gantt): add 'By Lane' and 'By Start Week' swimlane groupBy modes"
```

---

### Task 3: Add dropdown options

**Files:**
- Modify: `packages/client/src/components/widgets/GanttWidget/GanttTimeline.tsx:823-824`

**Step 1: Find the priority option and insert two new options after it**

Current (lines 820–824):
```tsx
  <option value="">No grouping</option>
  <option value="assignee">👤 By Assignee</option>
  <option value="status">🔵 By Status</option>
  <option value="priority">⚡ By Priority</option>
  <option value="custom">🏷 Custom Lanes</option>
```

Replace with:
```tsx
  <option value="">No grouping</option>
  <option value="assignee">👤 By Assignee</option>
  <option value="status">🔵 By Status</option>
  <option value="priority">⚡ By Priority</option>
  <option value="lane">🗂 By Lane</option>
  <option value="week">📅 By Start Week</option>
  <option value="custom">🏷 Custom Lanes</option>
```

**Step 2: Run typecheck (confirms the onChange cast covers new values)**

```bash
pnpm --filter @pm/client typecheck
```
Expected: 0 errors

**Step 3: Run client tests**

```bash
pnpm --filter @pm/client test --run
```
Expected: 162+/163 pass

**Step 4: Commit**

```bash
git add packages/client/src/components/widgets/GanttWidget/GanttTimeline.tsx
git commit -m "feat(gantt): add 'By Lane' and 'By Start Week' options to groupBy dropdown"
```

---

### Task 4: Manual QA + push

**Step 1: Start the dev server**

```bash
pnpm dev:client
```
Navigate to `http://localhost:5173`, open a project with tasks.

**Step 2: QA checklist**

| Check | Expected |
|-------|----------|
| Open Gantt → Group By dropdown | Shows "🗂 By Lane" and "📅 By Start Week" in order |
| Select "By Lane" (project has lanes) | Tasks grouped into one swimlane per lane + "Unassigned" at bottom |
| Select "By Lane" (no lanes) | Single row: "No lanes defined. Use Custom Lanes to create some." |
| "By Lane" headers | Show colored dot + lane name + task count. NO edit/delete/create buttons |
| Select "By Start Week" | Swimlanes labeled "Week of Mar 3", etc., in chronological order |
| Tasks with no startDate | Appear in "Unscheduled" swimlane at the bottom |
| Switch to "Custom Lanes" | Lane management controls (edit/delete/create) still present |
| Switch back to "By Lane" | Management controls gone |
| Dependency arrows | Still render correctly in new modes (they use buildRowMap) |

**Step 3: Push to origin**

```bash
git push origin main
```

---

## Files Modified

| File | Changes |
|------|---------|
| `packages/client/src/components/widgets/GanttWidget/GanttTimeline.tsx` | Add `startOfWeek` import, extend type union, add 2 swimlane cases, add 2 dropdown options |

No other files need changes.
