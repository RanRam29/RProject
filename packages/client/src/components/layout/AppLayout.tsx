import React, { useEffect, useCallback, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useUIStore } from '../../stores/ui.store';
import { CommandPalette } from '../ui/CommandPalette';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MOBILE_BREAKPOINT = 768;

/* ------------------------------------------------------------------ */
/*  Toast container component                                          */
/* ------------------------------------------------------------------ */

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUIStore();

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: '16px',
    right: '16px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxWidth: 'min(400px, calc(100vw - 24px))',
    width: '100%',
    pointerEvents: 'none',
  };

  const getToastColor = (type: string) => {
    switch (type) {
      case 'success':
        return { bg: 'var(--color-success)', lightBg: 'var(--color-success-light)' };
      case 'error':
        return { bg: 'var(--color-danger)', lightBg: 'var(--color-danger-light)' };
      case 'warning':
        return { bg: 'var(--color-warning)', lightBg: 'var(--color-warning-light)' };
      default:
        return { bg: 'var(--color-accent)', lightBg: 'var(--color-accent-light)' };
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div style={containerStyle}>
      {toasts.map((toast) => {
        const colors = getToastColor(toast.type);
        return (
          <div
            key={toast.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderLeft: `4px solid ${colors.bg}`,
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              animation: 'toastEnter var(--transition-normal) ease',
              pointerEvents: 'auto',
              fontSize: '14px',
              color: 'var(--color-text-primary)',
            }}
          >
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '20px',
                height: '20px',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'transparent',
                color: 'var(--color-text-tertiary)',
                cursor: 'pointer',
                fontSize: '16px',
                lineHeight: 1,
                flexShrink: 0,
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                e.currentTarget.style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-tertiary)';
              }}
            >
              &times;
            </button>
          </div>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  AppLayout component                                                */
/* ------------------------------------------------------------------ */

export const AppLayout: React.FC = () => {
  const { sidebarOpen, toggleSidebar, setSidebarOpen, isMobile, setIsMobile } = useUIStore();

  // Responsive: track viewport width
  const wasMobileRef = useRef(window.innerWidth < MOBILE_BREAKPOINT);
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      const wasMobile = wasMobileRef.current;
      wasMobileRef.current = mobile;
      setIsMobile(mobile);
      // Only close sidebar when transitioning from desktop to mobile
      if (mobile && !wasMobile) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    // Initial check
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarOpen, setIsMobile]);

  const handleSidebarToggle = useCallback(() => {
    toggleSidebar();
  }, [toggleSidebar]);

  // On mobile, close sidebar after navigation
  const handleMobileNavigate = useCallback(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile, setSidebarOpen]);

  const shellStyle: React.CSSProperties = {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: 'var(--color-bg-primary)',
  };

  const mainContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: isMobile ? '12px' : '24px',
    backgroundColor: 'var(--color-bg-secondary)',
  };

  return (
    <div style={shellStyle}>
      {/* Sidebar */}
      <Sidebar
        collapsed={!sidebarOpen}
        onToggle={handleSidebarToggle}
        isMobile={isMobile}
        onNavigate={handleMobileNavigate}
      />

      {/* Main content area */}
      <div style={mainContainerStyle}>
        {/* Top bar */}
        <TopBar onMenuClick={handleSidebarToggle} />

        {/* Page content */}
        <main style={contentStyle}>
          <Outlet />
        </main>
      </div>

      {/* Toast container overlay */}
      <ToastContainer />

      {/* Command palette (Ctrl+K) */}
      <CommandPalette />
    </div>
  );
};
