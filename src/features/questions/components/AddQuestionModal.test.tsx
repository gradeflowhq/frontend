import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it } from 'vitest';

import AddQuestionModal from './AddQuestionModal';

const renderModal = (props?: Partial<React.ComponentProps<typeof AddQuestionModal>>) => {
  const defaultProps: React.ComponentProps<typeof AddQuestionModal> = {
    opened: true,
    existingIds: [],
    submissionQids: [],
    onClose: () => {},
    onAdd: () => {},
  };

  return render(
    <MantineProvider>
      <AddQuestionModal {...defaultProps} {...props} />
    </MantineProvider>,
  );
};

describe('AddQuestionModal', () => {
  it('does not show duplicate-id validation while closing after a successful add', async () => {
    const user = userEvent.setup();
    const view = renderModal();

    await user.type(screen.getByLabelText('Question ID'), 'Q1');

    view.rerender(
      <MantineProvider>
        <AddQuestionModal
          opened
          existingIds={['Q1']}
          submissionQids={[]}
          isSaving
          onClose={() => {}}
          onAdd={() => {}}
        />
      </MantineProvider>,
    );

    expect(screen.queryByText('A question with this ID already exists.')).not.toBeInTheDocument();

    view.rerender(
      <MantineProvider>
        <AddQuestionModal
          opened={false}
          existingIds={['Q1']}
          submissionQids={[]}
          onClose={() => {}}
          onAdd={() => {}}
        />
      </MantineProvider>,
    );

    expect(screen.queryByText('A question with this ID already exists.')).not.toBeInTheDocument();
  });

  it('does not show stale server errors while closing', () => {
    const view = renderModal({ error: new Error('Question already exists') });

    expect(screen.getByText('Question already exists')).toBeInTheDocument();

    view.rerender(
      <MantineProvider>
        <AddQuestionModal
          opened={false}
          existingIds={[]}
          submissionQids={[]}
          error={new Error('Question already exists')}
          onClose={() => {}}
          onAdd={() => {}}
        />
      </MantineProvider>,
    );

    expect(screen.queryByText('Question already exists')).not.toBeInTheDocument();
  });

  it('requires question ids to exist in current submissions', async () => {
    const user = userEvent.setup();

    renderModal({ submissionQids: ['Q1', 'Q2'] });

    await user.type(screen.getByLabelText('Question ID'), 'Q3');

    expect(
      screen.getByText('Question ID must match a question found in the uploaded submissions.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
  });
});
