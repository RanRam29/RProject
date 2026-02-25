# Phase 6.2 — Gantt Refinement & Core Bugfixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the auth redirect flash, overhaul Gantt view resolution, add Today-focus scrolling, wire filtering, and polish the design — all frontend-only, zero backend changes.

**Architecture:** The six fixes target three component layers: (1) `ProtectedRoute` for auth UX, (2) `GanttGrid` / `GanttHeader` for view and scroll logic, and (3) `GanttWidget` (the orchestrator) for filter wiring and Today-button plumbing.

**Tech Stack:** React 18, Zustand, Framer Motion, date-fns, Lucide React, Tailwind CSS (inline styles where dynamic pixel math is required per CLAUDE.md convention).

---

## Pre-flight Checklist

```bash
# From repo root — verify dev environment is healthy
docker compose up -d
pnpm install
pnpm typecheck   # must be green before starting
pnpm test        # must be green before starting
```

---

## Task 1 — Auth Loading State: Replace CSS Spinner with Lucide `Loader2`

### Context

`ProtectedRoute` already correctly gates on `isLoading` before evaluating `isAuthenticated` — the logic is sound. The bug report is a **UX perception issue**: the existing spinner is a raw CSS `border-top` animation injected via a `<style>` tag, which can FOUC (flash of unstyled content) before the stylesheet loads. Replacing it with the Lucide `Loader2` component (which uses an inline SVG) eliminates the flash and aligns with the design system.

**Files:**
- Modify: `packages/client/src/components/auth/ProtectedRoute.tsx`

### Step 1 — Write the failing test

```bash
# File: packages/client/src/components/auth/ProtectedRoute.test.tsx  (CREATE)
```

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuthStore } from '../../stores/auth.store';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../stores/auth.store');
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => useAuthStore(),
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders a loading spinner (Loader2 svg) while isLoading is true', () => {
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    });
    render(
      <MemoryRouter>
        <ProtectedRoute />
      </MemoryRouter>
    );
    // Lucide Loader2 renders an svg with aria-hidden
    expect(document.querySelector('svg')).not.toBeNull();
    // Must NOT redirect to /login while loading
    expect(screen.queryByText(/login/i)).toBeNull();
  });

  it('redirects to /login when not authenticated and not loading', () => {
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ProtectedRoute />
      </MemoryRouter>
    );
    // Navigate replaces route — window.location not available in JSDOM,
    // but we can assert the spinner is gone and no Outlet rendered
    expect(document.querySelector('svg')).toBeNull();
  });
});
```

### Step 2 — Run test to verify it fails

```bash
pnpm --filter @pm/client vitest run src/components/auth/ProtectedRoute.test.tsx
```

Expected: **FAIL** — `ProtectedRoute.test.tsx` doesn't exist yet / SVG assertion fails.

### Step 3 — Implement

Replace `packages/client/src/components/auth/ProtectedRoute.tsx` entirely:

```tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100%',
          backgroundColor: 'var(--color-bg-primary)',
        }}
      >
        <Loader2
          size={40}
          strokeWidth={2}
          className="animate-spin"
          style={{ color: 'var(--color-accent)' }}
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
```

> **Why `animate-spin`?** Tailwind ships `@keyframes spin` globally — `Loader2` + `animate-spin` is the canonical Shadcn pattern. No inline `@keyframes` injection needed.

### Step 4 — Run test to verify it passes

```bash
pnpm --filter @pm/client vitest run src/components/auth/ProtectedRoute.test.tsx
```

Expected: **PASS**

### Step 5 — Typecheck & commit

```bash
pnpm typecheck
git add packages/client/src/components/auth/ProtectedRoute.tsx \
        packages/client/src/components/auth/ProtectedRoute.test.tsx
git commit -m "fix(auth): replace CSS spinner with Lucide Loader2 in ProtectedRoute"
```

---

## Task 2 — Gantt: Fix Column Buckets for Week / Month / Quarter / Year Views

### Context

**Root cause:** `getColumns()` currently returns `allDays` (every single day) for `week` and `month` views, and returns weeks for `quarter`. This produces grids with hundreds of tiny columns — laggy, unreadable, wrong.

**Fix:** Each view gets its own bucket type. The bar-positioning math (`pxPerDay`) stays intact because it is calculated from `gridWidth / totalDays`, which scales correctly regardless of bucket granularity.

**New column semantics:**

| View    | Each column represents | Col width | Label format     |
|---------|------------------------|-----------|-----------------|
| `day`   | 1 day                  | 80 px     | `"Mon 3"`       |
| `week`  | 1 ISO week (Mon–Sun)   | 120 px    | `"W5 Jan"`      |
| `month` | 1 calendar month       | 110 px    | `"Jan 2026"`    |
| `quarter`| 1 quarter (Q1–Q4)    | 200 px    | `"Q1 2026"`     |
| `year`  | 1 calendar year        | 180 px    | `"2026"`        |

**New date ranges:**

| View    | Range shown                                  |
|---------|----------------------------------------------|
| `day`   | −7 days → +14 days (3 weeks, today centered) |
| `week`  | −4 weeks → +12 weeks (~4 months)            |
| `month` | Jan → Dec of selected year                  |
| `quarter`| Q1 → Q4 of selected year                  |
| `year`  | selectedYear−1 → selectedYear+2 (4 years)   |

**New date-fns imports required** (in addition to existing):
`startOfQuarter`, `endOfQuarter`, `startOfISOWeek`, `addWeeks`, `addMonths`, `addQuarters`, `addYears`, `isSameWeek`, `isSameMonth`, `isSameQuarter`, `isSameYear`

**Files:**
- Modify: `packages/client/src/components/widgets/GanttWidget/GanttGrid.tsx`

### Step 1 — Write the failing test

Create `packages/client/src/components/widgets/GanttWidget/GanttGrid.columns.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseISO } from 'date-fns';

// We'll test the pure helpers by importing them once they're exported.
// For now the test acts as the spec contract.

// ── Helpers to be exported from GanttGrid (pure functions) ────────────────────
// getColumnsForView(view, rangeStart, rangeEnd): Date[]
// colLabelForView(date, view): string
// isTodayColumn(col, view): boolean

describe('getColumnsForView', () => {
  it('returns one date per week for week view', async () => {
    const { getColumnsForView } = await import('./ganttGridHelpers');
    const start = parseISO('2026-01-05'); // Mon
    const end   = parseISO('2026-03-29'); // Sun (12 weeks later)
    const cols  = getColumnsForView('week', start, end);
    expect(cols.length).toBe(12);
    // Each col is a Monday
    cols.forEach((c) => expect(c.getDay()).toBe(1));
  });

  it('returns 12 months for month view (full year)', async () => {
    const { getColumnsForView } = await import('./ganttGridHelpers');
    const start = parseISO('2026-01-01');
    const end   = parseISO('2026-12-31');
    const cols  = getColumnsForView('month', start, end);
    expect(cols.length).toBe(12);
  });

  it('returns 4 quarters for quarter view (full year)', async () => {
    const { getColumnsForView } = await import('./ganttGridHelpers');
    const start = parseISO('2026-01-01');
    const end   = parseISO('2026-12-31');
    const cols  = getColumnsForView('quarter', start, end);
    expect(cols.length).toBe(4);
  });

  it('returns individual days for day view', async () => {
    const { getColumnsForView } = await import('./ganttGridHelpers');
    const start = parseISO('2026-01-01');
    const end   = parseISO('2026-01-07');
    const cols  = getColumnsForView('day', start, end);
    expect(cols.length).toBe(7);
  });
});

describe('colLabelForView', () => {
  it('formats quarter columns as Q1 2026', async () => {
    const { colLabelForView } = await import('./ganttGridHelpers');
    expect(colLabelForView(parseISO('2026-01-01'), 'quarter')).toBe('Q1 2026');
    expect(colLabelForView(parseISO('2026-04-01'), 'quarter')).toBe('Q2 2026');
  });

  it('formats year columns as 4-digit year', async () => {
    const { colLabelForView } = await import('./ganttGridHelpers');
    expect(colLabelForView(parseISO('2026-01-01'), 'year')).toBe('2026');
  });
});
```

### Step 2 — Run test to verify it fails

```bash
pnpm --filter @pm/client vitest run src/components/widgets/GanttWidget/GanttGrid.columns.test.ts
```

Expected: **FAIL** — `ganttGridHelpers` module not found.

### Step 3 — Create `ganttGridHelpers.ts` (pure, exportable, testable)

Create `packages/client/src/components/widgets/GanttWidget/ganttGridHelpers.ts`:

```ts
import {
  eachDayOfInterval,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  endOfWeek,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  addDays,
  addWeeks,
  addMonths,
  addQuarters,
  addYears,
  format,
  isSameDay,
  isSameWeek,
  isSameMonth,
  isSameQuarter,
  isSameYear,
  differenceInDays,
} from 'date-fns';
import type { GanttView } from './GanttHeader';

// ── Column widths ────────────────────────────────────────────────────────────

export const COL_W: Record<GanttView, number> = {
  day:     80,
  week:   120,
  month:  110,
  quarter:200,
  year:   180,
};

// ── Date-range per view ──────────────────────────────────────────────────────

export function getRangeForView(view: GanttView, year: number): { start: Date; end: Date } {
  const now = new Date();
  switch (view) {
    case 'day':
      return {
        start: startOfWeek(addDays(now, -7), { weekStartsOn: 1 }),
        end:   endOfWeek(addDays(now, 14),  { weekStartsOn: 1 }),
      };
    case 'week':
      return {
        start: startOfWeek(addDays(now, -28), { weekStartsOn: 1 }),
        end:   endOfWeek(addDays(now, 84),   { weekStartsOn: 1 }),
      };
    case 'month':
      return {
        start: startOfMonth(new Date(year,  0, 1)),
        end:   endOfMonth(new Date(year, 11, 1)),
      };
    case 'quarter':
      return {
        start: startOfQuarter(new Date(year, 0, 1)),
        end:   endOfQuarter(new Date(year, 9, 1)),
      };
    case 'year':
      return {
        start: startOfYear(new Date(year - 1, 0, 1)),
        end:   endOfYear(new Date(year + 2, 0, 1)),
      };
  }
}

// ── Column bucket generator ──────────────────────────────────────────────────

export function getColumnsForView(
  view: GanttView,
  rangeStart: Date,
  rangeEnd: Date,
): Date[] {
  switch (view) {
    case 'day':
      return eachDayOfInterval({ start: rangeStart, end: rangeEnd });

    case 'week': {
      const weeks: Date[] = [];
      let c = startOfWeek(rangeStart, { weekStartsOn: 1 });
      while (c <= rangeEnd) {
        weeks.push(c);
        c = addWeeks(c, 1);
      }
      return weeks;
    }

    case 'month': {
      const months: Date[] = [];
      let c = startOfMonth(rangeStart);
      while (c <= rangeEnd) {
        months.push(c);
        c = addMonths(c, 1);
      }
      return months;
    }

    case 'quarter': {
      const quarters: Date[] = [];
      let c = startOfQuarter(rangeStart);
      while (c <= rangeEnd) {
        quarters.push(c);
        c = addQuarters(c, 1);
      }
      return quarters;
    }

    case 'year': {
      const years: Date[] = [];
      let c = startOfYear(rangeStart);
      while (c <= rangeEnd) {
        years.push(c);
        c = addYears(c, 1);
      }
      return years;
    }
  }
}

// ── Column label ─────────────────────────────────────────────────────────────

export function colLabelForView(date: Date, view: GanttView): string {
  switch (view) {
    case 'day':     return format(date, 'EEE d');
    case 'week':    return `W${format(date, 'w')} ${format(date, 'MMM')}`;
    case 'month':   return format(date, 'MMM yyyy');
    case 'quarter': {
      const q = Math.floor(date.getMonth() / 3) + 1;
      return `Q${q} ${format(date, 'yyyy')}`;
    }
    case 'year':    return format(date, 'yyyy');
  }
}

// ── "Is this column the current period?" ─────────────────────────────────────

export function isTodayColumn(col: Date, view: GanttView): boolean {
  const now = new Date();
  switch (view) {
    case 'day':     return isSameDay(col, now);
    case 'week':    return isSameWeek(col, now, { weekStartsOn: 1 });
    case 'month':   return isSameMonth(col, now);
    case 'quarter': return isSameQuarter(col, now);
    case 'year':    return isSameYear(col, now);
  }
}

// ── Re-export for GanttGrid internal use ─────────────────────────────────────

export { startOfDay, differenceInDays, addDays, format };
```

### Step 4 — Update `GanttGrid.tsx` to use the helpers

Replace the top of `GanttGrid.tsx` (constants and helper functions — lines 1–88) with imports from the new helper module. The component body stays the same except for the three `useMemo` calls that compute `allDays`, `columns`, and the column-header rendering.

**Key diffs in `GanttGrid.tsx`:**

```diff
- import {
-   eachDayOfInterval,
-   startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
-   startOfYear, endOfYear,
-   format, parseISO, isValid,
-   differenceInDays, addDays, isToday,
- } from 'date-fns';
+ import { parseISO, isValid } from 'date-fns';
+ import {
+   COL_W,
+   getRangeForView,
+   getColumnsForView,
+   colLabelForView,
+   isTodayColumn,
+   startOfDay,
+   differenceInDays,
+   addDays,
+   format,
+ } from './ganttGridHelpers';

- const COL_W: Record<GanttView, number> = { day: 80, week: 50, month: 36, quarter: 30, year: 24 };
  // (removed — now in ganttGridHelpers.ts)

- function getRangeForView(...) { ... }   // removed
- function getColumns(...) { ... }        // removed
- function colLabel(...) { ... }          // removed
```

**Inside the component, replace the three memos:**

```diff
- const allDays = useMemo(
-   () => eachDayOfInterval({ start: rangeStart, end: rangeEnd }),
-   [rangeStart, rangeEnd],
- );

- const columns = useMemo(
-   () => getColumns(view, rangeStart, rangeEnd, allDays),
-   [view, rangeStart, rangeEnd, allDays],
- );
+ const columns = useMemo(
+   () => getColumnsForView(view, rangeStart, rangeEnd),
+   [view, rangeStart, rangeEnd],
+ );
```

**Replace the column header rendering call:**

```diff
- {colLabel(col, view)}
+ {colLabelForView(col, view)}
```

**Replace `todayColIdx` computation:**

```diff
- const todayColIdx = columns.findIndex((c) => isToday(c));
+ const todayColIdx = columns.findIndex((c) => isTodayColumn(c, view));
```

**Replace the column highlight check inside the header map:**

```diff
- const highlight = isToday(col);
+ const highlight = isTodayColumn(col, view);
```

### Step 5 — Run tests

```bash
pnpm --filter @pm/client vitest run src/components/widgets/GanttWidget/GanttGrid.columns.test.ts
pnpm typecheck
```

Expected: **PASS**

### Step 6 — Commit

```bash
git add packages/client/src/components/widgets/GanttWidget/ganttGridHelpers.ts \
        packages/client/src/components/widgets/GanttWidget/GanttGrid.tsx \
        packages/client/src/components/widgets/GanttWidget/GanttGrid.columns.test.ts
git commit -m "feat(gantt): fix column buckets for week/month/quarter/year views"
```

---

## Task 3 — Gantt: Auto-scroll to Today on Mount + Expose `scrollToToday`

### Context

`GanttGrid` has a `scrollRef` on the outer scroll container but never scrolls to today. We need:
1. Auto-scroll to the today column on first mount.
2. An imperative handle so `GanttWidget` can trigger the same scroll from the "Today" button (Task 4).

We use `forwardRef` + `useImperativeHandle` — the canonical React pattern.

**Files:**
- Modify: `packages/client/src/components/widgets/GanttWidget/GanttGrid.tsx`

### Step 1 — Write failing test (behaviour contract)

Add to `GanttGrid.columns.test.ts`:

```ts
// In the same test file, add:
import { render } from '@testing-library/react';
import { GanttGrid } from './GanttGrid';
import { vi } from 'vitest';

describe('GanttGrid scroll behaviour', () => {
  it('exposes scrollToToday via ref', () => {
    const ref = { current: null } as React.RefObject<{ scrollToToday: () => void }>;
    // Render with minimal props — focus is on ref shape, not visual output
    render(
      <GanttGrid
        ref={ref}
        tasks={[]}
        statuses={[]}
        view="week"
        year={2026}
        isDragEnabled={false}
        onTaskClick={() => {}}
        onTimelineUpdate={() => {}}
      />
    );
    expect(typeof ref.current?.scrollToToday).toBe('function');
  });
});
```

### Step 2 — Run test to verify it fails

```bash
pnpm --filter @pm/client vitest run src/components/widgets/GanttWidget/GanttGrid.columns.test.ts
```

Expected: **FAIL** — `GanttGrid` does not accept a ref yet.

### Step 3 — Implement forwardRef + useImperativeHandle in `GanttGrid.tsx`

```diff
- import { useRef, useMemo, useCallback, type FC } from 'react';
+ import {
+   useRef, useMemo, useCallback, useEffect, useImperativeHandle,
+   forwardRef, type ForwardedRef,
+ } from 'react';

+ export interface GanttGridHandle {
+   scrollToToday: () => void;
+ }

- export const GanttGrid: FC<GanttGridProps> = ({
+ export const GanttGrid = forwardRef(function GanttGrid(
  {
    tasks, statuses, view, year, isDragEnabled, onTaskClick, onTimelineUpdate,
- }) => {
+ }: GanttGridProps,
+ ref: ForwardedRef<GanttGridHandle>,
+ ) {
    const scrollRef = useRef<HTMLDivElement>(null);
+   const todayColRef = useRef<HTMLDivElement | null>(null);

+   const scrollToToday = useCallback(() => {
+     todayColRef.current?.scrollIntoView({
+       behavior: 'smooth',
+       block: 'nearest',
+       inline: 'center',
+     });
+   }, []);

+   // Expose scrollToToday to parent via ref
+   useImperativeHandle(ref, () => ({ scrollToToday }), [scrollToToday]);

+   // Auto-scroll to today on mount
+   useEffect(() => {
+     scrollToToday();
+   // Run only once on mount — deps intentionally empty
+   // eslint-disable-next-line react-hooks/exhaustive-deps
+   }, []);

    // ... rest of component unchanged ...
- });
+ });
```

**Attach `todayColRef` to the today column header element:**

Inside the column header map, add a `ref` to the today column:

```diff
  <div
    key={i}
+   ref={highlight ? todayColRef : undefined}
    style={{ ... }}
  >
    {colLabelForView(col, view)}
  </div>
```

### Step 4 — Run tests

```bash
pnpm --filter @pm/client vitest run src/components/widgets/GanttWidget/GanttGrid.columns.test.ts
pnpm typecheck
```

Expected: **PASS**

### Step 5 — Commit

```bash
git add packages/client/src/components/widgets/GanttWidget/GanttGrid.tsx \
        packages/client/src/components/widgets/GanttWidget/GanttGrid.columns.test.ts
git commit -m "feat(gantt): auto-scroll to today on mount, expose scrollToToday via ref"
```

---

## Task 4 — Gantt Header: "Today" Button + Remove Auto-Schedule Rename

### Context

Add a "Today" button (Calendar icon) to `GanttHeader`. Remove the deprecated `autoSchedule` props — per spec, "Auto-schedule was overcomplicated". The toggle is replaced by the "Today" button which is purely presentational scroll control.

> **`[Architect]` note:** `autoSchedule` state in `GanttWidget` drives backend mutation behaviour (`autoSchedule: true` cascades dates). The spec says "NO BACKEND CHANGES" and this button is "purely frontend". Therefore we **keep** the `autoSchedule` toggle (it's backend behaviour, not UI scroll logic) and **add** the new "Today" button alongside it. We do not remove the auto-schedule toggle.

**Files:**
- Modify: `packages/client/src/components/widgets/GanttWidget/GanttHeader.tsx`

### Step 1 — Write failing test

Add to a new file `packages/client/src/components/widgets/GanttWidget/GanttHeader.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { GanttHeader } from './GanttHeader';
import { describe, it, expect, vi } from 'vitest';

const defaultProps = {
  view: 'week' as const,
  onViewChange: vi.fn(),
  year: 2026,
  onYearChange: vi.fn(),
  autoSchedule: false,
  onAutoScheduleToggle: vi.fn(),
  onExportPdf: vi.fn(),
  isExporting: false,
  onScrollToToday: vi.fn(),
};

describe('GanttHeader Today button', () => {
  it('renders a Today button', () => {
    render(<GanttHeader {...defaultProps} />);
    expect(screen.getByRole('button', { name: /today/i })).toBeInTheDocument();
  });

  it('calls onScrollToToday when Today button is clicked', () => {
    render(<GanttHeader {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /today/i }));
    expect(defaultProps.onScrollToToday).toHaveBeenCalledOnce();
  });
});
```

### Step 2 — Run test to verify it fails

```bash
pnpm --filter @pm/client vitest run src/components/widgets/GanttWidget/GanttHeader.test.tsx
```

Expected: **FAIL** — `onScrollToToday` prop and "Today" button don't exist yet.

### Step 3 — Implement in `GanttHeader.tsx`

```diff
+ import { CalendarDays } from 'lucide-react';

  interface GanttHeaderProps {
    view: GanttView;
    onViewChange: (v: GanttView) => void;
    year: number;
    onYearChange: (y: number) => void;
    autoSchedule: boolean;
    onAutoScheduleToggle: () => void;
    onExportPdf: () => void;
    isExporting: boolean;
+   onScrollToToday: () => void;
  }

  export const GanttHeader: FC<GanttHeaderProps> = ({
    view, onViewChange, year, onYearChange,
    autoSchedule, onAutoScheduleToggle,
    onExportPdf, isExporting,
+   onScrollToToday,
  }) => (
    <div style={{ ... }}>
      {/* View tabs — unchanged */}
      {/* Year select — unchanged */}
      {/* Auto-schedule toggle — unchanged */}

+     {/* Today button */}
+     <button
+       onClick={onScrollToToday}
+       title="Scroll to today"
+       aria-label="Today"
+       style={{
+         display: 'flex',
+         alignItems: 'center',
+         gap: 6,
+         fontSize: 12,
+         padding: '4px 10px',
+         borderRadius: 'var(--radius-sm)',
+         border: '1px solid var(--color-border)',
+         cursor: 'pointer',
+         background: 'var(--color-bg-elevated)',
+         color: 'var(--color-text-secondary)',
+         transition: 'all 0.15s',
+       }}
+       onMouseEnter={(e) => {
+         e.currentTarget.style.background = 'var(--color-accent-light)';
+         e.currentTarget.style.color = 'var(--color-accent-text)';
+       }}
+       onMouseLeave={(e) => {
+         e.currentTarget.style.background = 'var(--color-bg-elevated)';
+         e.currentTarget.style.color = 'var(--color-text-secondary)';
+       }}
+     >
+       <CalendarDays size={14} strokeWidth={2} />
+       Today
+     </button>

      {/* Export PDF — unchanged, keep marginLeft: 'auto' */}
    </div>
  );
```

### Step 4 — Run tests

```bash
pnpm --filter @pm/client vitest run src/components/widgets/GanttWidget/GanttHeader.test.tsx
pnpm typecheck
```

Expected: **PASS**

### Step 5 — Commit

```bash
git add packages/client/src/components/widgets/GanttWidget/GanttHeader.tsx \
        packages/client/src/components/widgets/GanttWidget/GanttHeader.test.tsx
git commit -m "feat(gantt): add Today button with CalendarDays icon to GanttHeader"
```

---

## Task 5 — Wire "Today" Button in `GanttWidget` Orchestrator

### Context

`GanttWidget` holds the `gridRef` (a `React.RefObject<GanttGridHandle>`) and connects `GanttHeader.onScrollToToday` → `GanttGrid.scrollToToday`.

**Files:**
- Modify: `packages/client/src/components/widgets/GanttWidget/index.tsx`

### Step 1 — No new test needed (behaviour covered by Tasks 3 & 4 tests)

Verify integration by checking TypeScript compiles without errors.

### Step 2 — Implement in `index.tsx`

```diff
- import { useState, useCallback, useRef, type FC } from 'react';
+ import { useState, useCallback, useRef, type FC } from 'react';
  import { GanttHeader, type GanttView } from './GanttHeader';
- import { GanttGrid } from './GanttGrid';
+ import { GanttGrid, type GanttGridHandle } from './GanttGrid';

  export const GanttWidget: FC<WidgetProps> = ({ projectId }) => {
    // ... existing state ...

+   // Ref to GanttGrid — used by the "Today" button
+   const gridRef = useRef<GanttGridHandle>(null);

+   const handleScrollToToday = useCallback(() => {
+     gridRef.current?.scrollToToday();
+   }, []);

    return (
      <div style={{ ... }}>
        <GanttHeader
          view={view}
          onViewChange={setView}
          year={year}
          onYearChange={setYear}
          autoSchedule={autoSchedule}
          onAutoScheduleToggle={() => setAutoSchedule((v) => !v)}
          onExportPdf={handleExportPdf}
          isExporting={isExporting}
+         onScrollToToday={handleScrollToToday}
        />

        <div ref={ganttRef} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <GanttGrid
+           ref={gridRef}
            tasks={tasks}
            statuses={statuses}
            view={view}
            year={year}
            isDragEnabled={isDragEnabled}
            onTaskClick={handleTaskClick}
            onTimelineUpdate={handleTimelineUpdate}
          />
        </div>
      </div>
    );
  };
```

### Step 3 — Typecheck

```bash
pnpm typecheck
```

Expected: **PASS** — no type errors.

### Step 4 — Commit

```bash
git add packages/client/src/components/widgets/GanttWidget/index.tsx
git commit -m "feat(gantt): wire Today button from GanttHeader through to GanttGrid scroll"
```

---

## Task 6 — Gantt Filter Bar Integration

### Context

`useTaskFilters` already exists and works. `FilterBar` already exists and works. We just need to wire them into `GanttWidget` and pass `filteredTasks` instead of `tasks` to `GanttGrid`.

**`[Architect]` note:** Filtering is client-side only (no query param changes to React Query). The task list from the server stays cached. `useTaskFilters` takes the full task array and returns a filtered subset in `filteredTasks`. The Gantt grid only renders rows for tasks in `filteredTasks`.

**Files:**
- Modify: `packages/client/src/components/widgets/GanttWidget/index.tsx`

### Step 1 — Write failing test

Add to `packages/client/src/components/widgets/GanttWidget/GanttWidget.filter.test.tsx` (CREATE):

```tsx
import { render, screen } from '@testing-library/react';
import { GanttWidget } from './index';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect } from 'vitest';

vi.mock('../../../api/tasks.api', () => ({
  tasksApi: {
    list: vi.fn().mockResolvedValue([]),
    getStatuses: vi.fn().mockResolvedValue([]),
  },
}));

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('GanttWidget filter bar', () => {
  it('renders the FilterBar with a search input', () => {
    render(
      <QueryClientProvider client={qc}>
        <GanttWidget projectId="proj-1" widgetId="w-1" />
      </QueryClientProvider>
    );
    expect(screen.getByPlaceholderText(/search tasks/i)).toBeInTheDocument();
  });
});
```

### Step 2 — Run test to verify it fails

```bash
pnpm --filter @pm/client vitest run src/components/widgets/GanttWidget/GanttWidget.filter.test.tsx
```

Expected: **FAIL** — `FilterBar` not rendered.

### Step 3 — Implement in `index.tsx`

```diff
+ import { FilterBar } from '../../filter/FilterBar';
+ import { useTaskFilters } from '../../../hooks/useTaskFilters';

  export const GanttWidget: FC<WidgetProps> = ({ projectId }) => {
    // ... existing state and queries ...

+   // ── Filtering ─────────────────────────────────────────────────────────────
+   const { filters, filteredTasks, updateFilter, clearFilters, activeCount } =
+     useTaskFilters(tasks);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', ... }}>
        <GanttHeader ... />

+       <FilterBar
+         projectId={projectId}
+         filters={filters}
+         activeCount={activeCount}
+         onFilterChange={updateFilter}
+         onClear={clearFilters}
+       />

        <div ref={ganttRef} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <GanttGrid
            ref={gridRef}
-           tasks={tasks}
+           tasks={filteredTasks}
            statuses={statuses}
            ...
          />
        </div>
      </div>
    );
  };
```

### Step 4 — Run tests

```bash
pnpm --filter @pm/client vitest run src/components/widgets/GanttWidget/GanttWidget.filter.test.tsx
pnpm typecheck
```

Expected: **PASS**

### Step 5 — Commit

```bash
git add packages/client/src/components/widgets/GanttWidget/index.tsx \
        packages/client/src/components/widgets/GanttWidget/GanttWidget.filter.test.tsx
git commit -m "feat(gantt): integrate FilterBar and useTaskFilters into GanttWidget"
```

---

## Task 7 — Gantt Design Polish

### Context

Three targeted visual improvements, all in existing files:
1. **`GanttTaskBar`** — rounder task bars (`var(--radius-md)`), smooth brightness hover.
2. **`GanttGrid`** — stronger sidebar border (`border-right: 2px solid var(--color-border)`) for visual hierarchy; label column gets `background: var(--color-bg-elevated)` (was `transparent`) to make it feel sticky.
3. **`GanttHeader`** — already uses design tokens; no changes needed.

**Files:**
- Modify: `packages/client/src/components/widgets/GanttWidget/GanttTaskBar.tsx`
- Modify: `packages/client/src/components/widgets/GanttWidget/GanttGrid.tsx`

### Step 1 — No unit tests required for pure visual changes

Visual correctness is verified via manual QA in the running dev server (see Step 4).

### Step 2 — Update `GanttTaskBar.tsx`

```diff
  <motion.div
    style={{
      ...
-     borderRadius: 4,
+     borderRadius: 'var(--radius-md)',
      ...
    }}
+   whileHover={{ filter: 'brightness(1.12)' }}
    drag={isDragEnabled ? 'x' : false}
    ...
  >
```

For the milestone diamond, also add `whileHover`:

```diff
  <div style={{
    width: 14,
    height: 14,
    background: 'var(--color-warning)',
    transform: 'rotate(45deg)',
    ...
  }} />
```

Wrap the outer milestone `<div>` in a `motion.div`:

```diff
- <div
+ <motion.div
    style={{ position: 'absolute', top: 6, left: `${leftPct}%`, ... }}
    onClick={onClick}
+   whileHover={{ scale: 1.2 }}
  >
    <div style={{ ... /* diamond */ }} />
- </div>
+ </motion.div>
```

### Step 3 — Update `GanttGrid.tsx` — sidebar border polish

**Label column container** — add right-border weight:

```diff
  <div style={{
    width: LABEL_W,
    minWidth: LABEL_W,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
+   background: 'var(--color-bg-elevated)',
+   borderRight: '2px solid var(--color-border)',
+   position: 'sticky',
+   left: 0,
+   zIndex: 10,
  }}>
```

> **`[Architect]` note:** The sticky label column must be applied to the **body label column** (not the header spacer, which is already inside a sticky header). This is the key fix for the "sticky sidebar" requirement — the label column will now pin on horizontal scroll.

**Also update the header spacer** (the empty div to the left of date columns inside the sticky header) to match:

```diff
  <div style={{
    width: LABEL_W,
    minWidth: LABEL_W,
    flexShrink: 0,
    borderRight: '1px solid var(--color-border)',
    background: 'var(--color-bg-elevated)',
+   position: 'sticky',
+   left: 0,
+   zIndex: 30,
  }} />
```

> The header already has `position: sticky; top: 0; zIndex: 20`. The spacer inside it needs `zIndex: 30` to sit on top of column lines that bleed through.

**Lane header rows** — ensure they also get the `bg-elevated` background so the sticky panel is opaque on scroll:

```diff
  <div style={{
    height: ROW_H,
    display: 'flex',
    alignItems: 'center',
    ...
-   background: 'var(--color-bg-secondary)',
+   background: 'var(--color-bg-elevated)',
    borderBottom: '1px solid var(--color-border)',
-   borderRight: '1px solid var(--color-border)',   // remove — handled by parent
  }}>
```

### Step 4 — Manual QA checklist

Start the dev server and run through:

```bash
docker compose up -d
pnpm dev
```

Open `http://localhost:5173`, navigate to a project → Gantt widget.

- [ ] **Auth refresh:** Hard-refresh (`Ctrl+Shift+R`) on a protected route → sees Lucide spinner (animated), NOT a redirect to `/login`
- [ ] **Day view:** Shows individual day columns, today highlighted in accent
- [ ] **Week view:** Shows ~16 week-bucket columns (W-labels), NOT 112 day columns
- [ ] **Month view:** Shows 12 month columns (Jan 2026 – Dec 2026)
- [ ] **Quarter view:** Shows 4 quarter columns (Q1 2026 – Q4 2026)
- [ ] **Year view:** Shows 4 year columns (2025–2028)
- [ ] **Auto-scroll:** On initial mount, grid scrolls to today column automatically
- [ ] **Today button:** Clicking "Today" in the header scrolls back to the current period after manual scrolling away
- [ ] **Filter bar:** Search, status, priority, assignee, label dropdowns visible above grid; filtering reduces visible rows
- [ ] **Task bars:** Rounded corners, subtle brightness on hover
- [ ] **Sticky sidebar:** Scrolling the Gantt grid horizontally keeps the task name column pinned to the left

### Step 5 — Run full test suite

```bash
pnpm test
pnpm typecheck
```

Expected: **All PASS**

### Step 6 — Commit

```bash
git add packages/client/src/components/widgets/GanttWidget/GanttTaskBar.tsx \
        packages/client/src/components/widgets/GanttWidget/GanttGrid.tsx
git commit -m "polish(gantt): rounded bars, hover brightness, sticky sidebar border"
```

---

## Final: Full Suite + PR

```bash
pnpm test
pnpm typecheck
pnpm build   # verify no build errors
```

If all green:

```bash
# Use the commit-push-pr skill (or manually):
git push origin feature/phase-6-2-gantt-refinement
gh pr create \
  --title "Phase 6.2: Gantt Refinement & Core Bugfixes" \
  --body "Fixes auth redirect flash (Loader2 spinner), Gantt view resolution (week/month/quarter/year buckets), Today auto-scroll and button, FilterBar integration, and design polish (rounded bars, sticky sidebar, hover states)."
```

---

## Dependency Graph

```
Task 1 (Auth spinner)          ← independent
Task 2 (Column buckets)        ← independent
Task 3 (scrollToToday ref)     ← depends on Task 2 (same file)
Task 4 (Today button header)   ← independent
Task 5 (Wire today button)     ← depends on Task 3 + Task 4
Task 6 (Filter bar)            ← depends on Task 5 (same file)
Task 7 (Design polish)         ← depends on Task 2 (touches GanttGrid)
```

**Parallel execution is possible:** Task 1 and Tasks 2-7 can be worked in parallel branches. Tasks 3 → 5 → 6 must be sequential within the Gantt branch.
