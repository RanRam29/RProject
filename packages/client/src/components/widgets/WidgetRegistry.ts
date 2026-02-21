import type { ComponentType } from 'react';
import type { WidgetProps } from './widget.types';
import { TaskListWidget } from './TaskListWidget';
import { KanbanWidget } from './KanbanWidget';
import { GanttWidget } from './GanttWidget';
import { FilesWidget } from './FilesWidget';
import { AIAssistantWidget } from './AIAssistantWidget';
import { DependencyGraphWidget } from './DependencyGraphWidget';
import { ActivityFeedWidget } from './ActivityFeedWidget';
import { AnalyticsWidget } from './AnalyticsWidget';
import { CalendarWidget } from './CalendarWidget';

export const WidgetRegistry: Record<string, ComponentType<WidgetProps>> = {
  TASK_LIST: TaskListWidget,
  KANBAN: KanbanWidget,
  TIMELINE: GanttWidget,
  FILES: FilesWidget,
  AI_ASSISTANT: AIAssistantWidget,
  DEPENDENCY_GRAPH: DependencyGraphWidget,
  ACTIVITY_FEED: ActivityFeedWidget,
  ANALYTICS: AnalyticsWidget,
  CALENDAR: CalendarWidget,
};

export const WIDGET_CATALOG = [
  {
    type: 'TASK_LIST',
    title: 'Task List',
    description: 'Table view with sortable columns, filtering, and inline creation',
    icon: '\u2630',
    defaultSize: { width: 900, height: 400 },
  },
  {
    type: 'KANBAN',
    title: 'Kanban Board',
    description: 'Drag-and-drop board with status columns',
    icon: '\u25A7',
    defaultSize: { width: 900, height: 500 },
  },
  {
    type: 'TIMELINE',
    title: 'Gantt Chart',
    description: 'Advanced Gantt with swimlanes, milestones, dependencies, auto-schedule, and PDF export',
    icon: '\u2192',
    defaultSize: { width: 1100, height: 500 },
  },
  {
    type: 'FILES',
    title: 'Files',
    description: 'File storage with drag & drop upload',
    icon: '\uD83D\uDCC1',
    defaultSize: { width: 400, height: 300 },
  },
  {
    type: 'AI_ASSISTANT',
    title: 'AI Assistant',
    description: 'Analyze project data, create tasks, get insights',
    icon: '\uD83E\uDD16',
    defaultSize: { width: 400, height: 500 },
  },
  {
    type: 'DEPENDENCY_GRAPH',
    title: 'Dependency Graph',
    description: 'Visualize task dependencies as a directed graph',
    icon: '\uD83D\uDD17',
    defaultSize: { width: 700, height: 400 },
  },
  {
    type: 'ACTIVITY_FEED',
    title: 'Activity Feed',
    description: 'Recent project activity from all team members',
    icon: '\uD83D\uDCCB',
    defaultSize: { width: 400, height: 400 },
  },
  {
    type: 'ANALYTICS',
    title: 'Project Analytics',
    description: 'Task completion rates, status breakdown, and priority distribution',
    icon: '\uD83D\uDCCA',
    defaultSize: { width: 400, height: 500 },
  },
  {
    type: 'CALENDAR',
    title: 'Calendar',
    description: 'Month-view calendar showing tasks by due date',
    icon: '\uD83D\uDCC5',
    defaultSize: { width: 800, height: 500 },
  },
];
