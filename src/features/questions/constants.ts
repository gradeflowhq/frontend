import questionsSchema from '@schemas/questions.json';

/** Mantine colour name for each question type badge. */
export const QUESTION_TYPE_COLORS: Record<string, string> = {
  TEXT: 'gray',
  NUMERIC: 'blue',
  CHOICE: 'violet',
  MULTI_VALUED: 'teal',
};

/** All supported question type keys. */
export const QUESTION_TYPES = ['TEXT', 'NUMERIC', 'CHOICE', 'MULTI_VALUED'] as const;

/**
 * Return the JSON schema object for the given question type.
 * Falls back to TextQuestion when the type is unknown.
 */
export const selectRootSchema = (type: string | undefined): object | null => {
  const dict = questionsSchema as Record<string, unknown>;
  switch (type) {
    case 'CHOICE':
      return (dict.ChoiceQuestion as object) ?? null;
    case 'MULTI_VALUED':
      return (dict.MultiValuedQuestion as object) ?? null;
    case 'NUMERIC':
      return (dict.NumericQuestion as object) ?? null;
    case 'TEXT':
    default:
      return (dict.TextQuestion as object) ?? null;
  }
};
