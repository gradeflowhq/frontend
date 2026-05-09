import { MantineProvider } from '@mantine/core';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { useRuleEditorState } from '@features/rules/hooks/useRuleEditorState';

import RuleEditor from './RuleEditor';

import type { RuleValue } from '../types';

vi.mock('@features/rules/hooks/useRuleEditorState', () => ({
  useRuleEditorState: vi.fn(),
}));

const mockedUseRuleEditorState = vi.mocked(useRuleEditorState);

describe('RuleEditor', () => {
  it('sends field edits to the draft state', async () => {
    const user = userEvent.setup();
    const onDraftChange = vi.fn();
    const onDraftEdit = vi.fn();
    const setDraft = vi.fn();

    mockedUseRuleEditorState.mockReturnValue({
      draft: { type: 'MOCK', name: 'initial' } as unknown as RuleValue,
      setDraft,
      schema: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          name: { type: 'string', title: 'Name' },
        },
      },
      uiSchema: {
        'ui:title': '',
        'ui:submitButtonOptions': { norender: true },
      },
      ruleType: 'MOCK',
      isLoading: false,
      error: null,
    });

    render(
      <MantineProvider>
        <RuleEditor
          formKeyBase="mock-rule"
          selectedRuleType="MOCK"
          assessmentId="assessment-1"
          onSave={vi.fn()}
          onCancel={vi.fn()}
          onDraftChange={onDraftChange}
          onDraftEdit={onDraftEdit}
        />
      </MantineProvider>,
    );

    await waitFor(() => {
      expect(onDraftChange).toHaveBeenCalledWith({ type: 'MOCK', name: 'initial' });
    });
    const initialDraftChangeCount = onDraftChange.mock.calls.length;

    const input = screen.getByDisplayValue('initial');
    await user.clear(input);
    await user.type(input, 'updated');

    await waitFor(() => {
      expect(onDraftEdit).toHaveBeenCalled();
      expect(setDraft).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'updated' }));
    });
    expect(onDraftChange).toHaveBeenCalledTimes(initialDraftChangeCount);
  });
});
