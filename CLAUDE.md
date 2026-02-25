# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Local dev (requires Docker for DB)
docker compose up -d          # Start PostgreSQL (port 5433) + Redis (port 6379)
pnpm install                  # Install all workspace dependencies
pnpm db:migrate               # Run Prisma migrations
pnpm db:seed                  # Seed database
pnpm dev                      # Start client (localhost:5173) + server (localhost:3001) in parallel

# Individual packages
pnpm dev:server               # Server only (tsx watch)
pnpm dev:client               # Client only (Vite)

# Build
pnpm build                    # Builds shared first, then client + server in parallel

# Database
pnpm db:studio                # Open Prisma Studio
pnpm --filter @pm/server prisma migrate dev --name <name>  # Create new migration

# Testing
pnpm test                     # Run all tests across all packages (vitest)
pnpm test:watch               # Watch mode
pnpm test:coverage            # Coverage report
pnpm test:e2e                 # Playwright E2E tests
pnpm --filter @pm/server test # Run server tests only
pnpm --filter @pm/client test # Run client tests only

# Single test file
pnpm --filter @pm/server vitest run src/modules/tasks/tasks.service.test.ts

# Lint / typecheck
pnpm lint                     # ESLint across all packages
pnpm typecheck                # TypeScript check across all packages (parallel)
```

## Architecture

**Monorepo** managed by `pnpm` workspaces with three packages: `@pm/shared`, `@pm/server`, `@pm/client`.

```
packages/
  shared/   — TypeScript types, enums, Zod validators shared by both sides
  server/   — Express API + Socket.io (Node 20, ESM)
  client/   — React 18 SPA (Vite, React Router v6)
```

**Deployment:** Client → Vercel, Server → Render Web Service, DB → Render PostgreSQL.

### Server (`packages/server`)

- Entry: `src/index.ts` → `src/app.ts` (Express app factory)
- All API routes are `/api/v1/...` with a health check at `/api/health`
- Feature modules live in `src/modules/<feature>/` — each has `.routes.ts`, `.controller.ts`, `.service.ts`
- Middleware stack (in order): Helmet → CORS → CSRF → cookieParser → JSON body → Morgan → rate limiter
- Auth: JWT access tokens (15m) + httpOnly cookie refresh tokens (7d). Token fingerprinting via SHA-256 of user-agent + IP. `authenticate` middleware from `src/middleware/auth.middleware.ts`.
- WebSocket: `src/ws/ws.server.ts` — Socket.io with room-per-project model. All sensitive events validate room membership. Heartbeat re-validates JWT every 30s.
- RBAC: Two-layer — `SystemRole` (enum on User) + project-level `ProjectPermission`. Check both on every new route.

### Client (`packages/client`)

- Entry: `src/main.tsx` → `src/App.tsx`
- Routing: React Router v6, protected routes via `ProtectedRoute` wrapper in `src/router/index.tsx`
- State management:
  - **Zustand** stores in `src/stores/` — `auth.store.ts`, `project.store.ts`, `ui.store.ts`, `ws.store.ts`
  - **React Query** (`@tanstack/react-query`) for all server data — cache is invalidated by WebSocket events received in `src/hooks/useWebSocket.ts`
- API: Axios client in `src/api/client.ts` with auto token-refresh interceptor. Each domain has its own `*.api.ts` file.
- Real-time: `src/contexts/SocketContext.tsx` wraps Socket.io connection. `useWebSocket` hook subscribes to events and fires React Query invalidations.
- DnD: `@dnd-kit` for Kanban and Gantt drag-and-drop.

### Shared (`packages/shared`)

Single source of truth for TypeScript types (`src/types/`), enums (`src/enums/`), Zod validators (`src/validators/`), and constants. **Must be built before server or client.**  Import from `@pm/shared` — never duplicate types in server or client.

### Widgets System

`ProjectPage` renders a configurable grid of widgets. Widget types are defined in `WidgetType` enum (`@pm/shared`). Each widget is a self-contained component under `packages/client/src/components/widgets/`. The Gantt widget (`GanttWidget/`) has sub-components: `GanttHeader`, `GanttGrid`, `GanttTaskBar`, `GanttDependencyLines`.

## Critical Rules

- **Shared package for all types** — never define duplicate types in server or client.
- **RBAC on every new route** — check both SystemRole and ProjectPermission.
- **Task Prisma queries must include `labels` AND `comments`** in `include` — omitting these breaks the client.
- **Never nest `<form>` inside `TaskDetailModal`** — use `<div>` + `onClick` instead.
- **`progressPercentage` is computed, never stored** — formula: if subtasks exist → `(completed / total) * 100`; else by status name (TODO=0, IN_PROGRESS=50, IN_REVIEW=90, COMPLETED=100).
- **Gantt DnD** is restricted to Day and Week views only.
- **CSRF protection** is enforced globally on all state-changing requests via `src/middleware/csrf.middleware.ts` — Origin/Referer validation.

## Environment Variables

**Server (`.env` in `packages/server/`):**
```
DATABASE_URL=postgresql://pm_user:pm_password@localhost:5433/pm_dev
JWT_SECRET=...
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
RESEND_API_KEY=...   # Email service (Resend)
GEMINI_API_KEY=...   # AI widget (Google Generative AI)
```

**Client (`.env` in `packages/client/`):**
```
VITE_API_URL=http://localhost:3001/api/v1
VITE_WS_URL=http://localhost:3001
```

## UI / Styling Conventions

- **CSS**: Tailwind CSS classes exclusively — no inline styles (except the Gantt chart components, which use inline styles due to dynamic pixel calculations).
- **Component primitives**: Radix UI / Shadcn for complex interactive elements (modals, dropdowns, popovers).
- **Icons**: `lucide-react` exclusively.
- **New features** go on a dedicated git branch (e.g., `feature/gantt-core`), merged only after QA compile check passes.

## Testing Patterns

- Server integration tests use a real test DB and follow the pattern in `src/modules/tasks/tasks.integration.test.ts` and `src/modules/auth/auth.integration.test.ts`.
- Client unit tests use Vitest + Testing Library; stores are tested in isolation.
- E2E tests use Playwright (`playwright.config.ts` at root).
- Run `pnpm db:seed` to populate test data before E2E runs.
