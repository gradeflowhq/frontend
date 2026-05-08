import { describe, expect, it } from 'vitest';

import { materializeDraft } from '@features/rules/hooks/useRuleEditorState';

import type { JSONSchema7 } from 'json-schema';

describe('materializeDraft', () => {
  it('initializes a draft id for null schema', () => {
    expect(materializeDraft(null)).toEqual({ id: expect.any(String) });
  });

  it('populates type from schema const', () => {
    const schema: JSONSchema7 = {
      properties: { type: { const: 'TEXT_MATCH' }, scope: { const: 'question' } },
    };
    expect(materializeDraft(schema)).toEqual({
      id: expect.any(String),
      type: 'TEXT_MATCH',
      scope: 'question',
    });
  });

  it('populates type and scope from schema defaults', () => {
    const schema: JSONSchema7 = {
      properties: { type: { default: 'NUMERIC' }, scope: { default: 'global' } },
    };
    expect(materializeDraft(schema)).toEqual({
      id: expect.any(String),
      type: 'NUMERIC',
      scope: 'global',
    });
  });

  it('adds question_id when schema has the property and questionId provided', () => {
    const schema: JSONSchema7 = {
      properties: {
        type: { const: 'TEXT_MATCH' },
        question_id: { type: 'string' },
      },
    };
    expect(materializeDraft(schema, 'Q1')).toEqual({
      id: expect.any(String),
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

  it('keeps schema type authoritative over initial type', () => {
    const schema: JSONSchema7 = {
      properties: { type: { const: 'TEXT_MATCH' } },
    };
    const initial = { type: 'EXISTING' } as never;
    expect(materializeDraft(schema, null, initial)).toMatchObject({
      type: 'TEXT_MATCH',
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
