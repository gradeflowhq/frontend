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

    const nestedRuleOptions =
      ((prepared.Assumption?.properties?.rule as {
        oneOf?: Array<{ $ref?: string; title?: string }>;
      } | undefined)?.oneOf ?? []);
    const nestedRuleRefs = nestedRuleOptions
      .map((entry) => entry.$ref?.split('/').pop())
      .filter((value): value is string => typeof value === 'string');

    expect(nestedRuleRefs).toContain('MultipleChoiceRule');
    expect(nestedRuleRefs).not.toContain('CompositeRule');
    expect(nestedRuleRefs).not.toContain('MultiValuedRule');

    expect(prepared.CompositeRule?.properties?.question_types).toBeUndefined();
    expect(prepared.CompositeRule?.properties?.constraints).toBeUndefined();
  });

  it('strips engine keys from all definitions', () => {
    const prepared = prepareRuleDefinitionsForRender(
      rulesSchema as Record<string, unknown>,
    ) as Record<string, { properties?: Record<string, unknown> }>;

    for (const [, def] of Object.entries(prepared)) {
      if (!def?.properties) continue;
      expect(def.properties.question_types).toBeUndefined();
      expect(def.properties.constraints).toBeUndefined();
    }
  });
});