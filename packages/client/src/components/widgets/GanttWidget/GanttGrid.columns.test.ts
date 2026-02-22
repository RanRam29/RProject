import { describe, it, expect } from 'vitest';
import { parseISO, startOfWeek, startOfMonth, startOfQuarter } from 'date-fns';
import {
  getColumnsForView,
  colLabelForView,
  isTodayColumn,
} from './ganttGridHelpers';

describe('getColumnsForView', () => {
  it('returns one date per day for day view', () => {
    const start = parseISO('2026-01-01');
    const end   = parseISO('2026-01-07');
    const cols  = getColumnsForView('day', start, end);
    expect(cols.length).toBe(7);
  });

  it('returns one date per week (Mondays) for week view', () => {
    const start = parseISO('2026-01-05'); // Monday
    const end   = parseISO('2026-03-29'); // 12 Mondays later
    const cols  = getColumnsForView('week', start, end);
    expect(cols.length).toBe(12);
    // Each should be a Monday (day 1)
    cols.forEach((c) => expect(c.getDay()).toBe(1));
  });

  it('returns 12 months for a full year (month view)', () => {
    const start = parseISO('2026-01-01');
    const end   = parseISO('2026-12-31');
    const cols  = getColumnsForView('month', start, end);
    expect(cols.length).toBe(12);
  });

  it('returns 4 quarters for a full year (quarter view)', () => {
    const start = parseISO('2026-01-01');
    const end   = parseISO('2026-12-31');
    const cols  = getColumnsForView('quarter', start, end);
    expect(cols.length).toBe(4);
  });

  it('returns correct year count for year view', () => {
    const start = parseISO('2025-01-01');
    const end   = parseISO('2028-12-31');
    const cols  = getColumnsForView('year', start, end);
    expect(cols.length).toBe(4);
  });
});

describe('colLabelForView', () => {
  it('formats quarter columns as Q1 2026', () => {
    expect(colLabelForView(parseISO('2026-01-01'), 'quarter')).toBe('Q1 2026');
    expect(colLabelForView(parseISO('2026-04-01'), 'quarter')).toBe('Q2 2026');
    expect(colLabelForView(parseISO('2026-07-01'), 'quarter')).toBe('Q3 2026');
    expect(colLabelForView(parseISO('2026-10-01'), 'quarter')).toBe('Q4 2026');
  });

  it('formats year columns as 4-digit year', () => {
    expect(colLabelForView(parseISO('2026-01-01'), 'year')).toBe('2026');
  });

  it('formats month columns as "Mon YYYY"', () => {
    expect(colLabelForView(parseISO('2026-01-01'), 'month')).toBe('Jan 2026');
  });

  it('formats week columns as "W{n} Mon" (ISO week number + month abbrev)', () => {
    // 2026-01-05 is the Monday of ISO week 2 in January
    const label = colLabelForView(parseISO('2026-01-05'), 'week');
    // Should start with W and contain Jan
    expect(label).toMatch(/^W\d+\s+\w{3}$/);
    expect(label).toContain('Jan');
  });

  it('formats day columns as "Day-abbrev date" e.g. "Mon 5"', () => {
    const label = colLabelForView(parseISO('2026-01-05'), 'day');
    expect(label).toBe('Mon 5');
  });
});

describe('isTodayColumn', () => {
  it('returns true for the current day in day view', () => {
    expect(isTodayColumn(new Date(), 'day')).toBe(true);
  });

  it('returns false for a date in the past (day view)', () => {
    const past = parseISO('2020-01-01');
    expect(isTodayColumn(past, 'day')).toBe(false);
  });

  it('returns true for this year in year view', () => {
    const thisYear = new Date(new Date().getFullYear(), 0, 1);
    expect(isTodayColumn(thisYear, 'year')).toBe(true);
  });

  it('returns true for the current week in week view', () => {
    const thisWeekMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
    expect(isTodayColumn(thisWeekMonday, 'week')).toBe(true);
  });

  it('returns false for a past week in week view', () => {
    const pastMonday = startOfWeek(parseISO('2020-01-06'), { weekStartsOn: 1 });
    expect(isTodayColumn(pastMonday, 'week')).toBe(false);
  });

  it('returns true for the current month in month view', () => {
    const thisMonth = startOfMonth(new Date());
    expect(isTodayColumn(thisMonth, 'month')).toBe(true);
  });

  it('returns true for the current quarter in quarter view', () => {
    const thisQuarter = startOfQuarter(new Date());
    expect(isTodayColumn(thisQuarter, 'quarter')).toBe(true);
  });
});
