import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ErrorAlert from './ErrorAlert';

import type { ComponentProps } from 'react';

const renderAlert = (props: ComponentProps<typeof ErrorAlert>) =>
  render(
    <MantineProvider>
      <ErrorAlert {...props} />
    </MantineProvider>,
  );

describe('ErrorAlert', () => {
  it('renders multiple backend errors as a list', () => {
    renderAlert({
      error: {
        response: {
          status: 422,
          data: {
            message: 'Rule is invalid.',
            errors: ['expression is required.', 'expected is required.'],
          },
        },
      },
    });

    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'expression is required.',
      'expected is required.',
    ]);
  });

  it('renders one backend error without a list', () => {
    renderAlert({
      error: {
        response: {
          status: 422,
          data: { errors: ['question id is required.'] },
        },
      },
    });

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByText('question id is required.')).toBeInTheDocument();
  });

  it('renders an explicit message', () => {
    renderAlert({ message: 'Export is not available.' });

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByText('Export is not available.')).toBeInTheDocument();
  });

  it('renders explicit messages as a list', () => {
    renderAlert({ messages: ['first issue', 'second issue'] });

    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'first issue',
      'second issue',
    ]);
  });

  it('preserves line breaks in single messages', () => {
    renderAlert({ error: new Error('first line\nsecond line') });

    const message = screen.getByText((_, element) => (
      element?.tagName === 'P' && element.textContent === 'first line\nsecond line'
    ));
    expect(message).toHaveStyle({
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
    });
  });
});
