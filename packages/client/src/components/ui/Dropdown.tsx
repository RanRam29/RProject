import React from 'react';

interface DropdownItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = 'left',
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
  };

  const triggerWrapperStyle: React.CSSProperties = {
    cursor: 'pointer',
    display: 'inline-flex',
  };

  const menuStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    [align === 'right' ? 'right' : 'left']: 0,
    minWidth: '180px',
    backgroundColor: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 500,
    padding: '4px',
    animation: 'scaleIn var(--transition-fast) ease',
    transformOrigin: align === 'right' ? 'top right' : 'top left',
  };

  const getItemStyle = (item: DropdownItem, index: number): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '8px 12px',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: hoveredIndex === index
      ? item.danger
        ? 'var(--color-danger-light)'
        : 'var(--color-bg-tertiary)'
      : 'transparent',
    color: item.danger ? 'var(--color-danger)' : 'var(--color-text-primary)',
    fontSize: '14px',
    fontWeight: 400,
    cursor: 'pointer',
    transition: `all var(--transition-fast)`,
    textAlign: 'left' as const,
    lineHeight: 1.4,
    whiteSpace: 'nowrap' as const,
  });

  const iconStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    fontSize: '16px',
    lineHeight: 0,
    flexShrink: 0,
    opacity: 0.8,
  };

  return (
    <div ref={containerRef} style={containerStyle}>
      <div
        style={triggerWrapperStyle}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {trigger}
      </div>

      {isOpen && (
        <div style={menuStyle} role="menu">
          {items.map((item, index) => (
            <button
              key={index}
              role="menuitem"
              style={getItemStyle(item, index)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
            >
              {item.icon && <span style={iconStyle}>{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
