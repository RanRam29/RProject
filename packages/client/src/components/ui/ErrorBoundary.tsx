import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={containerStyle}>
          <div style={cardStyle}>
            <span style={{ fontSize: 32 }}>&#9888;&#65039;</span>
            <h3 style={titleStyle}>Something went wrong</h3>
            <p style={messageStyle}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button onClick={this.handleReset} style={btnStyle}>
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/** Lightweight boundary for individual widgets — shows inline error */
export class WidgetErrorBoundary extends Component<
  { children: ReactNode; widgetTitle?: string },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; widgetTitle?: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[Widget Error] ${this.props.widgetTitle || 'Unknown'}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={widgetErrorStyle}>
          <span style={{ fontSize: 20 }}>&#9888;&#65039;</span>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Widget failed to load
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={widgetRetryStyle}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Styles ─────────────────────────────────────────────────
const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  minHeight: 200,
  padding: 24,
};

const cardStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: 32,
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-bg-elevated)',
  maxWidth: 400,
};

const titleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  margin: '12px 0 8px',
};

const messageStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--color-text-secondary)',
  margin: '0 0 16px',
  lineHeight: 1.5,
};

const btnStyle: React.CSSProperties = {
  padding: '8px 20px',
  fontSize: 14,
  fontWeight: 500,
  backgroundColor: 'var(--color-accent)',
  color: 'white',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
};

const widgetErrorStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  height: '100%',
  minHeight: 100,
  padding: 16,
};

const widgetRetryStyle: React.CSSProperties = {
  padding: '4px 12px',
  fontSize: 12,
  backgroundColor: 'transparent',
  color: 'var(--color-accent)',
  border: '1px solid var(--color-accent)',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
};
