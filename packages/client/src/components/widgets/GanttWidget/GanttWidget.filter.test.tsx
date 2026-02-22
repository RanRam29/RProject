import { render, screen } from '@testing-library/react';
import { GanttWidget } from './index';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../../api/tasks.api', () => ({
  tasksApi: {
    list: vi.fn().mockResolvedValue([]),
    getStatuses: vi.fn().mockResolvedValue([]),
    updateTimeline: vi.fn(),
  },
}));

vi.mock('../../filter/FilterBar', () => ({
  FilterBar: ({ filters }: { filters: { search: string } }) => (
    <div data-testid="filter-bar">
      <input placeholder="Search tasks... ( / )" value={filters.search} readOnly />
    </div>
  ),
}));

const makeQc = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('GanttWidget filter integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the FilterBar', () => {
    render(
      <QueryClientProvider client={makeQc()}>
        <GanttWidget projectId="proj-1" widgetId="w-1" config={{}} />
      </QueryClientProvider>
    );
    expect(screen.getByTestId('filter-bar')).toBeInTheDocument();
  });
});
