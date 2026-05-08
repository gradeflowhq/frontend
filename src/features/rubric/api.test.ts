import { describe, expect, it } from 'vitest';

import { isMissingStoredRubricError } from './api';

const apiError = (status: number, message: string) => ({
  response: {
    status,
    data: {
      code: status === 404 ? 'NOT_FOUND' : 'BAD_REQUEST',
      message,
      errors: [message],
    },
  },
});

describe('isMissingStoredRubricError', () => {
  it('matches only the missing stored rubric 404', () => {
    expect(isMissingStoredRubricError(apiError(404, 'Rubric not set'))).toBe(true);
  });

  it('does not collapse other 404s into a missing rubric', () => {
    expect(isMissingStoredRubricError(apiError(404, 'Question set not set'))).toBe(false);
  });

  it('does not match rubric already set errors', () => {
    expect(isMissingStoredRubricError(apiError(400, 'Rubric already set'))).toBe(false);
  });
});
