# GSD Project Roadmap

> **Project:** Project Management Platform
> **Architecture:** Monorepo (React + Express + PostgreSQL)
> **Current Security Score:** 9.5/10

---

## Phase 0 — SECURITY HARDENING (Priority: CRITICAL) ✅ COMPLETE

All security hardening items implemented. Security score: 9.5/10.

### 0.1 CSRF Protection ✅
- [x] Implement Origin/Referer header validation (SPA-appropriate pattern)
- [x] Validate CSRF on all state-changing requests (POST/PATCH/DELETE)
- [x] Integrated into global middleware stack

### 0.2 Account Lockout & Brute Force Protection ✅
- [x] Progressive lockout after 5 failed login attempts (15min → 30min → 1hr)
- [x] In-memory failed attempt tracking with TTL cleanup
- [x] IP-based rate limiting (20 failed attempts/15min window per IP)
- [ ] Send email notification on lockout (deferred — requires email service from Phase 2.1)

### 0.3 WebSocket Authorization Hardening ✅
- [x] Validate project membership on `project:join` event
- [x] Room membership check on all sensitive events (cursor, typing)
- [x] WS rate limiting (50 events per 10s window per socket)
- [x] Room eviction when permissions are revoked (`evictUserFromProject`)
- [x] Heartbeat/ping-pong with periodic auth re-validation (30s interval)
- [x] Re-validate JWT + user active status + room permissions periodically

### 0.4 Template Access Control ✅
- [x] Verify user has access to template before instantiation
- [x] Enforce `isPublic` flag — private templates only visible to creator
- [x] Permission check in `projects.service.ts` instantiate flow

### 0.5 Password Policy Enforcement ✅
- [x] Require minimum complexity: 1 uppercase, 1 lowercase, 1 number, 1 special char
- [x] Check against common password list (~100 most common passwords)
- [ ] Add password strength meter on client (deferred — UI enhancement for Phase 3.4)
- [ ] Enforce password history (deferred — requires schema change + migration)

### 0.6 Input Sanitization & Validation Gaps ✅
- [x] Max size limit on `task.description` (100KB bounded JSON field)
- [x] HTML sanitization on comments (strip tags before storage, 10K char limit)
- [x] File upload validation (MIME type whitelist: images, docs, archives)
- [x] File size limit (10MB) enforced in validator
- [x] `Content-Disposition: attachment` on file downloads (prevent XSS via uploads)

### 0.7 Security Headers & Transport ✅
- [x] `Permissions-Policy` header (camera, microphone, geolocation disabled)
- [x] `X-Permitted-Cross-Domain-Policies: none`
- [x] HSTS with `includeSubDomains` and `preload` (1 year max-age)
- [x] `Content-Disposition: attachment` on file downloads
- [x] CSP with strict source directives via Helmet

### 0.8 Audit Logging ✅
- [x] Log admin operations (role changes, user deactivation)
- [x] Log permission changes (invites, role updates, removals)
- [x] Log authentication events (login, logout, failed attempts, token refresh)
- [x] **Database persistence** (AuditLog model with async writes)
- [x] **90-day retention policy** with automatic daily cleanup
- [x] IP address and user agent captured in all audit entries

### 0.9 Token Security Improvements ✅
- [x] httpOnly cookie support for refresh tokens (with SameSite=strict in production)
- [x] Token fingerprinting (SHA-256 hash of user-agent + IP bound to JWT)
- [x] `jti` (JWT ID) claim on every access token for tracking
- [x] Refresh token still available via body for backward compatibility
- [ ] Access token blacklist (deferred — requires Redis, Phase 5.3)

---

## Phase 1 — TESTING & RELIABILITY (Priority: HIGH)

Current test coverage is minimal (3 test files). This blocks safe feature development.

### 1.1 Server Unit Tests
- [ ] Auth service tests (register, login, refresh, logout)
- [ ] Task service tests (CRUD, status changes, reordering)
- [ ] Project service tests (CRUD, permissions, templates)
- [ ] Permission service tests (invite, update, custom roles)
- [ ] Middleware tests (auth, rate limiting, validation)
- **Target:** 80%+ service layer coverage

### 1.2 Server Integration Tests
- [ ] Auth flow end-to-end (register → login → refresh → logout)
- [ ] RBAC enforcement (role-based endpoint access)
- [ ] Task lifecycle (create → update status → assign → complete)
- [ ] WebSocket event propagation
- [ ] Error handling (400, 401, 403, 404, 409 responses)

### 1.3 Client Unit Tests
- [ ] All Zustand stores (auth, ui, project, ws — auth/ui done)
- [ ] Custom hooks (useAuth, useProjectPermission, useProjectSocket)
- [ ] Utility functions (export — partially done)
- [ ] API client interceptor logic (token refresh flow)

### 1.4 Client Component Tests
- [ ] Auth forms (LoginForm, RegisterForm)
- [ ] KanbanBoard drag-and-drop behavior
- [ ] ProtectedRoute rendering logic
- [ ] Modal components (TeamManagement, TaskDetail)
- [ ] Toast notification system

### 1.5 E2E Tests
- [ ] Set up Playwright or Cypress
- [ ] Auth flow (register, login, logout)
- [ ] Project creation and navigation
- [ ] Task CRUD on Kanban board
- [ ] Team member invite and permission changes
- [ ] Real-time updates between two sessions

---

## Phase 2 — CORE FEATURE COMPLETION (Priority: HIGH)

Fill gaps in existing features that affect daily usability.

### 2.1 Email System
- [ ] Set up transactional email provider (SendGrid/Resend/SES)
- [ ] Password reset flow (forgot password → email link → reset form)
- [ ] Email verification on registration
- [ ] Project invite notifications via email
- [ ] Task assignment notifications
- [ ] Digest emails (daily/weekly project summary)

### 2.2 Task Enhancements
- [ ] Bulk task operations (select multiple → move, assign, delete)
- [ ] Task search with full-text search (PostgreSQL tsvector or external)
- [ ] Task activity history (who changed what, when)
- [ ] Recurring tasks (daily, weekly, custom schedule)
- [ ] Task time tracking (start/stop timer, manual entry)
- [ ] Rich text editor for task descriptions (Tiptap/ProseMirror)

### 2.3 Views & Visualization
- [ ] List view (table format with sorting/filtering)
- [ ] Timeline/Gantt view widget (using existing TIMELINE widget type)
- [ ] Calendar view (tasks by due date)
- [ ] Dependency graph visualization (using existing DEPENDENCY_GRAPH widget type)
- [ ] Activity feed widget (using existing ACTIVITY_FEED widget type)

### 2.4 Notifications System
- [ ] In-app notification center (bell icon with unread count)
- [ ] Real-time notifications via WebSocket
- [ ] Notification preferences (per-project, per-event-type)
- [ ] Mark as read/unread, bulk dismiss
- [ ] Push notifications (web push API)

### 2.5 File Management
- [ ] File preview (images, PDFs, text files)
- [ ] File versioning (upload new version, view history)
- [ ] Drag-and-drop file upload in task detail
- [ ] File size limits and storage quotas per project
- [ ] Integrate actual S3 backend (currently placeholder)

---

## Phase 3 — COLLABORATION & UX (Priority: MEDIUM)

### 3.1 Real-Time Collaboration
- [ ] Live cursors on Kanban board (foundation exists in WS)
- [ ] Presence indicators (who's viewing which project)
- [ ] Collaborative task editing (conflict resolution)
- [ ] Typing indicators in comments
- [ ] "User X is viewing this task" indicators

### 3.2 Comments & Communication
- [ ] @mentions in comments (notify mentioned users)
- [ ] Comment reactions (emoji reactions)
- [ ] Threaded replies on comments
- [ ] Markdown support in comments
- [ ] File attachments in comments

### 3.3 Dashboard Improvements
- [ ] Project analytics widgets (task completion rates, burndown charts)
- [ ] Personal "My Tasks" dashboard across all projects
- [ ] Recently viewed projects
- [ ] Starred/favorited projects
- [ ] Project search and filtering

### 3.4 UX Polish
- [ ] Keyboard shortcuts (Ctrl+K command palette, task navigation)
- [ ] Onboarding flow for new users (guided tour)
- [ ] Empty states with actionable guidance
- [ ] Undo/redo for task operations (optimistic updates with rollback)
- [ ] Responsive mobile layout
- [ ] Accessibility audit (ARIA labels, keyboard navigation, screen readers)

---

## Phase 4 — PLATFORM FEATURES (Priority: MEDIUM)

### 4.1 Advanced Permissions
- [ ] Project-level API keys (for external integrations)
- [ ] Granular task-level permissions (restrict specific tasks to specific users)
- [ ] Permission inheritance for subtasks
- [ ] Team/group-based permissions (assign roles to groups, not just individuals)
- [ ] Guest access (view-only links without login)

### 4.2 AI Assistant (Widget Exists)
- [ ] Connect AI_ASSISTANT widget to LLM provider
- [ ] Task suggestions based on project context
- [ ] Auto-generate task descriptions from titles
- [ ] Smart task assignment recommendations
- [ ] Natural language task creation ("Create a task to fix the login bug, high priority, due Friday")

### 4.3 Integrations
- [ ] GitHub/GitLab integration (link PRs to tasks, auto-update status)
- [ ] Slack integration (notifications, task creation from Slack)
- [ ] Webhook system (configurable outgoing webhooks per event)
- [ ] Import from Jira/Trello/Asana (CSV + API import)
- [ ] Export to CSV/JSON (foundation exists in `export.ts`)
- [ ] REST API documentation (OpenAPI/Swagger)

### 4.4 Templates System
- [ ] Template marketplace/gallery (browse public templates)
- [ ] Template versioning
- [ ] Template categories and tags
- [ ] Template preview before instantiation
- [ ] Community template sharing

---

## Phase 5 — SCALABILITY & OPERATIONS (Priority: LOW — until traffic demands it)

### 5.1 Performance
- [ ] Database query optimization (N+1 queries, missing indexes)
- [ ] Redis caching layer (project data, user sessions, query results)
- [ ] Connection pooling (PgBouncer or Prisma connection pool)
- [ ] Client-side virtualization for large task lists (react-window)
- [ ] Image/asset CDN (CloudFront or Vercel Edge)
- [ ] Bundle size optimization (analyze and tree-shake)

### 5.2 Observability
- [ ] Structured logging (pino/winston with JSON output)
- [ ] Application performance monitoring (Sentry, Datadog, or New Relic)
- [ ] Health check dashboard (uptime, response times, error rates)
- [ ] Database query performance monitoring
- [ ] WebSocket connection metrics
- [ ] Alerting on error rate spikes

### 5.3 Infrastructure
- [ ] Database backups (automated daily snapshots)
- [ ] Staging environment (separate Render/Vercel deployment)
- [ ] Blue-green or canary deployments
- [ ] Database migration rollback strategy
- [ ] Horizontal scaling preparation (stateless server, external session store)
- [ ] Rate limiting with Redis (distributed, not in-memory)

### 5.4 Developer Experience
- [ ] API documentation (Swagger/OpenAPI auto-generated)
- [ ] Development seed data (realistic test data for all models)
- [ ] Pre-commit hooks (lint, typecheck, test affected)
- [ ] PR template with checklist
- [ ] Automated dependency updates (Renovate/Dependabot)
- [ ] Code coverage reporting in CI (Codecov/Coveralls)

---

## Execution Priority Matrix

| Phase | Priority | Effort | Impact | Start When |
|-------|----------|--------|--------|------------|
| **Phase 0** — Security | CRITICAL | 2-3 weeks | Prevents vulnerabilities | **NOW** |
| **Phase 1** — Testing | HIGH | 2-3 weeks | Enables safe development | After Phase 0.1-0.4 |
| **Phase 2** — Core Features | HIGH | 4-6 weeks | Daily usability | Parallel with Phase 1 |
| **Phase 3** — Collaboration | MEDIUM | 4-6 weeks | User engagement | After Phase 2 core |
| **Phase 4** — Platform | MEDIUM | 6-8 weeks | Market differentiation | After Phase 3 |
| **Phase 5** — Scale | LOW | Ongoing | Operational maturity | When traffic demands |

---

## Immediate Next Actions (This Sprint)

1. ~~Implement CSRF protection (Phase 0.1)~~ ✅
2. ~~Add account lockout (Phase 0.2)~~ ✅
3. ~~Fix WebSocket room authorization (Phase 0.3)~~ ✅
4. ~~Fix template access control (Phase 0.4)~~ ✅
5. ~~Add server auth service tests (Phase 1.1)~~ ✅
6. ~~Complete remaining Phase 0 items (0.5-0.9)~~ ✅
7. **Next: Begin Phase 1.2 — Server Integration Tests**
8. **Next: Begin Phase 2.1 — Email System**

---

*Generated by GSD Framework — Last updated: 2026-02-08*
