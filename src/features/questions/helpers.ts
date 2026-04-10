import type { QuestionId, ExamplesByQuestion } from './types';
import type {
  RawSubmission,
  QuestionSetOutputQuestionMap,
  QuestionSetInputQuestionMap,
  ParseSubmissionsResponse,
} from '@api/models';

type QuestionMapLike = QuestionSetOutputQuestionMap | QuestionSetInputQuestionMap;

const sortQuestionIds = (ids: Iterable<string>): QuestionId[] =>
  [...ids].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

/**
 * Sorted question IDs (natural-ish).
 */
export const getQuestionIdsSorted = (qMap: QuestionSetOutputQuestionMap | QuestionSetInputQuestionMap): QuestionId[] =>
  sortQuestionIds(Object.keys(qMap ?? {}));

/**
 * Extract all unique question IDs present in raw submissions.
 */
export const getSubmissionQuestionIds = (
  rawSubmissions: RawSubmission[] | undefined,
): QuestionId[] => {
  const ids = new Set<string>();
  for (const submission of rawSubmissions ?? []) {
    for (const qid of Object.keys(submission.raw_answer_map ?? {})) {
      ids.add(qid);
    }
  }
  return sortQuestionIds(ids);
};

/**
 * Question IDs configured in the current question set but missing from submissions.
 */
export const getInvalidQuestionIds = (
  qMap: QuestionMapLike,
  submissionQuestionIds: readonly string[],
): QuestionId[] => {
  const validIds = new Set(submissionQuestionIds);
  return getQuestionIdsSorted(qMap).filter((qid) => !validIds.has(qid));
};

/**
 * Question IDs present in submissions but missing from the current question set.
 */
export const getMissingQuestionIds = (
  qMap: QuestionMapLike,
  submissionQuestionIds: readonly string[],
): QuestionId[] => {
  const configuredIds = new Set(getQuestionIdsSorted(qMap));
  return sortQuestionIds(submissionQuestionIds).filter((qid) => !configuredIds.has(qid));
};

/**
 * Synchronize the question map with the inferred map from the current submissions.
 * Existing question definitions are preserved for question IDs that still exist,
 * while newly inferred questions are added and invalid questions are removed.
 */
export const synchronizeQuestionMap = (
  currentQuestionMap: QuestionMapLike,
  inferredQuestionMap: QuestionMapLike,
): QuestionSetInputQuestionMap => {
  return Object.fromEntries(
    getQuestionIdsSorted(inferredQuestionMap).map((qid) => [
      qid,
      (currentQuestionMap?.[qid] ?? inferredQuestionMap[qid]) as QuestionSetInputQuestionMap[string],
    ]),
  ) as QuestionSetInputQuestionMap;
};

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
