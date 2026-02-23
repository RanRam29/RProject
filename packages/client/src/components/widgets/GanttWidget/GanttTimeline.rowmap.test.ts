/**
 * buildRowMap — pure-function unit tests (Task 13 — Phase 7 overhaul)
 *
 * Verifies the single source of truth for row positions used by both
 * bar rendering and dependency arrows (fixes the dual-counter bug).
 */

import { describe, it, expect } from 'vitest';
import { buildRowMap } from './GanttTimeline';

describe('buildRowMap', () => {
  it('assigns consecutive row indices in flat mode (displayName null)', () => {
    const swimlanes = [
      {
        displayName: null,
        tasks: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      },
    ];
    const map = buildRowMap(swimlanes);
    expect(map.get('a')).toBe(0);
    expect(map.get('b')).toBe(1);
    expect(map.get('c')).toBe(2);
    expect(map.size).toBe(3);
  });

  it('unscheduled tasks (no dates) still receive a row index', () => {
    // buildRowMap doesn't care about dates — it assigns rows to all tasks
    const swimlanes = [
      {
        displayName: null,
        tasks: [{ id: 'a' }, { id: 'unscheduled' }, { id: 'c' }],
      },
    ];
    const map = buildRowMap(swimlanes);
    expect(map.get('unscheduled')).toBe(1);
    expect(map.size).toBe(3);
  });

  it('accounts for swimlane header rows (displayName non-null)', () => {
    const swimlanes = [
      {
        displayName: 'Alice',
        tasks: [{ id: 'a' }, { id: 'b' }],
      },
      {
        displayName: 'Bob',
        tasks: [{ id: 'c' }],
      },
    ];
    const map = buildRowMap(swimlanes);
    // Row 0 = Alice header (not in map)
    expect(map.get('a')).toBe(1);
    expect(map.get('b')).toBe(2);
    // Row 3 = Bob header (not in map)
    expect(map.get('c')).toBe(4);
    expect(map.size).toBe(3); // only tasks, not headers
  });

  it('flat mode with a swimlane has no header row overhead', () => {
    const swimlanes = [
      { displayName: null, tasks: [{ id: 'x' }, { id: 'y' }] },
    ];
    const map = buildRowMap(swimlanes);
    expect(map.get('x')).toBe(0);
    expect(map.get('y')).toBe(1);
  });

  it('returns an empty map for empty swimlanes', () => {
    expect(buildRowMap([]).size).toBe(0);
  });

  it('swimlane with zero tasks skips just the header row', () => {
    const swimlanes = [
      { displayName: 'Empty', tasks: [] },
      { displayName: null, tasks: [{ id: 'z' }] },
    ];
    const map = buildRowMap(swimlanes);
    // "Empty" lane header = row 0, no tasks
    // flat lane starts at row 1
    expect(map.get('z')).toBe(1);
  });
});
