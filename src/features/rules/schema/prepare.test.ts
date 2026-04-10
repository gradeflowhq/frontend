import { describe, expect, it } from 'vitest';

import rulesSchema from '@schemas/rules.json';

import { prepareRuleDefinitionsForRender } from './prepare';

describe('prepareRuleDefinitionsForRender', () => {
  it('filters incompatible nested assumption rules before engine keys are stripped', () => {
    const prepared = prepareRuleDefinitionsForRender(
      rulesSchema as Record<string, unknown>,
      {
        questionMap: {
          q1: { type: 'CHOICE' },
        },
        questionId: 'q1',
        questionType: 'CHOICE',
        isSingleTarget: true,
      },
    ) as Record<string, { properties?: Record<string, unknown> }>;

    const nestedRuleRefs = ((prepared.Assumption?.properties?.rule as { oneOf?: Array<{ $ref: string }> } | undefined)?.oneOf ?? [])
      .map((entry) => entry.$ref.split('/').pop());

    expect(nestedRuleRefs).toContain('MultipleChoiceRule');
    expect(nestedRuleRefs).not.toContain('CompositeRule');
    expect(nestedRuleRefs).not.toContain('MultiValuedRule');

    expect(prepared.CompositeRule?.properties?.question_types).toBeUndefined();
    expect(prepared.CompositeRule?.properties?.constraints).toBeUndefined();
  });
});