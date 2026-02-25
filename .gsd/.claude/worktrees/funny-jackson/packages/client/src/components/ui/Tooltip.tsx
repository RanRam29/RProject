import React from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

const tooltipKeyframes = `
  @keyframes tooltip-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 300,
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = React.useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  }, [delay]);

  const handleMouseLeave = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  }, []);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const wrapperStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
  };

  const positionStyles: Record<string, React.CSSProperties> = {
    top: {
      bottom: 'calc(100% + 8px)',
      left: '50%',
      transform: 'translateX(-50%)',
    },
    bottom: {
      top: 'calc(100% + 8px)',
      left: '50%',
      transform: 'translateX(-50%)',
    },
    left: {
      right: 'calc(100% + 8px)',
      top: '50%',
      transform: 'translateY(-50%)',
    },
    right: {
      left: 'calc(100% + 8px)',
      top: '50%',
      transform: 'translateY(-50%)',
    },
  };

  const arrowPositions: Record<string, React.CSSProperties> = {
    top: {
      bottom: '-4px',
      left: '50%',
      transform: 'translateX(-50%) rotate(45deg)',
    },
    bottom: {
      top: '-4px',
      left: '50%',
      transform: 'translateX(-50%) rotate(45deg)',
    },
    left: {
      right: '-4px',
      top: '50%',
      transform: 'translateY(-50%) rotate(45deg)',
    },
    right: {
      left: '-4px',
      top: '50%',
      transform: 'translateY(-50%) rotate(45deg)',
    },
  };

  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    padding: '6px 10px',
    backgroundColor: 'var(--color-text-primary)',
    color: 'var(--color-bg-primary)',
    fontSize: '12px',
    fontWeight: 500,
    lineHeight: 1.4,
    borderRadius: 'var(--radius-sm)',
    whiteSpace: 'nowrap',
    zIndex: 1500,
    pointerEvents: 'none',
    animation: 'tooltip-fade-in var(--transition-fast) ease',
    ...positionStyles[position],
  };

  const arrowStyle: React.CSSProperties = {
    position: 'absolute',
    width: '8px',
    height: '8px',
    backgroundColor: 'var(--color-text-primary)',
    ...arrowPositions[position],
  };

  return (
    <>
      <style>{tooltipKeyframes}</style>
      <div
        style={wrapperStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
        {isVisible && content && (
          <div style={tooltipStyle} role="tooltip">
            <div style={arrowStyle} />
            {content}
          </div>
        )}
      </div>
    </>
  );
};
