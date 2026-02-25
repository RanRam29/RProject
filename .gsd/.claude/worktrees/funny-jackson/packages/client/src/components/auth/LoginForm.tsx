import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      await login({ email: email.trim(), password }, rememberMe);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Invalid email or password. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    width: '100%',
  };

  const errorStyle: React.CSSProperties = {
    padding: '10px 14px',
    backgroundColor: 'var(--color-danger-light)',
    border: '1px solid var(--color-danger)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-danger)',
    fontSize: '13px',
    fontWeight: 500,
    animation: 'shake 0.5s ease',
  };

  const rememberRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '-8px',
  };

  const checkboxStyle: React.CSSProperties = {
    width: '16px',
    height: '16px',
    accentColor: 'var(--color-accent)',
    cursor: 'pointer',
  };

  const rememberLabelStyle: React.CSSProperties = {
    fontSize: '13px',
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
    userSelect: 'none',
  };

  const footerStyle: React.CSSProperties = {
    textAlign: 'center',
    fontSize: '14px',
    color: 'var(--color-text-secondary)',
    marginTop: '8px',
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle} noValidate autoComplete="off">
      {error && <div style={errorStyle}>{error}</div>}

      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        fullWidth
        autoComplete="username"
        autoFocus
      />

      <Input
        label="Password"
        type="password"
        placeholder="Enter your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        fullWidth
        autoComplete="current-password"
      />

      <label style={rememberRowStyle}>
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          style={checkboxStyle}
        />
        <span style={rememberLabelStyle}>Remember me</span>
      </label>

      <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
        Sign in
      </Button>

      <div style={footerStyle}>
        Contact your administrator to get an account.
      </div>
    </form>
  );
};
