import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export const RegisterForm: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!displayName.trim()) {
      errors.displayName = 'Display name is required.';
    }

    if (!email.trim()) {
      errors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
      });
      navigate('/', { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    width: '100%',
  };

  const errorBannerStyle: React.CSSProperties = {
    padding: '10px 14px',
    backgroundColor: 'var(--color-danger-light)',
    border: '1px solid var(--color-danger)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-danger)',
    fontSize: '13px',
    fontWeight: 500,
    animation: 'shake 0.5s ease',
  };

  const footerStyle: React.CSSProperties = {
    textAlign: 'center',
    fontSize: '14px',
    color: 'var(--color-text-secondary)',
    marginTop: '8px',
  };

  const linkStyle: React.CSSProperties = {
    color: 'var(--color-accent)',
    textDecoration: 'none',
    fontWeight: 500,
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle} noValidate>
      {error && <div style={errorBannerStyle}>{error}</div>}

      <Input
        label="Display Name"
        type="text"
        placeholder="John Doe"
        value={displayName}
        onChange={(e) => {
          setDisplayName(e.target.value);
          if (fieldErrors.displayName) {
            setFieldErrors((prev) => ({ ...prev, displayName: '' }));
          }
        }}
        error={fieldErrors.displayName}
        fullWidth
        autoComplete="name"
        autoFocus
      />

      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (fieldErrors.email) {
            setFieldErrors((prev) => ({ ...prev, email: '' }));
          }
        }}
        error={fieldErrors.email}
        fullWidth
        autoComplete="email"
      />

      <Input
        label="Password"
        type="password"
        placeholder="At least 8 characters"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          if (fieldErrors.password) {
            setFieldErrors((prev) => ({ ...prev, password: '' }));
          }
        }}
        error={fieldErrors.password}
        fullWidth
        autoComplete="new-password"
      />

      <Input
        label="Confirm Password"
        type="password"
        placeholder="Re-enter your password"
        value={confirmPassword}
        onChange={(e) => {
          setConfirmPassword(e.target.value);
          if (fieldErrors.confirmPassword) {
            setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
          }
        }}
        error={fieldErrors.confirmPassword}
        fullWidth
        autoComplete="new-password"
      />

      <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
        Create Account
      </Button>

      <div style={footerStyle}>
        Already have an account?{' '}
        <Link to="/login" style={linkStyle}>
          Sign in
        </Link>
      </div>
    </form>
  );
};
