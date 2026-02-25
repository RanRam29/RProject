import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    textAlign: 'center',
    gap: '16px',
  };

  const iconWrapperStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '64px',
    height: '64px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-bg-tertiary)',
    color: 'var(--color-text-tertiary)',
    fontSize: '28px',
    lineHeight: 0,
    marginBottom: '4px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    lineHeight: 1.4,
    margin: 0,
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: '14px',
    color: 'var(--color-text-secondary)',
    lineHeight: 1.5,
    maxWidth: '360px',
    margin: 0,
  };

  const actionWrapperStyle: React.CSSProperties = {
    marginTop: '8px',
  };

  return (
    <div style={containerStyle}>
      {icon && <div style={iconWrapperStyle}>{icon}</div>}
      <h3 style={titleStyle}>{title}</h3>
      {description && <p style={descriptionStyle}>{description}</p>}
      {action && <div style={actionWrapperStyle}>{action}</div>}
    </div>
  );
};
