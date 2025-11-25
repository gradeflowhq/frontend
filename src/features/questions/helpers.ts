import type {
  QuestionSetInput,
  QuestionSetOutputQuestionMap,
  QuestionSetInputQuestionMap,
  ParseSubmissionsResponse,
} from '@api/models';
import type { QuestionDef, QuestionId, QuestionType, ExamplesByQuestion } from './types';

/**
 * Sorted question IDs (natural-ish).
 */
export const getQuestionIdsSorted = (qMap: QuestionSetOutputQuestionMap | QuestionSetInputQuestionMap): QuestionId[] =>
  Object.keys(qMap ?? {}).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

/**
 * Read the type of a question, defaulting to TEXT.
 */
export const getQuestionType = (q: QuestionDef | undefined): QuestionType =>
  (q?.type as QuestionType) ?? 'TEXT';

/**
 * Extract example answers from parsed submissions for each question.
 * Limits to at most maxPerQuestion unique examples per question.
 */
export const buildExamplesFromParsed = (
  parsed: ParseSubmissionsResponse | undefined,
  maxPerQuestion = 10,
  sampleLimit = 50
): ExamplesByQuestion => {
  const map: ExamplesByQuestion = {};
  const subs = parsed?.submissions ?? [];
  subs.slice(0, sampleLimit).forEach((sub) => {
    Object.entries(sub.answer_map ?? {}).forEach(([qid, val]) => {
      const str =
        Array.isArray(val)
          ? JSON.stringify(val)
          : typeof val === 'object' && val !== null
          ? JSON.stringify(val)
          : String(val ?? '');
      if (!map[qid]) map[qid] = [];
      const list = map[qid];
      if (list.length < maxPerQuestion && !list.includes(str)) list.push(str);
    });
  });
  return map;
};
