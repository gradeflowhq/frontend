import { describe, expect, it } from 'vitest';

import { stripEngineKeysFromRulesSchema } from '@features/rules/schema/strip';

describe('stripEngineKeysFromRulesSchema', () => {
  it('removes engine keys from properties', () => {
    const schema = {
      TextMatchRule: {
        properties: {
          type: { const: 'TEXT_MATCH', default: 'TEXT_MATCH', readOnly: true },
          question_types: { default: ['TEXT'] },
          constraints: { default: [{ source: 'options', target: 'match_values' }] },
          match_values: { type: 'array' },
        },
        required: ['type', 'question_types', 'match_values'],
      },
    };

    const result = stripEngineKeysFromRulesSchema(schema);
    const props = (result.TextMatchRule as Record<string, unknown>).properties as Record<string, unknown>;

    expect(props).not.toHaveProperty('question_types');
    expect(props).not.toHaveProperty('constraints');
    expect(props).toHaveProperty('match_values');
  });

  it('converts const to enum and strips readOnly from discriminator props', () => {
    const schema = {
      SomeRule: {
        properties: {
          type: { const: 'SOME', default: 'SOME', readOnly: true },
          dtype: { const: 'Int', default: 'Int', readOnly: true },
        },
      },
    };

    const result = stripEngineKeysFromRulesSchema(schema);
    const props = (result.SomeRule as Record<string, unknown>).properties as Record<string, unknown>;
    const typeProp = props.type as Record<string, unknown>;
    const dtypeProp = props.dtype as Record<string, unknown>;

    expect(typeProp).not.toHaveProperty('const');
    expect(typeProp).not.toHaveProperty('readOnly');
    expect(typeProp.default).toBe('SOME');
    expect(typeProp.enum).toEqual(['SOME']);

    expect(dtypeProp).not.toHaveProperty('const');
    expect(dtypeProp).not.toHaveProperty('readOnly');
    expect(dtypeProp.default).toBe('Int');
    expect(dtypeProp.enum).toEqual(['Int']);
  });

  it('removes engine keys from required array', () => {
    const schema = {
      Rule: {
        properties: {
          type: { const: 'X' },
          question_types: { default: [] },
        },
        required: ['type', 'question_types'],
      },
    };

    const result = stripEngineKeysFromRulesSchema(schema);
    expect((result.Rule as Record<string, unknown>).required).toEqual(['type']);
  });

  it('does not mutate original schema', () => {
    const schema = {
      Rule: { properties: { question_types: { default: [] } }, required: ['question_types'] },
    };
    const original = JSON.parse(JSON.stringify(schema));
    stripEngineKeysFromRulesSchema(schema);
    expect(schema).toEqual(original);
  });

  it('handles schema with definitions wrapper', () => {
    const schema = {
      definitions: {
        Rule: {
          properties: {
            question_types: { default: [] },
            value: { type: 'number' },
          },
        },
      },
    };

    const result = stripEngineKeysFromRulesSchema(schema);
    const defs = (result as Record<string, unknown>).definitions as Record<string, unknown>;
    const props = (defs.Rule as Record<string, unknown>).properties as Record<string, unknown>;
    expect(props).not.toHaveProperty('question_types');
    expect(props).toHaveProperty('value');
  });

  it('accepts custom engine keys', () => {
    const schema = {
      Rule: { properties: { custom_key: {}, value: { type: 'string' } } },
    };
    const result = stripEngineKeysFromRulesSchema(schema, ['custom_key']);
    const props = (result.Rule as Record<string, unknown>).properties as Record<string, unknown>;
    expect(props).not.toHaveProperty('custom_key');
    expect(props).toHaveProperty('value');
  });
});
