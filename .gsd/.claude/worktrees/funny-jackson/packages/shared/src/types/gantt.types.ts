// ── Gantt timeline PATCH request / response ───────────────────────────────────

export interface UpdateTaskTimelineRequest {
  startDate?: string | null;  // ISO date "yyyy-MM-dd"
  endDate?: string | null;    // ISO date "yyyy-MM-dd" (maps to dueDate)
  autoSchedule: boolean;      // cascade date delta to downstream dependents
}

export interface CascadedTaskUpdate {
  taskId: string;
  newStartDate: string | null;
  newEndDate: string | null;
}

export interface UpdateTaskTimelineResponse {
  updated: CascadedTaskUpdate[];
  cascadeCount: number;
}

// ── Client-side resource overload computation ─────────────────────────────────

export interface DayResourceLoad {
  date: string;                // "yyyy-MM-dd"
  assigneeId: string;
  totalEstimatedHours: number;
  isOverloaded: boolean;       // totalEstimatedHours > 8
  taskIds: string[];
}
