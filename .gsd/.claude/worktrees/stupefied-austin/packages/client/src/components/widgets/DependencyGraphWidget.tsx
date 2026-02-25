import { useState, useMemo, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '../../api/tasks.api';
import { TaskDetailModal } from '../task/TaskDetailModal';
import type { WidgetProps } from './widget.types';
import type { TaskDTO } from '@pm/shared';
import { PRIORITY_CONFIG } from '@pm/shared';

// ─── Layout Constants ───────────────────────────────────────
const NODE_W = 180;
const NODE_H = 60;
const GAP_X = 60;
const GAP_Y = 24;
const PAD = 40;

// ─── Types ──────────────────────────────────────────────────
interface GraphNode {
  task: TaskDTO;
  level: number;
  index: number;
  x: number;
  y: number;
}

interface GraphEdge {
  from: string; // blockingTaskId
  to: string;   // blockedTaskId
  resolved: boolean;
}

// ─── Layout Algorithm ───────────────────────────────────────
function buildGraph(tasks: TaskDTO[]): { nodes: GraphNode[]; edges: GraphEdge[]; width: number; height: number } {
  // Only top-level tasks with dependencies (or that ARE dependencies)
  const topLevel = tasks.filter((t) => !t.parentTaskId);
  const taskMap = new Map(topLevel.map((t) => [t.id, t]));

  // Collect all task IDs that participate in any dependency
  const depTaskIds = new Set<string>();
  const edges: GraphEdge[] = [];

  for (const task of topLevel) {
    if (task.blockedBy && task.blockedBy.length > 0) {
      for (const dep of task.blockedBy) {
        if (taskMap.has(dep.blockingTaskId)) {
          depTaskIds.add(task.id);
          depTaskIds.add(dep.blockingTaskId);
          // Edge: blocking → blocked
          const blockingTask = taskMap.get(dep.blockingTaskId);
          edges.push({
            from: dep.blockingTaskId,
            to: task.id,
            resolved: !!blockingTask && isBlockingResolved(blockingTask),
          });
        }
      }
    }
    if (task.blocking && task.blocking.length > 0) {
      for (const dep of task.blocking) {
        if (taskMap.has(dep.blockedTaskId)) {
          depTaskIds.add(task.id);
          depTaskIds.add(dep.blockedTaskId);
        }
      }
    }
  }

  if (depTaskIds.size === 0) {
    return { nodes: [], edges: [], width: 0, height: 0 };
  }

  // Build adjacency for topological sort (blocking → blocked = edge direction)
  const adjOut = new Map<string, string[]>();
  const inDeg = new Map<string, number>();

  for (const id of depTaskIds) {
    adjOut.set(id, []);
    inDeg.set(id, 0);
  }

  for (const edge of edges) {
    adjOut.get(edge.from)?.push(edge.to);
    inDeg.set(edge.to, (inDeg.get(edge.to) || 0) + 1);
  }

  // BFS-based level assignment (longest path from sources)
  const levels = new Map<string, number>();
  const queue: string[] = [];

  for (const id of depTaskIds) {
    if ((inDeg.get(id) || 0) === 0) {
      queue.push(id);
      levels.set(id, 0);
    }
  }

  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++];
    const currLevel = levels.get(curr) || 0;
    for (const next of adjOut.get(curr) || []) {
      const newLevel = currLevel + 1;
      if (newLevel > (levels.get(next) || 0)) {
        levels.set(next, newLevel);
      }
      inDeg.set(next, (inDeg.get(next) || 0) - 1);
      if (inDeg.get(next) === 0) {
        queue.push(next);
      }
    }
  }

  // Handle cycles (shouldn't exist, but safety net)
  for (const id of depTaskIds) {
    if (!levels.has(id)) levels.set(id, 0);
  }

  // Group by level
  const levelGroups = new Map<number, string[]>();
  for (const [id, level] of levels) {
    if (!levelGroups.has(level)) levelGroups.set(level, []);
    levelGroups.get(level)!.push(id);
  }

  // Compute positions
  const nodes: GraphNode[] = [];
  let maxLevel = 0;
  let maxPerLevel = 0;

  for (const [level, ids] of levelGroups) {
    if (level > maxLevel) maxLevel = level;
    if (ids.length > maxPerLevel) maxPerLevel = ids.length;
    ids.forEach((id, index) => {
      const task = taskMap.get(id)!;
      nodes.push({
        task,
        level,
        index,
        x: PAD + level * (NODE_W + GAP_X),
        y: PAD + index * (NODE_H + GAP_Y),
      });
    });
  }

  const width = PAD * 2 + (maxLevel + 1) * NODE_W + maxLevel * GAP_X;
  const height = PAD * 2 + maxPerLevel * NODE_H + (maxPerLevel - 1) * GAP_Y;

  return { nodes, edges, width: Math.max(width, 300), height: Math.max(height, 200) };
}

function isBlockingResolved(task: TaskDTO): boolean {
  // A blocking task is "resolved" if its status name suggests completion
  // We check via the status object if available
  const status = (task as TaskDTO & { status?: { name: string } }).status;
  if (status) {
    const name = status.name.toLowerCase();
    return name === 'done' || name === 'complete' || name === 'completed' || name === 'closed';
  }
  return false;
}

// ─── SVG Edge Path ──────────────────────────────────────────
function edgePath(fromNode: GraphNode, toNode: GraphNode): string {
  const x1 = fromNode.x + NODE_W;
  const y1 = fromNode.y + NODE_H / 2;
  const x2 = toNode.x;
  const y2 = toNode.y + NODE_H / 2;
  const cx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
}

// ─── Component ──────────────────────────────────────────────
export function DependencyGraphWidget({ projectId }: WidgetProps) {
  const [selectedTask, setSelectedTask] = useState<TaskDTO | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.list(projectId),
  });

  const graph = useMemo(() => buildGraph(tasks), [tasks]);

  const nodeMap = useMemo(
    () => new Map(graph.nodes.map((n) => [n.task.id, n])),
    [graph.nodes]
  );

  // Highlight edges connected to hovered node
  const isEdgeHighlighted = useCallback(
    (edge: GraphEdge) => hoveredNodeId === edge.from || hoveredNodeId === edge.to,
    [hoveredNodeId]
  );

  const handleNodeClick = useCallback((task: TaskDTO) => {
    setSelectedTask(task);
  }, []);

  if (graph.nodes.length === 0) {
    return (
      <div style={emptyStyle}>
        <span style={{ fontSize: 32 }}>🔗</span>
        <p style={{ color: '#9CA3AF', marginTop: 8 }}>No task dependencies yet</p>
        <p style={{ color: '#6B7280', fontSize: 12 }}>
          Add dependencies in a task&apos;s detail view to see the graph
        </p>
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      <div ref={containerRef} style={containerStyle}>
        <svg
          width={graph.width}
          height={graph.height}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        >
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 7"
              refX="10"
              refY="3.5"
              markerWidth="8"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#6B7280" />
            </marker>
            <marker
              id="arrow-active"
              viewBox="0 0 10 7"
              refX="10"
              refY="3.5"
              markerWidth="8"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#EF4444" />
            </marker>
            <marker
              id="arrow-highlight"
              viewBox="0 0 10 7"
              refX="10"
              refY="3.5"
              markerWidth="8"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#3B82F6" />
            </marker>
          </defs>

          {graph.edges.map((edge, i) => {
            const fromNode = nodeMap.get(edge.from);
            const toNode = nodeMap.get(edge.to);
            if (!fromNode || !toNode) return null;

            const highlighted = isEdgeHighlighted(edge);
            const color = highlighted ? '#3B82F6' : edge.resolved ? '#4B5563' : '#EF4444';
            const marker = highlighted
              ? 'url(#arrow-highlight)'
              : edge.resolved
              ? 'url(#arrow)'
              : 'url(#arrow-active)';

            return (
              <path
                key={i}
                d={edgePath(fromNode, toNode)}
                fill="none"
                stroke={color}
                strokeWidth={highlighted ? 2.5 : 1.5}
                strokeDasharray={edge.resolved ? '6 3' : undefined}
                markerEnd={marker}
                opacity={hoveredNodeId && !highlighted ? 0.2 : 1}
              />
            );
          })}
        </svg>

        {graph.nodes.map((node) => {
          const task = node.task;
          const status = (task as TaskDTO & { status?: { name: string; color: string } }).status;
          const priorityColor = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG]?.color || 'transparent';
          const dimmed = hoveredNodeId !== null && hoveredNodeId !== task.id &&
            !graph.edges.some((e) => (e.from === task.id || e.to === task.id) && (e.from === hoveredNodeId || e.to === hoveredNodeId));

          return (
            <div
              key={task.id}
              style={{
                ...nodeStyle,
                left: node.x,
                top: node.y,
                borderLeftColor: status?.color || '#6B7280',
                opacity: dimmed ? 0.3 : 1,
                transform: hoveredNodeId === task.id ? 'scale(1.04)' : undefined,
              }}
              onClick={() => handleNodeClick(task)}
              onMouseEnter={() => setHoveredNodeId(task.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
            >
              <div style={nodeTitleRow}>
                {priorityColor !== 'transparent' && (
                  <span style={{ ...priorityDot, backgroundColor: priorityColor }} />
                )}
                <span style={nodeTitleStyle}>{task.title}</span>
              </div>
              {status && (
                <span style={{ ...statusBadge, backgroundColor: status.color + '22', color: status.color }}>
                  {status.name}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <TaskDetailModal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        projectId={projectId}
        task={selectedTask}
        mode="edit"
      />
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const wrapperStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  position: 'relative',
};

const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  overflow: 'auto',
  position: 'relative',
};

const emptyStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  gap: 4,
};

const nodeStyle: React.CSSProperties = {
  position: 'absolute',
  width: NODE_W,
  height: NODE_H,
  borderRadius: 8,
  backgroundColor: '#1F2937',
  border: '1px solid #374151',
  borderLeftWidth: 4,
  borderLeftStyle: 'solid',
  padding: '8px 10px',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: 4,
  transition: 'opacity 0.15s, transform 0.15s, box-shadow 0.15s',
  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  zIndex: 1,
};

const nodeTitleRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  overflow: 'hidden',
};

const nodeTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: '#F3F4F6',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const priorityDot: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  flexShrink: 0,
};

const statusBadge: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  borderRadius: 4,
  padding: '1px 6px',
  alignSelf: 'flex-start',
};
