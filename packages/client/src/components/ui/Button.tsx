import React from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
  className?: string;
}

const sizeStyles: Record<string, React.CSSProperties> = {
  sm: {
    padding: '6px 12px',
    fontSize: '13px',
    height: '32px',
    gap: '6px',
  },
  md: {
    padding: '8px 16px',
    fontSize: '14px',
    height: '38px',
    gap: '8px',
  },
  lg: {
    padding: '10px 24px',
    fontSize: '15px',
    height: '44px',
    gap: '8px',
  },
};

const spinnerKeyframes = `
  @keyframes button-spinner {
    to { transform: rotate(360deg); }
  }
`;

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  fullWidth = false,
  className,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isActive, setIsActive] = React.useState(false);

  const isDisabled = disabled || loading;

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontWeight: 500,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: `all var(--transition-fast)`,
    opacity: isDisabled ? 0.5 : 1,
    width: fullWidth ? '100%' : 'auto',
    outline: 'none',
    textDecoration: 'none',
    lineHeight: 1,
    userSelect: 'none' as const,
    position: 'relative' as const,
    whiteSpace: 'nowrap' as const,
    ...sizeStyles[size],
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: isActive
        ? 'var(--color-accent-hover)'
        : isHovered
          ? 'var(--color-accent-hover)'
          : 'var(--color-accent)',
      color: 'var(--color-text-inverse)',
      transform: isActive ? 'scale(0.97)' : 'none',
      boxShadow: isHovered && !isDisabled ? 'var(--shadow-md)' : 'var(--shadow-sm)',
    },
    secondary: {
      backgroundColor: isActive
        ? 'var(--color-bg-tertiary)'
        : isHovered
          ? 'var(--color-bg-secondary)'
          : 'transparent',
      color: 'var(--color-text-primary)',
      border: '1px solid var(--color-border)',
      borderColor: isHovered ? 'var(--color-border-hover)' : 'var(--color-border)',
      transform: isActive ? 'scale(0.97)' : 'none',
    },
    danger: {
      backgroundColor: isActive
        ? '#dc2626'
        : isHovered
          ? '#dc2626'
          : 'var(--color-danger)',
      color: 'var(--color-text-inverse)',
      transform: isActive ? 'scale(0.97)' : 'none',
      boxShadow: isHovered && !isDisabled ? 'var(--shadow-md)' : 'var(--shadow-sm)',
    },
    ghost: {
      backgroundColor: isActive
        ? 'var(--color-accent-light)'
        : isHovered
          ? 'var(--color-accent-light)'
          : 'transparent',
      color: isHovered ? 'var(--color-accent)' : 'var(--color-text-secondary)',
      border: 'none',
      transform: isActive ? 'scale(0.97)' : 'none',
    },
  };

  const spinnerSize = size === 'sm' ? 14 : size === 'md' ? 16 : 18;

  const spinnerStyle: React.CSSProperties = {
    width: spinnerSize,
    height: spinnerSize,
    border: '2px solid transparent',
    borderTopColor: variant === 'secondary' || variant === 'ghost'
      ? 'var(--color-accent)'
      : 'var(--color-text-inverse)',
    borderRadius: '50%',
    animation: 'button-spinner 0.6s linear infinite',
    flexShrink: 0,
  };

  return (
    <>
      <style>{spinnerKeyframes}</style>
      <button
        type={type}
        disabled={isDisabled}
        onClick={onClick}
        className={className}
        style={{ ...baseStyle, ...variantStyles[variant] }}
        onMouseEnter={() => !isDisabled && setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsActive(false);
        }}
        onMouseDown={() => !isDisabled && setIsActive(true)}
        onMouseUp={() => setIsActive(false)}
      >
        {loading && <span style={spinnerStyle} />}
        <span style={{ opacity: loading ? 0.7 : 1 }}>{children}</span>
      </button>
    </>
  );
};
