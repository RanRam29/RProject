/**
 * GanttTimeline — forwardRef / scrollToToday tests
 * Updated from GanttGrid.ref.test.tsx (Task 13 — Phase 7 overhaul)
 */

import { render } from '@testing-library/react';
import { createRef } from 'react';
import { GanttTimeline, type GanttTimelineHandle } from './GanttTimeline';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TaskPriority } from '@pm/shared';
import type { TaskDTO, TaskStatusDTO } from '@pm/shared';

const TODAY_ISO = new Date().toISOString().slice(0, 10);

const mockTask: TaskDTO = {
  id: 'task-1',
  projectId: 'proj-1',
  title: 'Test task',
  description: null,
  statusId: 'status-1',
  assigneeId: null,
  creatorId: 'user-1',
  parentTaskId: null,
  priority: TaskPriority.NONE,
  startDate: TODAY_ISO,
  dueDate: TODAY_ISO,
  sortOrder: 0,
  createdAt: TODAY_ISO,
  updatedAt: TODAY_ISO,
  isMilestone: false,
  estimatedHours: 0,
  progressPercentage: 0,
  assignee: null,
  labels: [],
  comments: [],
  blockedBy: [],
  blocking: [],
};

const mockStatus: TaskStatusDTO = {
  id: 'status-1',
  projectId: 'proj-1',
  name: 'In Progress',
  color: '#3b82f6',
  sortOrder: 0,
  isFinal: false,
};

const defaultProps = {
  tasks: [],
  statuses: [],
  view: 'week' as const,
  year: 2026,
  isDragEnabled: false,
  swimlaneMode: false,
  focusMode: false,
  autoSchedule: false,
  pdfExporting: false,
  onFocusModeChange: vi.fn(),
  onSwimlaneToggle: vi.fn(),
  onViewChange: vi.fn(),
  onYearChange: vi.fn(),
  onAutoScheduleChange: vi.fn(),
  onScrollToToday: vi.fn(),
  onExportPDF: vi.fn(),
  onTaskClick: vi.fn(),
  onTimelineUpdate: vi.fn(),
};

describe('GanttTimeline forwardRef', () => {
  let scrollToSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollToSpy = vi.fn();
    HTMLElement.prototype.scrollTo = scrollToSpy as unknown as typeof HTMLElement.prototype.scrollTo;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes scrollToToday function via ref', () => {
    const ref = createRef<GanttTimelineHandle>();
    render(<GanttTimeline ref={ref} {...defaultProps} />);
    expect(typeof ref.current?.scrollToToday).toBe('function');
  });

  it('calls scrollTo on the container when scrollToToday is invoked', () => {
    const ref = createRef<GanttTimelineHandle>();
    render(
      <GanttTimeline
        ref={ref}
        {...defaultProps}
        tasks={[mockTask]}
        statuses={[mockStatus]}
        view="day"
        year={new Date().getFullYear()}
      />,
    );

    ref.current!.scrollToToday();

    expect(scrollToSpy).toHaveBeenCalled();
  });
});
