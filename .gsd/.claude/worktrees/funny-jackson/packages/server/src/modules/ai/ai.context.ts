import prisma from '../../config/db.js';

export interface ProjectContext {
  projectName: string;
  projectDescription: string | null;
  statuses: Array<{ id: string; name: string; isFinal: boolean; taskCount: number }>;
  members: Array<{ id: string; displayName: string; role: string }>;
  taskSummary: {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    overdue: number;
    unassigned: number;
    completionRate: number;
  };
  recentTasks: Array<{
    title: string;
    status: string;
    priority: string;
    assignee: string | null;
    dueDate: string | null;
  }>;
}

export async function buildProjectContext(projectId: string): Promise<ProjectContext> {
  const [project, statuses, members, tasks] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true, description: true },
    }),
    prisma.taskStatus.findMany({
      where: { projectId },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.projectPermission.findMany({
      where: { projectId },
      include: { user: { select: { id: true, displayName: true } } },
    }),
    prisma.task.findMany({
      where: { projectId },
      include: {
        status: { select: { name: true, isFinal: true } },
        assignee: { select: { displayName: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    }),
  ]);

  // Build status info with task counts
  const statusTaskCounts: Record<string, number> = {};
  tasks.forEach((t) => {
    statusTaskCounts[t.statusId] = (statusTaskCounts[t.statusId] || 0) + 1;
  });

  const statusList = statuses.map((s) => ({
    id: s.id,
    name: s.name,
    isFinal: s.isFinal,
    taskCount: statusTaskCounts[s.id] || 0,
  }));

  // Build task summary
  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  let overdue = 0;
  let unassigned = 0;
  let completed = 0;

  const now = new Date();
  tasks.forEach((t) => {
    const statusName = t.status.name;
    byStatus[statusName] = (byStatus[statusName] || 0) + 1;
    byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;

    if (t.status.isFinal) completed++;
    if (!t.assigneeId) unassigned++;
    if (t.dueDate && new Date(t.dueDate) < now && !t.status.isFinal) overdue++;
  });

  const total = tasks.length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Recent tasks for context (up to 50)
  const recentTasks = tasks.slice(0, 50).map((t) => ({
    title: t.title,
    status: t.status.name,
    priority: t.priority,
    assignee: t.assignee?.displayName || null,
    dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
  }));

  return {
    projectName: project?.name || 'Unknown Project',
    projectDescription: project?.description || null,
    statuses: statusList,
    members: members.map((m) => ({
      id: m.user.id,
      displayName: m.user.displayName,
      role: m.role,
    })),
    taskSummary: {
      total,
      byStatus,
      byPriority,
      overdue,
      unassigned,
      completionRate,
    },
    recentTasks,
  };
}
