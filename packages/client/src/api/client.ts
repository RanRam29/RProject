import axios from 'axios';
import { env } from '../config/env';
import { useAuthStore } from '../stores/auth.store';
import { getAccessToken, setAccessToken } from '../utils/token-storage';

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

    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
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
        // No body needed — the httpOnly refresh-token cookie is sent
        // automatically by the browser because withCredentials is true.
        // Use apiClient so the request goes through the Vite dev proxy
        // and picks up the correct base URL in all environments.
        const { data } = await apiClient.post('/auth/refresh');

        const { accessToken } = data.data;
        setAccessToken(accessToken);

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

    if (error.response?.status === 429) {
      // If we hit a rate limit, standard API calls should fail immediately
      // without triggering retry loops or mass-logout cascades.
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
