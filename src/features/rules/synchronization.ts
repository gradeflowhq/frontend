import { getRuleTargetQids } from '@features/rules/schema';
import { natsort } from '@utils/sort';

import type { RuleValue } from './types';

export interface InvalidRuleReference {
  ruleIndex: number;
  rule: RuleValue;
  label: string;
  missingQuestionIds: string[];
  summary: string;
}

const getRuleLabel = (rule: RuleValue): string => rule.display_name;

export const getInvalidRuleReferences = (
  rules: readonly RuleValue[],
  questionIds: readonly string[],
): InvalidRuleReference[] => {
  const validQuestionIds = new Set(questionIds);

  return rules.flatMap((rule, ruleIndex) => {
    const missingQuestionIds = [...new Set(
      getRuleTargetQids(rule).filter((qid) => !validQuestionIds.has(qid)),
    )].sort(natsort);

    if (missingQuestionIds.length === 0) {
      return [];
    }

    const label = getRuleLabel(rule);

    return [{
      ruleIndex,
      rule,
      label,
      missingQuestionIds,
      summary: `${missingQuestionIds.join(', ')} -> ${label}`,
    }];
  });
};

export const synchronizeRules = (
  rules: readonly RuleValue[],
  invalidRules: readonly InvalidRuleReference[],
): RuleValue[] => {
  const invalidRuleIndexes = new Set(invalidRules.map((rule) => rule.ruleIndex));
  return rules.filter((_, index) => !invalidRuleIndexes.has(index));
};