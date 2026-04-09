import { Alert } from '@mantine/core';
import React, { type ErrorInfo } from 'react';

import { getErrorMessages } from '@utils/error';

type Props = { children: React.ReactNode };

type State = { hasError: boolean; error: unknown };

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, error };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
  }
  render() {
    if (this.state.hasError) {
      const messages = getErrorMessages(this.state.error ?? new Error('Something went wrong'));
      return (
        <Alert color="red" my="md">{messages.join(' ')}</Alert>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
