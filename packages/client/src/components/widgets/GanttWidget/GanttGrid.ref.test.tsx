import { render } from '@testing-library/react';
import { createRef } from 'react';
import { GanttGrid, type GanttGridHandle } from './GanttGrid';
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
};

const mockStatus: TaskStatusDTO = {
  id: 'status-1',
  projectId: 'proj-1',
  name: 'In Progress',
  color: '#3b82f6',
  sortOrder: 0,
  isFinal: false,
};

describe('GanttGrid forwardRef', () => {
  let scrollIntoViewSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollIntoViewSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewSpy as unknown as typeof Element.prototype.scrollIntoView;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes scrollToToday function via ref', () => {
    const ref = createRef<GanttGridHandle>();
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

  it('calls scrollIntoView with inline:center when scrollToToday is invoked', () => {
    const ref = createRef<GanttGridHandle>();
    render(
      <GanttGrid
        ref={ref}
        tasks={[mockTask]}
        statuses={[mockStatus]}
        view="day"
        year={new Date().getFullYear()}
        isDragEnabled={false}
        onTaskClick={() => {}}
        onTimelineUpdate={() => {}}
      />
    );
    // Clear calls from the mount auto-scroll effect
    scrollIntoViewSpy.mockClear();

    ref.current!.scrollToToday();

    expect(scrollIntoViewSpy).toHaveBeenCalledWith(
      expect.objectContaining({ inline: 'center', behavior: 'smooth' }),
    );
  });
});
