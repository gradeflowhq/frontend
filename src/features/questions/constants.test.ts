import { describe, expect, it } from 'vitest';

import { selectRootSchema } from '@features/questions/constants';

describe('selectRootSchema', () => {
  it.each([
    ['TEXT'],
    ['NUMERIC'],
    ['CHOICE'],
    ['MULTI_VALUED'],
  ] as const)('returns a schema object for %s', (type) => {
    const schema = selectRootSchema(type);
    expect(schema).not.toBeNull();
    expect(typeof schema).toBe('object');
  });

  it('falls back to TextQuestion for undefined', () => {
    const schema = selectRootSchema(undefined);
    expect(schema).not.toBeNull();
    expect(schema).toEqual(selectRootSchema('TEXT'));
  });

  it('falls back to TextQuestion for unknown type', () => {
    const schema = selectRootSchema('BOGUS');
    expect(schema).toEqual(selectRootSchema('TEXT'));
  });
});
