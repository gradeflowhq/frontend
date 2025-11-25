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
 * Build a QuestionSetInput from an output map (immutable copy).
 */
export const toQuestionSetInput = (qMap: QuestionSetOutputQuestionMap): QuestionSetInput => ({
  question_map: { ...qMap } as QuestionSetInput['question_map'],
});

/**
 * Get CHOICE options for a question (empty when not applicable).
 */
export const getChoiceOptions = (q: QuestionDef | undefined): string[] =>
  q && q.type === 'CHOICE' && Array.isArray((q as any).options) ? ((q as any).options as string[]) : [];

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

/**
 * Count questions by type (useful for summary/analytics).
 */
export const getQuestionTypeCounts = (qMap: QuestionSetOutputQuestionMap): Record<QuestionType, number> => {
  const counts: Record<QuestionType, number> = { TEXT: 0, NUMERIC: 0, CHOICE: 0, MULTI_VALUED: 0 };
  Object.values(qMap).forEach((q) => {
    const t = getQuestionType(q as QuestionDef);
    counts[t] += 1;
  });
  return counts;
};

/**
 * Normalise a question definition (optional trimming or defaults).
 * Keeps shape immutable; extend as needed (e.g., ensure config object exists).
 */
export const normalizeQuestionDef = (q: QuestionDef): QuestionDef => {
  const base: any = { ...q };
  if (typeof base.description === 'string') base.description = base.description.trim();
  return base as QuestionDef;
};

/**
 * Immutable update of a single question in a map.
 */
export const updateQuestionDef = (
  qMap: QuestionSetOutputQuestionMap,
  qid: QuestionId,
  updater: (prev: QuestionDef) => QuestionDef
): QuestionSetOutputQuestionMap => {
  const prev = qMap[qid] as QuestionDef | undefined;
  if (!prev) return qMap;
  return { ...qMap, [qid]: normalizeQuestionDef(updater(prev)) };
};

/**
 * Collect compatible question IDs by allowed types (uppercase match).
 * If no types provided, return all IDs.
 */
export const collectCompatibleQuestionIds = (
  qMap: QuestionSetOutputQuestionMap,
  allowed?: QuestionType[]
): QuestionId[] => {
  if (!allowed || allowed.length === 0) return getQuestionIdsSorted(qMap);
  const set = new Set(allowed.map((t) => t.toUpperCase()));
  return getQuestionIdsSorted(qMap).filter((qid) => {
    const t = getQuestionType(qMap[qid] as QuestionDef).toUpperCase();
    return set.has(t);
  });
};