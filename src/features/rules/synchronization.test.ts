import { describe, expect, it } from 'vitest';

import { getInvalidRuleReferences, synchronizeRules } from './synchronization';

import type { RuleValue } from './types';

describe('rule synchronization helpers', () => {
  it('detects invalid single-target and multi-target rules', () => {
    const rules = [
      { type: 'TEXT_MATCH', name: 'Text Match', question_id: 'Q1' },
      { type: 'TEXT_MATCH', name: 'Text Match', question_id: 'Q9' },
      {
        type: 'CONDITIONAL',
        name: 'Conditional',
        then_rules: [{ type: 'TEXT_MATCH', name: 'Text Match', question_id: 'Q10' }],
        else_rules: [{ type: 'TEXT_MATCH', name: 'Text Match', question_id: 'Q2' }],
      },
    ] as RuleValue[];

    const invalidRules = getInvalidRuleReferences(rules, ['Q1', 'Q2']);

    expect(invalidRules).toEqual([
      expect.objectContaining({ ruleIndex: 1, missingQuestionIds: ['Q9'], summary: 'Q9 -> Text Match' }),
      expect.objectContaining({ ruleIndex: 2, missingQuestionIds: ['Q10'], summary: 'Q10 -> Conditional' }),
    ]);
  });

  it('removes rules that reference deleted questions', () => {
    const rules = [
      { type: 'TEXT_MATCH', name: 'Text Match', question_id: 'Q1' },
      { type: 'TEXT_MATCH', name: 'Text Match', question_id: 'Q9' },
    ] as RuleValue[];

    const invalidRules = getInvalidRuleReferences(rules, ['Q1']);

    expect(synchronizeRules(rules, invalidRules)).toEqual([
      { type: 'TEXT_MATCH', name: 'Text Match', question_id: 'Q1' },
    ]);
  });
});