import { describe, expect, it } from 'vitest';

import { buildRuleUiSchema } from './schemaUi';

import type { JSONSchema7 } from 'json-schema';

const arrayItemUi = (
  uiSchema: Record<string, unknown>,
  key: string,
  index: number,
): Record<string, unknown> => {
  const items = (uiSchema[key] as Record<string, unknown>).items;
  expect(items).toEqual(expect.any(Function));
  return (items as (item: unknown, index: number) => Record<string, unknown>)({}, index);
};

describe('buildRuleUiSchema', () => {
  it('maps neutral input hints to renderer ui schema', () => {
    const schema = {
      type: 'object',
      properties: {
        type: { const: 'RULE_A', readOnly: true },
        question_id: { const: 'q1', readOnly: true },
        code: { type: 'string', 'x-gradeflow': { input: 'code' } },
        answers: {
          type: 'array',
          items: { type: 'string' },
          'x-gradeflow': { input: 'string-list', suggestions: ['Alice'] },
        },
        rules: {
          type: 'array',
          minItems: 2,
          maxItems: 2,
          items: { oneOf: [] },
          'x-gradeflow': { input: 'rule-list' },
        },
      },
    };

    expect(buildRuleUiSchema(schema as JSONSchema7)).toEqual({
      type: {
        'ui:widget': 'hidden',
        'ui:title': '',
        'ui:options': { label: false, hidden: true },
      },
      question_id: {
        'ui:widget': 'hidden',
        'ui:title': '',
        'ui:options': { label: false, hidden: true },
      },
      code: {
        'ui:widget': 'CodeEditorWidget',
        'ui:options': { language: 'python', height: '320px' },
      },
      answers: { 'ui:field': 'StringListField' },
      rules: {
        items: {
          'ui:field': 'RuleSlotField',
          'ui:fieldReplacesAnyOrOneOf': true,
        },
        'ui:options': {
          addable: false,
          orderable: false,
          removable: false,
        },
      },
    });
  });

  it('does not hide editable const fields by name', () => {
    const schema = {
      type: 'object',
      properties: {
        question_id: { const: 'q1' },
      },
    };

    expect(buildRuleUiSchema(schema as JSONSchema7)).toEqual({});
  });

  it('hides read-only fields without relying on field names', () => {
    const schema = {
      type: 'object',
      properties: {
        generated: { type: 'string', readOnly: true },
      },
    };

    expect(buildRuleUiSchema(schema as JSONSchema7)).toEqual({
      generated: {
        'ui:widget': 'hidden',
        'ui:title': '',
        'ui:options': { label: false, hidden: true },
      },
    });
  });

  it('recurses through object arrays and local refs', () => {
    const schema = {
      type: 'object',
      properties: {
        assumptions: {
          type: 'array',
          items: { $ref: '#/$defs/Assumption' },
        },
      },
      $defs: {
        Assumption: {
          type: 'object',
          title: 'Assumption',
          properties: {
            rule: {
              oneOf: [],
              'x-gradeflow': { input: 'rule' },
            },
          },
        },
      },
    };

    const result = buildRuleUiSchema(schema as JSONSchema7);

    expect(arrayItemUi(result, 'assumptions', 0)).toEqual({
      'ui:title': 'Assumption 1',
      rule: {
        'ui:field': 'RuleSlotField',
        'ui:fieldReplacesAnyOrOneOf': true,
      },
    });
    expect(arrayItemUi(result, 'assumptions', 1)['ui:title']).toBe('Assumption 2');
  });

  it('recurses through nested object refs with input hints', () => {
    const schema = {
      type: 'object',
      properties: {
        config: { $ref: '#/$defs/CodeTestConfig' },
      },
      $defs: {
        CodeTestConfig: {
          type: 'object',
          properties: {
            prepend_code: { type: 'string', 'x-gradeflow': { input: 'code' } },
            append_code: { type: 'string', 'x-gradeflow': { input: 'code' } },
          },
        },
      },
    };

    expect(buildRuleUiSchema(schema as JSONSchema7)).toEqual({
      config: {
        prepend_code: {
          'ui:widget': 'CodeEditorWidget',
          'ui:options': { language: 'python', height: '320px' },
        },
        append_code: {
          'ui:widget': 'CodeEditorWidget',
          'ui:options': { language: 'python', height: '320px' },
        },
      },
    });
  });

  it('numbers default object array items from their schema title', () => {
    const schema = {
      type: 'object',
      properties: {
        testcases: {
          type: 'array',
          title: 'Testcases',
          items: { $ref: '#/$defs/CodeTestCase' },
        },
      },
      $defs: {
        CodeTestCase: {
          type: 'object',
          title: 'Test Case',
          properties: {
            expression: { type: 'string' },
            expected: { type: 'string' },
          },
        },
      },
    };

    const result = buildRuleUiSchema(schema as JSONSchema7);

    expect(arrayItemUi(result, 'testcases', 0)['ui:title']).toBe('Test Case 1');
    expect(arrayItemUi(result, 'testcases', 1)['ui:title']).toBe('Test Case 2');
  });

  it('recurses through additional property union schemas', () => {
    const schema = {
      type: 'object',
      properties: {
        parameters: {
          type: 'object',
          additionalProperties: {
            oneOf: [
              {
                type: 'object',
                properties: {
                  dtype: { const: 'Int', default: 'Int', readOnly: true },
                  value: { type: 'integer' },
                },
              },
            ],
          },
        },
      },
    };

    expect(buildRuleUiSchema(schema as JSONSchema7)).toEqual({
      parameters: {
        additionalProperties: {
          dtype: {
            'ui:widget': 'hidden',
            'ui:title': '',
            'ui:options': { label: false, hidden: true },
          },
        },
      },
    });
  });

  it('handles recursive nested rule schemas', () => {
    const schema = {
      type: 'object',
      properties: {
        assumptions: {
          type: 'array',
          items: { $ref: '#/$defs/Assumption' },
        },
      },
      $defs: {
        Assumption: {
          type: 'object',
          properties: {
            rule: {
              oneOf: [{ $ref: '#/$defs/AssumptionSet' }],
              'x-gradeflow': { input: 'rule' },
            },
          },
        },
        AssumptionSet: {
          type: 'object',
          properties: {
            type: { const: 'ASSUMPTION_SET', readOnly: true },
            assumptions: {
              type: 'array',
              items: { $ref: '#/$defs/Assumption' },
            },
          },
        },
      },
    };

    expect(buildRuleUiSchema(schema as JSONSchema7)).toMatchObject({
      assumptions: {
        items: {
          rule: {
            'ui:field': 'RuleSlotField',
            'ui:fieldReplacesAnyOrOneOf': true,
          },
        },
      },
    });
  });
});
