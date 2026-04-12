import { describe, expect, it } from 'vitest';

import {
  buildExamplesFromParsed,
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