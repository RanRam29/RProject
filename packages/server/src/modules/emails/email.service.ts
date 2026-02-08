import { Resend } from 'resend';
import { env } from '../../config/env.js';
import logger from '../../utils/logger.js';

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
// Email Templates
// ──────────────────────────────────────────────

function passwordResetEmailHtml(resetUrl: string, displayName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;padding:40px;">
          <tr>
            <td>
              <h1 style="color:#18181b;font-size:24px;margin:0 0 16px;">Reset Your Password</h1>
              <p style="color:#3f3f46;font-size:16px;line-height:24px;margin:0 0 24px;">
                Hi ${displayName},
              </p>
              <p style="color:#3f3f46;font-size:16px;line-height:24px;margin:0 0 24px;">
                We received a request to reset your password. Click the button below to create a new password. This link will expire in 1 hour.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background-color:#2563eb;border-radius:6px;padding:12px 24px;">
                    <a href="${resetUrl}" style="color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#71717a;font-size:14px;line-height:20px;margin:0 0 8px;">
                If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
              </p>
              <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;" />
              <p style="color:#a1a1aa;font-size:12px;line-height:16px;margin:0;">
                If the button doesn't work, copy and paste this URL into your browser:<br />
                <a href="${resetUrl}" style="color:#2563eb;word-break:break-all;">${resetUrl}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function emailVerificationHtml(verifyUrl: string, displayName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;padding:40px;">
          <tr>
            <td>
              <h1 style="color:#18181b;font-size:24px;margin:0 0 16px;">Verify Your Email</h1>
              <p style="color:#3f3f46;font-size:16px;line-height:24px;margin:0 0 24px;">
                Hi ${displayName},
              </p>
              <p style="color:#3f3f46;font-size:16px;line-height:24px;margin:0 0 24px;">
                Thanks for signing up! Please verify your email address by clicking the button below. This link will expire in 24 hours.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background-color:#16a34a;border-radius:6px;padding:12px 24px;">
                    <a href="${verifyUrl}" style="color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">
                      Verify Email
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#71717a;font-size:14px;line-height:20px;margin:0 0 8px;">
                If you didn't create an account, you can safely ignore this email.
              </p>
              <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;" />
              <p style="color:#a1a1aa;font-size:12px;line-height:16px;margin:0;">
                If the button doesn't work, copy and paste this URL into your browser:<br />
                <a href="${verifyUrl}" style="color:#16a34a;word-break:break-all;">${verifyUrl}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function projectInviteHtml(inviteUrl: string, inviterName: string, projectName: string, recipientName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Invitation</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;padding:40px;">
          <tr>
            <td>
              <h1 style="color:#18181b;font-size:24px;margin:0 0 16px;">You've Been Invited!</h1>
              <p style="color:#3f3f46;font-size:16px;line-height:24px;margin:0 0 24px;">
                Hi ${recipientName},
              </p>
              <p style="color:#3f3f46;font-size:16px;line-height:24px;margin:0 0 24px;">
                <strong>${inviterName}</strong> has invited you to collaborate on the project <strong>${projectName}</strong>.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background-color:#7c3aed;border-radius:6px;padding:12px 24px;">
                    <a href="${inviteUrl}" style="color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">
                      View Project
                    </a>
                  </td>
                </tr>
              </table>
              <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;" />
              <p style="color:#a1a1aa;font-size:12px;line-height:16px;margin:0;">
                If the button doesn't work, copy and paste this URL into your browser:<br />
                <a href="${inviteUrl}" style="color:#7c3aed;word-break:break-all;">${inviteUrl}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function taskAssignmentHtml(taskUrl: string, assignerName: string, taskTitle: string, projectName: string, recipientName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Task Assigned to You</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;padding:40px;">
          <tr>
            <td>
              <h1 style="color:#18181b;font-size:24px;margin:0 0 16px;">New Task Assigned</h1>
              <p style="color:#3f3f46;font-size:16px;line-height:24px;margin:0 0 24px;">
                Hi ${recipientName},
              </p>
              <p style="color:#3f3f46;font-size:16px;line-height:24px;margin:0 0 24px;">
                <strong>${assignerName}</strong> assigned you a task in <strong>${projectName}</strong>:
              </p>
              <div style="background-color:#f4f4f5;border-radius:6px;padding:16px;margin:0 0 24px;">
                <p style="color:#18181b;font-size:16px;font-weight:600;margin:0;">${taskTitle}</p>
              </div>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background-color:#2563eb;border-radius:6px;padding:12px 24px;">
                    <a href="${taskUrl}" style="color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">
                      View Task
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
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
};

export default emailService;
