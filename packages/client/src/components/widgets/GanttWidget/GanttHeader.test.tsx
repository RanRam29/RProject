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
    const onScrollToToday = vi.fn();
    render(<GanttHeader {...defaultProps} onScrollToToday={onScrollToToday} />);
    fireEvent.click(screen.getByRole('button', { name: /today/i }));
    expect(onScrollToToday).toHaveBeenCalledOnce();
  });

  it('renders the CalendarDays icon (SVG) inside the Today button', () => {
    render(<GanttHeader {...defaultProps} />);
    const btn = screen.getByRole('button', { name: /today/i });
    expect(btn.querySelector('svg')).not.toBeNull();
  });
});
