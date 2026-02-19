import axios from 'axios';
import { env } from '../config/env';
import { useAuthStore } from '../stores/auth.store';
import { getAccessToken, getRefreshToken, setAccessToken } from '../utils/token-storage';

const apiClient = axios.create({
  baseURL: env.API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Refresh-token lock ──────────────────────────────────────
// Prevents concurrent 401 responses from each trying to refresh
// the single-use refresh token (race condition that logs the user out).
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function onRefreshFailed() {
  refreshSubscribers = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(apiClient(originalRequest));
          });
          setTimeout(() => reject(error), 10000);
        });
      }

      isRefreshing = true;

      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token');

        // Use apiClient so the request goes through the Vite dev proxy
        // and picks up the correct base URL in all environments.
        const { data } = await apiClient.post('/auth/refresh', { refreshToken });

        const { accessToken, refreshToken: newRefreshToken } = data.data;
        // Update only the access token in storage; preserve the existing
        // remember-me preference. Also update the refresh token if returned.
        setAccessToken(accessToken);
        if (newRefreshToken) {
          // Store the rotated refresh token using the same storage preference
          const { setTokens } = await import('../utils/token-storage');
          setTokens(accessToken, newRefreshToken);
        }

        onTokenRefreshed(accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch {
        onRefreshFailed();
        useAuthStore.getState().logout();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
