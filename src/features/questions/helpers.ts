import type { QuestionId, ExamplesByQuestion } from './types';
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
 * Extract example answers from parsed submissions for each question.
 */
export const buildExamplesFromParsed = (
  parsed: ParseSubmissionsResponse | undefined,
): ExamplesByQuestion => {
  const map: ExamplesByQuestion = {};
  const subs = parsed?.submissions ?? [];
  subs.forEach((sub) => {
    Object.entries(sub.answer_map ?? {}).forEach(([qid, val]) => {
      if (!map[qid]) map[qid] = [];
      const list = map[qid];
      // Check for duplicates using JSON comparison
      const isDuplicate = list.some(existing => JSON.stringify(existing) === JSON.stringify(val));
      if (!isDuplicate) {
        list.push(val);
      }
    });
  });
  return map;
};
