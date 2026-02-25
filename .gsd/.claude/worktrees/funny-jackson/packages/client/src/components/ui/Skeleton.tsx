import React from 'react';

const skeletonKeyframes = `
  @keyframes skeleton-pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.15; }
  }
`;

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '16px',
  borderRadius = 'var(--radius-sm)',
  className,
}) => {
  const style: React.CSSProperties = {
    width,
    height,
    borderRadius,
    backgroundColor: 'var(--color-bg-tertiary)',
    animation: 'skeleton-pulse 1.8s ease-in-out infinite',
  };

  return (
    <>
      <style>{skeletonKeyframes}</style>
      <div style={style} className={className} aria-hidden="true" />
    </>
  );
};

interface SkeletonTextProps {
  lines?: number;
  lineHeight?: string | number;
  gap?: string | number;
  className?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  lineHeight = '14px',
  gap = '10px',
  className,
}) => {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: typeof gap === 'number' ? `${gap}px` : gap,
  };

  return (
    <div style={containerStyle} className={className}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={lineHeight}
          width={i === lines - 1 ? '70%' : '100%'}
        />
      ))}
    </div>
  );
};

interface SkeletonCardProps {
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ className }) => {
  const cardStyle: React.CSSProperties = {
    padding: '20px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-elevated)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  };

  return (
    <div style={cardStyle} className={className}>
      <div style={headerStyle}>
        <Skeleton width={36} height={36} borderRadius="var(--radius-full)" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Skeleton height="14px" width="60%" />
          <Skeleton height="12px" width="40%" />
        </div>
      </div>
      <SkeletonText lines={3} />
      <div style={{ display: 'flex', gap: '8px' }}>
        <Skeleton width={60} height="22px" borderRadius="var(--radius-full)" />
        <Skeleton width={80} height="22px" borderRadius="var(--radius-full)" />
      </div>
    </div>
  );
};
