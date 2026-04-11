/**
 * Pure grouping functions for the Group View feature.
 */

import { clusterByThreshold } from './clustering';

import type { AdjustableSubmission } from '@api/models';

// ── Exported types ────────────────────────────────────────────────────────────

export type GroupingMode = 'answer' | 'feedback';

export type NormalizeOpts = {
  ignoreCase: boolean;
  ignoreWhitespace: boolean;
  ignorePunctuation: boolean;
};

export type GroupEntry = {
  studentId: string;
  rawAnswer: unknown;
  effectivePoints: number;
  originalPoints: number;
  maxPoints: number;
  effectiveFeedback: string | null;
  originalFeedback: string | null;
  hasManualAdjustment: boolean;
};

export type AnswerGroup = {
  key: string;
  label: string;
  mode: GroupingMode;
  entries: GroupEntry[];
  pointsMin: number;
  pointsMax: number;
  isUniform: boolean;
  hasAdjustments: boolean;
  adjustmentCount: number;
  /** Distinct raw answer strings merged into this group (only set for similarity clusters). */
  mergedAnswers?: string[];
};

export type ClusterOpts = {
  threshold: number;
  normalizeOpts: NormalizeOpts;
};

// ── Internal helpers ──────────────────────────────────────────────────────────

export const answerToString = (value: unknown): string => {
  if (value === null || value === undefined) return '(no answer)';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
};

const normalizeAnswer = (s: string, opts: NormalizeOpts): string => {
  let result = s;
  if (opts.ignoreCase) result = result.toLowerCase();
  if (opts.ignoreWhitespace) result = result.replace(/\s+/g, ' ').trim();
  if (opts.ignorePunctuation) result = result.replace(/[^\w\s]/g, '');
  return result;
};

const deriveGroupStats = (
  entries: GroupEntry[],
): Pick<AnswerGroup, 'pointsMin' | 'pointsMax' | 'isUniform' | 'hasAdjustments' | 'adjustmentCount'> => {
  if (entries.length === 0) {
    return { pointsMin: 0, pointsMax: 0, isUniform: true, hasAdjustments: false, adjustmentCount: 0 };
  }
  const pts = entries.map((e) => e.effectivePoints);
  const pointsMin = Math.min(...pts);
  const pointsMax = Math.max(...pts);
  return {
    pointsMin,
    pointsMax,
    isUniform: pointsMin === pointsMax,
    hasAdjustments: entries.some((e) => e.hasManualAdjustment),
    adjustmentCount: entries.filter((e) => e.hasManualAdjustment).length,
  };
};

export const buildGroupKey = (
  mode: GroupingMode,
  label: string,
  entries: GroupEntry[],
): string => {
  const firstStudentId = entries[0]?.studentId ?? 'empty';
  return `${mode}:${firstStudentId}:${label}`;
};

// ── Exported entry builder ────────────────────────────────────────────────────

export const buildGroupEntry = (sub: AdjustableSubmission, qid: string): GroupEntry => {
  const result = sub.result_map?.[qid];
  if (!result) {
    return {
      studentId: sub.student_id,
      rawAnswer: null,
      effectivePoints: 0,
      originalPoints: 0,
      maxPoints: 0,
      effectiveFeedback: null,
      originalFeedback: null,
      hasManualAdjustment: false,
    };
  }

  return {
    studentId: sub.student_id,
    rawAnswer: sub.answer_map?.[qid] ?? null,
    effectivePoints: result.adjusted_points ?? result.points ?? 0,
    originalPoints: result.points ?? 0,
    maxPoints: result.max_points ?? 0,
    effectiveFeedback: result.adjusted_feedback ?? result.feedback ?? null,
    originalFeedback: result.feedback ?? null,
    hasManualAdjustment: result.adjusted_points != null || result.adjusted_feedback != null,
  };
};

// ── Grouping functions ────────────────────────────────────────────────────────

export const groupByAnswer = (submissions: AdjustableSubmission[], qid: string): AnswerGroup[] => {
  const map = new Map<string, GroupEntry[]>();

  for (const sub of submissions) {
    const entry = buildGroupEntry(sub, qid);
    const rawKey = answerToString(entry.rawAnswer);
    const key = rawKey || '(empty)';
    const existing = map.get(key);
    if (existing) {
      existing.push(entry);
    } else {
      map.set(key, [entry]);
    }
  }

  return [...map.entries()]
    .sort(([, a], [, b]) => b.length - a.length)
    .map(([key, entries]) => ({
      key: buildGroupKey('answer', key, entries),
      label: key,
      mode: 'answer' as GroupingMode,
      entries,
      ...deriveGroupStats(entries),
    }));
};

export const groupByFeedback = (submissions: AdjustableSubmission[], qid: string): AnswerGroup[] => {
  const map = new Map<string, GroupEntry[]>();

  for (const sub of submissions) {
    const entry = buildGroupEntry(sub, qid);
    const key = (entry.effectiveFeedback ?? '') || '(no feedback)';
    const existing = map.get(key);
    if (existing) {
      existing.push(entry);
    } else {
      map.set(key, [entry]);
    }
  }

  return [...map.entries()]
    .sort(([, a], [, b]) => b.length - a.length)
    .map(([key, entries]) => ({
      key: buildGroupKey('feedback', key, entries),
      label: key,
      mode: 'feedback' as GroupingMode,
      entries,
      ...deriveGroupStats(entries),
    }));
};

// ── Shared cluster helper ─────────────────────────────────────────────────────

/**
 * Generic fuzzy-cluster function.
 * `getText` extracts the string to cluster on from each entry.
 */
const clusterGroupsByText = (
  entries: GroupEntry[],
  getText: (e: GroupEntry) => string,
  mode: GroupingMode,
  opts: ClusterOpts,
): AnswerGroup[] => {
  const items = entries.map((e, i) => ({
    id: String(i),
    normalized: normalizeAnswer(getText(e), opts.normalizeOpts),
  }));

  const clusters = clusterByThreshold(items, opts.threshold);
  const groups: AnswerGroup[] = [];

  for (const [, ids] of clusters.entries()) {
    const clusterEntries = ids.map((id) => entries[Number(id)]!);

    // Count raw text frequencies to find the majority head
    const rawFreqMap = new Map<string, number>();
    for (const id of ids) {
      const raw = getText(entries[Number(id)]!);
      rawFreqMap.set(raw, (rawFreqMap.get(raw) ?? 0) + 1);
    }
    // Sort: most frequent first; alphabetically for tie-breaking
    const sortedRaws = [...rawFreqMap.entries()]
      .sort(([a, fa], [b, fb]) => fb - fa || a.localeCompare(b))
      .map(([raw]) => raw);

    const headRaw = sortedRaws[0] ?? '';
    const safeLabel = headRaw || (mode === 'answer' ? '(empty)' : '(no feedback)');
    // Expose all merged variants only when there is more than one distinct text
    const mergedAnswers = sortedRaws.length > 1 ? sortedRaws.slice(0, 20) : undefined;

    groups.push({
      key: buildGroupKey(mode, safeLabel, clusterEntries),
      label: safeLabel,
      mode,
      entries: clusterEntries,
      mergedAnswers,
      ...deriveGroupStats(clusterEntries),
    });
  }

  return groups.sort((a, b) => b.entries.length - a.entries.length);
};

export const groupByCluster = (
  submissions: AdjustableSubmission[],
  qid: string,
  opts: ClusterOpts,
): AnswerGroup[] => {
  const entries = submissions.map((sub) => buildGroupEntry(sub, qid));
  return clusterGroupsByText(entries, (e) => answerToString(e.rawAnswer), 'answer', opts);
};

export const groupByFeedbackCluster = (
  submissions: AdjustableSubmission[],
  qid: string,
  opts: ClusterOpts,
): AnswerGroup[] => {
  const entries = submissions.map((sub) => buildGroupEntry(sub, qid));
  return clusterGroupsByText(entries, (e) => e.effectiveFeedback ?? '', 'feedback', opts);
};

// ── Dispatcher ────────────────────────────────────────────────────────────────

/**
 * Build answer groups for the given question and mode.
 *
 * For both 'answer' and 'feedback' modes:
 *   - threshold === 1.0  → exact match (after normalization)
 *   - threshold <  1.0   → fuzzy match via Levenshtein clustering
 */
export const buildGroups = (
  submissions: AdjustableSubmission[],
  qid: string,
  mode: GroupingMode,
  clusterOpts: ClusterOpts,
): AnswerGroup[] => {
  return mode === 'answer'
    ? clusterOpts.threshold >= 1.0
      ? groupByAnswer(submissions, qid)
      : groupByCluster(submissions, qid, clusterOpts)
    : clusterOpts.threshold >= 1.0
      ? groupByFeedback(submissions, qid)
      : groupByFeedbackCluster(submissions, qid, clusterOpts);
};
