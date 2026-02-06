import { useEffect } from 'react';
import { AppRouter } from './router';
import { ToastContainer } from './components/ui/Toast';
import { useUIStore } from './stores/ui.store';

export default function App() {
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <>
      <AppRouter />
      <ToastContainer />
    </>
  );
}
