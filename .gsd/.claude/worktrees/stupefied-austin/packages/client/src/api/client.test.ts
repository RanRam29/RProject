import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock env before importing the client module
vi.mock('../config/env', () => ({
  env: { API_URL: 'http://test-api' },
}));

import apiClient from './client';

// Helper to extract the registered interceptor handler functions from the axios instance.
function getRequestInterceptor() {
  const handlers = (apiClient.interceptors.request as any).handlers;
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
    sessionStorage.clear();
    vi.restoreAllMocks();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: originalLocation.href },
    });
  });

  afterEach(() => {
    delete (apiClient.defaults as any).adapter;
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
      expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
    });

    it('has withCredentials enabled', () => {
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

    it('does not add Authorization header when no accessToken', () => {
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
    });
  });

  describe('response interceptor', () => {
    it('passes successful responses through unchanged', () => {
      const interceptor = getResponseInterceptor();
      const response = { status: 200, data: { message: 'ok' } };
      expect(interceptor.fulfilled(response)).toBe(response);
    });

    it('rejects non-401 errors as-is', async () => {
      const interceptor = getResponseInterceptor();
      const error = { config: { headers: {} }, response: { status: 500 } };
      await expect(interceptor.rejected(error)).rejects.toBe(error);
    });

    it('rejects network errors as-is', async () => {
      const interceptor = getResponseInterceptor();
      const error = { config: { headers: {} }, response: undefined };
      await expect(interceptor.rejected(error)).rejects.toBe(error);
    });

    it('does not retry a 401 when _retry is already set', async () => {
      const interceptor = getResponseInterceptor();
      const error = { config: { headers: {}, _retry: true }, response: { status: 401 } };
      await expect(interceptor.rejected(error)).rejects.toBe(error);
    });

    it('clears tokens via store logout when no refresh token exists', async () => {
      localStorage.setItem('accessToken', 'expired-token');
      // No refreshToken in storage → interceptor should call logout()

      const interceptor = getResponseInterceptor();
      const error = { config: { headers: {} }, response: { status: 401 } };

      await expect(interceptor.rejected(error)).rejects.toBe(error);
      expect(localStorage.getItem('accessToken')).toBeNull();
    });

    it('clears tokens via store logout when refresh request fails', async () => {
      localStorage.setItem('accessToken', 'expired-token');
      localStorage.setItem('refreshToken', 'bad-refresh-token');

      // Simulate the /auth/refresh call failing
      apiClient.defaults.adapter = vi.fn().mockRejectedValueOnce(
        Object.assign(new Error('Refresh failed'), {
          response: { status: 401 },
          config: { url: '/auth/refresh', headers: {}, _retry: true },
        })
      );

      const interceptor = getResponseInterceptor();
      const error = { config: { headers: {} }, response: { status: 401 } };

      await expect(interceptor.rejected(error)).rejects.toBe(error);
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });

    it('refreshes token and updates storage on 401 with valid refresh token', async () => {
      localStorage.setItem('accessToken', 'expired-token');
      localStorage.setItem('refreshToken', 'valid-refresh-token');

      // First adapter call: POST /auth/refresh → new tokens
      // Second adapter call: retry of original request → success
      apiClient.defaults.adapter = vi.fn()
        .mockResolvedValueOnce({
          status: 200,
          data: { data: { accessToken: 'new-access-token', refreshToken: 'new-refresh-token' } },
          headers: {},
          config: {},
          statusText: 'OK',
        })
        .mockResolvedValueOnce({
          status: 200,
          data: 'retried',
          headers: {},
          config: {},
          statusText: 'OK',
        });

      const interceptor = getResponseInterceptor();
      const error = {
        config: { headers: {}, url: '/some-endpoint', method: 'get' },
        response: { status: 401 },
      };

      await interceptor.rejected(error);

      expect(localStorage.getItem('accessToken')).toBe('new-access-token');
    });

    it('sets _retry flag on the original request during 401 handling', async () => {
      localStorage.setItem('refreshToken', 'some-token');

      apiClient.defaults.adapter = vi.fn().mockRejectedValueOnce(
        Object.assign(new Error('Refresh failed'), {
          response: { status: 401 },
          config: { url: '/auth/refresh', headers: {}, _retry: true },
        })
      );

      const interceptor = getResponseInterceptor();
      const originalConfig = { headers: {} } as any;
      const error = { config: originalConfig, response: { status: 401 } };

      await expect(interceptor.rejected(error)).rejects.toBe(error);
      expect(originalConfig._retry).toBe(true);
    });

    it('sets new Authorization header on the retried request', async () => {
      localStorage.setItem('accessToken', 'expired-token');
      localStorage.setItem('refreshToken', 'valid-refresh-token');

      apiClient.defaults.adapter = vi.fn()
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

      const interceptor = getResponseInterceptor();
      const originalConfig = {
        headers: { Authorization: 'Bearer expired-token' },
        url: '/protected',
        method: 'get',
      };
      const error = { config: originalConfig, response: { status: 401 } };

      await interceptor.rejected(error);

      expect(originalConfig.headers.Authorization).toBe('Bearer fresh-token');
    });
  });
});
