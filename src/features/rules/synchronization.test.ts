import { describe, expect, it } from 'vitest';

import { getInvalidRuleReferences } from './synchronization';

import type { RuleValue } from './types';

describe('rule synchronization helpers', () => {
  it('detects invalid single-target and multi-target rules', () => {
    const rules = [
      { id: 'r1', type: 'TEXT_MATCH', display_name: 'Text Match', question_id: 'Q1' },
      { id: 'r2', type: 'TEXT_MATCH', display_name: 'Text Match', question_id: 'Q9' },
      {
        id: 'r3',
        type: 'CONDITIONAL',
        display_name: 'Conditional',
        then_rules: [{ type: 'TEXT_MATCH', display_name: 'Text Match', question_id: 'Q10' }],
        else_rules: [{ type: 'TEXT_MATCH', display_name: 'Text Match', question_id: 'Q2' }],
      },
    ] as RuleValue[];

    const invalidRules = getInvalidRuleReferences(rules, ['Q1', 'Q2']);

    expect(invalidRules).toEqual([
      expect.objectContaining({ ruleId: 'r2', missingQuestionIds: ['Q9'], summary: 'Q9 -> Text Match' }),
      expect.objectContaining({ ruleId: 'r3', missingQuestionIds: ['Q10'], summary: 'Q10 -> Conditional' }),
    ]);
  });

  it('reports rule IDs for delete-by-id synchronization', () => {
    const rules = [
      { id: 'r1', type: 'TEXT_MATCH', display_name: 'Text Match', question_id: 'Q1' },
      { id: 'r2', type: 'TEXT_MATCH', display_name: 'Text Match', question_id: 'Q9' },
    ] as RuleValue[];

    const invalidRules = getInvalidRuleReferences(rules, ['Q1']);

    expect(invalidRules.map((rule) => rule.ruleId)).toEqual(['r2']);
  });

  it('returns empty when all rules are valid', () => {
    const rules = [
      { id: 'r1', type: 'TEXT_MATCH', display_name: 'R1', question_id: 'Q1' },
    ] as unknown as RuleValue[];
    expect(getInvalidRuleReferences(rules, ['Q1'])).toEqual([]);
  });

  it('marks all rules invalid when questionIds is empty', () => {
    const rules = [
      { id: 'r1', type: 'TEXT_MATCH', display_name: 'R1', question_id: 'Q1' },
      { id: 'r2', type: 'TEXT_MATCH', display_name: 'R2', question_id: 'Q2' },
    ] as unknown as RuleValue[];
    const invalid = getInvalidRuleReferences(rules, []);
    expect(invalid).toHaveLength(2);
  });

  it('handles empty rules array', () => {
    expect(getInvalidRuleReferences([], ['Q1'])).toEqual([]);
  });

  it('deduplicates missing IDs and sorts naturally', () => {
    const rules = [
      {
        id: 'r1', type: 'MULTI', display_name: 'Multi',
        question_ids: ['Q10', 'Q2', 'Q10'],
      },
    ] as unknown as RuleValue[];
    const invalid = getInvalidRuleReferences(rules, []);
    expect(invalid[0].missingQuestionIds).toEqual(['Q2', 'Q10']);
  });

});
