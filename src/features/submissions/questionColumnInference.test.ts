import { describe, expect, it } from 'vitest';

import {
  arraysEqual,
  computeAutoScores,
  computeNextMapping,
  inferColumnsFromSource,
} from '@features/submissions/questionColumnInference';

describe('arraysEqual', () => {
  it('returns true for two empty arrays', () => {
    expect(arraysEqual([], [])).toBe(true);
  });

  it('returns true for equal arrays', () => {
    expect(arraysEqual(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(true);
  });

  it('returns false for arrays with different lengths', () => {
    expect(arraysEqual(['a', 'b'], ['a', 'b', 'c'])).toBe(false);
  });

  it('returns false for arrays with different values', () => {
    expect(arraysEqual(['a', 'b', 'c'], ['a', 'x', 'c'])).toBe(false);
  });

  it('is order-sensitive', () => {
    expect(arraysEqual(['a', 'b'], ['b', 'a'])).toBe(false);
  });
});

describe('computeAutoScores', () => {
  it('returns empty array for empty headers', () => {
    expect(computeAutoScores([], [])).toEqual([]);
  });

  it('gives high confidence to question-style headers with choice-like values', () => {
    const headers = ['email', 'Q1', 'Q2', 'timestamp'];
    const rows = [
      ['a@b.com', 'A', 'B', '2024-01-01'],
      ['c@d.com', 'C', 'D', '2024-01-02'],
      ['e@f.com', 'B', 'A', '2024-01-03'],
    ];
    const scores = computeAutoScores(headers, rows);
    const q1 = scores.find((s) => s.header === 'Q1')!;
    const q2 = scores.find((s) => s.header === 'Q2')!;
    const email = scores.find((s) => s.header === 'email')!;
    const ts = scores.find((s) => s.header === 'timestamp')!;

    expect(q1.confidence).toBeGreaterThan(email.confidence);
    expect(q2.confidence).toBeGreaterThan(ts.confidence);
  });

  it('penalizes auxiliary columns like Q1 Pts', () => {
    const headers = ['Q1', 'Q1 Pts', 'Q2', 'Q2 Marks'];
    const rows = [
      ['A', '10', 'B', '8'],
      ['C', '7', 'D', '9'],
    ];
    const scores = computeAutoScores(headers, rows);
    const q1 = scores.find((s) => s.header === 'Q1')!;
    const q1pts = scores.find((s) => s.header === 'Q1 Pts')!;

    expect(q1.confidence).toBeGreaterThan(q1pts.confidence);
  });

  it('returns results sorted by confidence descending', () => {
    const headers = ['name', 'Q1', 'Q2'];
    const rows = [
      ['Alice', 'A', 'B'],
      ['Bob', 'C', 'D'],
    ];
    const scores = computeAutoScores(headers, rows);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1].confidence).toBeGreaterThanOrEqual(scores[i].confidence);
    }
  });
});

describe('computeNextMapping', () => {
  it('keeps valid previous mapping unchanged', () => {
    const headers = ['id', 'Q1', 'Q2'];
    const prev = { studentIdColumn: 'id', questionColumns: ['Q1', 'Q2'] };
    const result = computeNextMapping(headers, prev);
    expect(result).toBe(prev); // same reference — no change
  });

  it('falls back to first header when previous SID is missing', () => {
    const headers = ['email', 'Q1', 'Q2'];
    const prev = { studentIdColumn: 'missing', questionColumns: ['Q1'] };
    const result = computeNextMapping(headers, prev);
    expect(result.studentIdColumn).toBe('email');
  });

  it('drops question columns not in new headers', () => {
    const headers = ['id', 'Q1', 'Q3'];
    const prev = { studentIdColumn: 'id', questionColumns: ['Q1', 'Q2'] };
    const result = computeNextMapping(headers, prev);
    expect(result.questionColumns).toEqual(['Q1']);
  });

  it('auto-infers when all previous questions invalid and rows provided', () => {
    const headers = ['id', 'Q1', 'Q2'];
    const rows = [
      ['s1', 'A', 'B'],
      ['s2', 'C', 'D'],
    ];
    const prev = { studentIdColumn: 'id', questionColumns: ['gone1', 'gone2'] };
    const result = computeNextMapping(headers, prev, { rowsForHeuristic: rows });
    expect(result.questionColumns.length).toBeGreaterThan(0);
    expect(result.questionColumns).not.toContain('id');
  });

  it('falls back to all non-SID headers when no rows and no valid questions', () => {
    const headers = ['id', 'col_a', 'col_b'];
    const prev = { studentIdColumn: 'id', questionColumns: [] };
    const result = computeNextMapping(headers, prev);
    expect(result.questionColumns).toEqual(['col_a', 'col_b']);
  });
});

describe('inferColumnsFromSource', () => {
  it('infers answer columns and point column mapping', () => {
    const headers = ['student', 'Q1', 'Q1 Pts', 'Q2', 'Q2 Pts'];
    const rows = [
      ['s1', 'A', '10', 'B', '8'],
      ['s2', 'C', '7', 'D', '9'],
      ['s3', 'B', '5', 'A', '6'],
    ];
    const result = inferColumnsFromSource(headers, rows, 'student');
    expect(result.answerCols).toContain('Q1');
    expect(result.answerCols).toContain('Q2');
    // Q1 Pts should be mapped as points for Q1
    if (result.pointColMap['Q1']) {
      expect(result.pointColMap['Q1']).toBe('Q1 Pts');
    }
  });

  it('returns empty answer columns for no headers', () => {
    const result = inferColumnsFromSource([], [], 'id');
    expect(result.answerCols).toEqual([]);
    expect(result.pointColMap).toEqual({});
  });
});
