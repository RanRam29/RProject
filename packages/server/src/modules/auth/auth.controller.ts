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
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, displayName } = req.body;
      const fingerprint = getFingerprint(req);
      const result = await authService.register(email, password, displayName, fingerprint);
      audit(req, 'auth.register', { targetId: result.user.id });
      setRefreshTokenCookie(res, result.tokens.refreshToken);
      sendSuccess(res, result, 201);
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
