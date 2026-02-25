import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface UIState {
  theme: Theme;
  sidebarOpen: boolean;
  isMobile: boolean;
  toasts: Toast[];
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setIsMobile: (isMobile: boolean) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialSidebarOpen(): boolean {
  const stored = localStorage.getItem('sidebarOpen');
  if (stored === 'false') return false;
  return true;
}

export const useUIStore = create<UIState>((set) => ({
  theme: getInitialTheme(),
  sidebarOpen: getInitialSidebarOpen(),
  isMobile: typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  toasts: [],

  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
      return { theme: newTheme };
    }),

  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },

  toggleSidebar: () =>
    set((state) => {
      const newOpen = !state.sidebarOpen;
      localStorage.setItem('sidebarOpen', String(newOpen));
      return { sidebarOpen: newOpen };
    }),
  setSidebarOpen: (sidebarOpen) => {
    localStorage.setItem('sidebarOpen', String(sidebarOpen));
    set({ sidebarOpen });
  },
  setIsMobile: (isMobile) => set({ isMobile }),

  addToast: (toast) =>
    set((state) => {
      const id = crypto.randomUUID();
      const newToast = { ...toast, id };
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, 5000);
      return { toasts: [...state.toasts, newToast] };
    }),

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
