import { MantineProvider } from '@mantine/core';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import rawDefs from '@schemas/rules.json';

import { HIDE_KEYS_SINGLE } from '../constants';
import RuleEditorForm from './RuleEditorForm';
import { prepareRuleDefinitionsForRender } from '../schema/prepare';


import type { RuleValue } from '../types';
import type { JSONSchema7 } from 'json-schema';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Process definitions through the full pipeline (single-target TEXT). */
function buildProcessedDefs(questionType = 'TEXT') {
  return prepareRuleDefinitionsForRender(rawDefs as Record<string, unknown>, {
    questionType,
    questionId: 'q1',
    isSingleTarget: true,
    questionMap: { q1: { type: { type: 'string', default: questionType } } },
  }) as Record<string, JSONSchema7>;
}

/** Build a schemaForRender the same way useRuleEditorState does. */
function buildSchema(defs: Record<string, JSONSchema7>, key: string): JSONSchema7 {
  const base = defs[key];
  if (!base) throw new Error(`Definition "${key}" not found`);
  return { ...base, definitions: defs } as JSONSchema7;
}

/** Build the default uiSchema with hidden keys for single-target mode. */
function buildUiSchema(): Record<string, unknown> {
  const ui: Record<string, unknown> = {
    'ui:title': '',
    'ui:options': { label: true },
    'ui:submitButtonOptions': { norender: true },
  };
  const hidden = {
    'ui:widget': 'hidden',
    'ui:title': '',
    'ui:options': { label: false, hidden: true },
  };
  HIDE_KEYS_SINGLE.forEach((k) => {
    ui[k] = hidden;
  });
  return ui;
}

const noop = () => {};

function renderForm(
  overrides: Partial<React.ComponentProps<typeof RuleEditorForm>> = {},
) {
  const defaults: React.ComponentProps<typeof RuleEditorForm> = {
    formKey: 'test-form',
    schemaForRender: null,
    mergedUiSchema: {},
    hiddenKeys: [...HIDE_KEYS_SINGLE],
    draft: {} as RuleValue,
    onDraftChange: noop,
    onSave: noop,
    onCancel: noop,
  };

  return render(
    <MantineProvider>
      <RuleEditorForm {...defaults} {...overrides} />
    </MantineProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RuleEditorForm', () => {
  // ── Basic rendering ─────────────────────────────────────────────────────

  it('shows a warning when schemaForRender is null', () => {
    renderForm({ schemaForRender: null });
    expect(screen.getByText('Rule schema not found.')).toBeInTheDocument();
  });

  it('renders Save and Cancel buttons', () => {
    const defs = buildProcessedDefs();
    const schema = buildSchema(defs, 'TextMatchRule');
    renderForm({ schemaForRender: schema, mergedUiSchema: buildUiSchema() });
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('disables Cancel while saving', () => {
    const defs = buildProcessedDefs();
    const schema = buildSchema(defs, 'TextMatchRule');
    renderForm({
      schemaForRender: schema,
      mergedUiSchema: buildUiSchema(),
      isSaving: true,
    });
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });

  it('shows error alert when error prop is set', () => {
    const defs = buildProcessedDefs();
    const schema = buildSchema(defs, 'TextMatchRule');
    renderForm({
      schemaForRender: schema,
      mergedUiSchema: buildUiSchema(),
      error: new Error('Server error'),
    });
    expect(screen.getByText('Server error')).toBeInTheDocument();
  });

  // ── TextMatchRule ───────────────────────────────────────────────────────

  it('renders TextMatchRule form with answers field', () => {
    const defs = buildProcessedDefs();
    const schema = buildSchema(defs, 'TextMatchRule');
    renderForm({
      schemaForRender: schema,
      mergedUiSchema: buildUiSchema(),
      draft: { type: 'TEXT_MATCH', question_id: 'q1' } as RuleValue,
    });
    // TextMatchRule has an "answers" array field — check for its heading
    expect(screen.getByRole('heading', { name: /answers/i })).toBeInTheDocument();
  });

  // ── ProgrammingRule ─────────────────────────────────────────────────────

  it('renders ProgrammingRule form with testcases field', () => {
    const defs = buildProcessedDefs();
    const schema = buildSchema(defs, 'ProgrammingRule');
    renderForm({
      schemaForRender: schema,
      mergedUiSchema: buildUiSchema(),
      draft: { type: 'PROGRAMMING', question_id: 'q1' } as RuleValue,
    });
    expect(screen.getByText(/testcases/i)).toBeInTheDocument();
  });

  // ── Cancel/Save callbacks ───────────────────────────────────────────────

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const defs = buildProcessedDefs();
    const schema = buildSchema(defs, 'TextMatchRule');
    renderForm({
      schemaForRender: schema,
      mergedUiSchema: buildUiSchema(),
      onCancel,
    });
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onSave with current draft when Save button is clicked', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const defs = buildProcessedDefs();
    const schema = buildSchema(defs, 'TextMatchRule');
    const draft = { type: 'TEXT_MATCH', question_id: 'q1' } as RuleValue;
    renderForm({
      schemaForRender: schema,
      mergedUiSchema: buildUiSchema(),
      draft,
      onSave,
    });
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).toHaveBeenCalledWith(draft);
  });
});

describe('RuleEditorForm – nested rule schemas', () => {
  /**
   * Verify that the processed schema for rules containing nested oneOf
   * (like CompositeRule) preserves the discriminator mapping so RJSF can
   * use getOptionMatchingSimpleDiscriminator for instant matching.
   */
  it('CompositeRule schema retains discriminator on nested rules oneOf', () => {
    const defs = buildProcessedDefs();
    const schema = buildSchema(defs, 'CompositeRule');
    const rulesItems = (schema.properties as Record<string, JSONSchema7>)?.rules
      ?.items as JSONSchema7 | undefined;

    expect(rulesItems).toBeDefined();
    expect(rulesItems!.oneOf).toBeDefined();

    const disc = (rulesItems as Record<string, unknown>)?.discriminator as
      | { propertyName: string; mapping?: Record<string, string> }
      | undefined;
    expect(disc).toBeDefined();
    expect(disc!.propertyName).toBe('type');
    // mapping should be pruned to only TEXT-compatible rules
    expect(disc!.mapping).toBeDefined();
    // ProgrammingRule is TEXT-compatible — it must be in the mapping
    expect(Object.values(disc!.mapping!)).toContain('#/definitions/ProgrammingRule');
  });

  it('Nested rule option schemas have type.enum for simple discriminator matching', () => {
    const defs = buildProcessedDefs();
    // Check a few rule definitions have type.enum instead of type.const
    for (const key of ['ProgrammingRule', 'TextMatchRule', 'RegexRule', 'CompositeRule']) {
      const def = defs[key] as JSONSchema7 | undefined;
      if (!def) continue;
      const typeProp = (def.properties as Record<string, JSONSchema7> | undefined)?.type;
      expect(typeProp, `${key} should have type property`).toBeDefined();
      expect(typeProp!.enum, `${key}.type should have enum`)
        .toBeInstanceOf(Array);
      expect(typeProp!.const, `${key}.type should NOT have const`)
        .toBeUndefined();
    }
  });

  it('ProgrammingRule definition is present after filtering for TEXT questions', () => {
    const defs = buildProcessedDefs('TEXT');
    expect(defs).toHaveProperty('ProgrammingRule');
    // ProgrammingRule is compatible with TEXT
    const progDef = defs.ProgrammingRule as JSONSchema7;
    expect(progDef.properties).toBeDefined();
    const typeProp = (progDef.properties as Record<string, JSONSchema7>).type;
    expect(typeProp.enum).toEqual(['PROGRAMMING']);
    expect(typeProp.default).toBe('PROGRAMMING');
  });

  it('CompositeRule renders with a nested rule selector', () => {
    const defs = buildProcessedDefs();
    const schema = buildSchema(defs, 'CompositeRule');
    renderForm({
      schemaForRender: schema,
      mergedUiSchema: buildUiSchema(),
      draft: {
        type: 'COMPOSITE',
        display_name: 'Composite',
        rules: [],
        aggregation: 'ALL',
      } as unknown as RuleValue,
    });
    // Should render the rules array field — check for its heading
    expect(screen.getByRole('heading', { name: /^rules$/i })).toBeInTheDocument();
  });

  it('CompositeRule with nested ProgrammingRule renders correctly', async () => {
    const defs = buildProcessedDefs();
    const schema = buildSchema(defs, 'CompositeRule');
    const draft = {
      type: 'COMPOSITE',
      display_name: 'Composite',
      rules: [
        {
          type: 'PROGRAMMING',
          display_name: 'Programming',
          testcases: [{ expression: 'foo()', expected: '42' }],
          language: 'python',
          show_evaluated_expected: true,
          mode: 'ALL',
        },
      ],
      aggregation: 'ALL',
    } as unknown as RuleValue;

    renderForm({
      schemaForRender: schema,
      mergedUiSchema: buildUiSchema(),
      draft,
    });

    // The nested ProgrammingRule should render its test case data
    await waitFor(() => {
      expect(screen.getByDisplayValue('foo()')).toBeInTheDocument();
      expect(screen.getByDisplayValue('42')).toBeInTheDocument();
    });
  });

  it('CompositeRule with nested TextMatchRule renders answer fields', async () => {
    const defs = buildProcessedDefs();
    const schema = buildSchema(defs, 'CompositeRule');
    const draft = {
      type: 'COMPOSITE',
      display_name: 'Composite',
      rules: [
        {
          type: 'TEXT_MATCH',
          display_name: 'Text Match',
          answers: ['hello'],
        },
      ],
      aggregation: 'ALL',
    } as unknown as RuleValue;

    renderForm({
      schemaForRender: schema,
      mergedUiSchema: buildUiSchema(),
      draft,
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('hello')).toBeInTheDocument();
    });
  });

  it('deeply nested CompositeRule renders correctly', async () => {
    const defs = buildProcessedDefs();
    const schema = buildSchema(defs, 'CompositeRule');
    const draft = {
      type: 'COMPOSITE',
      display_name: 'Composite',
      rules: [
        {
          type: 'COMPOSITE',
          display_name: 'Composite',
          rules: [
            {
              type: 'TEXT_MATCH',
              display_name: 'Text Match',
              answers: ['nested-answer'],
            },
          ],
          aggregation: 'ALL',
        },
      ],
      aggregation: 'ALL',
    } as unknown as RuleValue;

    renderForm({
      schemaForRender: schema,
      mergedUiSchema: buildUiSchema(),
      draft,
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('nested-answer')).toBeInTheDocument();
    });
  });

  it('calls onDraftChange when form fields are edited', async () => {
    const user = userEvent.setup();
    const onDraftChange = vi.fn();
    const defs = buildProcessedDefs();
    const schema = buildSchema(defs, 'ProgrammingRule');
    renderForm({
      schemaForRender: schema,
      mergedUiSchema: buildUiSchema(),
      draft: {
        type: 'PROGRAMMING',
        question_id: 'q1',
        testcases: [{ expression: 'init', expected: '' }],
        language: 'python',
        show_evaluated_expected: true,
        mode: 'ALL',
      } as unknown as RuleValue,
      onDraftChange,
    });

    // Find the expression input by its current value
    const expressionInput = await screen.findByDisplayValue('init');
    await user.click(expressionInput);
    await user.type(expressionInput, 'x');

    await waitFor(() => {
      expect(onDraftChange).toHaveBeenCalled();
    });
  });
});

describe('RuleEditorForm – rule type variety', () => {
  it.each([
    ['RegexRule', { type: 'REGEX', pattern: 'test.*' }],
    ['KeywordsRule', { type: 'KEYWORDS', keywords: ['hello'], mode: 'ALL' }],
    ['ManualRule', { type: 'MANUAL' }],
    ['LengthRule', { type: 'LENGTH' }],
  ] as const)('renders %s without crashing', (key, draft) => {
    const defs = buildProcessedDefs();
    if (!defs[key]) return; // skip if not in the definitions
    const schema = buildSchema(defs, key);
    renderForm({
      schemaForRender: schema,
      mergedUiSchema: buildUiSchema(),
      draft: { ...draft, question_id: 'q1', display_name: key } as unknown as RuleValue,
    });
    // Should render Save and Cancel buttons (form is functional)
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });
});
