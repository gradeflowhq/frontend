import type { QuestionId, ExamplesByQuestion } from './types';
import type {
  QuestionSetOutputQuestionMap,
  QuestionSetInputQuestionMap,
  ParseSubmissionsResponse,
} from '@api/models';

type QuestionMapLike = QuestionSetOutputQuestionMap | QuestionSetInputQuestionMap;

/**
 * Build a `{ [qid]: questionType }` lookup from a question map.
 * Falls back to `'TEXT'` when a definition has no `type` field.
 */
export const buildQuestionTypesById = (qMap: QuestionMapLike): Record<string, string> => {
  const m: Record<string, string> = {};
  for (const [qid, def] of Object.entries(qMap ?? {})) {
    m[qid] = (def as { type?: string } | undefined)?.type ?? 'TEXT';
  }
  return m;
};

const sortQuestionIds = (ids: Iterable<string>): QuestionId[] =>
  [...ids].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

/**
 * Sorted question IDs (natural-ish).
 */
export const getQuestionIdsSorted = (qMap: QuestionSetOutputQuestionMap | QuestionSetInputQuestionMap): QuestionId[] =>
  sortQuestionIds(Object.keys(qMap ?? {}));

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
