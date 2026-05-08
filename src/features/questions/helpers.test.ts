import { describe, expect, it } from 'vitest';

import {
  buildExamplesFromParsed,
  buildQuestionTypesById,
  getQuestionIdsSorted,
} from './helpers';

import type { QuestionSetInputQuestionMap } from '@api/models';

describe('question helpers', () => {
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
