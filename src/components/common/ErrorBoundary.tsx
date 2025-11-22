import React from 'react';
import ErrorAlert from './ErrorAlert';

type Props = { children: React.ReactNode };

type State = { hasError: boolean; error: any };

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    // You can log to a service here
    console.error('ErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="my-4">
          <ErrorAlert error={this.state.error ?? new Error('Something went wrong')} />
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;