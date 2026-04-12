import { describe, expect, it } from 'vitest';

import {
  buildExamplesFromParsed,
  buildQuestionTypesById,
  getInvalidQuestionIds,
  getMissingQuestionIds,
  getQuestionIdsSorted,
  getSubmissionQuestionIds,
  synchronizeQuestionMap,
} from './helpers';

import type { QuestionSetInputQuestionMap, RawSubmission } from '@api/models';

describe('question helpers', () => {
  it('collects unique submission question ids in natural order', () => {
    const rawSubmissions = [
      {
        student_id: 'student-1',
        raw_answer_map: {
          Q10: 'ten',
          Q2: 'two',
        },
      },
      {
        student_id: 'student-2',
        raw_answer_map: {
          Q1: 'one',
          Q2: 'two-again',
        },
      },
    ] as RawSubmission[];

    expect(getSubmissionQuestionIds(rawSubmissions)).toEqual(['Q1', 'Q2', 'Q10']);
  });

  it('returns empty array for undefined submissions', () => {
    expect(getSubmissionQuestionIds(undefined)).toEqual([]);
  });

  it('handles submissions with empty raw_answer_map', () => {
    const rawSubmissions = [
      { student_id: 's1', raw_answer_map: {} },
    ] as RawSubmission[];
    expect(getSubmissionQuestionIds(rawSubmissions)).toEqual([]);
  });

  it('finds invalid and missing questions', () => {
    const questionMap = {
      Q1: { type: 'TEXT' },
      Q2: { type: 'TEXT' },
      Q3: { type: 'TEXT' },
    } as QuestionSetInputQuestionMap;

    const submissionQuestionIds = ['Q1', 'Q2', 'Q4'];

    expect(getInvalidQuestionIds(questionMap, submissionQuestionIds)).toEqual(['Q3']);
    expect(getMissingQuestionIds(questionMap, submissionQuestionIds)).toEqual(['Q4']);
  });

  it('returns empty when question set matches submissions exactly', () => {
    const questionMap = { Q1: { type: 'TEXT' } } as QuestionSetInputQuestionMap;
    expect(getInvalidQuestionIds(questionMap, ['Q1'])).toEqual([]);
    expect(getMissingQuestionIds(questionMap, ['Q1'])).toEqual([]);
  });

  it('returns empty for empty maps', () => {
    expect(getInvalidQuestionIds({} as QuestionSetInputQuestionMap, [])).toEqual([]);
    expect(getMissingQuestionIds({} as QuestionSetInputQuestionMap, [])).toEqual([]);
  });

  it('synchronizes question maps by preserving current definitions and adding inferred questions', () => {
    const currentQuestionMap = {
      Q1: { type: 'TEXT' },
      Q2: { type: 'TEXT', title: 'Keep my custom definition' },
      Q3: { type: 'TEXT' },
    } as QuestionSetInputQuestionMap;

    const inferredQuestionMap = {
      Q1: { type: 'TEXT' },
      Q2: { type: 'CHOICE', options: ['A', 'B'] },
      Q4: { type: 'NUMERIC' },
    } as QuestionSetInputQuestionMap;

    expect(synchronizeQuestionMap(currentQuestionMap, inferredQuestionMap)).toEqual({
      Q1: { type: 'TEXT' },
      Q2: { type: 'TEXT', title: 'Keep my custom definition' },
      Q4: { type: 'NUMERIC' },
    });
  });

  it('synchronizes with undefined current map', () => {
    const inferred = { Q1: { type: 'TEXT' } } as QuestionSetInputQuestionMap;
    const result = synchronizeQuestionMap(undefined as never, inferred);
    expect(result).toEqual({ Q1: { type: 'TEXT' } });
  });
});

describe('getQuestionIdsSorted', () => {
  it('returns naturally sorted question IDs', () => {
    const qMap = {
      Q10: { type: 'TEXT' },
      Q2: { type: 'TEXT' },
      Q1: { type: 'TEXT' },
    } as QuestionSetInputQuestionMap;
    expect(getQuestionIdsSorted(qMap)).toEqual(['Q1', 'Q2', 'Q10']);
  });

  it('handles null/undefined input', () => {
    expect(getQuestionIdsSorted(undefined as never)).toEqual([]);
  });
});

describe('buildQuestionTypesById', () => {
  it('extracts type from each question definition', () => {
    const qMap = {
      Q1: { type: 'TEXT' },
      Q2: { type: 'NUMERIC' },
    } as QuestionSetInputQuestionMap;
    expect(buildQuestionTypesById(qMap)).toEqual({ Q1: 'TEXT', Q2: 'NUMERIC' });
  });

  it('falls back to TEXT when type is missing', () => {
    const qMap = { Q1: {} } as QuestionSetInputQuestionMap;
    expect(buildQuestionTypesById(qMap)).toEqual({ Q1: 'TEXT' });
  });

  it('handles null/undefined input', () => {
    expect(buildQuestionTypesById(null as never)).toEqual({});
    expect(buildQuestionTypesById(undefined as never)).toEqual({});
  });
});

describe('buildExamplesFromParsed', () => {
  it('extracts examples from parsed submissions', () => {
    const parsed = {
      submissions: [
        { answer_map: { Q1: 'A', Q2: 'B' } },
        { answer_map: { Q1: 'C', Q2: 'B' } },
      ],
    };
    const result = buildExamplesFromParsed(parsed as never);
    expect(result['Q1']).toEqual(['A', 'C']);
    expect(result['Q2']).toEqual(['B']); // deduplicated
  });

  it('returns empty object for undefined input', () => {
    expect(buildExamplesFromParsed(undefined)).toEqual({});
  });

  it('deduplicates complex values via JSON comparison', () => {
    const parsed = {
      submissions: [
        { answer_map: { Q1: ['A', 'B'] } },
        { answer_map: { Q1: ['A', 'B'] } },
        { answer_map: { Q1: ['C'] } },
      ],
    };
    const result = buildExamplesFromParsed(parsed as never);
    expect(result['Q1']).toHaveLength(2);
  });
});