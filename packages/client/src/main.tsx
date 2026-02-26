import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { get, set, del } from 'idb-keyval';
import { SocketProvider } from './contexts/SocketContext';
import App from './App';
import './styles/globals.css';
import './styles/animations.css';

import { env } from './config/env';

// Fire-and-forget background ping to wake up the server from sleep (e.g. Render free tier)
fetch(`${env.API_URL}/health`).catch(() => { /* silent failure */ });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Configure IndexedDB persister
const persister = createAsyncStoragePersister({
  storage: {
    getItem: async (key: string) => {
      const value = await get(key);
      return value || null;
    },
    setItem: async (key: string, value: string) => {
      await set(key, value);
    },
    removeItem: async (key: string) => {
      await del(key);
    },
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <BrowserRouter>
        <SocketProvider>
          <App />
        </SocketProvider>
      </BrowserRouter>
    </PersistQueryClientProvider>
  </React.StrictMode>
);
