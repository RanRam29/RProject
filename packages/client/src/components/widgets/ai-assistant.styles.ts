import type React from 'react';

export const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: '300px',
};

export const chatAreaStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

export const msgStyle = (role: 'user' | 'assistant'): React.CSSProperties => ({
  maxWidth: '85%',
  padding: '8px 12px',
  borderRadius: 'var(--radius-md)',
  fontSize: '13px',
  lineHeight: 1.5,
  alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
  backgroundColor: role === 'user' ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
  color: role === 'user' ? 'white' : 'var(--color-text-primary)',
  whiteSpace: 'pre-wrap' as const,
  wordBreak: 'break-word' as const,
});

export const inputAreaStyle: React.CSSProperties = {
  borderTop: '1px solid var(--color-border)',
  padding: '8px 12px',
};

export const pillStyle: React.CSSProperties = {
  padding: '3px 8px',
  fontSize: '11px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-full)',
  backgroundColor: 'transparent',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
  transition: 'all var(--transition-fast)',
};

export function badgeStyle(isAIEnabled: boolean, hasError: boolean): React.CSSProperties {
  return {
    padding: '3px 8px',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.5px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: isAIEnabled
      ? 'var(--color-accent)'
      : hasError
        ? 'var(--color-danger)'
        : 'var(--color-bg-secondary)',
    color: isAIEnabled || hasError ? 'white' : 'var(--color-text-tertiary)',
    textTransform: 'uppercase',
  };
}
