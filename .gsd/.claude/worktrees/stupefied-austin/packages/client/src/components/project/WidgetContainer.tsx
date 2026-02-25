import { useState, useCallback, type ReactNode } from 'react';
import { useProjectPermission } from '../../hooks/usePermission';
import { useUIStore } from '../../stores/ui.store';

const SIZE_PRESETS = [
  { label: 'S', width: 400, height: 300 },
  { label: 'M', width: 600, height: 400 },
  { label: 'L', width: 900, height: 500 },
  { label: 'XL', width: 1200, height: 600 },
];

interface WidgetContainerProps {
  id: string;
  projectId: string;
  title: string;
  children: ReactNode;
  width: number;
  height: number;
  onRemove: () => void;
  onResize?: (width: number, height: number) => void;
}

export function WidgetContainer({
  id,
  projectId,
  title,
  children,
  width,
  height,
  onRemove,
  onResize,
}: WidgetContainerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const { isOwner } = useProjectPermission(projectId);
  const isMobile = useUIStore(s => s.isMobile);

  const currentSizeIndex = SIZE_PRESETS.findIndex(
    (s) => s.width === width && s.height === height
  );

  const handleGrow = useCallback(() => {
    const nextIdx = Math.min(
      (currentSizeIndex >= 0 ? currentSizeIndex : 1) + 1,
      SIZE_PRESETS.length - 1
    );
    const next = SIZE_PRESETS[nextIdx];
    onResize?.(next.width, next.height);
  }, [currentSizeIndex, onResize]);

  const handleShrink = useCallback(() => {
    const prevIdx = Math.max(
      (currentSizeIndex >= 0 ? currentSizeIndex : 1) - 1,
      0
    );
    const prev = SIZE_PRESETS[prevIdx];
    onResize?.(prev.width, prev.height);
  }, [currentSizeIndex, onResize]);

  const containerStyle: React.CSSProperties = {
    width: `${width}px`,
    maxWidth: '100%',
    minHeight: `${height}px`,
    backgroundColor: 'var(--color-bg-elevated)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: 'box-shadow var(--transition-fast), width 0.3s ease, min-height 0.3s ease',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderBottom: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-secondary)',
    cursor: 'default',
    minHeight: '40px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
  };

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    gap: '2px',
    opacity: (isMobile && isOwner) || (isHovered && isOwner) ? 1 : 0,
    transition: 'opacity var(--transition-fast)',
    alignItems: 'center',
  };

  const actionBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    color: 'var(--color-text-secondary)',
    padding: '2px 5px',
    borderRadius: 'var(--radius-sm)',
    lineHeight: 1,
    transition: 'all var(--transition-fast)',
  };

  const bodyStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'auto',
  };

  const sizeMenuStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '4px',
    backgroundColor: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-lg)',
    padding: '6px',
    display: 'flex',
    gap: '4px',
    zIndex: 50,
  };

  const sizePresetBtnStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: isActive ? 700 : 500,
    border: isActive ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: isActive ? 'var(--color-accent-light)' : 'transparent',
    color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  });

  return (
    <div
      style={containerStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowSizeMenu(false); }}
      data-widget-id={id}
    >
      <div style={headerStyle}>
        <span style={titleStyle}>{title}</span>
        <div style={{ ...actionsStyle, position: 'relative' }}>
          {/* Shrink button */}
          <button
            style={actionBtnStyle}
            onClick={handleShrink}
            title="Shrink widget"
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
          >
            &#8722;
          </button>

          {/* Size picker */}
          <button
            style={{ ...actionBtnStyle, fontSize: '11px', fontWeight: 600 }}
            onClick={() => setShowSizeMenu(!showSizeMenu)}
            title="Change size"
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
          >
            {SIZE_PRESETS[currentSizeIndex]?.label || 'M'}
          </button>

          {/* Grow button */}
          <button
            style={actionBtnStyle}
            onClick={handleGrow}
            title="Enlarge widget"
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
          >
            +
          </button>

          {/* Size presets dropdown */}
          {showSizeMenu && (
            <div style={sizeMenuStyle}>
              {SIZE_PRESETS.map((preset, idx) => (
                <button
                  key={preset.label}
                  style={sizePresetBtnStyle(idx === currentSizeIndex)}
                  onClick={() => {
                    onResize?.(preset.width, preset.height);
                    setShowSizeMenu(false);
                  }}
                >
                  {preset.label}
                  <div style={{ fontSize: '9px', color: 'var(--color-text-tertiary)' }}>
                    {preset.width}x{preset.height}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Separator */}
          <div style={{
            width: '1px',
            height: '16px',
            backgroundColor: 'var(--color-border)',
            margin: '0 4px',
          }} />

          {/* Remove button */}
          <button
            style={{ ...actionBtnStyle, color: 'var(--color-danger)' }}
            onClick={onRemove}
            title="Remove widget"
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-danger-light)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            &#215;
          </button>
        </div>
      </div>
      <div style={bodyStyle}>{children}</div>
    </div>
  );
}
