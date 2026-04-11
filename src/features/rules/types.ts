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

// Unified rule value type used by UI — name is always present at runtime (backend always provides it)
export type RuleValue = (RubricOutputRulesItem | RubricInputRulesItem) & { name: string };

// Alias the existing model type for UI code
export type QuestionType = QuestionConstraintType;