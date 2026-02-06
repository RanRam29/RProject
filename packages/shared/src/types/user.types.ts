import { SystemRole } from '../enums/index.js';

export interface UserDTO {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  systemRole: SystemRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPresenceDTO {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  systemRole: SystemRole;
  iat: number;
  exp: number;
}
