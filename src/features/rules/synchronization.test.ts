import { describe, expect, it } from 'vitest';

import { getInvalidRuleReferences, synchronizeRules } from './synchronization';

import type { RuleValue } from './types';

describe('rule synchronization helpers', () => {
  it('detects invalid single-target and multi-target rules', () => {
    const rules = [
      { type: 'TEXT_MATCH', display_name: 'Text Match', question_id: 'Q1' },
      { type: 'TEXT_MATCH', display_name: 'Text Match', question_id: 'Q9' },
      {
        type: 'CONDITIONAL',
        display_name: 'Conditional',
        then_rules: [{ type: 'TEXT_MATCH', display_name: 'Text Match', question_id: 'Q10' }],
        else_rules: [{ type: 'TEXT_MATCH', display_name: 'Text Match', question_id: 'Q2' }],
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
      { type: 'TEXT_MATCH', display_name: 'Text Match', question_id: 'Q1' },
      { type: 'TEXT_MATCH', display_name: 'Text Match', question_id: 'Q9' },
    ] as RuleValue[];

    const invalidRules = getInvalidRuleReferences(rules, ['Q1']);

    expect(synchronizeRules(rules, invalidRules)).toEqual([
      { type: 'TEXT_MATCH', display_name: 'Text Match', question_id: 'Q1' },
    ]);
  });

  it('returns empty when all rules are valid', () => {
    const rules = [
      { type: 'TEXT_MATCH', display_name: 'R1', question_id: 'Q1' },
    ] as unknown as RuleValue[];
    expect(getInvalidRuleReferences(rules, ['Q1'])).toEqual([]);
  });

  it('marks all rules invalid when questionIds is empty', () => {
    const rules = [
      { type: 'TEXT_MATCH', display_name: 'R1', question_id: 'Q1' },
      { type: 'TEXT_MATCH', display_name: 'R2', question_id: 'Q2' },
    ] as unknown as RuleValue[];
    const invalid = getInvalidRuleReferences(rules, []);
    expect(invalid).toHaveLength(2);
  });

  it('handles empty rules array', () => {
    expect(getInvalidRuleReferences([], ['Q1'])).toEqual([]);
    expect(synchronizeRules([], [])).toEqual([]);
  });

  it('deduplicates missing IDs and sorts naturally', () => {
    const rules = [
      {
        type: 'MULTI', display_name: 'Multi',
        question_ids: ['Q10', 'Q2', 'Q10'],
      },
    ] as unknown as RuleValue[];
    const invalid = getInvalidRuleReferences(rules, []);
    expect(invalid[0].missingQuestionIds).toEqual(['Q2', 'Q10']);
  });

  it('synchronizeRules keeps non-contiguous valid rules', () => {
    const rules = [
      { type: 'TEXT_MATCH', display_name: 'R0', question_id: 'Q_BAD' },
      { type: 'TEXT_MATCH', display_name: 'R1', question_id: 'Q1' },
      { type: 'TEXT_MATCH', display_name: 'R2', question_id: 'Q_BAD2' },
      { type: 'TEXT_MATCH', display_name: 'R3', question_id: 'Q2' },
    ] as unknown as RuleValue[];
    const invalid = getInvalidRuleReferences(rules, ['Q1', 'Q2']);
    const synced = synchronizeRules(rules, invalid);
    expect(synced.map((r) => r.display_name)).toEqual(['R1', 'R3']);
  });
});