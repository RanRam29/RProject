import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from './ui.store';

describe('useUIStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.setState({
      theme: 'light',
      sidebarOpen: true,
      toasts: [],
    });
  });

  describe('theme', () => {
    it('toggleTheme switches light to dark', () => {
      useUIStore.getState().toggleTheme();
      expect(useUIStore.getState().theme).toBe('dark');
      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('toggleTheme switches dark to light', () => {
      useUIStore.setState({ theme: 'dark' });
      useUIStore.getState().toggleTheme();
      expect(useUIStore.getState().theme).toBe('light');
    });

    it('setTheme sets specific theme', () => {
      useUIStore.getState().setTheme('dark');
      expect(useUIStore.getState().theme).toBe('dark');
      expect(localStorage.getItem('theme')).toBe('dark');
    });
  });

  describe('sidebar', () => {
    it('toggleSidebar flips state', () => {
      expect(useUIStore.getState().sidebarOpen).toBe(true);
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(false);
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });

    it('setSidebarOpen sets directly', () => {
      useUIStore.getState().setSidebarOpen(false);
      expect(useUIStore.getState().sidebarOpen).toBe(false);
    });
  });

  describe('toasts', () => {
    it('addToast adds a toast', () => {
      useUIStore.getState().addToast({ type: 'success', message: 'Done!' });
      const toasts = useUIStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].type).toBe('success');
      expect(toasts[0].message).toBe('Done!');
      expect(toasts[0].id).toBeDefined();
    });

    it('removeToast removes by id', () => {
      useUIStore.getState().addToast({ type: 'error', message: 'Fail' });
      const id = useUIStore.getState().toasts[0].id;
      useUIStore.getState().removeToast(id);
      expect(useUIStore.getState().toasts).toHaveLength(0);
    });

    it('can add multiple toasts', () => {
      useUIStore.getState().addToast({ type: 'success', message: 'One' });
      useUIStore.getState().addToast({ type: 'error', message: 'Two' });
      useUIStore.getState().addToast({ type: 'info', message: 'Three' });
      expect(useUIStore.getState().toasts).toHaveLength(3);
    });
  });
});
