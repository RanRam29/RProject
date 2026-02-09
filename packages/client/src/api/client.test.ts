import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock env before importing the client module
vi.mock('../config/env', () => ({
  env: { API_URL: 'http://test-api' },
}));

import apiClient from './client';

// Helper to extract the registered interceptor handler functions from the axios instance.
// Axios stores interceptors internally as { fulfilled, rejected } objects in a handlers array.
function getRequestInterceptor() {
  const handlers = (apiClient.interceptors.request as any).handlers;
  // Find the first non-null handler (axios may leave null slots after ejection)
  const handler = handlers.find((h: any) => h !== null);
  return handler;
}

function getResponseInterceptor() {
  const handlers = (apiClient.interceptors.response as any).handlers;
  const handler = handlers.find((h: any) => h !== null);
  return handler;
}

describe('apiClient', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    // Replace window.location with a writable mock so we can track href assignments.
    // jsdom does not implement navigation, so assigning window.location.href is a no-op.
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: originalLocation.href },
    });
  });

  afterEach(() => {
    // Restore original window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  describe('client configuration', () => {
    it('has correct baseURL', () => {
      expect(apiClient.defaults.baseURL).toBe('http://test-api');
    });

    it('has Content-Type set to application/json', () => {
      expect(apiClient.defaults.headers['Content-Type']).toBe(
        'application/json'
      );
    });
  });

  describe('request interceptor', () => {
    it('adds Authorization header when accessToken exists in localStorage', () => {
      localStorage.setItem('accessToken', 'my-test-token');

      const interceptor = getRequestInterceptor();
      const config = { headers: {} as Record<string, string> };
      const result = interceptor.fulfilled(config);

      expect(result.headers.Authorization).toBe('Bearer my-test-token');
    });

    it('does not add Authorization header when no accessToken in localStorage', () => {
      const interceptor = getRequestInterceptor();
      const config = { headers: {} as Record<string, string> };
      const result = interceptor.fulfilled(config);

      expect(result.headers.Authorization).toBeUndefined();
    });

    it('returns the config object', () => {
      const interceptor = getRequestInterceptor();
      const config = { headers: {} as Record<string, string>, url: '/test' };
      const result = interceptor.fulfilled(config);

      expect(result).toBe(config);
      expect(result.url).toBe('/test');
    });
  });

  describe('response interceptor', () => {
    it('passes successful responses through unchanged', () => {
      const interceptor = getResponseInterceptor();
      const response = { status: 200, data: { message: 'ok' } };

      const result = interceptor.fulfilled(response);
      expect(result).toBe(response);
    });

    it('rejects non-401 errors as-is', async () => {
      const interceptor = getResponseInterceptor();
      const error = {
        config: { headers: {} },
        response: { status: 500 },
        message: 'Internal Server Error',
      };

      await expect(interceptor.rejected(error)).rejects.toBe(error);
    });

    it('rejects errors with no response (network errors) as-is', async () => {
      const interceptor = getResponseInterceptor();
      const error = {
        config: { headers: {} },
        response: undefined,
        message: 'Network Error',
      };

      await expect(interceptor.rejected(error)).rejects.toBe(error);
    });

    it('does not retry a 401 when _retry is already set (prevents infinite loop)', async () => {
      const interceptor = getResponseInterceptor();
      const error = {
        config: { headers: {}, _retry: true },
        response: { status: 401 },
      };

      await expect(interceptor.rejected(error)).rejects.toBe(error);
    });

    it('clears tokens via store logout when refresh token is missing on 401', async () => {
      localStorage.setItem('accessToken', 'expired-token');
      // No refreshToken set in localStorage

      const interceptor = getResponseInterceptor();
      const error = {
        config: { headers: {} },
        response: { status: 401 },
      };

      await expect(interceptor.rejected(error)).rejects.toBe(error);

      // Store logout clears localStorage tokens
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });

    it('clears tokens via store logout when refresh request fails', async () => {
      localStorage.setItem('accessToken', 'expired-token');
      localStorage.setItem('refreshToken', 'bad-refresh-token');

      // Mock axios.post to simulate a failed refresh call.
      // The client.ts file imports axios directly and uses axios.post for the refresh.
      const axios = await import('axios');
      vi.spyOn(axios.default, 'post').mockRejectedValueOnce(
        new Error('Refresh failed')
      );

      const interceptor = getResponseInterceptor();
      const error = {
        config: { headers: {} },
        response: { status: 401 },
      };

      await expect(interceptor.rejected(error)).rejects.toBe(error);

      // Store logout clears localStorage tokens
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });

    it('refreshes token and updates localStorage on 401 with valid refresh token', async () => {
      localStorage.setItem('accessToken', 'expired-token');
      localStorage.setItem('refreshToken', 'valid-refresh-token');

      const axios = await import('axios');
      vi.spyOn(axios.default, 'post').mockResolvedValueOnce({
        data: {
          data: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
          },
        },
      });

      // Also mock the apiClient call that retries the original request
      // so it does not actually make a network request.
      const requestSpy = vi
        .spyOn(apiClient, 'request')
        .mockResolvedValueOnce({ data: 'retried-response' });

      const interceptor = getResponseInterceptor();
      const error = {
        config: { headers: {}, url: '/some-endpoint', method: 'get' },
        response: { status: 401 },
      };

      // The interceptor calls apiClient(originalRequest) which calls apiClient.request
      // We need to mock the callable behavior of apiClient
      // Since apiClient is an AxiosInstance (callable), the retry goes through the adapter.
      // Let's mock the adapter instead for a cleaner test.
      requestSpy.mockRestore();

      const adapterSpy = vi.fn().mockResolvedValueOnce({
        status: 200,
        data: 'retried-response',
        headers: {},
        config: error.config,
        statusText: 'OK',
      });
      apiClient.defaults.adapter = adapterSpy;

      try {
        await interceptor.rejected(error);
      } catch {
        // The retry may still go through interceptors, which is fine
      }

      // Verify tokens were updated in localStorage
      expect(localStorage.getItem('accessToken')).toBe('new-access-token');
      expect(localStorage.getItem('refreshToken')).toBe('new-refresh-token');

      // Verify the refresh endpoint was called with the correct refresh token
      expect(axios.default.post).toHaveBeenCalledWith(
        'http://test-api/auth/refresh',
        { refreshToken: 'valid-refresh-token' }
      );

      // Clean up adapter override
      delete (apiClient.defaults as any).adapter;
    });

    it('sets _retry flag on originalRequest during 401 handling', async () => {
      localStorage.setItem('refreshToken', 'some-token');

      const axios = await import('axios');
      vi.spyOn(axios.default, 'post').mockRejectedValueOnce(
        new Error('Refresh failed')
      );

      const interceptor = getResponseInterceptor();
      const originalConfig = { headers: {} } as any;
      const error = {
        config: originalConfig,
        response: { status: 401 },
      };

      await expect(interceptor.rejected(error)).rejects.toBe(error);

      // The interceptor should have set _retry = true on the original config
      expect(originalConfig._retry).toBe(true);
    });

    it('sets new Authorization header on the retried request', async () => {
      localStorage.setItem('accessToken', 'expired-token');
      localStorage.setItem('refreshToken', 'valid-refresh-token');

      const axios = await import('axios');
      vi.spyOn(axios.default, 'post').mockResolvedValueOnce({
        data: {
          data: {
            accessToken: 'fresh-token',
            refreshToken: 'fresh-refresh-token',
          },
        },
      });

      // Mock adapter to capture the retried request config
      const adapterSpy = vi.fn().mockResolvedValueOnce({
        status: 200,
        data: 'ok',
        headers: {},
        config: {},
        statusText: 'OK',
      });
      apiClient.defaults.adapter = adapterSpy;

      const interceptor = getResponseInterceptor();
      const originalConfig = {
        headers: { Authorization: 'Bearer expired-token' },
        url: '/protected',
        method: 'get',
      };
      const error = {
        config: originalConfig,
        response: { status: 401 },
      };

      try {
        await interceptor.rejected(error);
      } catch {
        // May throw if the retry itself triggers interceptors again
      }

      // The original request config should be updated with the fresh token
      expect(originalConfig.headers.Authorization).toBe('Bearer fresh-token');

      // Clean up
      delete (apiClient.defaults as any).adapter;
    });
  });
});
