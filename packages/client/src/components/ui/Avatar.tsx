import React from 'react';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes: Record<string, { dimension: number; fontSize: number }> = {
  sm: { dimension: 28, fontSize: 11 },
  md: { dimension: 36, fontSize: 13 },
  lg: { dimension: 48, fontSize: 17 },
};

const avatarColors = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#6366f1',
  '#06b6d4',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
}) => {
  const [imgError, setImgError] = React.useState(false);
  const sizeConfig = sizes[size];
  const showImage = src && !imgError;
  const bgColor = avatarColors[hashName(name) % avatarColors.length];

  const containerStyle: React.CSSProperties = {
    width: sizeConfig.dimension,
    height: sizeConfig.dimension,
    borderRadius: 'var(--radius-full)',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: showImage ? 'var(--color-bg-tertiary)' : bgColor,
    color: '#ffffff',
    fontSize: sizeConfig.fontSize,
    fontWeight: 600,
    lineHeight: 1,
    userSelect: 'none',
    textTransform: 'uppercase',
  };

  const imgStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  if (showImage) {
    return (
      <div style={containerStyle}>
        <img
          src={src}
          alt={name}
          style={imgStyle}
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div style={containerStyle} title={name} aria-label={name}>
      {getInitials(name)}
    </div>
  );
};
