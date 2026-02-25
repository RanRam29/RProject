import type { TaskDTO, TaskStatusDTO } from '@pm/shared';

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportTasksToCSV(tasks: TaskDTO[], statuses: TaskStatusDTO[], projectName?: string): void {
  const statusMap: Record<string, TaskStatusDTO> = {};
  statuses.forEach((s) => {
    statusMap[s.id] = s;
  });

  const headers = ['Title', 'Status', 'Start Date', 'Due Date', 'Created', 'Updated'];
  const rows = tasks.map((task) => {
    const status = statusMap[task.statusId];
    return [
      escapeCSV(task.title),
      escapeCSV(status?.name || 'Unknown'),
      task.startDate ? new Date(task.startDate).toLocaleDateString() : '',
      task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '',
      new Date(task.createdAt).toLocaleDateString(),
      new Date(task.updatedAt).toLocaleDateString(),
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  downloadFile(csv, `${projectName || 'tasks'}_export.csv`, 'text/csv');
}

export function exportTasksToJSON(tasks: TaskDTO[], statuses: TaskStatusDTO[], projectName?: string): void {
  const statusMap: Record<string, TaskStatusDTO> = {};
  statuses.forEach((s) => {
    statusMap[s.id] = s;
  });

  const exportData = tasks.map((task) => ({
    title: task.title,
    description: task.description,
    status: statusMap[task.statusId]?.name || 'Unknown',
    startDate: task.startDate,
    dueDate: task.dueDate,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  }));

  const json = JSON.stringify(exportData, null, 2);
  downloadFile(json, `${projectName || 'tasks'}_export.json`, 'application/json');
}

function downloadFile(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
