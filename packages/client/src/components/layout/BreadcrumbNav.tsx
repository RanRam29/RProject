import React from 'react';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '14px',
  color: 'var(--color-text-secondary)',
  minWidth: 0,
};

const separatorStyle: React.CSSProperties = {
  color: 'var(--color-text-tertiary)',
  fontSize: '12px',
  flexShrink: 0,
  userSelect: 'none',
};

const linkStyle: React.CSSProperties = {
  color: 'var(--color-text-secondary)',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  transition: 'color var(--transition-fast)',
};

const currentStyle: React.CSSProperties = {
  color: 'var(--color-text-primary)',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

export const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({ items }) => {
  return (
    <nav style={containerStyle} aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <React.Fragment key={index}>
            {index > 0 && <span style={separatorStyle}>&#8250;</span>}
            {isLast || !item.path ? (
              <span style={currentStyle}>{item.label}</span>
            ) : (
              <Link
                to={item.path}
                style={linkStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--color-accent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                }}
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
