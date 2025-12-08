import type {
  QuestionSetInput,
  QuestionSetOutput,
  QuestionSetInputQuestionMap,
  QuestionSetOutputQuestionMap,
  ChoiceQuestion,
  MultiValuedQuestion,
  TextQuestion,
  NumericQuestion,
  ParseSubmissionsResponse,
} from '@api/models';

// Re-export API types (single source of truth)
export type {
  QuestionSetInput,
  QuestionSetOutput,
  QuestionSetInputQuestionMap,
  QuestionSetOutputQuestionMap,
  ChoiceQuestion,
  MultiValuedQuestion,
  TextQuestion,
  NumericQuestion,
  ParseSubmissionsResponse,
};

// Union and type alias for convenience
export type QuestionDef = ChoiceQuestion | MultiValuedQuestion | TextQuestion | NumericQuestion;

// Derived UI types
export type QuestionId = string;
export type QuestionType = 'TEXT' | 'NUMERIC' | 'CHOICE' | 'MULTI_VALUED';

// Examples mapping (used by QuestionsTable)
export type ExamplesByQuestion = Record<QuestionId, unknown[]>;