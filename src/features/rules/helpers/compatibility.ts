import type { QuestionSetOutputQuestionMap } from '../../rules/types';

/**
 * Collect question IDs compatible with a set of allowed question types.
 * - If allowedTypes is empty/undefined, returns all question IDs.
 * - Matching is case-insensitive.
 */
export const collectCompatibleQuestionIds = (
  qMap: QuestionSetOutputQuestionMap,
  allowedTypes?: string[]
): string[] => {
  if (!allowedTypes || allowedTypes.length === 0) {
    return Object.keys(qMap);
  }
  const allowed = new Set(allowedTypes.map((t) => String(t).toUpperCase()));
  return Object.entries(qMap)
    .filter(([_, def]: [string, any]) => {
      const t = String(def?.type ?? '').toUpperCase();
      return allowed.has(t);
    })
    .map(([qid]) => qid);
};