import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTaskFilters } from './useTaskFilters';

const mockTasks = [
  {
    title: 'Build Login',
    statusId: 's1',
    assigneeId: 'u1',
    priority: 'HIGH',
    labels: [{ labelId: 'l1', label: { id: 'l1' } }],
  },
  {
    title: 'Fix Bug',
    statusId: 's2',
    assigneeId: 'u2',
    priority: 'LOW',
    labels: [],
  },
  {
    title: 'Build Dashboard',
    statusId: 's1',
    assigneeId: 'u1',
    priority: 'MEDIUM',
    labels: [{ labelId: 'l2', label: { id: 'l2' } }],
  },
] as any[];

describe('useTaskFilters', () => {
  describe('initial state', () => {
    it('returns all tasks when no filters are applied', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      expect(result.current.filteredTasks).toHaveLength(3);
      expect(result.current.filteredTasks).toEqual(mockTasks);
    });

    it('has all filter values set to empty strings', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      expect(result.current.filters).toEqual({
        search: '',
        statusId: '',
        assigneeId: '',
        priority: '',
        labelId: '',
      });
    });

    it('has activeCount of 0', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      expect(result.current.activeCount).toBe(0);
    });
  });

  describe('search filter', () => {
    it('filters tasks by partial title match', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('search', 'Build');
      });

      expect(result.current.filteredTasks).toHaveLength(2);
      expect(result.current.filteredTasks[0].title).toBe('Build Login');
      expect(result.current.filteredTasks[1].title).toBe('Build Dashboard');
    });

    it('filters case-insensitively', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('search', 'build');
      });

      expect(result.current.filteredTasks).toHaveLength(2);
      expect(result.current.filteredTasks[0].title).toBe('Build Login');
      expect(result.current.filteredTasks[1].title).toBe('Build Dashboard');
    });

    it('handles uppercase search against lowercase title content', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('search', 'BUG');
      });

      expect(result.current.filteredTasks).toHaveLength(1);
      expect(result.current.filteredTasks[0].title).toBe('Fix Bug');
    });

    it('returns no tasks when search matches nothing', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('search', 'nonexistent');
      });

      expect(result.current.filteredTasks).toHaveLength(0);
    });

    it('matches single-character partial searches', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('search', 'F');
      });

      expect(result.current.filteredTasks).toHaveLength(1);
      expect(result.current.filteredTasks[0].title).toBe('Fix Bug');
    });
  });

  describe('statusId filter', () => {
    it('filters tasks by exact statusId match', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('statusId', 's1');
      });

      expect(result.current.filteredTasks).toHaveLength(2);
      expect(result.current.filteredTasks[0].title).toBe('Build Login');
      expect(result.current.filteredTasks[1].title).toBe('Build Dashboard');
    });

    it('returns single task for unique statusId', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('statusId', 's2');
      });

      expect(result.current.filteredTasks).toHaveLength(1);
      expect(result.current.filteredTasks[0].title).toBe('Fix Bug');
    });

    it('returns no tasks for non-existent statusId', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('statusId', 's999');
      });

      expect(result.current.filteredTasks).toHaveLength(0);
    });
  });

  describe('assigneeId filter', () => {
    it('filters tasks by exact assigneeId match', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('assigneeId', 'u1');
      });

      expect(result.current.filteredTasks).toHaveLength(2);
      expect(result.current.filteredTasks[0].title).toBe('Build Login');
      expect(result.current.filteredTasks[1].title).toBe('Build Dashboard');
    });

    it('returns single task for unique assigneeId', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('assigneeId', 'u2');
      });

      expect(result.current.filteredTasks).toHaveLength(1);
      expect(result.current.filteredTasks[0].title).toBe('Fix Bug');
    });

    it('returns no tasks for non-existent assigneeId', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('assigneeId', 'u999');
      });

      expect(result.current.filteredTasks).toHaveLength(0);
    });
  });

  describe('priority filter', () => {
    it('filters tasks by exact priority match', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('priority', 'HIGH');
      });

      expect(result.current.filteredTasks).toHaveLength(1);
      expect(result.current.filteredTasks[0].title).toBe('Build Login');
    });

    it('filters LOW priority tasks', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('priority', 'LOW');
      });

      expect(result.current.filteredTasks).toHaveLength(1);
      expect(result.current.filteredTasks[0].title).toBe('Fix Bug');
    });

    it('filters MEDIUM priority tasks', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('priority', 'MEDIUM');
      });

      expect(result.current.filteredTasks).toHaveLength(1);
      expect(result.current.filteredTasks[0].title).toBe('Build Dashboard');
    });

    it('does not do partial or case-insensitive matching on priority', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('priority', 'high');
      });

      expect(result.current.filteredTasks).toHaveLength(0);
    });
  });

  describe('labelId filter', () => {
    it('matches tasks via tl.labelId', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('labelId', 'l1');
      });

      expect(result.current.filteredTasks).toHaveLength(1);
      expect(result.current.filteredTasks[0].title).toBe('Build Login');
    });

    it('matches tasks via tl.label.id', () => {
      const tasksWithOnlyLabelId = [
        {
          title: 'Task A',
          statusId: 's1',
          assigneeId: 'u1',
          priority: 'HIGH',
          labels: [{ labelId: 'other', label: { id: 'target-label' } }],
        },
      ] as any[];

      const { result } = renderHook(() => useTaskFilters(tasksWithOnlyLabelId));

      act(() => {
        result.current.updateFilter('labelId', 'target-label');
      });

      expect(result.current.filteredTasks).toHaveLength(1);
      expect(result.current.filteredTasks[0].title).toBe('Task A');
    });

    it('excludes tasks with no labels', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('labelId', 'l1');
      });

      const titles = result.current.filteredTasks.map((t: any) => t.title);
      expect(titles).not.toContain('Fix Bug');
    });

    it('returns no tasks for non-existent labelId', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('labelId', 'l999');
      });

      expect(result.current.filteredTasks).toHaveLength(0);
    });

    it('matches on second label in array', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('labelId', 'l2');
      });

      expect(result.current.filteredTasks).toHaveLength(1);
      expect(result.current.filteredTasks[0].title).toBe('Build Dashboard');
    });

    it('handles tasks with undefined labels gracefully', () => {
      const tasksWithUndefinedLabels = [
        {
          title: 'No Labels Task',
          statusId: 's1',
          assigneeId: 'u1',
          priority: 'HIGH',
          labels: undefined,
        },
      ] as any[];

      const { result } = renderHook(() => useTaskFilters(tasksWithUndefinedLabels));

      act(() => {
        result.current.updateFilter('labelId', 'l1');
      });

      expect(result.current.filteredTasks).toHaveLength(0);
    });
  });

  describe('multiple filters (AND logic)', () => {
    it('combines search and statusId filters', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('search', 'Build');
        result.current.updateFilter('statusId', 's1');
      });

      expect(result.current.filteredTasks).toHaveLength(2);
      expect(result.current.filteredTasks[0].title).toBe('Build Login');
      expect(result.current.filteredTasks[1].title).toBe('Build Dashboard');
    });

    it('combines search and priority to narrow results', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('search', 'Build');
        result.current.updateFilter('priority', 'HIGH');
      });

      expect(result.current.filteredTasks).toHaveLength(1);
      expect(result.current.filteredTasks[0].title).toBe('Build Login');
    });

    it('combines statusId, assigneeId, and priority', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('statusId', 's1');
        result.current.updateFilter('assigneeId', 'u1');
        result.current.updateFilter('priority', 'MEDIUM');
      });

      expect(result.current.filteredTasks).toHaveLength(1);
      expect(result.current.filteredTasks[0].title).toBe('Build Dashboard');
    });

    it('returns empty when combined filters exclude all tasks', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('statusId', 's2');
        result.current.updateFilter('priority', 'HIGH');
      });

      expect(result.current.filteredTasks).toHaveLength(0);
    });

    it('combines all five filters at once', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('search', 'Build');
        result.current.updateFilter('statusId', 's1');
        result.current.updateFilter('assigneeId', 'u1');
        result.current.updateFilter('priority', 'HIGH');
        result.current.updateFilter('labelId', 'l1');
      });

      expect(result.current.filteredTasks).toHaveLength(1);
      expect(result.current.filteredTasks[0].title).toBe('Build Login');
    });
  });

  describe('updateFilter', () => {
    it('updates a single filter key without affecting others', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('search', 'Build');
      });

      expect(result.current.filters.search).toBe('Build');
      expect(result.current.filters.statusId).toBe('');
      expect(result.current.filters.assigneeId).toBe('');
      expect(result.current.filters.priority).toBe('');
      expect(result.current.filters.labelId).toBe('');
    });

    it('overwrites a previously set filter value', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('priority', 'HIGH');
      });

      expect(result.current.filters.priority).toBe('HIGH');

      act(() => {
        result.current.updateFilter('priority', 'LOW');
      });

      expect(result.current.filters.priority).toBe('LOW');
    });

    it('can clear a single filter by setting it to empty string', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('search', 'Build');
        result.current.updateFilter('statusId', 's1');
      });

      expect(result.current.filteredTasks).toHaveLength(2);

      act(() => {
        result.current.updateFilter('search', '');
      });

      expect(result.current.filters.search).toBe('');
      expect(result.current.filters.statusId).toBe('s1');
      expect(result.current.filteredTasks).toHaveLength(2);
    });
  });

  describe('clearFilters', () => {
    it('resets all filters to empty strings', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('search', 'Build');
        result.current.updateFilter('statusId', 's1');
        result.current.updateFilter('assigneeId', 'u1');
        result.current.updateFilter('priority', 'HIGH');
        result.current.updateFilter('labelId', 'l1');
      });

      expect(result.current.filteredTasks).toHaveLength(1);

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters).toEqual({
        search: '',
        statusId: '',
        assigneeId: '',
        priority: '',
        labelId: '',
      });
    });

    it('returns all tasks after clearing', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('priority', 'HIGH');
      });

      expect(result.current.filteredTasks).toHaveLength(1);

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filteredTasks).toHaveLength(3);
      expect(result.current.filteredTasks).toEqual(mockTasks);
    });

    it('resets activeCount to 0', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('search', 'Build');
        result.current.updateFilter('statusId', 's1');
      });

      expect(result.current.activeCount).toBe(2);

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.activeCount).toBe(0);
    });
  });

  describe('activeCount', () => {
    it('counts a single active filter', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('search', 'test');
      });

      expect(result.current.activeCount).toBe(1);
    });

    it('counts multiple active filters', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('search', 'Build');
        result.current.updateFilter('statusId', 's1');
        result.current.updateFilter('priority', 'HIGH');
      });

      expect(result.current.activeCount).toBe(3);
    });

    it('counts all five filters when active', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('search', 'Build');
        result.current.updateFilter('statusId', 's1');
        result.current.updateFilter('assigneeId', 'u1');
        result.current.updateFilter('priority', 'HIGH');
        result.current.updateFilter('labelId', 'l1');
      });

      expect(result.current.activeCount).toBe(5);
    });

    it('decrements when a filter is cleared', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('search', 'Build');
        result.current.updateFilter('statusId', 's1');
      });

      expect(result.current.activeCount).toBe(2);

      act(() => {
        result.current.updateFilter('search', '');
      });

      expect(result.current.activeCount).toBe(1);
    });

    it('does not count empty string filters', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.updateFilter('search', '');
        result.current.updateFilter('statusId', '');
      });

      expect(result.current.activeCount).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('handles empty tasks array', () => {
      const { result } = renderHook(() => useTaskFilters([]));

      expect(result.current.filteredTasks).toHaveLength(0);

      act(() => {
        result.current.updateFilter('search', 'anything');
      });

      expect(result.current.filteredTasks).toHaveLength(0);
    });

    it('reacts to tasks prop changes', () => {
      const { result, rerender } = renderHook(
        ({ tasks }) => useTaskFilters(tasks),
        { initialProps: { tasks: mockTasks } }
      );

      act(() => {
        result.current.updateFilter('statusId', 's1');
      });

      expect(result.current.filteredTasks).toHaveLength(2);

      const updatedTasks = [
        ...mockTasks,
        {
          title: 'New Task',
          statusId: 's1',
          assigneeId: 'u3',
          priority: 'LOW',
          labels: [],
        },
      ] as any[];

      rerender({ tasks: updatedTasks });

      expect(result.current.filteredTasks).toHaveLength(3);
    });
  });
});
