import React from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RegisterForm } from '../components/auth/RegisterForm';
import { useAuthStore } from '../stores/auth.store';
import { authApi } from '../api/auth.api';
import LogoMark from '../components/ui/LogoMark';

const pageStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: '24px',
  backgroundImage: [
    'radial-gradient(circle at 30% 20%, rgba(79,70,229,0.35) 0%, transparent 60%)',
    'radial-gradient(circle at 80% 80%, rgba(236,72,153,0.30) 0%, transparent 60%)',
  ].join(', '),
  backgroundColor: 'var(--color-bg-primary)',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '400px',
  background: 'rgba(255,255,255,0.85)',
  backdropFilter: 'blur(24px) saturate(1.8)',
  WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--rp-radius-modal)',
  boxShadow: 'var(--shadow-xl)',
  padding: '36px 32px',
  animation: 'slideUp var(--transition-normal) ease',
};

const logoSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '32px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  color: 'var(--color-text-primary)',
  letterSpacing: '-0.4px',
  textAlign: 'center',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--color-text-secondary)',
  textAlign: 'center',
};

export const RegisterPage: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  const { data: setupData, isLoading } = useQuery({
    queryKey: ['setup-check'],
    queryFn: () => authApi.checkSetup(),
    staleTime: 30_000,
  });

  if (isAuthenticated && user) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!isLoading && setupData && !setupData.needsSetup) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <div style={pageStyle}>
        <div style={{
          width: '32px', height: '32px',
          border: '3px solid var(--color-border)',
          borderTopColor: 'var(--color-accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={logoSectionStyle}>
          <LogoMark size={48} />
          <h1 style={titleStyle}>RProjects</h1>
          <p style={subtitleStyle}>Create the admin account to set up the system</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
};
