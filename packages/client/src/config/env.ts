export const env = {
  API_URL: import.meta.env.VITE_API_URL || '/api/v1',
  WS_URL: import.meta.env.VITE_WS_URL || 'http://localhost:3001',
} as const;
