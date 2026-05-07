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
  it('keeps field edits out of parent draft state while exposing the latest draft reader', async () => {
    const user = userEvent.setup();
    const onDraftChange = vi.fn();
    const onDraftEdit = vi.fn();
    let readDraft: (() => RuleValue | null) | null = null;

    mockedUseRuleEditorState.mockReturnValue({
      draft: { type: 'MOCK', name: 'initial' } as unknown as RuleValue,
      schemaForRender: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          name: { type: 'string', title: 'Name' },
        },
      },
      mergedUiSchema: {
        'ui:title': '',
        'ui:submitButtonOptions': { norender: true },
      },
      concreteKey: 'MockRule',
      hiddenKeys: ['type'],
    });

    render(
      <MantineProvider>
        <RuleEditor
          formKeyBase="mock-rule"
          selectedRuleKey="MockRule"
          onSave={vi.fn()}
          onCancel={vi.fn()}
          onDraftChange={onDraftChange}
          onDraftEdit={onDraftEdit}
          onDraftReaderChange={(reader) => {
            readDraft = reader;
          }}
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
      expect(readDraft?.()).toMatchObject({ name: 'updated' });
    });
    expect(onDraftChange).toHaveBeenCalledTimes(initialDraftChangeCount);
  });
});
