import { useState, useMemo, useCallback } from 'react';
import type { TaskDTO } from '@pm/shared';

export interface TaskFilters {
  search: string;
  statusId: string;
  assigneeId: string;
  priority: string;
  labelId: string;
}

const EMPTY_FILTERS: TaskFilters = {
  search: '',
  statusId: '',
  assigneeId: '',
  priority: '',
  labelId: '',
};

export function useTaskFilters(tasks: TaskDTO[]) {
  const [filters, setFilters] = useState<TaskFilters>(EMPTY_FILTERS);

  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.statusId) count++;
    if (filters.assigneeId) count++;
    if (filters.priority) count++;
    if (filters.labelId) count++;
    return count;
  }, [filters]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!task.title.toLowerCase().includes(q)) return false;
      }
      if (filters.statusId && task.statusId !== filters.statusId) return false;
      if (filters.assigneeId && task.assigneeId !== filters.assigneeId) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.labelId) {
        const hasLabel = task.labels?.some(
          (tl) => tl.labelId === filters.labelId || tl.label?.id === filters.labelId
        );
        if (!hasLabel) return false;
      }
      return true;
    });
  }, [tasks, filters]);

  const updateFilter = useCallback(<K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, []);

  return { filters, filteredTasks, updateFilter, clearFilters, activeCount };
}
