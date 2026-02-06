import type { ComponentType } from 'react';
import type { WidgetProps } from './widget.types';
import { TaskListWidget } from './TaskListWidget';
import { KanbanWidget } from './KanbanWidget';
import { TimelineWidget } from './TimelineWidget';
import { FilesWidget } from './FilesWidget';
import { AIAssistantWidget } from './AIAssistantWidget';
import { DependencyGraphWidget } from './DependencyGraphWidget';
import { ActivityFeedWidget } from './ActivityFeedWidget';

export const WidgetRegistry: Record<string, ComponentType<WidgetProps>> = {
  TASK_LIST: TaskListWidget,
  KANBAN: KanbanWidget,
  TIMELINE: TimelineWidget,
  FILES: FilesWidget,
  AI_ASSISTANT: AIAssistantWidget,
  DEPENDENCY_GRAPH: DependencyGraphWidget,
  ACTIVITY_FEED: ActivityFeedWidget,
};

export const WIDGET_CATALOG = [
  {
    type: 'TASK_LIST',
    title: 'Task List',
    description: 'Simple list view of tasks with inline creation',
    icon: '\u2630',
    defaultSize: { width: 400, height: 400 },
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
    title: 'Timeline',
    description: 'Gantt-style timeline view with today line',
    icon: '\u2192',
    defaultSize: { width: 900, height: 400 },
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
];
