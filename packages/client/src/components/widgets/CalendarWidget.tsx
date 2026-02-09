import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '../../api/tasks.api';
import { FilterBar } from '../filter/FilterBar';
import { useTaskFilters } from '../../hooks/useTaskFilters';
import { TaskDetailModal } from '../task/TaskDetailModal';
import type { WidgetProps } from './widget.types';
import type { TaskDTO, TaskStatusDTO } from '@pm/shared';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function CalendarWidget({ projectId }: WidgetProps) {
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [selectedTask, setSelectedTask] = useState<TaskDTO | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createDefaultDate, setCreateDefaultDate] = useState('');

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.list(projectId),
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses', projectId],
    queryFn: () => tasksApi.getStatuses(projectId),
  });

  const statusMap: Record<string, TaskStatusDTO> = {};
  statuses.forEach((s) => {
    statusMap[s.id] = s;
  });

  const { filters, filteredTasks, updateFilter, clearFilters, activeCount } = useTaskFilters(tasks);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(currentYear, currentMonth, 1);
    const lastOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const startDayOfWeek = firstOfMonth.getDay();
    const daysInMonth = lastOfMonth.getDate();

    const days: Array<{ date: Date; inMonth: boolean }> = [];

    // Leading days from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth, -i);
      days.push({ date: d, inMonth: false });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ date: new Date(currentYear, currentMonth, d), inMonth: true });
    }

    // Trailing days to fill grid
    const totalCells = days.length <= 35 ? 35 : 42;
    while (days.length < totalCells) {
      const next = new Date(currentYear, currentMonth + 1, days.length - startDayOfWeek - daysInMonth + 1);
      days.push({ date: next, inMonth: false });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Map tasks to date keys
  const tasksByDate = useMemo(() => {
    const map: Record<string, TaskDTO[]> = {};

    filteredTasks.forEach((task) => {
      if (task.dueDate) {
        const key = task.dueDate.slice(0, 10);
        if (!map[key]) map[key] = [];
        map[key].push(task);
      }
      if (task.startDate && task.startDate.slice(0, 10) !== task.dueDate?.slice(0, 10)) {
        const key = task.startDate.slice(0, 10);
        if (!map[key]) map[key] = [];
        if (!map[key].some((t) => t.id === task.id)) {
          map[key].push(task);
        }
      }
    });

    return map;
  }, [filteredTasks]);

  const goToPrevMonth = useCallback(() => {
    setCurrentMonth((m) => {
      if (m === 0) {
        setCurrentYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((m) => {
      if (m === 11) {
        setCurrentYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const goToToday = useCallback(() => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
  }, []);

  const handleDateCellClick = useCallback((date: Date) => {
    setCreateDefaultDate(toDateKey(date));
    setShowCreate(true);
  }, []);

  const today = new Date();
  const todayKey = toDateKey(today);
  const monthLabel = new Date(currentYear, currentMonth).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const tasksWithDates = filteredTasks.filter((t) => t.dueDate);
  const tasksWithoutDates = filteredTasks.filter((t) => !t.dueDate);
  const rows = calendarDays.length / 7;

  const containerStyle: React.CSSProperties = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const navBarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '8px 12px',
  };

  const navBtnStyle: React.CSSProperties = {
    background: 'none',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    color: 'var(--color-text-secondary)',
    fontSize: '12px',
    padding: '4px 8px',
    lineHeight: 1,
  };

  const todayBtnStyle: React.CSSProperties = {
    padding: '4px 10px',
    fontSize: '12px',
    backgroundColor: 'var(--color-accent)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-full)',
    cursor: 'pointer',
  };

  const monthLabelStyle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    minWidth: '160px',
    textAlign: 'center',
  };

  const dayHeaderGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    borderBottom: '1px solid var(--color-border)',
  };

  const dayHeaderCellStyle: React.CSSProperties = {
    textAlign: 'center',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--color-text-tertiary)',
    padding: '4px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const calendarGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gridTemplateRows: `repeat(${rows}, 1fr)`,
    flex: 1,
    overflow: 'auto',
  };

  const summaryStyle: React.CSSProperties = {
    padding: '6px 12px',
    fontSize: '12px',
    color: 'var(--color-text-tertiary)',
    borderTop: '1px solid var(--color-border)',
    flexShrink: 0,
  };

  return (
    <div style={containerStyle}>
      <FilterBar
        projectId={projectId}
        filters={filters}
        activeCount={activeCount}
        onFilterChange={updateFilter}
        onClear={clearFilters}
      />

      {/* Navigation */}
      <div style={navBarStyle}>
        <button
          style={navBtnStyle}
          onClick={goToPrevMonth}
          title="Previous month"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          &#9664;
        </button>
        <button style={todayBtnStyle} onClick={goToToday}>
          Today
        </button>
        <span style={monthLabelStyle}>{monthLabel}</span>
        <button
          style={navBtnStyle}
          onClick={goToNextMonth}
          title="Next month"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          &#9654;
        </button>
      </div>

      {/* Day-of-week header */}
      <div style={dayHeaderGridStyle}>
        {DAY_NAMES.map((d) => (
          <div key={d} style={dayHeaderCellStyle}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={calendarGridStyle}>
        {calendarDays.map((day, idx) => {
          const key = toDateKey(day.date);
          const isToday = key === todayKey;
          const dayTasks = tasksByDate[key] || [];
          const isCurrentMonth = day.inMonth;

          return (
            <div
              key={idx}
              style={{
                borderRight: '1px solid var(--color-border)',
                borderBottom: '1px solid var(--color-border)',
                minHeight: '70px',
                padding: '2px 4px',
                cursor: 'pointer',
                transition: 'background-color var(--transition-fast)',
                overflow: 'hidden',
                backgroundColor: isToday ? 'rgba(59,130,246,0.06)' : 'transparent',
                opacity: isCurrentMonth ? 1 : 0.4,
              }}
              onClick={() => handleDateCellClick(day.date)}
              onMouseEnter={(e) => {
                if (!isToday) {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isToday
                  ? 'rgba(59,130,246,0.06)'
                  : 'transparent';
              }}
            >
              {/* Date number */}
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: isToday ? 700 : 400,
                  color: isToday ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  marginBottom: '2px',
                  ...(isToday
                    ? {
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-accent)',
                        color: 'white',
                      }
                    : {}),
                }}
              >
                {day.date.getDate()}
              </div>

              {/* Task pills */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {dayTasks.slice(0, 3).map((task) => {
                  const status = statusMap[task.statusId];
                  const isOverdue =
                    task.dueDate && new Date(task.dueDate) < today && !status?.isFinal;
                  return (
                    <div
                      key={task.id}
                      style={{
                        fontSize: '10px',
                        color: 'white',
                        padding: '1px 4px',
                        borderRadius: 'var(--radius-sm)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        lineHeight: '16px',
                        backgroundColor: isOverdue
                          ? 'var(--color-danger)'
                          : status?.color || 'var(--color-accent)',
                        opacity: status?.isFinal ? 0.5 : 1,
                        transition: 'opacity var(--transition-fast)',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTask(task);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = status?.isFinal ? '0.5' : '1';
                      }}
                      title={`${task.title}${isOverdue ? ' (Overdue)' : ''}`}
                    >
                      {task.title}
                    </div>
                  );
                })}
                {dayTasks.length > 3 && (
                  <div
                    style={{
                      fontSize: '10px',
                      color: 'var(--color-text-tertiary)',
                      padding: '1px 4px',
                    }}
                  >
                    +{dayTasks.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div style={summaryStyle}>
        {tasksWithDates.length} task{tasksWithDates.length !== 1 ? 's' : ''} with due dates
        {tasksWithoutDates.length > 0 && (
          <> &middot; {tasksWithoutDates.length} without dates</>
        )}
      </div>

      {/* Edit Modal */}
      <TaskDetailModal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        projectId={projectId}
        task={selectedTask}
        mode="edit"
      />

      {/* Create Modal */}
      <TaskDetailModal
        isOpen={showCreate}
        onClose={() => {
          setShowCreate(false);
          setCreateDefaultDate('');
        }}
        projectId={projectId}
        mode="create"
        defaultDueDate={createDefaultDate}
      />
    </div>
  );
}
