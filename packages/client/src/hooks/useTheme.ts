import { useEffect } from 'react';
import { useUIStore } from '../stores/ui.store';

export function useTheme() {
  const { theme, toggleTheme, setTheme } = useUIStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return { theme, toggleTheme, setTheme };
}
