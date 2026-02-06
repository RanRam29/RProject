import { WIDGET_CATALOG } from '../widgets/WidgetRegistry';

interface WidgetLibrarySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (type: string, title: string, width: number, height: number) => void;
}

export function WidgetLibrarySidebar({
  isOpen,
  onClose,
  onAddWidget,
}: WidgetLibrarySidebarProps) {
  if (!isOpen) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--color-bg-overlay)',
    zIndex: 200,
    animation: 'fadeIn var(--transition-fast)',
  };

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: '320px',
    backgroundColor: 'var(--color-bg-elevated)',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 201,
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideInRight var(--transition-normal)',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--color-border)',
  };

  const closeBtn: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: 'var(--color-text-secondary)',
    padding: '4px',
  };

  const listStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  const cardStyle: React.CSSProperties = {
    padding: '16px',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    backgroundColor: 'var(--color-bg-primary)',
  };

  return (
    <>
      <div style={overlayStyle} onClick={onClose} />
      <div style={panelStyle}>
        <div style={headerStyle}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Widget Library</h3>
          <button style={closeBtn} onClick={onClose}>
            ×
          </button>
        </div>
        <div style={listStyle}>
          {WIDGET_CATALOG.map((widget) => (
            <div
              key={widget.type}
              style={cardStyle}
              onClick={() =>
                onAddWidget(
                  widget.type,
                  widget.title,
                  widget.defaultSize.width,
                  widget.defaultSize.height
                )
              }
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-accent)';
                e.currentTarget.style.backgroundColor = 'var(--color-accent-light)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.backgroundColor = 'var(--color-bg-primary)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                <span style={{ fontSize: '24px' }}>{widget.icon}</span>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {widget.title}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
                {widget.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
