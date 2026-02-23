# Gantt Lanes & Group-by Design
**Date:** 2026-02-23
**Scope:** Bug fixes (scroll, task-click modal) + Feature A (custom lanes) + Feature B (group-by)

---

## Problems Being Solved

| # | Problem | Root Cause |
|---|---------|-----------|
| 1 | Horizontal scroll broken | `overflow-hidden` on wrapper div in `GanttWidget/index.tsx` clips the scroll container |
| 2 | Task click opens modal in wrong position | `LivingTaskModal` uses `position: fixed` which is broken inside CSS-transformed parents (Framer Motion widget panels create transform stacking contexts). Fix: `createPortal(modal, document.body)` |
| 3 | No custom swimlanes | Only auto-group-by-assignee exists |
| 4 | Only one grouping option | Want Assignee / Status / Priority / Custom |

---

## Architecture

### Data Model (new)

```prisma
model Lane {
  id        String   @id @default(uuid()) @db.Uuid
  projectId String   @map("project_id") @db.Uuid
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  name      String
  color     String   @default("#94a3b8")
  sortOrder Int      @default(0) @map("sort_order")
  createdAt DateTime @default(now()) @map("created_at")
  tasks     Task[]
}

// Task gets new optional FK:
// laneId String? @map("lane_id") @db.Uuid
// lane   Lane?   @relation(fields: [laneId], references: [id], onDelete: SetNull)
```

### Shared Types (new / updated)

```ts
// @pm/shared — new
export interface LaneDTO {
  id: string;
  projectId: string;
  name: string;
  color: string;
  sortOrder: number;
}

export interface CreateLaneRequest { name: string; color?: string; }
export interface UpdateLaneRequest { name?: string; color?: string; sortOrder?: number; }

// @pm/shared — updated TaskDTO
// + laneId: string | null;
```

### API Routes (new)

```
GET    /projects/:projectId/lanes            → LaneDTO[]
POST   /projects/:projectId/lanes            → LaneDTO
PATCH  /projects/:projectId/lanes/:laneId    → LaneDTO
DELETE /projects/:projectId/lanes/:laneId    → 204
PATCH  /projects/:projectId/tasks/:taskId    → already exists, add laneId to UpdateTaskRequest
```

---

## Frontend Changes

### GanttTimeline props

Replace `swimlaneMode: boolean` with `groupBy: 'assignee' | 'status' | 'priority' | 'custom' | null`.

When `groupBy === 'custom'`, swimlanes are built from the `lanes: LaneDTO[]` prop (plus an "Unassigned" catch-all).
When `groupBy === 'assignee' | 'status' | 'priority'`, derived from task fields (frontend only).
When `groupBy === null`, flat list (no swimlanes).

### Toolbar

"👥 Lanes" toggle → **"Group by" pill-dropdown**:
```
[ Group by ▾ ]  →  Off | Assignee | Status | Priority | Custom Lanes
```

When `groupBy === 'custom'`, a **"+ Lane"** button appears to create a new lane (inline text input, commits on Enter).

### Lane headers (custom mode)

Each lane header row shows: colored dot · name · pencil icon · task count · trash icon.
Clicking pencil → inline editable name field.
Trash → confirm delete (tasks go to Unassigned lane).

### Task → Lane assignment

In `LivingTaskModal`, add a **"Lane"** dropdown field (shown only when project has lanes). Options: "None" + all lanes. Saving sets `task.laneId`.

No 2D drag for lane assignment — the Gantt x-axis drag is for time only. Lane assignment is via the modal or a right-click "Move to lane" context menu (stretch goal).

### GanttWidget/index.tsx

1. Remove `overflow-hidden` from gantt wrapper div (fix scroll bug)
2. Wrap `LivingTaskModal` in `createPortal(modal, document.body)` (fix positioning bug)
3. Add `useQuery(['lanes', projectId], lanesApi.list)`
4. Replace `swimlaneMode` state with `groupBy` state

---

## Implementation Order

1. **Bug fixes** (no deps) — scroll + modal portal
2. **Feature B** (pure frontend) — Group-by dropdown, auto-group by status/priority
3. **Feature A backend** — Prisma migration, Lane model, API routes
4. **Feature A frontend** — Lane CRUD UI, LivingTaskModal lane field

---

## Files Affected

| File | Change |
|------|--------|
| `packages/server/prisma/schema.prisma` | Add `Lane` model + `Task.laneId` FK |
| `packages/server/src/modules/lanes/` | New module (routes, controller, service) |
| `packages/server/src/modules/tasks/tasks.service.ts` | Include `lane` in task queries; accept `laneId` in update |
| `packages/server/src/app.ts` | Register lanes router |
| `packages/shared/src/types/task.types.ts` | Add `laneId` to TaskDTO, UpdateTaskRequest |
| `packages/shared/src/types/lane.types.ts` | New file: LaneDTO, CreateLaneRequest, UpdateLaneRequest |
| `packages/shared/src/index.ts` | Export lane types |
| `packages/client/src/api/lanes.api.ts` | New API client |
| `packages/client/src/components/widgets/GanttWidget/index.tsx` | Bug fixes + groupBy state + lanes query |
| `packages/client/src/components/widgets/GanttWidget/GanttTimeline.tsx` | groupBy prop, Group-by toolbar, lane headers |
| `packages/client/src/components/task/LivingTaskModal.tsx` | Lane dropdown field |
