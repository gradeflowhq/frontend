import { describe, expect, it } from 'vitest';

import { getErrorInfo, getErrorMessage, getErrorMessages } from '@utils/error';

describe('getErrorMessages', () => {
  it('extracts string array from { errors: [...] } payload', () => {
    const error = { response: { data: { errors: ['bad input', 'missing field'] } } };
    expect(getErrorMessages(error)).toEqual(['bad input', 'missing field']);
  });

  it('extracts structured backend error metadata', () => {
    const error = {
      response: {
        status: 400,
        data: {
          code: 'BAD_REQUEST',
          message: 'Invalid grading request',
          errors: ['Question set not set'],
        },
      },
    };

    expect(getErrorInfo(error)).toMatchObject({
      kind: 'specific',
      code: 'BAD_REQUEST',
      status: 400,
      message: 'Question set not set',
    });
  });

  it('filters non-string entries from errors array', () => {
    const error = { response: { data: { errors: ['valid', 42, null] } } };
    expect(getErrorMessages(error)).toEqual(['valid']);
  });

  it('extracts messages from FastAPI validation detail', () => {
    const error = {
      response: {
        data: {
          detail: [
            { loc: ['body', 'name'], msg: 'field required' },
            { loc: ['body', 'score'], msg: 'must be positive' },
          ],
        },
      },
    };
    expect(getErrorMessages(error)).toEqual([
      'name: field required',
      'score: must be positive',
    ]);
  });

  it('extracts detail msg without loc', () => {
    const error = {
      response: {
        data: {
          detail: [{ msg: 'something failed' }],
        },
      },
    };
    expect(getErrorMessages(error)).toEqual(['something failed']);
  });

  it('classifies network errors as server down', () => {
    const error = { message: 'Network Error' };
    expect(getErrorInfo(error)).toMatchObject({
      kind: 'server_down',
      title: 'Backend unavailable',
    });
    expect(getErrorMessages(error)).toEqual([
      'Cannot reach the GradeFlow API. Check that the backend is running and try again.',
    ]);
  });

  it('classifies HTTP 500 separately from expected backend errors', () => {
    const error = {
      response: {
        status: 500,
        data: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error.',
          errors: ['Internal server error.'],
        },
      },
    };

    expect(getErrorInfo(error)).toMatchObject({
      kind: 'internal_server_error',
      code: 'INTERNAL_SERVER_ERROR',
      title: 'Internal server error',
      message: 'Internal server error.',
    });
  });

  it('falls back to Error instance message', () => {
    expect(getErrorMessages(new Error('something broke'))).toEqual(['something broke']);
  });

  it('returns generic fallback for unknown errors', () => {
    expect(getErrorMessages(42)).toEqual(['An unexpected error occurred']);
  });
});

describe('getErrorMessage', () => {
  it('joins multiple messages with newline', () => {
    const error = { response: { data: { errors: ['one', 'two'] } } };
    expect(getErrorMessage(error)).toBe('one\ntwo');
  });

  it('returns single message as-is', () => {
    expect(getErrorMessage(new Error('single'))).toBe('single');
  });
});
