import { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import type { TaskDTO, TaskStatusDTO } from '@pm/shared';

interface KanbanBoardProps {
  statuses: TaskStatusDTO[];
  tasks: TaskDTO[];
  projectId: string;
  onTaskStatusChange: (taskId: string, newStatusId: string, sortOrder: number) => void;
  onTaskClick: (task: TaskDTO) => void;
  onAddTask: (statusId: string) => void;
  selectedTaskIds?: Set<string>;
  onTaskSelectionChange?: (taskId: string, isSelected: boolean) => void;
  selectionMode?: boolean;
}

export function KanbanBoard({
  statuses,
  tasks,
  projectId,
  onTaskStatusChange,
  onTaskClick,
  onAddTask,
  selectedTaskIds,
  onTaskSelectionChange,
  selectionMode = false,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<TaskDTO | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Disable drag sensors in selection mode so DndContext doesn't
  // intercept click events intended for card selection
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  });
  const sensors = useSensors(...(selectionMode ? [] : [pointerSensor, touchSensor]));

  const tasksByStatus = useMemo(() => {
    const map: Record<string, TaskDTO[]> = {};
    statuses.forEach((s) => {
      map[s.id] = [];
    });
    tasks.forEach((t) => {
      if (map[t.statusId]) {
        map[t.statusId].push(t);
      }
    });
    // Sort by sortOrder within each column
    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => a.sortOrder - b.sortOrder);
    });
    return map;
  }, [statuses, tasks]);

  const findStatusForTask = useCallback(
    (taskId: string): string | null => {
      for (const [statusId, statusTasks] of Object.entries(tasksByStatus)) {
        if (statusTasks.some((t) => t.id === taskId)) {
          return statusId;
        }
      }
      return null;
    },
    [tasksByStatus]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = tasks.find((t) => t.id === event.active.id);
      if (task) setActiveTask(task);
    },
    [tasks]
  );

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverId(event.over?.id as string | null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);
      setOverId(null);

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Determine target status
      let targetStatusId: string | null = null;
      let targetSortOrder = 0;

      // Check if dropped on a column
      const isColumn = statuses.some((s) => s.id === overId);
      if (isColumn) {
        targetStatusId = overId;
        targetSortOrder = (tasksByStatus[overId]?.length || 0) * 1000;
      } else {
        // Dropped on another task
        const overTaskStatus = findStatusForTask(overId);
        if (overTaskStatus) {
          targetStatusId = overTaskStatus;
          const overTask = tasks.find((t) => t.id === overId);
          targetSortOrder = overTask ? overTask.sortOrder : 0;
        }
      }

      if (!targetStatusId) return;

      const currentStatusId = findStatusForTask(activeId);
      if (currentStatusId === targetStatusId && activeId === overId) return;

      onTaskStatusChange(activeId, targetStatusId, targetSortOrder);
    },
    [statuses, tasksByStatus, tasks, findStatusForTask, onTaskStatusChange]
  );

  const boardStyle: React.CSSProperties = {
    display: 'flex',
    gap: '16px',
    padding: '16px 0',
    overflowX: 'auto',
    minHeight: '400px',
    alignItems: 'flex-start',
    WebkitOverflowScrolling: 'touch',
    scrollSnapType: 'x proximity',
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div style={boardStyle}>
        {statuses.map((status) => (
          <SortableContext
            key={status.id}
            items={tasksByStatus[status.id]?.map((t) => t.id) || []}
            strategy={verticalListSortingStrategy}
          >
            <KanbanColumn
              status={status}
              tasks={tasksByStatus[status.id] || []}
              isOverlay={overId === status.id}
              onTaskClick={onTaskClick}
              onAddTask={() => onAddTask(status.id)}
              projectId={projectId}
              selectedTaskIds={selectedTaskIds}
              onTaskSelectionChange={onTaskSelectionChange}
              selectionMode={selectionMode}
            />
          </SortableContext>
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <KanbanCard task={activeTask} isDragging projectId={projectId} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
