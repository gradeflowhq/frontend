import type {
  RubricOutput,
  RubricOutputRulesItem,
  RubricInput,
  RubricInputRulesItem,
  QuestionSetOutputQuestionMap,
  QuestionConstraintType,
  ValidateRubricResponse,
} from '@api/models';

// Re-export API types (single source of truth)
export type {
  RubricOutput,
  RubricOutputRulesItem,
  RubricInput,
  RubricInputRulesItem,
  QuestionSetOutputQuestionMap,
  ValidateRubricResponse,
};

// Unified rule value type used by UI
export type RuleValue = RubricOutputRulesItem | RubricInputRulesItem;

// Alias the existing model type for UI code
export type QuestionType = QuestionConstraintType;