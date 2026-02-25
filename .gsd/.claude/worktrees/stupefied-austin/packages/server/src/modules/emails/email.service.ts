import { Resend } from 'resend';
import { env } from '../../config/env.js';
import logger from '../../utils/logger.js';
import {
  passwordResetEmailHtml,
  emailVerificationHtml,
  projectInviteHtml,
  taskAssignmentHtml,
  taskUpdatedHtml,
  taskCommentedHtml,
  dueDateReminderHtml,
} from './email-templates.js';

// ──────────────────────────────────────────────
// Resend client (lazy-initialized to allow mocking in tests)
// ──────────────────────────────────────────────

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

/** Override the Resend client (for testing). */
export function setResendClient(client: Resend | null): void {
  resendClient = client;
}

// ──────────────────────────────────────────────
// Email Service
// ──────────────────────────────────────────────

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

async function sendEmail(to: string, subject: string, html: string): Promise<SendEmailResult> {
  if (!env.RESEND_API_KEY) {
    logger.warn(`Email not sent (no RESEND_API_KEY configured): to=${to}, subject=${subject}`);
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const result = await getResend().emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    if (result.error) {
      logger.error(`Failed to send email: ${result.error.message}`);
      return { success: false, error: result.error.message };
    }

    logger.info(`Email sent: to=${to}, subject=${subject}, id=${result.data?.id}`);
    return { success: true, messageId: result.data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Email send error: ${message}`);
    return { success: false, error: message };
  }
}

export const emailService = {
  /**
   * Send a password reset email with a tokenized link.
   */
  async sendPasswordReset(to: string, displayName: string, resetToken: string): Promise<SendEmailResult> {
    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;
    const html = passwordResetEmailHtml(resetUrl, displayName);
    return sendEmail(to, 'Reset Your Password — GSD', html);
  },

  /**
   * Send an email verification link after registration.
   */
  async sendEmailVerification(to: string, displayName: string, verificationToken: string): Promise<SendEmailResult> {
    const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${verificationToken}`;
    const html = emailVerificationHtml(verifyUrl, displayName);
    return sendEmail(to, 'Verify Your Email — GSD', html);
  },

  /**
   * Send a project invite notification email.
   */
  async sendProjectInvite(
    to: string,
    recipientName: string,
    inviterName: string,
    projectName: string,
    projectId: string,
  ): Promise<SendEmailResult> {
    const inviteUrl = `${env.CLIENT_URL}/projects/${projectId}`;
    const html = projectInviteHtml(inviteUrl, inviterName, projectName, recipientName);
    return sendEmail(to, `${inviterName} invited you to ${projectName} — GSD`, html);
  },

  /**
   * Send a task assignment notification email.
   */
  async sendTaskAssignment(
    to: string,
    recipientName: string,
    assignerName: string,
    taskTitle: string,
    projectName: string,
    projectId: string,
    taskId: string,
  ): Promise<SendEmailResult> {
    const taskUrl = `${env.CLIENT_URL}/projects/${projectId}/tasks/${taskId}`;
    const html = taskAssignmentHtml(taskUrl, assignerName, taskTitle, projectName, recipientName);
    return sendEmail(to, `New task: ${taskTitle} — GSD`, html);
  },

  /**
   * Send a task updated notification email.
   */
  async sendTaskUpdated(
    to: string,
    recipientName: string,
    updaterName: string,
    taskTitle: string,
    projectName: string,
    projectId: string,
    taskId: string,
  ): Promise<SendEmailResult> {
    const taskUrl = `${env.CLIENT_URL}/projects/${projectId}/tasks/${taskId}`;
    const html = taskUpdatedHtml(taskUrl, updaterName, taskTitle, projectName, recipientName);
    return sendEmail(to, `Task updated: ${taskTitle} — GSD`, html);
  },

  /**
   * Send a task commented notification email.
   */
  async sendTaskCommented(
    to: string,
    recipientName: string,
    commenterName: string,
    taskTitle: string,
    projectName: string,
    projectId: string,
    taskId: string,
    commentPreview: string,
  ): Promise<SendEmailResult> {
    const taskUrl = `${env.CLIENT_URL}/projects/${projectId}/tasks/${taskId}`;
    const preview = commentPreview.length > 200 ? commentPreview.slice(0, 200) + '...' : commentPreview;
    const html = taskCommentedHtml(taskUrl, commenterName, taskTitle, projectName, recipientName, preview);
    return sendEmail(to, `New comment on: ${taskTitle} — GSD`, html);
  },

  /**
   * Send a due date reminder email.
   */
  async sendDueDateReminder(
    to: string,
    recipientName: string,
    taskTitle: string,
    projectName: string,
    projectId: string,
    taskId: string,
    dueDate: string,
  ): Promise<SendEmailResult> {
    const taskUrl = `${env.CLIENT_URL}/projects/${projectId}/tasks/${taskId}`;
    const html = dueDateReminderHtml(taskUrl, taskTitle, projectName, recipientName, dueDate);
    return sendEmail(to, `Reminder: ${taskTitle} is due ${dueDate} — GSD`, html);
  },
};

export default emailService;
