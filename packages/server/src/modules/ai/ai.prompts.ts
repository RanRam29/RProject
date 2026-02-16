import type { ProjectContext } from './ai.context.js';

export function buildSystemPrompt(context: ProjectContext): string {
  const statusLines = context.statuses
    .map((s) => `- "${s.name}" (${s.isFinal ? 'DONE' : 'active'}) — ${s.taskCount} tasks`)
    .join('\n');

  const memberLines = context.members
    .map((m) => `- ${m.displayName} (${m.role})`)
    .join('\n');

  const taskLines = context.recentTasks
    .map(
      (t) =>
        `- [${t.priority}] "${t.title}" | Status: ${t.status} | Assignee: ${t.assignee || 'unassigned'} | Due: ${t.dueDate || 'none'}`,
    )
    .join('\n');

  return `You are an AI project management assistant for the project "${context.projectName}" in the GSD (Get Stuff Done) application.

${context.projectDescription ? `PROJECT DESCRIPTION:\n${context.projectDescription}\n` : ''}
WORKFLOW STATUSES (in pipeline order):
${statusLines}

TEAM MEMBERS:
${memberLines}

TASK STATISTICS:
- Total tasks: ${context.taskSummary.total}
- Completion rate: ${context.taskSummary.completionRate}%
- Overdue: ${context.taskSummary.overdue}
- Unassigned: ${context.taskSummary.unassigned}
- By priority: ${Object.entries(context.taskSummary.byPriority).map(([k, v]) => `${k}: ${v}`).join(', ')}

RECENT TASKS (${context.recentTasks.length} most recently updated):
${taskLines || '(no tasks yet)'}

YOUR GUIDELINES:
- Be concise and actionable. Use markdown formatting (bold, lists, headers).
- Reference team members by name when relevant.
- When users want to create tasks, extract: title, priority (URGENT/HIGH/MEDIUM/LOW/NONE), due date, and assignee if mentioned.
- Prioritize pragmatic advice over generic project management theory.
- If asked about something outside the project data, be helpful but note the limitation.`;
}
