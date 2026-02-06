import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const spinnerContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100vh',
  width: '100%',
  backgroundColor: 'var(--color-bg-primary)',
};

const spinnerStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  border: '3px solid var(--color-border)',
  borderTopColor: 'var(--color-accent)',
  borderRadius: '50%',
  animation: 'button-spinner 0.8s linear infinite',
};

const spinnerKeyframes = `
  @keyframes button-spinner {
    to { transform: rotate(360deg); }
  }
`;

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <>
        <style>{spinnerKeyframes}</style>
        <div style={spinnerContainerStyle}>
          <div style={spinnerStyle} />
        </div>
      </>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
