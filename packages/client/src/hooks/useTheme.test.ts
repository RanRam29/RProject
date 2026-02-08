import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from './useTheme';
import { useUIStore } from '../stores/ui.store';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    useUIStore.setState({
      theme: 'light',
      sidebarOpen: true,
      toasts: [],
    });
  });

  it('returns current theme from store', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');
    expect(typeof result.current.toggleTheme).toBe('function');
    expect(typeof result.current.setTheme).toBe('function');
  });

  it('sets data-theme attribute on document.documentElement', () => {
    renderHook(() => useTheme());

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('toggleTheme switches between light and dark', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('dark');

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('light');
  });

  it('setTheme sets a specific theme', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');

    act(() => {
      result.current.setTheme('light');
    });

    expect(result.current.theme).toBe('light');
  });

  it('updates data-theme when theme changes', () => {
    const { result } = renderHook(() => useTheme());

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    act(() => {
      result.current.toggleTheme();
    });

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    act(() => {
      result.current.setTheme('light');
    });

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
