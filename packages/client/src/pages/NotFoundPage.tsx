import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

const pageStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: '24px',
  backgroundColor: 'var(--color-bg-secondary)',
};

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '16px',
  textAlign: 'center',
  maxWidth: '400px',
  animation: 'fadeIn var(--transition-normal) ease',
};

const codeStyle: React.CSSProperties = {
  fontSize: '72px',
  fontWeight: 800,
  color: 'var(--color-accent)',
  lineHeight: 1,
  letterSpacing: '-2px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  margin: 0,
};

const descriptionStyle: React.CSSProperties = {
  fontSize: '14px',
  color: 'var(--color-text-secondary)',
  lineHeight: 1.6,
  margin: 0,
};

const iconStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '80px',
  height: '80px',
  borderRadius: 'var(--radius-full)',
  backgroundColor: 'var(--color-bg-tertiary)',
  marginBottom: '8px',
};

export const NotFoundPage: React.FC = () => {
  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={iconStyle}>
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-text-tertiary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </div>
        <div style={codeStyle}>404</div>
        <h1 style={titleStyle}>Page not found</h1>
        <p style={descriptionStyle}>
          The page you are looking for does not exist or has been moved.
        </p>
        <Link to="/" style={{ textDecoration: 'none', marginTop: '8px' }}>
          <Button variant="primary">Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
};
