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
 CURRENT: Phase 6 — Templates & Time Tracking (both Prisma models exist, UI needed).

## Critical Rules
- Always use Shared package for Types.
- RBAC must be checked on every new API route.
- Task queries must include labels AND comments in Prisma includes.
- Never nest <form> elements inside TaskDetailModal (use <div> + onClick instead).
