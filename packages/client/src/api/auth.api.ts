import apiClient from './client';
import type {
  AuthTokens,
  LoginRequest,
  RegisterRequest,
  UserDTO,
  ApiResponse,
} from '@pm/shared';

export const authApi = {
  async register(data: RegisterRequest): Promise<{ user: UserDTO; tokens: AuthTokens }> {
    const res = await apiClient.post<ApiResponse<{ user: UserDTO; tokens: AuthTokens }>>(
      '/auth/register',
      data
    );
    return res.data.data!;
  },

  async login(data: LoginRequest): Promise<{ user: UserDTO; tokens: AuthTokens }> {
    const res = await apiClient.post<ApiResponse<{ user: UserDTO; tokens: AuthTokens }>>(
      '/auth/login',
      data
    );
    return res.data.data!;
  },

  async refresh(): Promise<AuthTokens> {
    // Refresh token is sent automatically via the httpOnly cookie (withCredentials).
    const res = await apiClient.post<ApiResponse<AuthTokens>>('/auth/refresh');
    return res.data.data!;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async me(): Promise<UserDTO> {
    const res = await apiClient.get<ApiResponse<UserDTO>>('/auth/me');
    return res.data.data!;
  },

  async checkSetup(): Promise<{ needsSetup: boolean }> {
    const res = await apiClient.get<ApiResponse<{ needsSetup: boolean }>>('/auth/setup-check');
    return res.data.data!;
  },
};
