import React from 'react';
import { RegisterForm } from '../components/auth/RegisterForm';

const pageStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: '24px',
  backgroundColor: 'var(--color-bg-secondary)',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '420px',
  backgroundColor: 'var(--color-bg-elevated)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-lg)',
  padding: '40px 32px',
  animation: 'slideUp var(--transition-normal) ease',
};

const logoSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '32px',
};

const logoMarkStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '48px',
  height: '48px',
  borderRadius: 'var(--radius-lg)',
  backgroundColor: 'var(--color-accent)',
  color: 'var(--color-text-inverse)',
  fontWeight: 700,
  fontSize: '18px',
  letterSpacing: '-0.5px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  color: 'var(--color-text-primary)',
  letterSpacing: '-0.3px',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: 'var(--color-text-secondary)',
  textAlign: 'center',
};

export const RegisterPage: React.FC = () => {
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={logoSectionStyle}>
          <span style={logoMarkStyle}>PM</span>
          <h1 style={titleStyle}>ProjectMgr</h1>
          <p style={subtitleStyle}>Create a new account to get started</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
};
