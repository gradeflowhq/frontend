import { describe, expect, it } from 'vitest';

import { materializeDraft } from '@features/rules/hooks/useRuleEditorState';

import type { JSONSchema7 } from 'json-schema';

describe('materializeDraft', () => {
  it('returns empty object for null schema', () => {
    expect(materializeDraft(null)).toEqual({});
  });

  it('populates type from schema const', () => {
    const schema: JSONSchema7 = {
      properties: { type: { const: 'TEXT_MATCH' } },
    };
    expect(materializeDraft(schema)).toEqual({ type: 'TEXT_MATCH' });
  });

  it('populates type from schema default', () => {
    const schema: JSONSchema7 = {
      properties: { type: { default: 'NUMERIC' } },
    };
    expect(materializeDraft(schema)).toEqual({ type: 'NUMERIC' });
  });

  it('adds question_id when schema has the property and questionId provided', () => {
    const schema: JSONSchema7 = {
      properties: {
        type: { const: 'TEXT_MATCH' },
        question_id: { type: 'string' },
      },
    };
    expect(materializeDraft(schema, 'Q1')).toEqual({
      type: 'TEXT_MATCH',
      question_id: 'Q1',
    });
  });

  it('does not add question_id when questionId is null', () => {
    const schema: JSONSchema7 = {
      properties: {
        type: { const: 'TEXT_MATCH' },
        question_id: { type: 'string' },
      },
    };
    const draft = materializeDraft(schema, null);
    expect(draft).not.toHaveProperty('question_id');
  });

  it('preserves initial values', () => {
    const schema: JSONSchema7 = {
      properties: { type: { const: 'TEXT_MATCH' } },
    };
    const initial = { pattern: '.*', case_sensitive: true } as never;
    const draft = materializeDraft(schema, null, initial);
    expect(draft).toMatchObject({ pattern: '.*', case_sensitive: true });
  });

  it('does not overwrite initial type', () => {
    const schema: JSONSchema7 = {
      properties: { type: { const: 'TEXT_MATCH' } },
    };
    const initial = { type: 'EXISTING' } as never;
    expect(materializeDraft(schema, null, initial)).toMatchObject({
      type: 'EXISTING',
    });
  });

  it('does not overwrite initial question_id', () => {
    const schema: JSONSchema7 = {
      properties: {
        type: { const: 'TEXT_MATCH' },
        question_id: { type: 'string' },
      },
    };
    const initial = { question_id: 'EXISTING' } as never;
    const draft = materializeDraft(schema, 'Q_NEW', initial);
    expect(draft).toMatchObject({ question_id: 'EXISTING' });
  });
});
