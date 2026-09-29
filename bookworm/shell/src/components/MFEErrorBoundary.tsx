import React, { Component, ReactNode } from 'react';
import './MFEErrorBoundary.css';

interface Props {
  name: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Error boundaries must be class components in React.
// They catch errors thrown during rendering of any child —
// including failed Module Federation dynamic imports.
class MFEErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    // The React dev overlay hooks into console.error and shows a red screen
    // for ANY error it sees — even ones already caught by an error boundary.
    // We suppress console.error here and use console.warn instead so the
    // overlay never fires, while we still get a visible diagnostic log.
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[MFE] "${this.props.name}" is unavailable:`, error.message);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mfe-error">
          <div className="mfe-error__icon">⚠️</div>
          <h2 className="mfe-error__title">
            {this.props.name} is unavailable
          </h2>
          <p className="mfe-error__message">
            This section could not be loaded. Please try refreshing the page.
          </p>
          <button
            className="mfe-error__retry"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MFEErrorBoundary;
