# 🚀 GSD DYNAMIC ROADMAP

**Current Sprint:** Phase 5: Security, Stability & Core UX — IN PROGRESS
**Overall Progress:** [------------] 0%
**Last Sync:** 2026-02-04 14:00

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

### 5.1 Security & Stability — `IN_PROGRESS`
- [ ] ErrorBoundary component (wrap AppLayout + individual widgets)
- [ ] Fix XSS in AIAssistantWidget (replace dangerouslySetInnerHTML with safe rendering)
- [ ] Add missing validation middleware (reorder endpoint + password change)
- [ ] Fix all pre-existing compile errors (unused imports/variables across 4 files)

### 5.2 Dashboard Analytics — `PENDING`
- [ ] Dashboard stats cards (total tasks, overdue, completed this week, team members)
- [ ] Recent activity feed section on dashboard
- [ ] Upcoming deadlines list
- [ ] Wire up AdminPage activity logs tab

### 5.3 Notification System — `PENDING`
- [ ] Notification bell icon in TopBar with badge count
- [ ] NotificationDropdown: recent notifications from WebSocket events
- [ ] Connect to existing WebSocket events for real-time push
- [ ] Expand activity logging to cover all entity types (10+ more events)

---

## 🪵 Activity Log (Recent)
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
