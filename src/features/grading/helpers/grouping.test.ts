import { describe, expect, it } from 'vitest';

import {
  answerToString,
  buildGroupEntry,
  buildGroupKey,
  buildGroups,
  groupByAnswer,
  groupByFeedback,
} from '@features/grading/helpers/grouping';

import type { AdjustableSubmission } from '@api/models';

const makeSub = (
  studentId: string,
  answer: unknown,
  opts?: {
    points?: number;
    maxPoints?: number;
    feedback?: string;
    adjustedPoints?: number | null;
    adjustedFeedback?: string | null;
  },
): AdjustableSubmission =>
  ({
    student_id: studentId,
    answer_map: { Q1: answer },
    result_map: {
      Q1: {
        points: opts?.points ?? 1,
        max_points: opts?.maxPoints ?? 1,
        feedback: opts?.feedback ?? 'ok',
        adjusted_points: opts?.adjustedPoints ?? null,
        adjusted_feedback: opts?.adjustedFeedback ?? null,
      },
    },
  }) as unknown as AdjustableSubmission;

describe('answerToString', () => {
  it('returns "(no answer)" for null', () => {
    expect(answerToString(null)).toBe('(no answer)');
  });

  it('returns "(no answer)" for undefined', () => {
    expect(answerToString(undefined)).toBe('(no answer)');
  });

  it('joins array values with comma', () => {
    expect(answerToString(['A', 'B', 'C'])).toBe('A, B, C');
  });

  it('converts primitives to string', () => {
    expect(answerToString(42)).toBe('42');
    expect(answerToString(true)).toBe('true');
    expect(answerToString('hello')).toBe('hello');
  });
});

describe('buildGroupEntry', () => {
  it('extracts data from a submission with results', () => {
    const sub = makeSub('s1', 'A', { points: 5, maxPoints: 10, feedback: 'good' });
    const entry = buildGroupEntry(sub, 'Q1');
    expect(entry.studentId).toBe('s1');
    expect(entry.rawAnswer).toBe('A');
    expect(entry.effectivePoints).toBe(5);
    expect(entry.maxPoints).toBe(10);
    expect(entry.effectiveFeedback).toBe('good');
    expect(entry.hasManualAdjustment).toBe(false);
  });

  it('uses adjusted values when present', () => {
    const sub = makeSub('s1', 'A', {
      points: 5,
      feedback: 'ok',
      adjustedPoints: 8,
      adjustedFeedback: 'revised',
    });
    const entry = buildGroupEntry(sub, 'Q1');
    expect(entry.effectivePoints).toBe(8);
    expect(entry.effectiveFeedback).toBe('revised');
    expect(entry.hasManualAdjustment).toBe(true);
  });

  it('returns zero defaults when result is missing', () => {
    const sub = { student_id: 's1', result_map: {} } as unknown as AdjustableSubmission;
    const entry = buildGroupEntry(sub, 'Q1');
    expect(entry.effectivePoints).toBe(0);
    expect(entry.maxPoints).toBe(0);
    expect(entry.effectiveFeedback).toBeNull();
    expect(entry.hasManualAdjustment).toBe(false);
  });
});

describe('buildGroupKey', () => {
  it('formats key from mode, label, and first student', () => {
    const entries = [{ studentId: 's1' }] as never[];
    expect(buildGroupKey('answer', 'A', entries)).toBe('answer:s1:A');
  });

  it('uses "empty" fallback when entries are empty', () => {
    expect(buildGroupKey('feedback', 'label', [])).toBe('feedback:empty:label');
  });
});

describe('groupByAnswer', () => {
  it('groups submissions by answer string', () => {
    const subs = [
      makeSub('s1', 'A'),
      makeSub('s2', 'B'),
      makeSub('s3', 'A'),
    ];
    const groups = groupByAnswer(subs, 'Q1');
    expect(groups).toHaveLength(2);
    // Largest group first
    expect(groups[0].label).toBe('A');
    expect(groups[0].entries).toHaveLength(2);
    expect(groups[1].label).toBe('B');
    expect(groups[1].entries).toHaveLength(1);
  });

  it('handles null answers as "(no answer)"', () => {
    const sub = { student_id: 's1', answer_map: {}, result_map: {} } as unknown as AdjustableSubmission;
    const groups = groupByAnswer([sub], 'Q1');
    expect(groups[0].label).toBe('(no answer)');
  });

  it('computes correct group stats', () => {
    const subs = [
      makeSub('s1', 'A', { points: 5, maxPoints: 10 }),
      makeSub('s2', 'A', { points: 8, maxPoints: 10 }),
    ];
    const group = groupByAnswer(subs, 'Q1')[0];
    expect(group.pointsMin).toBe(5);
    expect(group.pointsMax).toBe(8);
    expect(group.isUniform).toBe(false);
  });

  it('detects adjustments in stats', () => {
    const subs = [
      makeSub('s1', 'A', { adjustedPoints: 9 }),
      makeSub('s2', 'A'),
    ];
    const group = groupByAnswer(subs, 'Q1')[0];
    expect(group.hasAdjustments).toBe(true);
    expect(group.adjustmentCount).toBe(1);
  });
});

describe('groupByFeedback', () => {
  it('groups by effective feedback string', () => {
    const subs = [
      makeSub('s1', 'A', { feedback: 'correct' }),
      makeSub('s2', 'B', { feedback: 'correct' }),
      makeSub('s3', 'C', { feedback: 'wrong' }),
    ];
    const groups = groupByFeedback(subs, 'Q1');
    expect(groups).toHaveLength(2);
    expect(groups[0].label).toBe('correct');
    expect(groups[0].entries).toHaveLength(2);
  });

  it('uses "(no feedback)" for empty feedback', () => {
    const sub = makeSub('s1', 'A', { feedback: '' });
    const groups = groupByFeedback([sub], 'Q1');
    expect(groups[0].label).toBe('(no feedback)');
  });
});

describe('buildGroups', () => {
  const defaultOpts = {
    threshold: 1.0,
    normalizeOpts: { ignoreCase: false, ignoreWhitespace: false, ignorePunctuation: false },
  };

  it('dispatches to exact answer grouping at threshold 1.0', () => {
    const subs = [makeSub('s1', 'A'), makeSub('s2', 'A')];
    const groups = buildGroups(subs, 'Q1', 'answer', defaultOpts);
    expect(groups).toHaveLength(1);
    expect(groups[0].entries).toHaveLength(2);
  });

  it('dispatches to fuzzy answer grouping below threshold 1.0', () => {
    const subs = [makeSub('s1', 'cat'), makeSub('s2', 'cats'), makeSub('s3', 'dog')];
    const groups = buildGroups(subs, 'Q1', 'answer', { ...defaultOpts, threshold: 0.5 });
    // "cat" and "cats" should cluster together at threshold 0.5
    expect(groups.length).toBeLessThanOrEqual(2);
  });

  it('dispatches to feedback mode', () => {
    const subs = [
      makeSub('s1', 'A', { feedback: 'ok' }),
      makeSub('s2', 'B', { feedback: 'ok' }),
    ];
    const groups = buildGroups(subs, 'Q1', 'feedback', defaultOpts);
    expect(groups).toHaveLength(1);
    expect(groups[0].mode).toBe('feedback');
  });

  it('dispatches to fuzzy feedback clustering below threshold 1.0', () => {
    const subs = [
      makeSub('s1', 'A', { feedback: 'Correct answer' }),
      makeSub('s2', 'B', { feedback: 'Correct answers' }),
      makeSub('s3', 'C', { feedback: 'Wrong' }),
    ];
    const groups = buildGroups(subs, 'Q1', 'feedback', { ...defaultOpts, threshold: 0.5 });
    // "Correct answer" and "Correct answers" should cluster
    expect(groups.length).toBeLessThanOrEqual(2);
    expect(groups.every((g) => g.mode === 'feedback')).toBe(true);
  });

  it('applies case normalization in fuzzy answer grouping', () => {
    const subs = [makeSub('s1', 'Cat'), makeSub('s2', 'cat')];
    const groups = buildGroups(subs, 'Q1', 'answer', {
      threshold: 0.99,
      normalizeOpts: { ignoreCase: true, ignoreWhitespace: false, ignorePunctuation: false },
    });
    expect(groups).toHaveLength(1);
    expect(groups[0].entries).toHaveLength(2);
  });

  it('handles empty submissions array', () => {
    const groups = buildGroups([], 'Q1', 'answer', defaultOpts);
    expect(groups).toEqual([]);
  });
});
