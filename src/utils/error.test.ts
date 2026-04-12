import { describe, expect, it } from 'vitest';

import { getErrorMessage, getErrorMessages } from '@utils/error';

describe('getErrorMessages', () => {
  it('extracts string array from { errors: [...] } payload', () => {
    const error = { response: { data: { errors: ['bad input', 'missing field'] } } };
    expect(getErrorMessages(error)).toEqual(['bad input', 'missing field']);
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

  it('falls back to AxiosError message', () => {
    const error = { message: 'Network Error' };
    expect(getErrorMessages(error)).toEqual(['Network Error']);
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
