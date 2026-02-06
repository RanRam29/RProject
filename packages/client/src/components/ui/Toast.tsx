import React from 'react';
import { useUIStore } from '../../stores/ui.store';

const typeConfig: Record<
  string,
  { icon: string; bg: string; border: string; iconColor: string }
> = {
  success: {
    icon: '\u2713',
    bg: 'var(--color-success-light)',
    border: 'var(--color-success)',
    iconColor: 'var(--color-success)',
  },
  error: {
    icon: '\u2715',
    bg: 'var(--color-danger-light)',
    border: 'var(--color-danger)',
    iconColor: 'var(--color-danger)',
  },
  warning: {
    icon: '!',
    bg: 'var(--color-warning-light)',
    border: 'var(--color-warning)',
    iconColor: 'var(--color-warning)',
  },
  info: {
    icon: 'i',
    bg: 'var(--color-accent-light)',
    border: 'var(--color-accent)',
    iconColor: 'var(--color-accent)',
  },
};

export const ToastContainer: React.FC = () => {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: '16px',
    right: '16px',
    zIndex: 2000,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxWidth: '380px',
    width: '100%',
    pointerEvents: 'none',
  };

  return (
    <div style={containerStyle}>
      {toasts.map((toast) => {
        const config = typeConfig[toast.type] || typeConfig.info;

        const toastStyle: React.CSSProperties = {
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '14px 16px',
          backgroundColor: config.bg,
          borderLeft: `3px solid ${config.border}`,
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)',
          animation: 'toastEnter var(--transition-normal) ease',
          pointerEvents: 'auto',
        };

        const iconCircleStyle: React.CSSProperties = {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '22px',
          height: '22px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: config.border,
          color: 'var(--color-text-inverse)',
          fontSize: '12px',
          fontWeight: 700,
          flexShrink: 0,
          lineHeight: 1,
        };

        const messageStyle: React.CSSProperties = {
          flex: 1,
          fontSize: '14px',
          color: 'var(--color-text-primary)',
          lineHeight: 1.5,
          paddingTop: '1px',
        };

        const closeStyle: React.CSSProperties = {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '20px',
          height: '20px',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'transparent',
          color: 'var(--color-text-secondary)',
          cursor: 'pointer',
          fontSize: '14px',
          padding: 0,
          flexShrink: 0,
          transition: `all var(--transition-fast)`,
          lineHeight: 1,
        };

        return (
          <div key={toast.id} style={toastStyle}>
            <span style={iconCircleStyle}>{config.icon}</span>
            <span style={messageStyle}>{toast.message}</span>
            <button
              style={closeStyle}
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss toast"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-text-primary)';
                e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-secondary)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              &#x2715;
            </button>
          </div>
        );
      })}
    </div>
  );
};
