import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

const spinnerKeyframes = `
  @keyframes spinner-rotate {
    to { transform: rotate(360deg); }
  }
`;

const sizes: Record<string, number> = {
  sm: 16,
  md: 24,
  lg: 36,
};

const borderWidths: Record<string, number> = {
  sm: 2,
  md: 3,
  lg: 3,
};

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color,
}) => {
  const dimension = sizes[size];
  const borderWidth = borderWidths[size];

  const spinnerStyle: React.CSSProperties = {
    display: 'inline-block',
    width: dimension,
    height: dimension,
    border: `${borderWidth}px solid var(--color-border)`,
    borderTopColor: color || 'var(--color-accent)',
    borderRadius: '50%',
    animation: 'spinner-rotate 0.65s linear infinite',
    flexShrink: 0,
  };

  return (
    <>
      <style>{spinnerKeyframes}</style>
      <div style={spinnerStyle} role="status" aria-label="Loading" />
    </>
  );
};
