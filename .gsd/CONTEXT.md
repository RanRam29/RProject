# PROJECT CONTEXT: RPROJECTS 2.0

## Tech Stack
- Frontend: React, Tailwind, Lucide Icons, Radix UI.
- Backend: Node.js, Express, Socket.io.
- DB: Prisma (PostgreSQL), Mock S3 for Files.
- Auth: JWT, RBAC (System & Project roles).

## Current State
- Auth & Users: Fully Functional.
- Projects & Tasks: CRUD complete, Kanban DnD working, Subtask drag-drop reordering.
- Task Priority: Fully implemented (enum, types, validators, service, UI dropdown + dot).
- Task Labels: Fully implemented (CRUD, assign/remove, UI selector + card badges).
- Task Comments: Fully implemented (CRUD with author ownership, threaded UI, card count badge).
- Real-time: Socket.io fully wired — 26 events emitting across all entities (task, status, widget, file, project, subtask, dependency, label, comment). Client listeners auto-invalidate React Query cache.
- Widgets: 7 types (Task, Kanban, Timeline, Files, AI, Dependency Graph, Activity Feed).
- Task Filtering: Shared FilterBar component + useTaskFilters hook. Filters: search, status, priority, assignee, label. Integrated into KanbanWidget + TaskListWidget.
- User Profile: ProfilePage at /profile (edit display name, avatar URL, change password). TopBar dropdown has Profile link.
- Activity Feed: ActivityLog model populated via activityService.log(). ActivityFeedWidget shows recent project activity. 21 events tracked across 7 modules.
- Notifications: Full system — bell icon in TopBar, dropdown, WebSocket real-time push, 6 notification types (TASK_ASSIGNED, TASK_UPDATED, TASK_COMMENTED, PROJECT_INVITED, PERMISSION_CHANGED, MENTION).
- Dashboard: Stats cards (tasks, overdue, completed, team), recent activity, upcoming deadlines.

## Active Goal
 Phases 1-5 COMPLETE. Phase 2.3 (Views & Visualization) COMPLETE.
 Phase 6 (Templates & Time Tracking) SUPERSEDED.
 CURRENT: Phase 6.1 — Advanced Gantt Chart Implementation (multi-view, milestones, auto-scheduling, resource overload, PDF export).

## Phase 6.1 Gantt — Key Decisions
- New Prisma fields on Task: `isMilestone Boolean @default(false)`, `estimatedHours Int @default(0)`
- `progressPercentage` is COMPUTED by the backend service, never stored
- Progress formula: if subtasks exist → (completed_subtasks / total_subtasks) * 100; else by status name (TODO=0, IN_PROGRESS=50, IN_REVIEW=90, COMPLETED/final=100)
- New API route: `PATCH /api/projects/:projectId/tasks/:taskId/timeline` — accepts startDate, endDate, autoSchedule (bool); if autoSchedule=true, runs Prisma transaction to cascade date shift to all downstream dependents
- Gantt DnD restricted to Day/Week views only
- Resource overload: sum estimatedHours per assignee per day; if >8 → red ring on avatar
- Export: 100% client-side via html2canvas + jspdf (no server involvement)
- New component tree: GanttWidget/ → GanttHeader, GanttGrid, GanttTaskBar, GanttDependencyLines
- Git: every sub-task on its own branch (e.g. feature/gantt-core), merged only after QA PASS

## Critical Rules
- Always use Shared package for Types.
- RBAC must be checked on every new API route.
- Task queries must include labels AND comments in Prisma includes.
- Never nest <form> elements inside TaskDetailModal (use <div> + onClick instead).
