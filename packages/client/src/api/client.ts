import axios from 'axios';
import { env } from '../config/env';
import { useAuthStore } from '../stores/auth.store';
import { getAccessToken, setAccessToken } from '../utils/token-storage';

const apiClient = axios.create({
  baseURL: env.API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Send the httpOnly refreshToken cookie on same-origin requests
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
// the single-use refresh token (which causes a race condition
// where the second refresh fails and logs the user out).
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

      // If another request is already refreshing, queue this one
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(apiClient(originalRequest));
          });
          // Reject after 10s if refresh never completes
          setTimeout(() => reject(error), 10000);
        });
      }

      isRefreshing = true;

      try {
        // The server reads the refreshToken from the httpOnly cookie
        // (withCredentials: true ensures the cookie is sent).
        // No need to send the refresh token in the body.
        const { data } = await apiClient.post('/auth/refresh');

        const { accessToken } = data.data;
        setAccessToken(accessToken);

        // Notify all queued requests with the new token
        onTokenRefreshed(accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch {
        onRefreshFailed();
        // Refresh also failed — clear stale access token and update store
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
