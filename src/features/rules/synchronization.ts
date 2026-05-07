import { getRuleTargetQids } from '@features/rules/schema';
import { natsort } from '@utils/sort';

import type { RuleValue } from './types';

export interface InvalidRuleReference {
  ruleId: string;
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

  return rules.flatMap((rule) => {
    const missingQuestionIds = [...new Set(
      getRuleTargetQids(rule).filter((qid) => !validQuestionIds.has(qid)),
    )].sort(natsort);

    if (missingQuestionIds.length === 0) {
      return [];
    }

    const label = getRuleLabel(rule);

    return [{
      ruleId: rule.id,
      rule,
      label,
      missingQuestionIds,
      summary: `${missingQuestionIds.join(', ')} -> ${label}`,
    }];
  });
};
