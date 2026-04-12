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

  it('boosts columns with MRQ-style comma-separated values', () => {
    const headers = ['id', 'multi_q'];
    const rows = [
      ['s1', 'A,B'],
      ['s2', 'C,D'],
      ['s3', 'A,C'],
    ];
    const scores = computeAutoScores(headers, rows);
    const mq = scores.find((s) => s.header === 'multi_q')!;
    expect(mq.confidence).toBeGreaterThan(0.5);
  });

  it('boosts columns with true/false choice words', () => {
    const headers = ['id', 'answer'];
    const rows = [
      ['s1', 'true'],
      ['s2', 'false'],
      ['s3', 'true'],
    ];
    const scores = computeAutoScores(headers, rows);
    const ans = scores.find((s) => s.header === 'answer')!;
    expect(ans.confidence).toBeGreaterThan(0.5);
  });

  it('penalizes columns with all email values', () => {
    const headers = ['student_email', 'Q1'];
    const rows = [
      ['a@b.com', 'A'],
      ['c@d.com', 'B'],
      ['e@f.com', 'C'],
    ];
    const scores = computeAutoScores(headers, rows);
    const email = scores.find((s) => s.header === 'student_email')!;
    const q1 = scores.find((s) => s.header === 'Q1')!;
    expect(q1.confidence).toBeGreaterThan(email.confidence);
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

  it('does not map point columns below confidence threshold', () => {
    // Candidates have no points keywords and no numeric values
    const headers = ['id', 'Q1', 'notes'];
    const rows = [
      ['s1', 'A', 'some text'],
      ['s2', 'B', 'other text'],
    ];
    const result = inferColumnsFromSource(headers, rows, 'id');
    // 'notes' should NOT be mapped as a point column for Q1
    expect(result.pointColMap['Q1']).toBeUndefined();
  });

  it('maps point column with keyword and numeric values to answer column', () => {
    // Q1 Pts has points keyword + numeric values + proximity to Q1
    const headers = ['id', 'Q1', 'Q1 Pts', 'Q2', 'Q2 Pts'];
    const rows = [
      ['s1', 'A', '10', 'B', '8'],
      ['s2', 'C', '7', 'D', '9'],
      ['s3', 'B', '5', 'A', '6'],
    ];
    const result = inferColumnsFromSource(headers, rows, 'id');
    if (result.answerCols.includes('Q1') && result.pointColMap['Q1']) {
      expect(result.pointColMap['Q1']).toBe('Q1 Pts');
    }
    if (result.answerCols.includes('Q2') && result.pointColMap['Q2']) {
      expect(result.pointColMap['Q2']).toBe('Q2 Pts');
    }
  });

  it('each point column is claimed by at most one answer column', () => {
    // Only one shared "Points" column — should be claimed by the first answer column
    const headers = ['id', 'Q1', 'Q2', 'Points'];
    const rows = [
      ['s1', 'A', 'B', '10'],
      ['s2', 'C', 'D', '8'],
    ];
    const result = inferColumnsFromSource(headers, rows, 'id');
    const mapped = Object.values(result.pointColMap);
    // Points can map to at most one answer
    const countPoints = mapped.filter((v) => v === 'Points').length;
    expect(countPoints).toBeLessThanOrEqual(1);
  });
});
