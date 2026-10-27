import { MantineProvider } from '@mantine/core';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import QuestionEditorPanel from './QuestionEditorPanel';

describe('QuestionEditorPanel', () => {
  it('edits, adds, and removes options while preserving null text', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <MantineProvider>
        <QuestionEditorPanel
          qid="q1"
          questionDef={{ type: 'CHOICE', options: { A: 'First answer', B: null, C: 'Remove me' } }}
          updating={false}
          examples={[]}
          loadingExamples={false}
          onSave={onSave}
          onEditStateChange={() => {}}
        />
      </MantineProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const text = screen.getByDisplayValue('First answer');
    await user.clear(text);
    await user.type(text, 'Updated answer');
    const optionalText = screen.getByLabelText('B', { exact: true });
    await user.type(optionalText, 'Temporary text');
    await user.clear(optionalText);
    await user.click(screen.getAllByRole('button', { name: 'Remove' })[2]);
    expect(screen.queryByDisplayValue('Remove me')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add Item' }));
    const key = screen.getByDisplayValue('newKey');
    await user.clear(key);
    await user.type(key, 'D');
    await user.tab();
    const addedText = screen.getByLabelText('D', { exact: true });
    await user.clear(addedText);
    await user.type(addedText, 'New answer');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      options: { A: 'Updated answer', B: null, D: 'New answer' },
    })));
  });
});
