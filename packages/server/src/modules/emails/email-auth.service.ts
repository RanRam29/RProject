import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../../config/db.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/api-error.js';
import logger from '../../utils/logger.js';
import { emailService } from './email.service.js';

const SALT_ROUNDS = 12;
const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000;          // 1 hour
const EMAIL_VERIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESEND_COOLDOWN_MS = 60 * 1000;                      // 1 minute between resends

export const emailAuthService = {
  // ──────────────────────────────────────────
  // PASSWORD RESET
  // ──────────────────────────────────────────

  /**
   * Request a password reset email.
   * Always returns success even if the email doesn't exist (prevents user enumeration).
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Don't reveal whether the email exists
      logger.info(`Password reset requested for non-existent email: ${email}`);
      return { message: 'If an account with that email exists, a password reset link has been sent.' };
    }

    if (!user.isActive) {
      logger.info(`Password reset requested for deactivated account: ${email}`);
      return { message: 'If an account with that email exists, a password reset link has been sent.' };
    }

    // Invalidate any existing unused reset tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(), // Mark as used so they can't be reused
      },
    });

    // Create a new reset token
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // Send the email (fire-and-forget, don't fail the request if email fails)
    emailService.sendPasswordReset(user.email, user.displayName, token).catch((err) => {
      logger.error(`Failed to send password reset email to ${user.email}: ${err}`);
    });

    logger.info(`Password reset token created for user: ${user.email}`);
    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  },

  /**
   * Reset password using a valid token.
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      throw ApiError.badRequest('Invalid or expired reset token');
    }

    if (resetToken.usedAt) {
      throw ApiError.badRequest('This reset token has already been used');
    }

    if (resetToken.expiresAt < new Date()) {
      throw ApiError.badRequest('This reset token has expired');
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password and mark token as used in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate all refresh tokens (force re-login on all devices)
      prisma.refreshToken.deleteMany({
        where: { userId: resetToken.userId },
      }),
    ]);

    logger.info(`Password reset successfully for user: ${resetToken.user.email}`);
    return { message: 'Password has been reset successfully. Please log in with your new password.' };
  },

  // ──────────────────────────────────────────
  // EMAIL VERIFICATION
  // ──────────────────────────────────────────

  /**
   * Create and send an email verification token for a user.
   * Called after registration.
   */
  async sendVerificationEmail(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (user.emailVerified) {
      logger.info(`Email already verified for user: ${user.email}`);
      return;
    }

    // Check for recent verification token to prevent spam
    const recentToken = await prisma.emailVerificationToken.findFirst({
      where: {
        userId,
        usedAt: null,
        createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) },
      },
    });

    if (recentToken) {
      throw ApiError.tooManyRequests('A verification email was sent recently. Please wait before requesting another.');
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MS);

    await prisma.emailVerificationToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });

    emailService.sendEmailVerification(user.email, user.displayName, token).catch((err) => {
      logger.error(`Failed to send verification email to ${user.email}: ${err}`);
    });

    logger.info(`Verification email sent to: ${user.email}`);
  },

  /**
   * Verify email using a valid token.
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verificationToken) {
      throw ApiError.badRequest('Invalid or expired verification token');
    }

    if (verificationToken.usedAt) {
      throw ApiError.badRequest('This verification token has already been used');
    }

    if (verificationToken.expiresAt < new Date()) {
      throw ApiError.badRequest('This verification token has expired');
    }

    if (verificationToken.user.emailVerified) {
      return { message: 'Email is already verified.' };
    }

    // Mark email as verified and token as used in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerified: true },
      }),
      prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    logger.info(`Email verified for user: ${verificationToken.user.email}`);
    return { message: 'Email verified successfully.' };
  },

  /**
   * Resend verification email by email address (for logged-out users).
   */
  async resendVerification(email: string): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Don't reveal whether the email exists
      return { message: 'If an account with that email exists, a verification link has been sent.' };
    }

    if (user.emailVerified) {
      return { message: 'If an account with that email exists, a verification link has been sent.' };
    }

    // Check cooldown
    const recentToken = await prisma.emailVerificationToken.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
        createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) },
      },
    });

    if (recentToken) {
      throw ApiError.tooManyRequests('A verification email was sent recently. Please wait before requesting another.');
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MS);

    await prisma.emailVerificationToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    emailService.sendEmailVerification(user.email, user.displayName, token).catch((err) => {
      logger.error(`Failed to send verification email to ${user.email}: ${err}`);
    });

    return { message: 'If an account with that email exists, a verification link has been sent.' };
  },
};

export default emailAuthService;
