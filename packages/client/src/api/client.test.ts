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
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: originalLocation.href },
    });
  });

  afterEach(() => {
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

    it('has withCredentials enabled for cookie support', () => {
      expect(apiClient.defaults.withCredentials).toBe(true);
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

    it('clears access token via store logout when refresh request fails', async () => {
      localStorage.setItem('accessToken', 'expired-token');

      // Mock the adapter to simulate a failed /auth/refresh call
      const adapterSpy = vi.fn().mockRejectedValueOnce(
        Object.assign(new Error('Refresh failed'), {
          response: { status: 401 },
          config: { url: '/auth/refresh', headers: {}, _retry: true },
        })
      );
      apiClient.defaults.adapter = adapterSpy;

      const interceptor = getResponseInterceptor();
      const error = {
        config: { headers: {} },
        response: { status: 401 },
      };

      await expect(interceptor.rejected(error)).rejects.toBe(error);

      // Store logout clears the access token
      expect(localStorage.getItem('accessToken')).toBeNull();

      delete (apiClient.defaults as any).adapter;
    });

    it('refreshes token via cookie and updates localStorage on 401', async () => {
      localStorage.setItem('accessToken', 'expired-token');

      // First adapter call: /auth/refresh → returns new tokens
      // Second adapter call: retry of original request → succeeds
      const adapterSpy = vi
        .fn()
        .mockResolvedValueOnce({
          status: 200,
          data: { data: { accessToken: 'new-access-token', refreshToken: 'new-refresh-token' } },
          headers: {},
          config: {},
          statusText: 'OK',
        })
        .mockResolvedValueOnce({
          status: 200,
          data: 'retried-response',
          headers: {},
          config: {},
          statusText: 'OK',
        });
      apiClient.defaults.adapter = adapterSpy;

      const interceptor = getResponseInterceptor();
      const error = {
        config: { headers: {}, url: '/some-endpoint', method: 'get' },
        response: { status: 401 },
      };

      await interceptor.rejected(error);

      // Verify access token was updated in localStorage
      expect(localStorage.getItem('accessToken')).toBe('new-access-token');

      delete (apiClient.defaults as any).adapter;
    });

    it('sets _retry flag on originalRequest during 401 handling', async () => {
      const adapterSpy = vi.fn().mockRejectedValueOnce(
        Object.assign(new Error('Refresh failed'), {
          response: { status: 401 },
          config: { url: '/auth/refresh', headers: {}, _retry: true },
        })
      );
      apiClient.defaults.adapter = adapterSpy;

      const interceptor = getResponseInterceptor();
      const originalConfig = { headers: {} } as any;
      const error = {
        config: originalConfig,
        response: { status: 401 },
      };

      await expect(interceptor.rejected(error)).rejects.toBe(error);

      // The interceptor should have set _retry = true on the original config
      expect(originalConfig._retry).toBe(true);

      delete (apiClient.defaults as any).adapter;
    });

    it('sets new Authorization header on the retried request', async () => {
      localStorage.setItem('accessToken', 'expired-token');

      const adapterSpy = vi
        .fn()
        .mockResolvedValueOnce({
          status: 200,
          data: { data: { accessToken: 'fresh-token', refreshToken: 'fresh-refresh-token' } },
          headers: {},
          config: {},
          statusText: 'OK',
        })
        .mockResolvedValueOnce({
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

      await interceptor.rejected(error);

      // The original request config should be updated with the fresh token
      expect(originalConfig.headers.Authorization).toBe('Bearer fresh-token');

      delete (apiClient.defaults as any).adapter;
    });
  });
});
