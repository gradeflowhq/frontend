import type {
  RubricOutputRulesItem,
  RubricInputRulesItem,
  QuestionConstraintType,
} from '@api/models';

// Unified rule value type used by UI — backend rules always carry these fields.
export type RuleValue = (RubricOutputRulesItem | RubricInputRulesItem) & {
  id: string;
  type: RubricOutputRulesItem['type'];
  scope: RubricOutputRulesItem['scope'];
  display_name: string;
};

// Alias the existing model type for UI code
export type QuestionType = QuestionConstraintType;
