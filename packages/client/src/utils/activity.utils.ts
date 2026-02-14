export const ACTION_LABELS: Record<string, { verb: string; icon: string }> = {
  // Task actions
  'task.created': { verb: 'created a task', icon: '+' },
  'task.updated': { verb: 'updated a task', icon: '~' },
  'task.deleted': { verb: 'deleted a task', icon: '-' },
  'task.status_changed': { verb: 'changed task status', icon: '\u21C4' },
  'task.bulk.move': { verb: 'bulk moved tasks', icon: '\u21C4' },
  'task.bulk.delete': { verb: 'bulk deleted tasks', icon: '-' },
  'task.bulk.assign': { verb: 'bulk assigned tasks', icon: '\u2192' },
  'task.bulk.setPriority': { verb: 'bulk set priority', icon: '!' },
  // Comment actions
  'comment.created': { verb: 'commented on a task', icon: '#' },
  // Status actions
  'status.created': { verb: 'created a status', icon: '+' },
  'status.updated': { verb: 'updated a status', icon: '~' },
  'status.deleted': { verb: 'deleted a status', icon: '-' },
  // File actions
  'file.uploaded': { verb: 'uploaded a file', icon: '\u2191' },
  'file.deleted': { verb: 'deleted a file', icon: '-' },
  // Label actions
  'label.created': { verb: 'created a label', icon: '+' },
  'label.deleted': { verb: 'deleted a label', icon: '-' },
  'label.assigned': { verb: 'assigned a label', icon: '\u2192' },
  'label.unassigned': { verb: 'removed a label', icon: '\u2190' },
  // Member actions
  'member.invited': { verb: 'invited a member', icon: '+' },
  'member.role_changed': { verb: 'changed a member role', icon: '~' },
  'member.removed': { verb: 'removed a member', icon: '-' },
  // Project actions
  'project.created': { verb: 'created the project', icon: '+' },
  'project.updated': { verb: 'updated the project', icon: '~' },
  'project.archived': { verb: 'archived the project', icon: '\u2193' },
};

export function formatAction(action: string, metadata: Record<string, unknown>): { verb: string; icon: string; detail: string } {
  const config = ACTION_LABELS[action] || { verb: action, icon: '?' };
  const title = (metadata?.title as string)
    || (metadata?.taskTitle as string)
    || (metadata?.name as string)
    || (metadata?.fileName as string)
    || '';
  return { ...config, detail: title };
}

export function timeAgo(dateStr: string): string {
  const timestamp = new Date(dateStr).getTime();
  
  if (isNaN(timestamp)) {
    return 'Invalid date';
  }
  
  const diff = Date.now() - timestamp;
  
  if (diff < 0) {
    return 'just now';
  }
  
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
