import { render } from '@testing-library/react';
import { createRef } from 'react';
import { GanttGrid, type GanttGridHandle } from './GanttGrid';
import { describe, it, expect } from 'vitest';

describe('GanttGrid forwardRef', () => {
  it('exposes scrollToToday via ref', () => {
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
});
