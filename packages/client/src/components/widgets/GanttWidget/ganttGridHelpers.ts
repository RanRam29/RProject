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

// ── Column widths (px) ───────────────────────────────────────────────────────

export const COL_W: Record<GanttView, number> = {
  day:      80,
  week:    120,
  month:   110,
  quarter: 200,
  year:    180,
};

// ── Date-range per view ──────────────────────────────────────────────────────

export function getRangeForView(view: GanttView, year: number): { start: Date; end: Date } {
  const now = new Date();
  switch (view) {
    case 'day':
      return {
        start: startOfWeek(addDays(now, -7), { weekStartsOn: 1 }),
        end:   endOfWeek(addDays(now, 14),   { weekStartsOn: 1 }),
      };
    case 'week':
      return {
        start: startOfWeek(addDays(now, -28), { weekStartsOn: 1 }),
        end:   endOfWeek(addDays(now, 84),    { weekStartsOn: 1 }),
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

// ── Re-export utilities used by GanttGrid ────────────────────────────────────

export { startOfDay, differenceInDays, addDays, format };
