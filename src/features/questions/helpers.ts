import type { QuestionDef, QuestionId, QuestionType, ExamplesByQuestion } from './types';
import type {
  QuestionSetOutputQuestionMap,
  QuestionSetInputQuestionMap,
  ParseSubmissionsResponse,
} from '@api/models';

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
      if (!map[qid]) map[qid] = [];
      const list = map[qid];
      // Check for duplicates using JSON comparison
      const isDuplicate = list.some(existing => JSON.stringify(existing) === JSON.stringify(val));
      if (list.length < maxPerQuestion && !isDuplicate) {
        list.push(val);
      }
    });
  });
  return map;
};
