import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mergeContextInitialValue } from '../contextInitialValue';
import { buildRuleUiSchema } from '../schemaUi';
import RuleEditorForm from './RuleEditorForm';

import type { RuleValue } from '../types';
import type { JSONSchema7 } from 'json-schema';

const apiMocks = vi.hoisted(() => ({
  useCompatibleRules: vi.fn(),
  useRuleSchema: vi.fn(),
}));

vi.mock('../api', () => apiMocks);

beforeEach(() => {
  apiMocks.useCompatibleRules.mockReturnValue({
    data: [
      { type: 'RULE_A', label: 'Rule A' },
      { type: 'RULE_B', label: 'Rule B' },
    ],
    isError: false,
    error: null,
  });
  apiMocks.useRuleSchema.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
  });
});

const schema: JSONSchema7 = {
  type: 'object',
  properties: {
    type: { const: 'RULE_A' },
    answer: { type: 'string', title: 'Answer' },
  },
};

const uiSchema = {
  type: { 'ui:widget': 'hidden' },
};

const ControlledRuleEditorForm: React.FC<{
  props: React.ComponentProps<typeof RuleEditorForm>;
}> = ({ props }) => {
  const [draft, setDraft] = React.useState(props.draft);
  const handleDraftChange = React.useCallback(
    (next: RuleValue) => {
      setDraft(next);
      props.onDraftChange(next);
    },
    [props],
  );

  return <RuleEditorForm {...props} draft={draft} onDraftChange={handleDraftChange} />;
};

const renderForm = (
  overrides: Partial<React.ComponentProps<typeof RuleEditorForm>> = {},
) => {
  const props: React.ComponentProps<typeof RuleEditorForm> = {
    formKey: 'rule-form',
    schema,
    uiSchema,
    draft: { type: 'RULE_A', answer: 'initial' } as RuleValue,
    formContext: { assessmentId: 'assessment-1', questionId: 'q1' },
    onDraftChange: vi.fn(),
    onSave: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };

  return {
    props,
    ...render(
      <MantineProvider>
        <ControlledRuleEditorForm props={props} />
      </MantineProvider>,
    ),
  };
};

describe('RuleEditorForm', () => {
  it('shows a warning when no schema is available', () => {
    renderForm({ schema: null });
    expect(screen.getByText('Rule schema not found.')).toBeInTheDocument();
  });

  it('renders backend-provided schema and controls', () => {
    renderForm();
    expect(screen.getByDisplayValue('initial')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('hides backend read-only fields while editing', () => {
    const contextualSchema: JSONSchema7 = {
      type: 'object',
      properties: {
        type: { const: 'TEXT_MATCH', readOnly: true },
        question_id: { const: 'q1', readOnly: true, title: 'Question Id' },
        answer: { type: 'string', title: 'Answer' },
      },
    };

    renderForm({
      schema: contextualSchema,
      uiSchema: buildRuleUiSchema(contextualSchema),
      draft: { type: 'TEXT_MATCH', question_id: 'q1', answer: 'expected' } as RuleValue,
    });

    expect(screen.getByDisplayValue('expected')).toBeInTheDocument();
    expect(screen.queryByText('Question Id')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('q1')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('TEXT_MATCH')).not.toBeInTheDocument();
  });

  it('hides read-only discriminator fields in parameter values', () => {
    const parameterSchema: JSONSchema7 = {
      type: 'object',
      properties: {
        parameters: {
          type: 'object',
          title: 'Parameters',
          additionalProperties: {
            oneOf: [
              {
                type: 'object',
                title: 'Int Parameter',
                properties: {
                  dtype: { const: 'Int', default: 'Int', readOnly: true, title: 'Dtype' },
                  value: { type: 'integer', title: 'Value' },
                },
                required: ['value'],
              },
            ],
          },
        },
      },
    };

    renderForm({
      schema: parameterSchema,
      uiSchema: buildRuleUiSchema(parameterSchema),
      draft: {
        type: 'PROGRAMMABLE',
        parameters: { points: { dtype: 'Int', value: 2 } },
      } as RuleValue,
    });

    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    expect(screen.queryByText('Dtype')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Int')).not.toBeInTheDocument();
  });

  it('saves the latest local draft', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    renderForm({ onSave });

    const input = screen.getByDisplayValue('initial');
    await user.clear(input);
    await user.type(input, 'updated');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'RULE_A', answer: 'updated' }),
    );
  });

  it('disables cancel while saving and shows save errors', () => {
    renderForm({ isSaving: true, error: new Error('Save failed') });
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    expect(screen.getByText('Save failed')).toBeInTheDocument();
  });

  it('renders add control for backend array schemas', () => {
    renderForm({
      schema: {
        type: 'object',
        required: ['type', 'groups'],
        properties: {
          type: { const: 'GROUPED_RULE' },
          groups: {
            type: 'array',
            title: 'Groups',
            items: {
              type: 'object',
              properties: {
                name: { type: ['string', 'null'], title: 'Name' },
                weight: { type: 'number', default: 1 },
                children: {
                  type: 'array',
                  items: {
                    oneOf: [
                      {
                        type: 'object',
                        properties: {
                          type: { const: 'CHILD_RULE' },
                          values: { type: 'array', items: { type: 'string' } },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      uiSchema: {
        type: { 'ui:widget': 'hidden' },
        groups: {
          items: {
            children: {
              items: {
                'ui:field': 'RuleSlotField',
                'ui:fieldReplacesAnyOrOneOf': true,
              },
            },
          },
        },
      },
      draft: { type: 'GROUPED_RULE' } as RuleValue,
    });

    expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument();
  });

  it('refreshes backend initial values when nested rule context changes', () => {
    const next = mergeContextInitialValue(
      { type: 'CONTEXTUAL_RULE', question_id: 'q2', code: 'code for q1' } as RuleValue,
      { type: 'CONTEXTUAL_RULE', question_id: 'q1', code: 'code for q1' } as RuleValue,
      { type: 'CONTEXTUAL_RULE', question_id: 'q2', code: 'code for q2' } as RuleValue,
    );

    expect(next).toEqual({ type: 'CONTEXTUAL_RULE', question_id: 'q2', code: 'code for q2' });
  });

  it('keeps edited nested values when rule context changes', () => {
    const next = mergeContextInitialValue(
      { type: 'CONTEXTUAL_RULE', question_id: 'q2', code: 'custom code' } as RuleValue,
      { type: 'CONTEXTUAL_RULE', question_id: 'q1', code: 'code for q1' } as RuleValue,
      { type: 'CONTEXTUAL_RULE', question_id: 'q2', code: 'code for q2' } as RuleValue,
    );

    expect(next).toBeNull();
  });

  it('renders backend suggestions as selectable string-list options', async () => {
    const user = userEvent.setup();
    renderForm({
      schema: {
        type: 'object',
        properties: {
          type: { const: 'RULE_A' },
          answers: {
            type: 'array',
            title: 'Answers',
            items: { type: 'string' },
            'x-gradeflow': { input: 'string-list', suggestions: ['Alice', 'Bob'] },
          },
        },
      } as JSONSchema7,
      uiSchema: {
        type: { 'ui:widget': 'hidden' },
        answers: { 'ui:field': 'StringListField' },
      },
      draft: { type: 'RULE_A', answers: [] } as RuleValue,
    });

    await user.click(screen.getByRole('combobox', { name: /answers/i }));

    expect(screen.getByRole('option', { name: 'Alice', hidden: true })).toBeInTheDocument();
  });

  it('renders string-list enum values as constrained selectable options', async () => {
    const user = userEvent.setup();
    renderForm({
      schema: {
        type: 'object',
        properties: {
          type: { const: 'RULE_A' },
          target_question_ids: {
            type: 'array',
            title: 'Target Question Ids',
            items: { type: 'string', enum: ['q1', 'q2'] },
          },
        },
      },
      uiSchema: {
        type: { 'ui:widget': 'hidden' },
        target_question_ids: { 'ui:field': 'StringListField' },
      },
      draft: { type: 'RULE_A', target_question_ids: [] } as RuleValue,
    });

    await user.click(screen.getByRole('combobox', { name: /target question ids/i }));

    expect(screen.getByRole('option', { name: 'q1', hidden: true })).toBeInTheDocument();
  });
});
