# Refactoring Plan — Final Optimized Execution

## Completed Work
- ✅ **Batch 1** — Shared Package: Contract Layer (8 tasks, 13 files, 524/524 tests)
- ✅ **Batch 2** — Server: Clean Architecture / Layer Fixes (6 tasks, 5 files, 524/524 tests)

## Philosophy
- **Stability first.** Every batch leaves the build green (typecheck + tests).
- **Surgical edits.** No full-file rewrites. Favor focused, incremental changes.
- **File-locality.** Group tasks that touch the same files to minimize context-switching.
- **Stop-and-confirm** after each batch.

---

## Batch 3: Server Utilities — Create the Shared Infrastructure

**Why next:** This batch creates 3 small utility files that will be consumed by every
service in Batches 4+. They are leaf dependencies — nothing else needs to change for
them to exist. Creating them first means subsequent batches can *use* them immediately
as we touch each service file, instead of making a second pass.

**Estimated scope:** 3 new files created, 0 existing files modified. Unit tests for each.

### Task 3.1 — Create `utils/ws-emitter.ts` (+ test)

**Problem:** 30 `getIO().to(room).emit(event, payload)` calls across 9 services. Three
shape variations: standard project-room, user-scoped room (`user:${id}`), and
time-tracking's try/catch wrapper. Every service imports both `getIO` and `WS_EVENTS`.

**Solution:** A thin typed wrapper:
```ts
export function emitToProject(projectId: string, event: string, payload: unknown): void
export function emitToUser(userId: string, event: string, payload: unknown): void
```
- Wraps `getIO().to(room).emit(...)` with a safe try/catch (absorbs "socket not initialized" errors that time-tracking currently handles ad-hoc).
- Centralizes the import surface: services only import `{ emitToProject }` instead of both `getIO` and `WS_EVENTS`.
- Does NOT change existing callers yet — they'll be migrated in Batch 4 when we touch each service.

**Files:**
- NEW: `packages/server/src/utils/ws-emitter.ts`
- NEW: `packages/server/src/utils/ws-emitter.test.ts`

### Task 3.2 — Create `utils/fire-and-forget.ts` (+ test)

**Problem:** 31 `.catch(() => {})` sites across 9 files. Errors from side effects
(activity logging, notifications, history) are silently swallowed. If one of these
breaks in production, there's zero observability.

**Solution:** A single helper:
```ts
export function fireAndForget(promise: Promise<unknown>, label: string): void
```
- Catches and logs at `logger.warn` level with the label.
- Returns `void` (not a Promise) — intentionally non-awaited.
- Drop-in replacement: `activityService.log(...).catch(() => {})` →
  `fireAndForget(activityService.log(...), 'activity.log')`.
- Does NOT change existing callers yet — they'll be migrated in Batch 4.

**Files:**
- NEW: `packages/server/src/utils/fire-and-forget.ts`
- NEW: `packages/server/src/utils/fire-and-forget.test.ts`

### Task 3.3 — Create `utils/prisma-selects.ts`

**Problem:** 5 distinct user-select shapes copy-pasted across 30+ Prisma call sites.
When a field is added (e.g., `avatarUrl` for a new avatar feature), every site must be
updated individually.

**Solution:** Named select constants:
```ts
/** { id, displayName, avatarUrl } — presence/activity display */
export const USER_SELECT_BRIEF = { id: true, displayName: true, avatarUrl: true } as const;

/** { id, displayName, email } — task/project/comment contexts */
export const USER_SELECT_STANDARD = { id: true, displayName: true, email: true } as const;

/** { id, displayName, email, avatarUrl } — comment authors, history */
export const USER_SELECT_WITH_AVATAR = { id: true, displayName: true, email: true, avatarUrl: true } as const;

/** { id, displayName, email, systemRole } — permission checks */
export const USER_SELECT_WITH_ROLE = { id: true, displayName: true, email: true, systemRole: true } as const;
```
- Shape E (full profile) stays inline in `users.service.ts` — it's unique to that service.
- Does NOT change existing callers yet — they'll be swapped in Batch 4.

**Files:**
- NEW: `packages/server/src/utils/prisma-selects.ts`

### Task 3.4 — Build verification

- `pnpm typecheck` → clean
- `pnpm test` → 524/524 passing

---

## Batch 4: Server Services — Apply Utilities + Break Up God Files

**Why next:** Now that the utilities exist, we touch each service file exactly once:
swap in the new utilities AND reduce file size at the same time. Grouped by file to
maximize context locality.

**Estimated scope:** ~12 existing files modified. Net line reduction: ~350+ lines.

### Task 4.1 — `tasks.service.ts` (737 lines → ~550 lines)
- Replace 10 `getIO().to().emit()` calls → `emitToProject()`
- Replace 3 `.catch(() => {})` → `fireAndForget()`
- Replace ~11 inline user selects → `USER_SELECT_STANDARD`
- Extract `createSubtask` method (84 lines) into new `subtasks.service.ts`
- Remove `getIO` + `WS_EVENTS` imports (replaced by `ws-emitter`)

### Task 4.2 — `email.service.ts` (486 lines → ~180 lines)
- Extract 7 HTML template functions (294 lines) into `emails/templates/` directory
  (one file per template, each exporting a pure function `(params) => string`)
- Create `emails/templates/index.ts` barrel export
- `email.service.ts` becomes import-only: calls template functions, sends via Resend

### Task 4.3 — Remaining services: labels, comments, files, statuses, widgets, notifications
- Replace `getIO` calls → `emitToProject()` (or `emitToUser()` for notifications)
- Replace user select shapes → constants from `prisma-selects.ts`
- Each service touched exactly once

### Task 4.4 — Remaining controllers: statuses, projects, labels, files
- Replace `.catch(() => {})` → `fireAndForget()`
- Replace user select shapes if any

### Task 4.5 — `time-tracking.service.ts`
- Replace 2 try/catch-wrapped `getIO()` calls → `emitToProject()` (which already has built-in safety)
- Replace ~5 inline user selects → `USER_SELECT_STANDARD`

### Task 4.6 — Build verification + tests

---

## Batch 5: Client — Critical Bugs & Architecture Fixes

**Why after server:** Client changes are independent from server. But by doing server
first, we've stabilized the API contract, so client-side fixes build on solid ground.
Grouped by file locality within `client/src`.

**Estimated scope:** ~6 files modified.

### Task 5.1 — `api/client.ts`: Fix token refresh interval leak
- Clear the `checkInterval` inside the `subscribeTokenRefresh` callback (line 51-54)
- Remove the 10-second setTimeout band-aid
- Ensure interval is cleared on both success AND failure paths

### Task 5.2 — `api/ai.api.ts`: Replace raw `fetch` with `apiClient`
- Use `apiClient` for the streaming endpoint
- If streaming requires raw `fetch` (for `ReadableStream`), at minimum extract the
  token from the apiClient interceptor chain rather than raw `localStorage.getItem`
- Ensure 401 triggers the same refresh flow as all other API calls

### Task 5.3 — `contexts/SocketContext.tsx`: Fix stale ref on reconnection
- Ensure socket listeners reattach when socket reconnects
- Fix the cleanup ordering (disconnect before nullifying ref)

### Task 5.4 — `hooks/useNotifications.ts` + `stores/notification.store.ts`: Unify state
- Remove Zustand notification store (or reduce it to WebSocket-only)
- Use React Query as the single source of truth for notification list + unread count
- Socket events invalidate the query cache instead of updating a separate store
- Derive `unreadCount` from the list response (eliminate the extra HTTP call)

### Task 5.5 — `components/widgets/AIAssistantWidget.tsx`: Remove `console.log`
- Delete debug logging on lines 46-47

### Task 5.6 — Build verification + tests

---

## Batch 6: Client — Break Up God Components

**Why last:** Cosmetic/structural improvements. Lower risk, but the largest line-count
reduction. Grouped to minimize files open at once.

**Estimated scope:** 2 large files split → ~8 smaller files. ~7 small fixes.

### Task 6.1 — Split `AIAssistantWidget.tsx` (755 lines → 3-4 files)
- Extract NLP command parser → `utils/nlp-parser.ts` (~80 lines)
- Extract markdown renderer → `components/ui/MarkdownRenderer.tsx` (~60 lines)
- Extract analytics sub-view → `components/widgets/AIAnalyticsView.tsx` (~120 lines)
- Main widget drops to ~450 lines

### Task 6.2 — Split `DashboardPage.tsx` (890 lines → 4-5 files)
- Extract inline sub-components into their own files
- Replace raw `<input>` elements with existing `Input` component
- Replace inline modal with existing `Modal` component
- Fix `limit: 100` with no `staleTime` (add `staleTime: 30_000`)

### Task 6.3 — Refactor `useWebSocket.ts` (237 lines)
- Convert 25 handler registrations into data-driven map pattern
- Rename file export from `useProjectSocket` (or rename file to match)

### Task 6.4 — Cross-cutting UI consistency
- Replace 7 duplicate inline spinners → existing `Spinner` component
- Replace `window.confirm()` in `TaskListWidget.tsx` → project's modal confirm pattern
- Fix array-index React keys in `SettingsPage.tsx`
- Fix `data-theme` attribute set in 3 separate places → single source

### Task 6.5 — Build verification + tests

---

## Dependency Graph

```
Batch 3 (Utilities)     ← Pure leaf files, no dependencies
    ↓
Batch 4 (Server apply)  ← Consumes Batch 3 utilities, touches every service once
    ↓
Batch 5 (Client bugs)   ← Independent of server, but sequenced after for stability
    ↓
Batch 6 (Client split)  ← Cosmetic, safest last
```

## Summary

| Batch | Files New | Files Modified | Key Metric |
|-------|-----------|---------------|------------|
| 3     | 5         | 0             | 3 utilities + 2 tests created |
| 4     | ~3        | ~12           | -350 lines net, 30 getIO() centralized |
| 5     | 0         | ~6            | 4 critical client bugs fixed |
| 6     | ~6        | ~10           | -800 lines net from god files |
