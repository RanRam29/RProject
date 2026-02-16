import prisma from '../../config/db.js';
import { emailService } from './email.service.js';
import { notificationsService } from '../notifications/notifications.service.js';
import logger from '../../utils/logger.js';

const REMINDER_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const REMINDER_WINDOW_HOURS = 24; // Remind for tasks due within 24 hours

/**
 * Check for tasks with upcoming due dates and send reminder notifications.
 * Uses the notification metadata to track which reminders have already been sent.
 */
async function checkDueDateReminders(): Promise<void> {
  try {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);

    // Find tasks that:
    // 1. Have a due date within the next 24 hours
    // 2. Are not completed (status is not final)
    // 3. Have an assignee
    const tasks = await prisma.task.findMany({
      where: {
        dueDate: {
          gte: now,
          lte: windowEnd,
        },
        status: {
          isFinal: false,
        },
        assigneeId: {
          not: null,
        },
      },
      include: {
        assignee: {
          select: { id: true, email: true, displayName: true, emailNotifications: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    if (tasks.length === 0) return;

    // Check which tasks already had a reminder sent (look for existing notification)
    for (const task of tasks) {
      if (!task.assignee || !task.assigneeId) continue;

      // Check if a due date reminder notification already exists for this task
      const existingReminder = await prisma.notification.findFirst({
        where: {
          userId: task.assigneeId,
          taskId: task.id,
          type: 'TASK_UPDATED',
          metadata: {
            path: ['isDueDateReminder'],
            equals: true,
          },
        },
      });

      if (existingReminder) continue; // Already sent

      // Create in-app notification with metadata marker
      const dueDateStr = task.dueDate
        ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'soon';

      await notificationsService.create({
        userId: task.assigneeId,
        type: 'TASK_UPDATED',
        title: `"${task.title}" is due ${dueDateStr}`,
        body: `Your task in ${task.project.name} is due soon.`,
        projectId: task.project.id,
        taskId: task.id,
        metadata: { isDueDateReminder: true },
      });

      // Send email directly (notification service will also try, but we want the specific due date template)
      if (task.assignee.emailNotifications) {
        emailService.sendDueDateReminder(
          task.assignee.email,
          task.assignee.displayName,
          task.title,
          task.project.name,
          task.project.id,
          task.id,
          dueDateStr,
        ).catch((err) => {
          logger.error(`Failed to send due date reminder email for task ${task.id}: ${err}`);
        });
      }
    }

    logger.info(`Due date reminder check completed: ${tasks.length} tasks checked`);
  } catch (err) {
    logger.error(`Due date reminder check failed: ${err instanceof Error ? err.message : err}`);
  }
}

let reminderInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the due date reminder scheduler.
 * Runs immediately on startup, then every hour.
 */
export function startDueDateReminders(): void {
  // Run once on startup after a short delay (let DB connections settle)
  setTimeout(() => {
    checkDueDateReminders();
  }, 10_000);

  // Then run every hour
  reminderInterval = setInterval(checkDueDateReminders, REMINDER_INTERVAL_MS);
  logger.info('Due date reminder scheduler started (every 1 hour)');
}

/**
 * Stop the due date reminder scheduler.
 */
export function stopDueDateReminders(): void {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
    logger.info('Due date reminder scheduler stopped');
  }
}
