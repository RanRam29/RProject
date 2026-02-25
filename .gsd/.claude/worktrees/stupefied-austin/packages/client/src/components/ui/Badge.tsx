import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  variant?: 'solid' | 'subtle';
  size?: 'sm' | 'md';
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    return { r, g, b };
  }
  if (cleaned.length === 6) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  color = '#3b82f6',
  variant = 'subtle',
  size = 'sm',
}) => {
  const rgb = hexToRgb(color);

  const sizeStyles: React.CSSProperties = size === 'sm'
    ? { fontSize: '11px', padding: '2px 8px', height: '20px' }
    : { fontSize: '12px', padding: '3px 10px', height: '24px' };

  const solidStyle: React.CSSProperties = {
    backgroundColor: color,
    color: '#ffffff',
  };

  const subtleStyle: React.CSSProperties = rgb
    ? {
        backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`,
        color: color,
      }
    : {
        backgroundColor: 'var(--color-accent-light)',
        color: 'var(--color-accent)',
      };

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-full)',
    fontWeight: 600,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    userSelect: 'none',
    letterSpacing: '0.01em',
    ...sizeStyles,
    ...(variant === 'solid' ? solidStyle : subtleStyle),
  };

  return <span style={badgeStyle}>{children}</span>;
};
