import { describe, expect, it } from 'vitest';

import {
  augmentRulesSchemaWithTitles,
  filterNestedRuleOneOfByQuestionType,
  augmentRulesSchemaWithQuestionIdEnums,
  prependUnselectedPlaceholderToNestedOneOf,
  ruleTitleResolver,
  parameterTitleResolver,
  type TitleResolver,
} from '@features/rules/schema/augment';

describe('ruleTitleResolver', () => {
  it('returns camelCase-split fallback for key not in schema lookup', () => {
    expect(ruleTitleResolver('CompletelyUnknown', {})).toBe('Completely Unknown');
  });
});

describe('parameterTitleResolver', () => {
  it('returns dtype const value', () => {
    const def = { properties: { dtype: { const: 'Float' } } };
    expect(parameterTitleResolver('SomeDef', def)).toBe('Float');
  });

  it('returns dtype default value', () => {
    const def = { properties: { dtype: { default: 'Int' } } };
    expect(parameterTitleResolver('SomeDef', def)).toBe('Int');
  });

  it('returns undefined when no dtype', () => {
    const def = { properties: { name: { const: 'test' } } };
    expect(parameterTitleResolver('SomeDef', def)).toBeUndefined();
  });

  it('returns undefined when no properties', () => {
    expect(parameterTitleResolver('SomeDef', {})).toBeUndefined();
  });
});

describe('augmentRulesSchemaWithTitles', () => {
  it('adds titles from the first matching resolver', () => {
    const schema = {
      Foo: { properties: {} },
      Bar: { properties: {} },
    };
    const resolver1: TitleResolver = (key) => (key === 'Foo' ? 'Foo Title' : undefined);
    const resolver2: TitleResolver = () => 'Fallback';

    const result = augmentRulesSchemaWithTitles(schema, [resolver1, resolver2]);
    expect((result.Foo as Record<string, unknown>).title).toBe('Foo Title');
    expect((result.Bar as Record<string, unknown>).title).toBe('Fallback');
  });

  it('does not add title when no resolver matches', () => {
    const schema = { Foo: { properties: {} } };
    const resolver: TitleResolver = () => undefined;

    const result = augmentRulesSchemaWithTitles(schema, [resolver]);
    expect((result.Foo as Record<string, unknown>).title).toBeUndefined();
  });

  it('does not mutate original schema', () => {
    const schema = { Foo: { properties: {} } };
    const original = JSON.parse(JSON.stringify(schema));
    augmentRulesSchemaWithTitles(schema, [() => 'Title']);
    expect(schema).toEqual(original);
  });
});

describe('filterNestedRuleOneOfByQuestionType', () => {
  const schema = {
    TextMatchRule: {
      properties: {
        type: { const: 'TEXT_MATCH' },
        question_types: { default: ['TEXT'] },
      },
    },
    NumericRule: {
      properties: {
        type: { const: 'NUMERIC' },
        question_types: { default: ['NUMERIC'] },
      },
    },
    UniversalRule: {
      properties: {
        type: { const: 'UNIVERSAL' },
      },
    },
    ConditionalRule: {
      properties: {
        if_rules: {
          type: 'array',
          items: {
            oneOf: [
              { $ref: '#/definitions/TextMatchRule' },
              { $ref: '#/definitions/NumericRule' },
              { $ref: '#/definitions/UniversalRule' },
            ],
            discriminator: { propertyName: 'type' },
          },
        },
      },
    },
  };

  it('filters oneOf to only compatible rules', () => {
    const result = filterNestedRuleOneOfByQuestionType(schema, 'TEXT');
    const condProps = (result.ConditionalRule as Record<string, unknown>).properties as Record<string, unknown>;
    const items = (condProps.if_rules as Record<string, unknown>).items as Record<string, unknown>;
    const oneOf = items.oneOf as Array<{ $ref: string }>;
    const refs = oneOf.map((e) => e.$ref);
    expect(refs).toContain('#/definitions/TextMatchRule');
    expect(refs).toContain('#/definitions/UniversalRule');
    expect(refs).not.toContain('#/definitions/NumericRule');
  });

  it('preserves discriminator and prunes mapping after filtering', () => {
    const schemaWithMapping = {
      TextRule: { properties: { type: { const: 'TEXT' }, question_types: { default: ['TEXT'] } } },
      NumRule:  { properties: { type: { const: 'NUM'  }, question_types: { default: ['NUMERIC'] } } },
      Parent: {
        properties: {
          rules: {
            type: 'array',
            items: {
              oneOf: [
                { $ref: '#/definitions/TextRule' },
                { $ref: '#/definitions/NumRule' },
              ],
              discriminator: {
                propertyName: 'type',
                mapping: { TEXT: '#/definitions/TextRule', NUM: '#/definitions/NumRule' },
              },
            },
          },
        },
      },
    };
    const result = filterNestedRuleOneOfByQuestionType(schemaWithMapping, 'TEXT');
    const items = ((result.Parent as Record<string, unknown>).properties as Record<string, unknown>)
      .rules as Record<string, unknown>;
    const inner = (items as Record<string, unknown>).items as Record<string, unknown>;
    // discriminator should survive with pruned mapping
    expect(inner.discriminator).toBeDefined();
    const disc = inner.discriminator as { propertyName: string; mapping: Record<string, string> };
    expect(disc.propertyName).toBe('type');
    expect(disc.mapping).toEqual({ TEXT: '#/definitions/TextRule' });
    expect(disc.mapping).not.toHaveProperty('NUM');
  });

  it('returns schema unchanged when questionType is null', () => {
    const result = filterNestedRuleOneOfByQuestionType(schema, null);
    expect(result).toEqual(schema);
  });

  it('does not mutate original schema', () => {
    const original = JSON.parse(JSON.stringify(schema));
    filterNestedRuleOneOfByQuestionType(schema, 'TEXT');
    expect(schema).toEqual(original);
  });
});

describe('augmentRulesSchemaWithQuestionIdEnums', () => {
  const rulesSchema = {
    TextMatchRule: {
      properties: {
        type: { const: 'TEXT_MATCH' },
        question_id: { type: 'string' },
        question_types: { default: ['TEXT'] },
      },
    },
    NumericRule: {
      properties: {
        type: { const: 'NUMERIC' },
        question_id: { type: 'string' },
        question_types: { default: ['NUMERIC'] },
      },
    },
  };

  const questions = {
    Q1: { type: { default: 'TEXT' } },
    Q2: { type: { default: 'NUMERIC' } },
    Q3: { type: { default: 'TEXT' } },
  };

  it('injects compatible question IDs as enum', () => {
    const result = augmentRulesSchemaWithQuestionIdEnums(rulesSchema, questions);
    const textProps = (result.TextMatchRule as Record<string, unknown>).properties as Record<string, unknown>;
    const qidEnum = (textProps.question_id as Record<string, unknown>).enum as string[];
    expect(qidEnum.sort()).toEqual(['Q1', 'Q3']);
  });

  it('injects numeric question IDs for numeric rule', () => {
    const result = augmentRulesSchemaWithQuestionIdEnums(rulesSchema, questions);
    const numProps = (result.NumericRule as Record<string, unknown>).properties as Record<string, unknown>;
    const qidEnum = (numProps.question_id as Record<string, unknown>).enum as string[];
    expect(qidEnum).toEqual(['Q2']);
  });

  it('does not mutate original schema', () => {
    const original = JSON.parse(JSON.stringify(rulesSchema));
    augmentRulesSchemaWithQuestionIdEnums(rulesSchema, questions);
    expect(rulesSchema).toEqual(original);
  });
});

describe('prependUnselectedPlaceholderToNestedOneOf', () => {
  it('prepends placeholder to items.oneOf', () => {
    const schema = {
      ConditionalRule: {
        properties: {
          rules: {
            type: 'array',
            items: {
              oneOf: [{ $ref: '#/definitions/Foo' }],
            },
          },
        },
      },
    };
    const result = prependUnselectedPlaceholderToNestedOneOf(schema);
    const props = (result.ConditionalRule as Record<string, unknown>).properties as Record<string, unknown>;
    const items = (props.rules as Record<string, unknown>).items as Record<string, unknown>;
    const oneOf = items.oneOf as Array<Record<string, unknown>>;
    expect(oneOf).toHaveLength(2);
    expect(oneOf[0].title).toBe('Select\u2026');
  });

  it('does not double-prepend', () => {
    const schema = {
      Rule: {
        properties: {
          sub: {
            type: 'array',
            items: {
              oneOf: [{ title: 'Select\u2026' }, { $ref: '#/definitions/Foo' }],
            },
          },
        },
      },
    };
    const result = prependUnselectedPlaceholderToNestedOneOf(schema);
    const props = (result.Rule as Record<string, unknown>).properties as Record<string, unknown>;
    const items = (props.sub as Record<string, unknown>).items as Record<string, unknown>;
    expect((items.oneOf as unknown[]).length).toBe(2);
  });
});
