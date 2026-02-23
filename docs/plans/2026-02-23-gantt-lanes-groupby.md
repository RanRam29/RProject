# Gantt Lanes, Group-by & Bug Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix two Gantt bugs (horizontal scroll, task-click modal positioning) plus add hide-unscheduled-tasks, group-by-field (Assignee/Status/Priority), and custom named lanes (stored in DB, assigned in LivingTaskModal).

**Architecture:** Bug fixes are isolated to `GanttWidget/index.tsx` and `GanttTimeline.tsx`. Feature B (group-by) is pure frontend — replaces `swimlaneMode: boolean` with `groupBy` union type. Feature A (custom lanes) adds a `Lane` DB model, a new `lanes` server module (mirroring the `statuses` module pattern), and a lane dropdown inside `LivingTaskModal`.

**Tech Stack:** Prisma (migrations), Express + Zod (API), React Query (client data), inline-style React (GanttTimeline), `createPortal` (React DOM), Framer Motion (existing).

---

## Phase 0 — Bug Fixes (no dependencies)

### Task 1: Fix horizontal scroll

**Problem:** `overflow-hidden` on the gantt wrapper div in `index.tsx` clips the scroll container inside `GanttTimeline`.

**Files:**
- Modify: `packages/client/src/components/widgets/GanttWidget/index.tsx`

**Step 1:** Open `index.tsx`. Find line:
```tsx
<div ref={ganttRef} className="flex-1 min-h-0 overflow-hidden">
```

**Step 2:** Change to:
```tsx
<div ref={ganttRef} className="flex-1 min-h-0 overflow-auto">
```

**Step 3:** Run typecheck:
```bash
cd packages/client && npx tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors.

**Step 4:** Commit:
```bash
git add packages/client/src/components/widgets/GanttWidget/index.tsx
git commit -m "fix(gantt): remove overflow-hidden from wrapper — restores horizontal scroll"
```

---

### Task 2: Fix task-click modal positioning (createPortal)

**Problem:** `LivingTaskModal` uses `position: fixed` but is rendered inside a Framer Motion widget panel that applies CSS `transform`. CSS transforms create new stacking contexts, breaking `position: fixed` — the modal appears offset or partially hidden.

**Fix:** Render the modal via `createPortal(modal, document.body)` so it escapes the transform context.

**Files:**
- Modify: `packages/client/src/components/widgets/GanttWidget/index.tsx`

**Step 1:** Add import at the top of `index.tsx`:
```tsx
import { useState, useCallback, useRef, type FC } from 'react';
import { createPortal } from 'react-dom';  // ← add this line
```

**Step 2:** Find the LivingTaskModal render block (currently at the bottom of the return):
```tsx
{selectedTask && (
  <LivingTaskModal
    isOpen={!!selectedTask}
    onClose={() => setSelectedTask(null)}
    projectId={projectId}
    task={selectedTask}
    statuses={statuses ?? []}
  />
)}
```

**Step 3:** Replace with:
```tsx
{selectedTask &&
  createPortal(
    <LivingTaskModal
      isOpen={!!selectedTask}
      onClose={() => setSelectedTask(null)}
      projectId={projectId}
      task={selectedTask}
      statuses={statuses ?? []}
    />,
    document.body,
  )}
```

**Step 4:** Run typecheck:
```bash
cd packages/client && npx tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors.

**Step 5:** Commit:
```bash
git add packages/client/src/components/widgets/GanttWidget/index.tsx
git commit -m "fix(gantt): render LivingTaskModal via createPortal — fixes positioning inside transformed containers"
```

---

### Task 3: Hide tasks with no dates from Gantt

**Requirement:** Tasks that have neither `startDate` nor `dueDate` should not appear on the Gantt at all (no unscheduled chip, no row, nothing).

**Files:**
- Modify: `packages/client/src/components/widgets/GanttWidget/GanttTimeline.tsx`

**Step 1:** Find the `sortedTasks` useMemo (around line 413). After the sort, add a filter:
```tsx
const sortedTasks = useMemo(() => {
  const today = startOfDay(new Date());
  return [...tasks]
    .filter((t) => t.startDate != null || t.dueDate != null)  // ← add this line
    .sort((a, b) => {
      // ... existing sort logic unchanged ...
    });
}, [tasks]);
```

**Step 2:** Find the unscheduled chip block in the task bars render section (look for `if (!task.startDate && !task.dueDate)`). Remove that entire early-return chip block — it is now unreachable because filtered tasks always have at least one date, but remove it for cleanliness:

Delete from:
```tsx
// Unscheduled chip — no start AND no due date
if (!task.startDate && !task.dueDate) {
```
…to the closing `);` of that if-block.

**Step 3:** Also find the empty-state message that says `"No tasks found. Add start or due dates..."`. Update its text to be cleaner:
```tsx
No tasks scheduled. Add start or due dates to tasks to see them on the timeline.
```

**Step 4:** Run tests:
```bash
pnpm --filter @pm/client vitest run src/components/widgets/GanttWidget/
```
Expected: all pass (rowmap tests don't care about dates).

**Step 5:** Commit:
```bash
git add packages/client/src/components/widgets/GanttWidget/GanttTimeline.tsx
git commit -m "feat(gantt): hide tasks with no dates — only scheduled tasks shown on timeline"
```

---

## Phase 1 — Feature B: Group-by (pure frontend)

### Task 4: Replace `swimlaneMode` with `groupBy` type

**Files:**
- Modify: `packages/client/src/components/widgets/GanttWidget/GanttTimeline.tsx`
- Modify: `packages/client/src/components/widgets/GanttWidget/index.tsx`
- Modify: `packages/client/src/components/widgets/TimelineWidget.tsx`

**Step 1:** In `GanttTimeline.tsx`, change the props interface. Find:
```tsx
swimlaneMode: boolean;
```
Replace with:
```tsx
groupBy: 'assignee' | 'status' | 'priority' | null;
```
And change:
```tsx
onSwimlaneToggle: () => void;
```
To:
```tsx
onGroupByChange: (v: 'assignee' | 'status' | 'priority' | null) => void;
```

**Step 2:** In `GanttTimeline.tsx`, update the destructure in `forwardRef` function to use `groupBy` and `onGroupByChange` (replacing `swimlaneMode` and `onSwimlaneToggle`).

**Step 3:** In `GanttTimeline.tsx`, find the `swimlanes` useMemo. Replace the `if (!swimlaneMode)` check and the entire memo with:
```tsx
const swimlanes = useMemo<Swimlane[]>(() => {
  if (!groupBy) {
    return [{ assigneeId: null, displayName: null, tasks: sortedTasks }];
  }

  if (groupBy === 'assignee') {
    const map = new Map<string, Swimlane>();
    for (const task of sortedTasks) {
      const key = task.assigneeId ?? '__unassigned__';
      if (!map.has(key)) {
        map.set(key, {
          assigneeId: task.assigneeId ?? null,
          displayName: (task as any).assignee?.displayName ?? 'Unassigned',
          tasks: [],
        });
      }
      map.get(key)!.tasks.push(task);
    }
    return [...map.values()];
  }

  if (groupBy === 'status') {
    const map = new Map<string, Swimlane>();
    for (const task of sortedTasks) {
      const status = statusMap.get(task.statusId);
      const key = task.statusId;
      if (!map.has(key)) {
        map.set(key, {
          assigneeId: null,
          displayName: status?.name ?? 'Unknown',
          tasks: [],
        });
      }
      map.get(key)!.tasks.push(task);
    }
    return [...map.values()];
  }

  if (groupBy === 'priority') {
    const PRIORITY_ORDER = ['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE'];
    const map = new Map<string, Swimlane>();
    for (const p of PRIORITY_ORDER) {
      const tasksForPriority = sortedTasks.filter((t) => t.priority === p);
      if (tasksForPriority.length > 0) {
        const label =
          p === 'NONE'
            ? 'No Priority'
            : p.charAt(0) + p.slice(1).toLowerCase();
        map.set(p, { assigneeId: null, displayName: label, tasks: tasksForPriority });
      }
    }
    return [...map.values()];
  }

  return [{ assigneeId: null, displayName: null, tasks: sortedTasks }];
}, [sortedTasks, groupBy, statusMap]);
```

**Step 4:** In `GanttTimeline.tsx`, find the swimlane toggle button in the toolbar. Replace it with a group-by dropdown:
```tsx
{/* Group-by selector */}
<select
  value={groupBy ?? ''}
  onChange={(e) => {
    const v = e.target.value;
    onGroupByChange(
      v === '' ? null : (v as 'assignee' | 'status' | 'priority'),
    );
  }}
  style={{
    padding: '4px 8px',
    fontSize: 12,
    borderRadius: 6,
    border: groupBy
      ? '1.5px solid var(--color-accent)'
      : '1.5px solid var(--color-border)',
    background: groupBy ? 'var(--color-accent-light)' : 'var(--color-bg-elevated)',
    color: groupBy ? 'var(--color-accent-text)' : 'var(--color-text-secondary)',
    cursor: 'pointer',
    fontWeight: groupBy ? 600 : 400,
  }}
  title="Group rows by field"
>
  <option value="">No grouping</option>
  <option value="assignee">👤 By Assignee</option>
  <option value="status">🔵 By Status</option>
  <option value="priority">⚡ By Priority</option>
</select>
```

**Step 5:** Update `index.tsx` — replace `swimlaneMode` state with `groupBy`:
```tsx
// Remove:
const [swimlaneMode, setSwimlaneMode] = useState(false);
// Add:
const [groupBy, setGroupBy] = useState<'assignee' | 'status' | 'priority' | null>(null);
```

Update the `<GanttTimeline>` props in `index.tsx`:
```tsx
// Remove:
swimlaneMode={swimlaneMode}
onSwimlaneToggle={() => setSwimlaneMode((v) => !v)}
// Add:
groupBy={groupBy}
onGroupByChange={setGroupBy}
```

**Step 6:** Update `TimelineWidget.tsx` — same swap: remove `swimlaneMode`/`onSwimlaneToggle`, add `groupBy`/`onGroupByChange`.

**Step 7:** Run typecheck:
```bash
cd packages/client && npx tsc --noEmit 2>&1 | head -30
```
Expected: 0 errors.

**Step 8:** Run tests:
```bash
pnpm --filter @pm/client vitest run src/components/widgets/GanttWidget/
```
Expected: all pass.

**Step 9:** Commit:
```bash
git add packages/client/src/components/widgets/GanttWidget/GanttTimeline.tsx \
        packages/client/src/components/widgets/GanttWidget/index.tsx \
        packages/client/src/components/widgets/TimelineWidget.tsx
git commit -m "feat(gantt): replace swimlaneMode toggle with groupBy dropdown — Assignee, Status, Priority"
```

---

## Phase 2 — Feature A: Custom Lanes (Backend)

### Task 5: Add Lane model to Prisma schema + migration

**Files:**
- Modify: `packages/server/prisma/schema.prisma`

**Step 1:** Open `schema.prisma`. After the `TaskStatus` model block, add:
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

  @@map("lanes")
}
```

**Step 2:** Add the reverse relation to `Task` model. Find the `Task` model and add after `assignee` relation:
```prisma
  laneId    String?    @map("lane_id") @db.Uuid
  lane      Lane?      @relation(fields: [laneId], references: [id], onDelete: SetNull)
```

**Step 3:** Add the reverse relation to `Project` model. Find `Project` and add:
```prisma
  lanes     Lane[]
```

**Step 4:** Run migration:
```bash
pnpm --filter @pm/server prisma migrate dev --name add_lanes
```
Expected: Migration created and applied. No errors.

**Step 5:** Verify DB:
```bash
pnpm --filter @pm/server prisma studio
```
(Open briefly, confirm `lanes` table exists with correct columns, then close.)

**Step 6:** Commit:
```bash
git add packages/server/prisma/schema.prisma packages/server/prisma/migrations/
git commit -m "feat(lanes): add Lane model to Prisma schema + migration"
```

---

### Task 6: Add LaneDTO and validators to @pm/shared

**Files:**
- Create: `packages/shared/src/types/lane.types.ts`
- Create: `packages/shared/src/validators/lane.validator.ts`
- Modify: `packages/shared/src/types/index.ts`
- Modify: `packages/shared/src/types/task.types.ts`
- Modify: `packages/shared/src/validators/index.ts`

**Step 1:** Create `packages/shared/src/types/lane.types.ts`:
```typescript
export interface LaneDTO {
  id: string;
  projectId: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
}

export interface CreateLaneRequest {
  name: string;
  color?: string;
}

export interface UpdateLaneRequest {
  name?: string;
  color?: string;
  sortOrder?: number;
}
```

**Step 2:** Create `packages/shared/src/validators/lane.validator.ts`:
```typescript
import { z } from 'zod';

export const createLaneSchema = z.object({
  name: z.string().min(1, 'Lane name is required').max(80),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional()
    .default('#94a3b8'),
});

export const updateLaneSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  sortOrder: z.number().int().optional(),
});
```

**Step 3:** In `packages/shared/src/types/index.ts`, add:
```typescript
export * from './lane.types.js';
```

**Step 4:** In `packages/shared/src/validators/index.ts`, add:
```typescript
export * from './lane.validator.js';
```

**Step 5:** In `packages/shared/src/types/task.types.ts`, add `laneId` to `TaskDTO`:
```typescript
export interface TaskDTO {
  id: string;
  // ... (all existing fields) ...
  laneId: string | null;  // ← add this line after estimatedHours
  // ... rest unchanged ...
}
```

Also add `laneId` to `UpdateTaskRequest`:
```typescript
export interface UpdateTaskRequest {
  // ... existing fields ...
  laneId?: string | null;  // ← add this line
}
```

**Step 6:** Run shared build to verify no errors:
```bash
pnpm --filter @pm/shared build
```
Expected: Compiled successfully.

**Step 7:** Commit:
```bash
git add packages/shared/src/
git commit -m "feat(lanes): add LaneDTO, lane validators, laneId to TaskDTO/UpdateTaskRequest in @pm/shared"
```

---

### Task 7: Create the lanes server module

**Files:**
- Create: `packages/server/src/modules/lanes/lanes.service.ts`
- Create: `packages/server/src/modules/lanes/lanes.controller.ts`
- Create: `packages/server/src/modules/lanes/lanes.routes.ts`

**Step 1:** Create `packages/server/src/modules/lanes/lanes.service.ts`:
```typescript
import prisma from '../../config/db.js';
import { ApiError } from '../../utils/api-error.js';

export class LanesService {
  async list(projectId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw ApiError.notFound('Project not found');

    return prisma.lane.findMany({
      where: { projectId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(projectId: string, data: { name: string; color?: string }) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw ApiError.notFound('Project not found');

    const existing = await prisma.lane.findFirst({ where: { projectId, name: data.name } });
    if (existing) throw ApiError.conflict(`Lane "${data.name}" already exists`);

    const last = await prisma.lane.findFirst({
      where: { projectId },
      orderBy: { sortOrder: 'desc' },
    });
    const sortOrder = (last?.sortOrder ?? -1) + 1;

    return prisma.lane.create({
      data: { projectId, name: data.name, color: data.color ?? '#94a3b8', sortOrder },
    });
  }

  async update(
    projectId: string,
    laneId: string,
    data: { name?: string; color?: string; sortOrder?: number },
  ) {
    const lane = await prisma.lane.findFirst({ where: { id: laneId, projectId } });
    if (!lane) throw ApiError.notFound('Lane not found');

    return prisma.lane.update({ where: { id: laneId }, data });
  }

  async delete(projectId: string, laneId: string) {
    const lane = await prisma.lane.findFirst({ where: { id: laneId, projectId } });
    if (!lane) throw ApiError.notFound('Lane not found');

    // Unassign all tasks in this lane first
    await prisma.task.updateMany({
      where: { projectId, laneId },
      data: { laneId: null },
    });

    await prisma.lane.delete({ where: { id: laneId } });
  }
}

export const lanesService = new LanesService();
```

**Step 2:** Create `packages/server/src/modules/lanes/lanes.controller.ts`:
```typescript
import type { Request, Response } from 'express';
import { lanesService } from './lanes.service.js';
import { asyncHandler } from '../../utils/async-handler.js';

export class LanesController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const lanes = await lanesService.list(projectId);
    res.json({ success: true, data: lanes });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const lane = await lanesService.create(projectId, req.body);
    res.status(201).json({ success: true, data: lane });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const { projectId, laneId } = req.params;
    const lane = await lanesService.update(projectId, laneId, req.body);
    res.json({ success: true, data: lane });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    const { projectId, laneId } = req.params;
    await lanesService.delete(projectId, laneId);
    res.status(204).send();
  });
}

export const lanesController = new LanesController();
```

**Step 3:** Create `packages/server/src/modules/lanes/lanes.routes.ts`:
```typescript
import { Router } from 'express';
import { lanesController } from './lanes.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireProjectRole } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createLaneSchema, updateLaneSchema } from '@pm/shared';

const router = Router({ mergeParams: true });

router.get(
  '/',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR', 'VIEWER', 'CUSTOM'),
  lanesController.list,
);

router.post(
  '/',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  validate(createLaneSchema),
  lanesController.create,
);

router.patch(
  '/:laneId',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  validate(updateLaneSchema),
  lanesController.update,
);

router.delete(
  '/:laneId',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  lanesController.delete,
);

export default router;
```

**Step 4:** Register in `packages/server/src/app.ts`. Find the line:
```typescript
app.use('/api/v1/projects/:projectId/statuses', statusRoutes);
```
Add after it:
```typescript
import laneRoutes from './modules/lanes/lanes.routes.js';
// ...
app.use('/api/v1/projects/:projectId/lanes', laneRoutes);
```
(The import goes at the top with the other route imports; the `app.use` goes with the route registrations.)

**Step 5:** Update `tasks.service.ts` to include `lane` in task queries and accept `laneId` in updates. Find the main task `include` object (the one used in `list` and `getById`). Add:
```typescript
lane: {
  select: { id: true, name: true, color: true },
},
```
alongside `status`, `assignee`, etc.

Then find the `update` method in `tasks.service.ts`. Add `laneId` to the data passed to `prisma.task.update`:
```typescript
// In the update data object, add:
...(data.laneId !== undefined && { laneId: data.laneId }),
```

**Step 6:** Run server typecheck:
```bash
cd packages/server && npx tsc --noEmit 2>&1 | head -30
```
Expected: 0 errors.

**Step 7:** Start server briefly to test:
```bash
docker compose up -d && pnpm dev:server &
sleep 3 && curl http://localhost:3001/api/health
```
Expected: `{"status":"ok"}`.

**Step 8:** Commit:
```bash
git add packages/server/src/modules/lanes/ \
        packages/server/src/app.ts \
        packages/server/src/modules/tasks/tasks.service.ts
git commit -m "feat(lanes): add lanes server module — CRUD routes, service, controller + task laneId support"
```

---

## Phase 3 — Feature A: Custom Lanes (Frontend)

### Task 8: Create lanes API client

**Files:**
- Create: `packages/client/src/api/lanes.api.ts`

**Step 1:** Create `packages/client/src/api/lanes.api.ts`:
```typescript
import { apiClient } from './client';
import type { LaneDTO, CreateLaneRequest, UpdateLaneRequest } from '@pm/shared';
import type { ApiResponse } from '@pm/shared';

export const lanesApi = {
  async list(projectId: string): Promise<LaneDTO[]> {
    const res = await apiClient.get<ApiResponse<LaneDTO[]>>(
      `/projects/${projectId}/lanes`,
    );
    return res.data.data!;
  },

  async create(projectId: string, data: CreateLaneRequest): Promise<LaneDTO> {
    const res = await apiClient.post<ApiResponse<LaneDTO>>(
      `/projects/${projectId}/lanes`,
      data,
    );
    return res.data.data!;
  },

  async update(
    projectId: string,
    laneId: string,
    data: UpdateLaneRequest,
  ): Promise<LaneDTO> {
    const res = await apiClient.patch<ApiResponse<LaneDTO>>(
      `/projects/${projectId}/lanes/${laneId}`,
      data,
    );
    return res.data.data!;
  },

  async delete(projectId: string, laneId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/lanes/${laneId}`);
  },
};
```

**Step 2:** Run typecheck:
```bash
cd packages/client && npx tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors.

**Step 3:** Commit:
```bash
git add packages/client/src/api/lanes.api.ts
git commit -m "feat(lanes): add lanes API client"
```

---

### Task 9: Wire lanes into GanttWidget and extend GanttTimeline

**Files:**
- Modify: `packages/client/src/components/widgets/GanttWidget/index.tsx`
- Modify: `packages/client/src/components/widgets/GanttWidget/GanttTimeline.tsx`

**Step 1 — index.tsx:** Add lanes query and mutations. After the statuses query, add:
```tsx
import { lanesApi } from '../../../api/lanes.api';
import type { LaneDTO } from '@pm/shared';

// Inside the component:
const { data: lanes = [] } = useQuery({
  queryKey: ['lanes', projectId],
  queryFn: () => lanesApi.list(projectId),
});

const createLaneMutation = useMutation({
  mutationFn: (name: string) => lanesApi.create(projectId, { name }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lanes', projectId] }),
  onError: () => addToast({ type: 'error', message: 'Failed to create lane' }),
});

const updateLaneMutation = useMutation({
  mutationFn: ({ laneId, data }: { laneId: string; data: { name?: string; color?: string } }) =>
    lanesApi.update(projectId, laneId, data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lanes', projectId] }),
  onError: () => addToast({ type: 'error', message: 'Failed to update lane' }),
});

const deleteLaneMutation = useMutation({
  mutationFn: (laneId: string) => lanesApi.delete(projectId, laneId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['lanes', projectId] });
    queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
  },
  onError: () => addToast({ type: 'error', message: 'Failed to delete lane' }),
});

const assignTaskToLaneMutation = useMutation({
  mutationFn: ({ taskId, laneId }: { taskId: string; laneId: string | null }) =>
    tasksApi.update(projectId, taskId, { laneId }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
  onError: () => addToast({ type: 'error', message: 'Failed to assign lane' }),
});
```

**Step 2 — index.tsx:** Extend `groupBy` state to include `'custom'`:
```tsx
const [groupBy, setGroupBy] = useState<'assignee' | 'status' | 'priority' | 'custom' | null>(null);
```

**Step 3 — index.tsx:** Pass new props to `<GanttTimeline>`:
```tsx
<GanttTimeline
  // ... existing props ...
  groupBy={groupBy}
  onGroupByChange={setGroupBy}
  lanes={lanes}
  onCreateLane={(name) => createLaneMutation.mutate(name)}
  onUpdateLane={(laneId, data) => updateLaneMutation.mutate({ laneId, data })}
  onDeleteLane={(laneId) => deleteLaneMutation.mutate(laneId)}
/>
```

**Step 4 — GanttTimeline.tsx:** Update `GanttTimelineProps` to add new props:
```tsx
export interface GanttTimelineProps {
  // ... existing props, with groupBy updated:
  groupBy: 'assignee' | 'status' | 'priority' | 'custom' | null;
  onGroupByChange: (v: 'assignee' | 'status' | 'priority' | 'custom' | null) => void;
  // New:
  lanes?: LaneDTO[];
  onCreateLane?: (name: string) => void;
  onUpdateLane?: (laneId: string, data: { name?: string; color?: string }) => void;
  onDeleteLane?: (laneId: string) => void;
}
```

**Step 5 — GanttTimeline.tsx:** Add `LaneDTO` import:
```tsx
import type { TaskDTO, TaskStatusDTO, LaneDTO } from '@pm/shared';
```

**Step 6 — GanttTimeline.tsx:** Extend `swimlanes` useMemo to handle `'custom'` groupBy:
```tsx
// Add to the swimlanes useMemo, after the 'priority' case:
if (groupBy === 'custom') {
  if (!lanes || lanes.length === 0) {
    return [{ assigneeId: null, displayName: null, tasks: sortedTasks }];
  }
  const laneMap = new Map<string | null, Swimlane>();
  // Create entry for each defined lane (in sort order)
  for (const lane of [...lanes].sort((a, b) => a.sortOrder - b.sortOrder)) {
    laneMap.set(lane.id, {
      assigneeId: null,
      displayName: lane.name,
      laneColor: lane.color,
      laneId: lane.id,
      tasks: [],
    });
  }
  // Catch-all for tasks not assigned to any lane
  laneMap.set(null, {
    assigneeId: null,
    displayName: 'Unassigned',
    laneColor: '#94a3b8',
    laneId: null,
    tasks: [],
  });
  // Assign tasks to lanes
  for (const task of sortedTasks) {
    const key = task.laneId != null && laneMap.has(task.laneId) ? task.laneId : null;
    laneMap.get(key)!.tasks.push(task);
  }
  // Filter out empty lanes (except Unassigned which always shows if non-empty)
  return [...laneMap.values()].filter(
    (lane) => lane.tasks.length > 0 || lane.laneId !== null,
  );
}
```

**Step 7 — GanttTimeline.tsx:** Update the `Swimlane` type to include optional custom lane fields:
```tsx
type Swimlane = {
  assigneeId: string | null;
  displayName: string | null;
  laneId?: string | null;
  laneColor?: string;
  tasks: TaskDTO[];
};
```

**Step 8 — GanttTimeline.tsx:** Add `[newLaneName, setNewLaneName]` state and `[creatingLane, setCreatingLane]` toggle:
```tsx
const [newLaneName, setNewLaneName] = useState('');
const [creatingLane, setCreatingLane] = useState(false);
const [editingLaneId, setEditingLaneId] = useState<string | null>(null);
const [editingLaneName, setEditingLaneName] = useState('');
```

**Step 9 — GanttTimeline.tsx:** Update the group-by select in the toolbar to include 'Custom Lanes' option:
```tsx
<option value="custom">🏷 Custom Lanes</option>
```

When `groupBy === 'custom'`, show "+ Lane" button next to the dropdown:
```tsx
{groupBy === 'custom' && !creatingLane && (
  <button
    onClick={() => setCreatingLane(true)}
    style={{
      padding: '4px 10px',
      fontSize: 12,
      borderRadius: 6,
      border: '1.5px solid var(--color-border)',
      background: 'transparent',
      color: 'var(--color-text-secondary)',
      cursor: 'pointer',
    }}
  >
    + Lane
  </button>
)}
{creatingLane && (
  <form
    onSubmit={(e) => {
      e.preventDefault();
      if (newLaneName.trim()) {
        onCreateLane?.(newLaneName.trim());
        setNewLaneName('');
        setCreatingLane(false);
      }
    }}
    style={{ display: 'flex', gap: 4 }}
  >
    <input
      autoFocus
      value={newLaneName}
      onChange={(e) => setNewLaneName(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Escape') { setCreatingLane(false); setNewLaneName(''); } }}
      placeholder="Lane name…"
      style={{
        padding: '4px 8px',
        fontSize: 12,
        borderRadius: 6,
        border: '1.5px solid var(--color-accent)',
        background: 'var(--color-bg-elevated)',
        color: 'var(--color-text-primary)',
        outline: 'none',
        width: 140,
      }}
    />
    <button type="submit" style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6, background: 'var(--color-accent)', color: 'white', border: 'none', cursor: 'pointer' }}>
      Add
    </button>
    <button type="button" onClick={() => { setCreatingLane(false); setNewLaneName(''); }} style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
      ✕
    </button>
  </form>
)}
```

**Step 10 — GanttTimeline.tsx:** In the sticky label column, update the swimlane header row to show inline edit + delete for custom lanes:
```tsx
{lane.displayName !== null && (
  <div
    style={{
      height: ROW_HEIGHT,
      display: 'flex',
      alignItems: 'center',
      paddingLeft: 12,
      paddingRight: 8,
      gap: 8,
      background: 'var(--color-bg-secondary)',
      borderBottom: '1px solid var(--color-border)',
      fontSize: 11,
      fontWeight: 700,
      color: 'var(--color-text-secondary)',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    }}
  >
    {/* Lane color dot (custom mode only) */}
    {lane.laneColor && (
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: lane.laneColor,
          flexShrink: 0,
        }}
      />
    )}

    {/* Editable name (custom mode) vs static name (auto-group) */}
    {groupBy === 'custom' && lane.laneId && editingLaneId === lane.laneId ? (
      <input
        autoFocus
        value={editingLaneName}
        onChange={(e) => setEditingLaneName(e.target.value)}
        onBlur={() => {
          if (editingLaneName.trim() && editingLaneName !== lane.displayName) {
            onUpdateLane?.(lane.laneId!, { name: editingLaneName.trim() });
          }
          setEditingLaneId(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') setEditingLaneId(null);
        }}
        style={{
          flex: 1,
          fontSize: 11,
          fontWeight: 700,
          background: 'transparent',
          border: 'none',
          borderBottom: '1px solid var(--color-accent)',
          color: 'var(--color-text-secondary)',
          outline: 'none',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      />
    ) : (
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {lane.displayName} ({lane.tasks.length})
      </span>
    )}

    {/* Edit + delete icons (custom mode only, non-null laneId) */}
    {groupBy === 'custom' && lane.laneId && editingLaneId !== lane.laneId && (
      <>
        <button
          onClick={() => { setEditingLaneId(lane.laneId!); setEditingLaneName(lane.displayName ?? ''); }}
          title="Rename lane"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--color-text-tertiary)', fontSize: 12, lineHeight: 1 }}
        >✎</button>
        <button
          onClick={() => {
            if (confirm(`Delete lane "${lane.displayName}"? Tasks will be unassigned.`)) {
              onDeleteLane?.(lane.laneId!);
            }
          }}
          title="Delete lane"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--color-danger)', fontSize: 12, lineHeight: 1 }}
        >✕</button>
      </>
    )}
  </div>
)}
```

**Step 11:** Run typecheck:
```bash
cd packages/client && npx tsc --noEmit 2>&1 | head -30
```
Fix any errors. Expected: 0 errors.

**Step 12:** Run tests:
```bash
pnpm --filter @pm/client vitest run src/components/widgets/GanttWidget/
```
Expected: all pass.

**Step 13:** Commit:
```bash
git add packages/client/src/components/widgets/GanttWidget/ \
        packages/client/src/api/lanes.api.ts
git commit -m "feat(lanes): wire custom lanes into GanttWidget — create/rename/delete lane UI in GanttTimeline"
```

---

### Task 10: Add Lane field to LivingTaskModal

**Files:**
- Modify: `packages/client/src/components/task/LivingTaskModal.tsx`

**Step 1:** In `LivingTaskModal.tsx`, add lanes query near the top of the component (after existing queries):
```tsx
import { lanesApi } from '../../api/lanes.api';
import type { LaneDTO } from '@pm/shared';

// Inside component body, after statuses/comments queries:
const { data: lanes = [] } = useQuery({
  queryKey: ['lanes', task?.projectId ?? projectId],
  queryFn: () => lanesApi.list(task?.projectId ?? projectId),
  enabled: !!(task?.projectId ?? projectId),
});
```

**Step 2:** Add lane update mutation in `LivingTaskModal.tsx`. Find where other mutations are defined (`updateMutation`). Add:
```tsx
const laneUpdateMutation = useMutation({
  mutationFn: (laneId: string | null) =>
    tasksApi.update(projectId, task!.id, { laneId }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    queryClient.invalidateQueries({ queryKey: ['lanes', projectId] });
  },
  onError: () => addToast({ type: 'error', message: 'Failed to update lane' }),
});
```

**Step 3:** In the modal's left-pane form area, find where STATUS and PRIORITY dropdowns are rendered. After the ASSIGNEE field, add a LANE field (only shown when `lanes.length > 0`):
```tsx
{lanes.length > 0 && (
  <div>
    <label
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--color-text-tertiary)',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 6,
        display: 'block',
      }}
    >
      LANE
    </label>
    <select
      value={task?.laneId ?? ''}
      onChange={(e) => {
        const val = e.target.value;
        laneUpdateMutation.mutate(val === '' ? null : val);
      }}
      style={{
        width: '100%',
        padding: '8px 12px',
        fontSize: 13,
        borderRadius: 8,
        border: '1px solid var(--color-border)',
        background: 'var(--color-bg-primary)',
        color: 'var(--color-text-primary)',
        cursor: 'pointer',
      }}
    >
      <option value="">No lane</option>
      {lanes.map((lane) => (
        <option key={lane.id} value={lane.id}>
          {lane.name}
        </option>
      ))}
    </select>
  </div>
)}
```

**Step 4:** Run typecheck:
```bash
cd packages/client && npx tsc --noEmit 2>&1 | head -30
```
Expected: 0 errors.

**Step 5:** Commit:
```bash
git add packages/client/src/components/task/LivingTaskModal.tsx
git commit -m "feat(lanes): add Lane dropdown to LivingTaskModal — assign tasks to custom lanes"
```

---

## Phase 4 — Verification

### Task 11: Full typecheck, tests, manual smoke test

**Step 1:** Full typecheck across all packages:
```bash
pnpm typecheck
```
Expected: 0 errors.

**Step 2:** Full test suite:
```bash
pnpm test
```
Expected: all pass.

**Step 3:** Start dev server:
```bash
docker compose up -d && pnpm dev
```

**Step 4:** Smoke test checklist:

| Feature | Test |
|---------|------|
| Scroll | Switch to Week view → horizontal scroll works |
| Task click | Click any task bar → LivingTaskModal opens centered on screen (not offset) |
| Hide unscheduled | Create task with no dates → does NOT appear in Gantt |
| Group by Assignee | Select "By Assignee" from dropdown → lanes appear grouped by person |
| Group by Status | Select "By Status" → lanes grouped by task status |
| Group by Priority | Select "By Priority" → URGENT/HIGH/MEDIUM/LOW/No Priority lanes |
| Create lane | Select "Custom Lanes" → click "+ Lane" → type "Phase 1" → Enter → lane header appears |
| Rename lane | Click ✎ on lane header → rename → blur → name updates |
| Delete lane | Click ✕ on lane → confirm → lane removed, tasks unassigned |
| Assign task to lane | Click task bar → LivingTaskModal opens → "LANE" dropdown shows → select "Phase 1" → close modal → task appears in "Phase 1" lane |
| Lane persists | Refresh page → task still in correct lane |

**Step 5:** Commit any lint fixes if needed:
```bash
pnpm lint --fix
git add -A && git commit -m "fix(lint): address lint warnings from new lanes feature"
```

---

## Critical File Reference

| File | Change |
|------|--------|
| `packages/server/prisma/schema.prisma` | Add `Lane` model + `Task.laneId` FK |
| `packages/server/prisma/migrations/` | New migration file |
| `packages/server/src/modules/lanes/lanes.service.ts` | New: CRUD service |
| `packages/server/src/modules/lanes/lanes.controller.ts` | New: HTTP controller |
| `packages/server/src/modules/lanes/lanes.routes.ts` | New: Express router |
| `packages/server/src/app.ts` | Register `/lanes` route |
| `packages/server/src/modules/tasks/tasks.service.ts` | Include `lane` relation; accept `laneId` in update |
| `packages/shared/src/types/lane.types.ts` | New: LaneDTO, CreateLaneRequest, UpdateLaneRequest |
| `packages/shared/src/types/task.types.ts` | Add `laneId` to TaskDTO and UpdateTaskRequest |
| `packages/shared/src/types/index.ts` | Export lane types |
| `packages/shared/src/validators/lane.validator.ts` | New: Zod schemas |
| `packages/shared/src/validators/index.ts` | Export lane validators |
| `packages/client/src/api/lanes.api.ts` | New: API client |
| `packages/client/src/components/widgets/GanttWidget/index.tsx` | Bug fixes + lanes queries/mutations + groupBy |
| `packages/client/src/components/widgets/GanttWidget/GanttTimeline.tsx` | Hide unscheduled, groupBy, custom lane UI |
| `packages/client/src/components/widgets/TimelineWidget.tsx` | Update groupBy prop |
| `packages/client/src/components/task/LivingTaskModal.tsx` | Lane dropdown field |
