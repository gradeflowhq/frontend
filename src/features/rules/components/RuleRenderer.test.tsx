import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import RuleRenderer from './RuleRenderer';

import type { RuleValue } from '../types';
import type { JSONSchema7 } from 'json-schema';

const renderRule = (value: RuleValue, schema: JSONSchema7 | null) => render(
  <MantineProvider>
    <RuleRenderer value={value} schema={schema} hideRootType flatRoot />
  </MantineProvider>,
);

describe('RuleRenderer', () => {
  it('renders only fields described by the schema', () => {
    renderRule(
      {
        id: 'rule-1',
        type: 'TEXT_MATCH',
        display_name: 'Text Match',
        answer: 'correct',
        extra: 'internal',
      } as unknown as RuleValue,
      {
        type: 'object',
        title: 'Text Match',
        properties: {
          type: { const: 'TEXT_MATCH', readOnly: true },
          answer: { type: 'string', title: 'Answer' },
        },
      },
    );

    expect(screen.getByText('Answer')).toBeInTheDocument();
    expect(screen.getByText('correct')).toBeInTheDocument();
    expect(screen.queryByText('rule-1')).not.toBeInTheDocument();
    expect(screen.queryByText('TEXT_MATCH')).not.toBeInTheDocument();
    expect(screen.queryByText('Text Match')).not.toBeInTheDocument();
    expect(screen.queryByText('internal')).not.toBeInTheDocument();
  });

  it('does not render object internals without schema', () => {
    renderRule(
      {
        id: 'rule-1',
        type: 'TEXT_MATCH',
        answer: 'correct',
      } as unknown as RuleValue,
      null,
    );

    expect(screen.queryByText('{}')).not.toBeInTheDocument();
    expect(screen.queryByText('rule-1')).not.toBeInTheDocument();
    expect(screen.queryByText('TEXT_MATCH')).not.toBeInTheDocument();
    expect(screen.queryByText('correct')).not.toBeInTheDocument();
  });

  it('hides read-only schema fields at every rendered level', () => {
    renderRule(
      {
        type: 'PROGRAMMABLE',
        question_id: 'q1',
        generated: 'internal',
        parameters: {
          points: { dtype: 'Int', value: 2 },
        },
      } as unknown as RuleValue,
      {
        type: 'object',
        properties: {
          type: { const: 'PROGRAMMABLE', readOnly: true },
          question_id: { const: 'q1', readOnly: true, title: 'Question Id' },
          generated: { type: 'string', readOnly: true, title: 'Generated' },
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
                },
              ],
            },
          },
        },
      },
    );

    expect(screen.getAllByText('Parameters').length).toBeGreaterThan(0);
    expect(screen.getByText('Value')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.queryByText('Question Id')).not.toBeInTheDocument();
    expect(screen.queryByText('q1')).not.toBeInTheDocument();
    expect(screen.queryByText('Generated')).not.toBeInTheDocument();
    expect(screen.queryByText('internal')).not.toBeInTheDocument();
    expect(screen.queryByText('Dtype')).not.toBeInTheDocument();
  });

  it('selects nested union schemas from const fields', () => {
    renderRule(
      {
        type: 'PARENT_RULE',
        rule: {
          id: 'child-rule-id',
          type: 'RULE_B',
          threshold: 0.8,
          answer: 'wrong branch',
        },
      } as unknown as RuleValue,
      {
        type: 'object',
        properties: {
          type: { const: 'PARENT_RULE', readOnly: true },
          rule: {
            oneOf: [
              {
                type: 'object',
                title: 'Rule A',
                properties: {
                  type: { const: 'RULE_A', readOnly: true },
                  answer: { type: 'string', title: 'Answer' },
                },
              },
              {
                type: 'object',
                title: 'Rule B',
                properties: {
                  id: { type: 'string', readOnly: true, title: 'Id' },
                  type: { const: 'RULE_B', readOnly: true },
                  threshold: { type: 'number', title: 'Threshold' },
                },
              },
            ],
          },
        },
      },
    );

    expect(screen.getByText('Threshold')).toBeInTheDocument();
    expect(screen.getByText('0.8')).toBeInTheDocument();
    expect(screen.queryByText('child-rule-id')).not.toBeInTheDocument();
    expect(screen.queryByText('Answer')).not.toBeInTheDocument();
    expect(screen.queryByText('wrong branch')).not.toBeInTheDocument();
  });

  it('does not render a union branch when no discriminator matches', () => {
    renderRule(
      {
        type: 'PARENT_RULE',
        rule: {
          type: 'UNKNOWN_RULE',
          answer: 'wrong branch',
        },
      } as unknown as RuleValue,
      {
        type: 'object',
        properties: {
          type: { const: 'PARENT_RULE', readOnly: true },
          rule: {
            oneOf: [
              {
                type: 'object',
                title: 'Rule A',
                properties: {
                  type: { const: 'RULE_A', readOnly: true },
                  answer: { type: 'string', title: 'Answer' },
                },
              },
            ],
          },
        },
      },
    );

    expect(screen.queryByText('Rule A')).not.toBeInTheDocument();
    expect(screen.queryByText('Answer')).not.toBeInTheDocument();
    expect(screen.queryByText('wrong branch')).not.toBeInTheDocument();
  });

  it('renders code fields from schema input hints', async () => {
    renderRule(
      {
        type: 'PROGRAMMABLE',
        code: 'passed = True',
        config: {
          prepend_code: 'def answer():',
          append_code: 'output = answer()',
        },
      } as unknown as RuleValue,
      {
        type: 'object',
        properties: {
          type: { const: 'PROGRAMMABLE', readOnly: true },
          code: {
            type: 'string',
            title: 'Code',
            'x-gradeflow': { input: 'code' },
          },
          config: { $ref: '#/$defs/ProgrammingConfig' },
        },
        $defs: {
          ProgrammingConfig: {
            type: 'object',
            properties: {
              prepend_code: {
                type: 'string',
                title: 'Prepend Code',
                'x-gradeflow': { input: 'code' },
              },
              append_code: {
                type: 'string',
                title: 'Append Code',
                'x-gradeflow': { input: 'code' },
              },
            },
          },
        },
      } as JSONSchema7,
    );

    expect(await screen.findByRole('button', { name: 'Code' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Prepend Code' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Append Code' })).toBeInTheDocument();
  });
});
