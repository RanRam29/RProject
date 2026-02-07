import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import prisma from '../../config/db.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/api-error.js';
import logger from '../../utils/logger.js';

const SALT_ROUNDS = 12;

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface UserPayload {
  id: string;
  email: string;
  systemRole: string;
}

interface AuthResult {
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    systemRole: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  tokens: TokenPair;
}

function excludePasswordHash(user: {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  avatarUrl: string | null;
  systemRole: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

function parseExpiresIn(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${expiresIn}`);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Unknown time unit: ${unit}`);
  }
}

async function generateTokens(user: UserPayload): Promise<TokenPair> {
  const accessToken = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      systemRole: user.systemRole,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
  );

  const refreshTokenValue = randomUUID();
  const refreshExpiresMs = parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN);
  const expiresAt = new Date(Date.now() + refreshExpiresMs);

  await prisma.refreshToken.create({
    data: {
      token: refreshTokenValue,
      userId: user.id,
      expiresAt,
    },
  });

  return {
    accessToken,
    refreshToken: refreshTokenValue,
  };
}

export const authService = {
  async register(
    email: string,
    password: string,
    displayName: string,
  ): Promise<AuthResult> {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw ApiError.conflict('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
      },
    });

    logger.info(`User registered: ${user.email}`);

    const tokens = await generateTokens({
      id: user.id,
      email: user.email,
      systemRole: user.systemRole,
    });

    return {
      user: excludePasswordHash(user),
      tokens,
    };
  },

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw ApiError.unauthorized('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    logger.info(`User logged in: ${user.email}`);

    const tokens = await generateTokens({
      id: user.id,
      email: user.email,
      systemRole: user.systemRole,
    });

    return {
      user: excludePasswordHash(user),
      tokens,
    };
  },

  async refreshToken(token: string): Promise<TokenPair> {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!storedToken) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw ApiError.unauthorized('Refresh token has expired');
    }

    // Delete the old refresh token (single-use rotation)
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    const tokens = await generateTokens({
      id: storedToken.user.id,
      email: storedToken.user.email,
      systemRole: storedToken.user.systemRole,
    });

    logger.info(`Token refreshed for user: ${storedToken.user.email}`);

    return tokens;
  },

  async logout(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    logger.info(`User logged out, all refresh tokens revoked: ${userId}`);
  },

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return excludePasswordHash(user);
  },
};

export default authService;
