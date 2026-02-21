# 🚀 GSD DYNAMIC ROADMAP

**Current Sprint:** Phase 6: Templates & Time Tracking — PENDING
**Overall Progress:** [#####-------] 25%
**Last Sync:** 2026-02-14

---

## ✅ Completed

### 1.1 Task Priority — `DONE`
- [x] DB Schema, Shared Types (TaskPriority enum), Zod Validators
- [x] PRIORITY_CONFIG constant, Server Service, UI (dropdown + dot)

### 1.2 Task Labels — `DONE`
- [x] Backend module (service, controller, routes) + app.ts registration
- [x] Frontend API client, LabelSelector component
- [x] KanbanCard label badges, TaskDetailModal integration
- [x] Task queries include labels

### 1.3 Task Comments — `DONE`
- [x] Backend module (service with author ownership, controller, routes + RBAC)
- [x] Frontend API client, CommentThread component (add/edit/delete)
- [x] KanbanCard comment count badge, TaskDetailModal integration
- [x] Task queries include comments (lightweight for list, full for detail)
- [x] Bug fix: Nested form tags resolved (CommentThread + LabelSelector)

---

### 2.1 Subtask UI — `DONE`
- [x] SubtaskList component (create, toggle status, edit, delete, progress bar)
- [x] TaskDetailModal integration
- [x] KanbanCard subtask progress badge (existing)
- [x] API verified: createSubtask endpoint working

### 2.2 Dependencies UI — `DONE`
- [x] DependencyManager component (blocked-by/blocking display, search + add, remove)
- [x] TaskDetailModal integration
- [x] KanbanCard blocked indicator (lock icon)
- [x] API verified: addDependency/removeDependency endpoints working

---

### 3.1 WebSocket Real-time — `DONE`
- [x] 13 new event constants + type signatures (subtask/dependency/label/comment)
- [x] Wired 26 `getIO().to().emit()` calls across 7 service files
- [x] 13 existing orphaned events now emitting (task/status/widget/file/project)
- [x] 13 new client listeners in useWebSocket.ts with React Query invalidation
- [x] QA: 0 new compile errors across all 3 packages

---

### 3.2 Dependency Graph — `DONE`
- [x] Prisma WidgetType enum: added DEPENDENCY_GRAPH + migration
- [x] DependencyGraphWidget: topological layout, SVG edges, node hover/click
- [x] WidgetRegistry + catalog entry (icon, default size 700x400)
- [x] Click node → TaskDetailModal, hover → highlight connected edges
- [x] QA: 0 new compile errors

---

### 3.3 Subtask Reordering — `DONE`
- [x] SortableSubtaskItem component with useSortable hook + drag handle
- [x] DndContext + SortableContext wrapping subtask list
- [x] handleDragEnd: calculates sortOrder, calls existing reorder API
- [x] reorderMutation with optimistic invalidation
- [x] Visual feedback: opacity, background, grab cursor
- [x] QA: 0 new compile errors

---

## 📋 Phase 4: UX Polish & Productivity

### 4.1 Task Filtering & Search — `DONE`
- [x] useTaskFilters hook: client-side filter state + memoized filtering logic
- [x] FilterBar component: search, status, priority, assignee, label dropdowns + clear
- [x] KanbanWidget integration: FilterBar above KanbanBoard, passes filteredTasks
- [x] TaskListWidget integration: FilterBar replaces old status-only filter bar
- [x] Backend: added priority filter to TasksService + controller query params
- [x] QA: 0 new compile errors across all 3 packages

### 4.2 User Profile Page — `DONE`
- [x] Backend: changePassword endpoint (service + controller + route)
- [x] Client API: update() + changePassword() methods added to usersApi
- [x] ProfilePage component: avatar, display name, avatar URL, password change sections
- [x] Router: /profile route registered (lazy-loaded)
- [x] TopBar: Profile link added to user dropdown menu
- [x] QA: 0 new compile errors

### 4.3 Activity Feed Widget — `DONE`
- [x] Prisma migration: ACTIVITY_FEED added to WidgetType enum
- [x] Shared WidgetType enum + Zod validator synced (added DEPENDENCY_GRAPH + ACTIVITY_FEED)
- [x] ActivityService: log writer (fire-and-forget) + project-scoped list endpoint
- [x] Activity logging wired into 4 key events (task.created, task.updated, task.deleted, comment.created)
- [x] Activity routes registered in app.ts: /projects/:projectId/activity
- [x] Client API: activityApi.list()
- [x] ActivityFeedWidget: avatar, user name, action verb, detail, relative time
- [x] WidgetRegistry + catalog entry (icon, default size 400x400)
- [x] QA: 0 new compile errors

---

## 📋 Phase 5: Security, Stability & Core UX

### 5.1 Security & Stability — `DONE`
- [x] ErrorBoundary component — ALREADY EXISTS (verified in ErrorBoundary.tsx + WidgetErrorBoundary)
- [x] Fix XSS in AIAssistantWidget — ALREADY SAFE (no dangerouslySetInnerHTML used)
- [x] Add missing validation middleware — ALREADY EXISTS (reorderTaskSchema + changePasswordSchema)
- [x] Fix all pre-existing compile errors — FIXED (70 errors across 16 files)

### 5.2 Dashboard Analytics — `DONE`
- [x] Dashboard stats cards (total tasks, overdue, completed this week, team members)
- [x] Recent activity feed section on dashboard
- [x] Upcoming deadlines list
- [x] Wire up AdminPage activity logs tab

### 5.3 Notification System — `DONE`
- [x] Notification bell icon in TopBar with badge count
- [x] NotificationDropdown: recent notifications from WebSocket events
- [x] Connect to existing WebSocket events for real-time push
- [x] Expand activity logging to cover all entity types (21 events across 7 modules)

---

## 📋 Phase 6.1: Advanced Gantt Chart — `IN PROGRESS`

### Branch Strategy (Zero Regression Rule)
- Each sub-task → dedicated branch → merged only after [QA] PASS
- Branches: `feature/gantt-schema`, `feature/gantt-api`, `feature/gantt-core`, `feature/gantt-resource`, `feature/gantt-export`

### 6.1.A Schema & Shared Types — `DONE`
- [x] Prisma: add `isMilestone Boolean @default(false)` to Task model
- [x] Prisma: add `estimatedHours Int @default(0)` to Task model
- [ ] Run migration: `pnpm db:migrate` — **[DevOps] gate before deploy**
- [x] shared/types/task.types.ts: add `isMilestone`, `estimatedHours`, `progressPercentage` to TaskDTO
- [x] shared/types/gantt.types.ts: UpdateTaskTimelineRequest/Response, DayResourceLoad
- [x] shared/validators/gantt.validator.ts: updateTimelineSchema (startDate, endDate, autoSchedule)
- [x] Rebuild shared package: 0 errors (`pnpm --filter @pm/shared build` PASS)

### 6.1.B API Layer — `IN PROGRESS` (branch: feature/gantt-api)
- [x] tasks.service.ts: add `updateTimeline(taskId, data, actorId)` — Prisma BFS + $transaction cascade
- [x] tasks.service.ts: extend `update()` to accept `isMilestone` + `estimatedHours`
- [x] tasks.controller.ts: add `updateTimeline` handler — logs `task.gantt.timeline_updated` + `task.gantt.timeline_cascaded` per downstream task; logs `task.gantt.milestone_toggled` + `task.gantt.estimated_hours_set` on field edits
- [x] tasks.routes.ts: register `PATCH /:taskId/timeline` (auth + EDITOR RBAC + validate)
- [x] shared/validators/gantt.validator.ts: `updateTimelineSchema` (startDate, endDate, autoSchedule)
- [x] shared/validators/index.ts: export gantt.validator
- [x] Emit WS_EVENTS.TASK_UPDATED after timeline patch (primary + each cascaded task)
- [x] taskChangeHistory: field-level diff recorded for startDate + dueDate on primary and cascaded tasks
- [x] tasks.service.ts: add `computeProgress(task)` helper — subtask ratio or status-name fallback
- [x] tasks.service.ts: integrate `progressPercentage` into list() and getById() responses

### 6.1.C Core Gantt Components — `DONE`
- [x] GanttWidget/index.tsx — root widget, view/year state, autoSchedule, PDF export, mutation
- [x] GanttWidget/GanttHeader.tsx — Day/Week/Month/Quarter/Year tabs, year select, toggle, export btn
- [x] GanttWidget/GanttGrid.tsx — swimlane matrix, date columns, today highlight, smart sort, dep lines
- [x] GanttWidget/GanttTaskBar.tsx — progress fill, milestone diamond (isMilestone), drag-on-day/week only
- [x] GanttWidget/GanttDependencyLines.tsx — SVG overlay, cubic Bezier arrows with arrowhead marker
- [x] GanttWidget/GanttTooltip.tsx — hover card: title, status, assignee, progress bar, dates, hours, milestone badge
- [x] tasks.api.ts: `updateTimeline(projectId, taskId, payload)` added
- [x] WidgetRegistry: register TIMELINE → GanttWidget (catalog title/description/defaultSize updated)

### 6.1.D Resource Overload Indicator — `DONE` (integrated in GanttGrid)
- [x] Per-assignee per-day estimatedHours computed via `useMemo` in GanttGrid
- [x] If sum > 8h: `ring-2 ring-red-500` on avatar + title tooltip
- [x] 0 extra API calls — pure client-side derivation from task data

### 6.1.E PDF Export — `DONE` (integrated in GanttWidget/index.tsx)
- [x] `html2canvas` + `jspdf` installed in client package (`pnpm --filter @pm/client add`)
- [x] Dynamically imported in handleExportPdf (keeps them out of initial bundle)
- [x] Filename: `gantt-{projectId}-{date}.pdf`, landscape orientation, 2x scale

### 6.2 Task Templates UI — `DEFERRED`
### 6.3 Time Tracking UI — `DEFERRED`

---

## 🪵 Activity Log (Recent)
- [2026-02-21] [Dev] 6.1.C WidgetRegistry: TIMELINE → GanttWidget. Catalog updated (title, description, defaultSize 1100x500). 0 compile errors. PHASE 6.1 COMPLETE.
- [2026-02-21] [QA] 6.1 Compile check: 0 errors across shared + server + client. PASS.
- [2026-02-21] [Dev] 6.1.C GanttWidget tree complete: index, GanttHeader, GanttGrid, GanttTaskBar, GanttDependencyLines, GanttTooltip. html2canvas + jspdf installed.
- [2026-02-21] [Dev] 6.1.B computeProgress() added to tasks.service.ts — subtask ratio or status-name fallback. Wired into list() and getById().
- [2026-02-21] [Dev] 6.1.B Activity logging wired: 4 Gantt-specific action types (timeline_updated, timeline_cascaded, milestone_toggled, estimated_hours_set). TaskChangeHistory + WS emit on all cascaded tasks.
- [2026-02-21] [Dev] 6.1.B updateTimeline() service method: BFS cascade, Prisma $transaction, returns full before/after per task.
- [2026-02-21] [Dev] 6.1.B PATCH /:taskId/timeline route registered with auth + EDITOR RBAC + Zod validation.
- [2026-02-21] [Dev] 6.1.B gantt.validator.ts added to shared package (updateTimelineSchema).
- [2026-02-21] [Lead] Phase 6.1 Advanced Gantt initiated. CONTEXT.md + TODO.md updated. Architect + UX/UI specs delivered. User approved — Dev in progress.

- [2026-02-14] [Lead] Phase 5.2 Dashboard Analytics marked DONE. Stats cards, activity feed, deadlines on dashboard.
- [2026-02-14] [Lead] Phase 5.3 Notification System marked DONE. Bell icon, dropdown, WebSocket push, 21 activity events.
- [2026-02-14] [Dev] TASK_UPDATED notification added for assignees. Status change activity logging added.
- [2026-02-14] [Dev] Activity logging expanded to 7 controllers (files, labels, permissions, projects, statuses, tasks, users).
- [2026-02-14] [Dev] Dashboard: stats cards, recent activity, upcoming deadlines. Admin: activity logs tab.
- [2026-02-14] [Architect] Phase 6 defined: Templates & Time Tracking (both models exist in Prisma, UI needed).
- [2026-02-09] [Lead] Phase 2.3 Views & Visualization marked DONE. CalendarWidget built, enum mismatches fixed.
- [2026-02-09] [QA] 2.3 Compile check: 0 errors across shared + client packages. PASS.
- [2026-02-09] [Dev] 2.3 CalendarWidget: month grid, task pills, navigation, FilterBar, click-to-create with date pre-fill.
- [2026-02-09] [Dev] 2.3 Fixed ANALYTICS enum mismatch (shared enum + Zod validator synced to 9 widget types).
- [2026-02-09] [Dev] 2.3 TaskDetailModal: added defaultDueDate prop for calendar click-to-create.
- [2026-02-09] [DevOps] 2.3 Prisma db push: CALENDAR added to WidgetType enum.
- [2026-02-09] [Dev] Fixed 2 pre-existing compile errors (LoginForm unused var, AdminPage Button style prop).
- [2026-02-06] [Lead] 5.1 Security & Stability marked DONE. 70 compile errors fixed across server package.
- [2026-02-06] [QA] 5.1 Compile check: 0 errors across all 3 packages. PASS.
- [2026-02-06] [Dev] 5.1 Fixed type assertions in 11 controllers + 5 services (TaskPriority, ProjectRole, WidgetType, Prisma.InputJsonValue casts).
- [2026-02-06] [Architect] 5.1 Audit: ErrorBoundary exists, XSS safe, validation exists. Only compile errors needed fixing.
- [2026-02-04 14:00] [Lead] Phase 5 defined: Security & Stability, Dashboard Analytics, Notification System.
- [2026-02-04 13:45] [Lead] Codebase audit: found 35 gaps (2 critical security, 8 high-impact, 10 medium, 15 low).
- [2026-02-04 13:15] [Lead] 4.3 Activity Feed Widget marked DONE. PHASE 4 COMPLETE.
- [2026-02-04 13:12] [QA] 4.3 Compile check: 0 new errors across all 3 packages. PASS.
- [2026-02-04 13:10] [Dev] 4.3 ActivityFeedWidget + WidgetRegistry registration.
- [2026-02-04 13:08] [Dev] 4.3 Client API: activityApi.list() created.
- [2026-02-04 13:05] [Dev] 4.3 Activity logging wired: task CRUD + comment.created (4 events).
- [2026-02-04 13:00] [Dev] 4.3 ActivityService (log writer) + controller + routes + app.ts registration.
- [2026-02-04 12:55] [DevOps] 4.3 Prisma migration: add_activity_feed_widget_type. Shared enum + validator synced.
- [2026-02-04 12:50] [Architect] 4.3 Spec: ActivityLog model exists, wire logging + create widget.
- [2026-02-04 12:45] [Lead] 4.2 User Profile Page marked DONE.
- [2026-02-04 12:42] [QA] 4.2 Compile check: 0 new errors. PASS.
- [2026-02-04 12:40] [Dev] 4.2 TopBar: Profile link added to user dropdown menu.
- [2026-02-04 12:38] [Dev] 4.2 ProfilePage component + /profile route registered.
- [2026-02-04 12:35] [Dev] 4.2 Client API: usersApi.update() + usersApi.changePassword().
- [2026-02-04 12:30] [Dev] 4.2 Backend: changePassword endpoint (bcrypt verify + hash).
- [2026-02-04 12:25] [Architect] 4.2 Spec: Profile info + password change sections.
- [2026-02-04 12:15] [Lead] 4.1 Task Filtering & Search marked DONE.
- [2026-02-04 12:12] [QA] 4.1 Compile check: 0 new errors across all 3 packages. PASS.
- [2026-02-04 12:10] [Dev] 4.1 FilterBar integrated into KanbanWidget + TaskListWidget.
- [2026-02-04 12:05] [Dev] 4.1 useTaskFilters hook + FilterBar component created.
- [2026-02-04 12:00] [Dev] 4.1 Backend priority filter added to TasksService + controller.
- [2026-02-04 11:55] [Architect] 4.1 Spec: Client-side filtering via shared hook, reusable FilterBar.
- [2026-02-04 11:30] [Lead] Phase 4 defined: Task Filtering, User Profile, Activity Feed.
- [2026-02-04 11:00] [Lead] 3.3 Subtask Reordering marked DONE. Phase 3 COMPLETE.
- [2026-02-04 10:55] [QA] 3.3 Compile check: 0 new errors. PASS.
- [2026-02-04 10:50] [Dev] 3.3 SubtaskList rewritten with @dnd-kit sortable drag-drop.
- [2026-02-04 10:45] [Architect] 3.3 Spec: Reuse existing reorder endpoint + @dnd-kit pattern.
- [2026-02-03 10:15] [Lead] 3.2 Dependency Graph marked DONE.
- [2026-02-03 10:12] [QA] 3.2 Compile check: 0 new errors. PASS.
- [2026-02-03 10:10] [Dev] 3.2 DependencyGraphWidget + WidgetRegistry registration.
- [2026-02-03 10:05] [DevOps] 3.2 Prisma migration: add_dependency_graph_widget_type.
- [2026-02-03 10:00] [Architect] 3.2 Spec: Pure CSS/SVG graph, no external library.
- [2026-02-03 09:30] [Lead] 3.1 WebSocket Real-time marked DONE. Phase 3 in progress.
- [2026-02-03 09:28] [QA] 3.1 Compile check: 0 new errors across shared/server/client. PASS.
- [2026-02-03 09:25] [Dev] 3.1 Client listeners: 13 new handlers + cleanup in useWebSocket.ts.
- [2026-02-03 09:20] [Dev] 3.1 Server emissions: 26 emit calls wired into 7 service files.
- [2026-02-03 09:15] [Dev] 3.1 Shared: 13 new WS_EVENTS constants + ServerToClientEvents types.
- [2026-02-03 09:10] [Architect] 3.1 Spec: Found 13 orphaned events + 4 missing entity types.
- [2026-02-03 08:05] [QA] Phase 2 API verified: subtask + dependency CRUD all 200s. 0 compile errors.
- [2026-02-03 08:00] [Dev] 2.2 DependencyManager component + KanbanCard blocked indicator.
- [2026-02-03 07:58] [Dev] 2.1 SubtaskList component (progress bar, checkbox toggle, CRUD).
- [2026-02-03 07:55] [Architect] Phase 2 analysis: full backend exists, only UI components needed.
- [2026-02-02 14:12] [QA] Bug fix verified: nested <form> tags resolved, 0 console errors.
- [2026-02-02 14:10] [Dev] Fixed nested form bug in CommentThread + LabelSelector.
- [2026-02-02 14:08] [QA] Found nested <form> DOM nesting error causing form submit conflicts.
- [2026-02-02 14:05] [Lead] 1.3 Task Comments marked DONE. Phase 1 COMPLETE.
- [2026-02-02 14:00] [Lead] 1.2 Task Labels marked DONE. Moving to 1.3 Task Comments.
- [2026-02-02 13:55] [QA] 1.2 Verification: PASS.
- [2026-02-02 13:50] [Dev] 1.2 Frontend + backend complete. Labels include in task queries.
- [2026-02-02 13:30] [Lead] 1.1 Task Priority marked DONE.
- [2026-02-02 10:45] [Lead] Initialized GSD Framework and Team Protocol.
