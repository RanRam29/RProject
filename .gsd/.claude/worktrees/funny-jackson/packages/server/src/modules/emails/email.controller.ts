import { Request, Response, NextFunction } from 'express';
import { emailAuthService } from './email-auth.service.js';
import { sendSuccess } from '../../utils/api-response.js';
import { audit } from '../../middleware/audit.middleware.js';

export const emailController = {
  /**
   * POST /auth/forgot-password
   * Request a password reset email.
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const result = await emailAuthService.forgotPassword(email);
      audit(req, 'auth.password_reset_requested', { metadata: { email } });
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /auth/reset-password
   * Reset password using a token.
   */
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, password } = req.body;
      const result = await emailAuthService.resetPassword(token, password);
      audit(req, 'auth.password_reset_completed');
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /auth/verify-email
   * Verify email address using a token.
   */
  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body;
      const result = await emailAuthService.verifyEmail(token);
      audit(req, 'auth.email_verified');
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /auth/resend-verification
   * Resend verification email.
   */
  async resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const result = await emailAuthService.resendVerification(email);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },
};

export default emailController;
