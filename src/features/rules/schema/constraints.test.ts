import { describe, expect, it } from 'vitest';

import { injectEnumsFromConstraintsForQuestion } from '@features/rules/schema/constraints';

describe('injectEnumsFromConstraintsForQuestion', () => {
  const makeRulesSchema = (constraints: unknown[], targetProp?: Record<string, unknown>) => ({
    TextMatchRule: {
      properties: {
        type: { const: 'TEXT_MATCH' },
        question_id: { type: 'string' },
        constraints: { default: constraints },
        match_values: targetProp ?? { type: 'string' },
      },
    },
  });

  const questionSchemas: Record<string, Record<string, unknown>> = {
    Q1: { type: 'TEXT', options: ['A', 'B', 'C'] },
    Q2: { type: 'NUMERIC' },
  };

  it('injects enum from question source into rule target property', () => {
    const schema = makeRulesSchema([{ source: 'options', target: 'match_values' }]);
    const result = injectEnumsFromConstraintsForQuestion(schema, questionSchemas, 'Q1');
    const props = (result.TextMatchRule as Record<string, unknown>).properties as Record<string, unknown>;
    expect((props.match_values as Record<string, unknown>).enum).toEqual(['A', 'B', 'C']);
  });

  it('injects enum into array items when target is array type', () => {
    const schema = makeRulesSchema(
      [{ source: 'options', target: 'match_values' }],
      { type: 'array', items: { type: 'string' } },
    );
    const result = injectEnumsFromConstraintsForQuestion(schema, questionSchemas, 'Q1');
    const props = (result.TextMatchRule as Record<string, unknown>).properties as Record<string, unknown>;
    const matchValues = props.match_values as Record<string, unknown>;
    expect((matchValues.items as Record<string, unknown>).enum).toEqual(['A', 'B', 'C']);
  });

  it('returns unchanged schema when question not found', () => {
    const schema = makeRulesSchema([{ source: 'options', target: 'match_values' }]);
    const result = injectEnumsFromConstraintsForQuestion(schema, questionSchemas, 'MISSING');
    const props = (result.TextMatchRule as Record<string, unknown>).properties as Record<string, unknown>;
    expect((props.match_values as Record<string, unknown>).enum).toBeUndefined();
  });

  it('skips constraints with missing source in question', () => {
    const schema = makeRulesSchema([{ source: 'nonexistent', target: 'match_values' }]);
    const result = injectEnumsFromConstraintsForQuestion(schema, questionSchemas, 'Q1');
    const props = (result.TextMatchRule as Record<string, unknown>).properties as Record<string, unknown>;
    expect((props.match_values as Record<string, unknown>).enum).toBeUndefined();
  });

  it('creates target property if it does not exist', () => {
    const schema = {
      SomeRule: {
        properties: {
          constraints: { default: [{ source: 'options', target: 'new_field' }] },
        },
      },
    };
    const result = injectEnumsFromConstraintsForQuestion(
      schema, questionSchemas, 'Q1',
    );
    const props = (result.SomeRule as Record<string, unknown>).properties as Record<string, unknown>;
    expect((props.new_field as Record<string, unknown>).enum).toEqual(['A', 'B', 'C']);
  });

  it('does not mutate original schema', () => {
    const schema = makeRulesSchema([{ source: 'options', target: 'match_values' }]);
    const original = JSON.parse(JSON.stringify(schema));
    injectEnumsFromConstraintsForQuestion(schema, questionSchemas, 'Q1');
    expect(schema).toEqual(original);
  });

  it('handles scalar source value as single-element enum', () => {
    const questions = { Q1: { category: 'math' } };
    const schema = makeRulesSchema([{ source: 'category', target: 'match_values' }]);
    const result = injectEnumsFromConstraintsForQuestion(schema, questions, 'Q1');
    const props = (result.TextMatchRule as Record<string, unknown>).properties as Record<string, unknown>;
    expect((props.match_values as Record<string, unknown>).enum).toEqual(['math']);
  });
});
