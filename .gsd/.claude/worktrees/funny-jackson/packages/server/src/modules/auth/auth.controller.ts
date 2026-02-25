import { Request, Response, NextFunction } from 'express';
import { authService, generateFingerprint } from './auth.service.js';
import { sendSuccess } from '../../utils/api-response.js';
import { audit } from '../../middleware/audit.middleware.js';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function getFingerprint(req: Request): string {
  const ua = req.headers['user-agent'] || 'unknown';
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return generateFingerprint(ua, ip);
}

function setRefreshTokenCookie(res: Response, refreshToken: string): void {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? 'strict' : 'lax',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? 'strict' : 'lax',
    path: '/api/v1/auth',
  });
}

export const authController = {
  /** Public registration is only allowed when no users exist (initial system setup).
   *  After the first admin user is created, new users must be created by a SYS_ADMIN
   *  via the admin panel (POST /users). */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, displayName } = req.body;

      // Check if any user exists — if so, block self-registration
      const userCount = await authService.getUserCount();
      if (userCount > 0) {
        res.status(403).json({
          success: false,
          error: 'Self-registration is disabled. Please contact your system administrator.',
        });
        return;
      }

      const fingerprint = getFingerprint(req);
      // First user is always SYS_ADMIN
      const result = await authService.register(email, password, displayName, fingerprint, 'SYS_ADMIN');
      audit(req, 'auth.register', { targetId: result.user.id });
      setRefreshTokenCookie(res, result.tokens.refreshToken);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  },

  /** Check if the system has any users — used by the client to decide whether
   *  to show the registration page or the login page. */
  async checkSetup(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userCount = await authService.getUserCount();
      sendSuccess(res, { needsSetup: userCount === 0 });
    } catch (error) {
      next(error);
    }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const fingerprint = getFingerprint(req);
      const result = await authService.login(email, password, ip, fingerprint);
      audit(req, 'auth.login', { targetId: result.user.id });
      setRefreshTokenCookie(res, result.tokens.refreshToken);
      sendSuccess(res, result);
    } catch (error) {
      audit(req, 'auth.login_failed', { metadata: { email: req.body?.email } });
      next(error);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Accept refresh token from body OR httpOnly cookie
      const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
      if (!refreshToken) {
        res.status(400).json({ success: false, error: 'Refresh token is required' });
        return;
      }
      const fingerprint = getFingerprint(req);
      const tokens = await authService.refreshToken(refreshToken, fingerprint);
      audit(req, 'auth.token_refresh');
      setRefreshTokenCookie(res, tokens.refreshToken);
      sendSuccess(res, tokens);
    } catch (error) {
      next(error);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.sub;
      await authService.logout(userId);
      audit(req, 'auth.logout', { targetId: userId });
      clearRefreshTokenCookie(res);
      sendSuccess(res, { message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  },

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.sub;
      const user = await authService.getMe(userId);
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  },
};

export default authController;
