import React from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  fullWidth = false,
  className,
  type = 'text',
  disabled,
  style,
  ...rest
}) => {
  const [isFocused, setIsFocused] = React.useState(false);

  const wrapperStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    width: fullWidth ? '100%' : 'auto',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
    lineHeight: 1.4,
  };

  const inputWrapperStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: '38px',
    padding: icon ? '8px 12px 8px 38px' : '8px 12px',
    fontSize: '14px',
    lineHeight: 1.5,
    color: 'var(--color-text-primary)',
    backgroundColor: 'var(--color-bg-primary)',
    border: `1px solid ${error ? 'var(--color-danger)' : isFocused ? 'var(--color-accent)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    transition: `all var(--transition-fast)`,
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'text',
    boxShadow: isFocused
      ? error
        ? '0 0 0 3px var(--color-danger-light)'
        : '0 0 0 3px var(--color-accent-light)'
      : 'none',
    ...style,
  };

  const iconWrapperStyle: React.CSSProperties = {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: isFocused ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    transition: `color var(--transition-fast)`,
    fontSize: '16px',
    lineHeight: 0,
  };

  const errorStyle: React.CSSProperties = {
    fontSize: '12px',
    color: 'var(--color-danger)',
    lineHeight: 1.4,
    marginTop: '2px',
  };

  return (
    <div style={wrapperStyle} className={className}>
      {label && <label style={labelStyle}>{label}</label>}
      <div style={inputWrapperStyle}>
        {icon && <span style={iconWrapperStyle}>{icon}</span>}
        <input
          type={type}
          disabled={disabled}
          style={inputStyle}
          onFocus={(e) => {
            setIsFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            rest.onBlur?.(e);
          }}
          {...rest}
        />
      </div>
      {error && <span style={errorStyle}>{error}</span>}
    </div>
  );
};
