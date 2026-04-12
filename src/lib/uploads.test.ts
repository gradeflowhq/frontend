import { describe, expect, it } from 'vitest';

import { fileAcceptForConfig } from '@lib/uploads';

describe('fileAcceptForConfig', () => {
  it('returns csv accept string for csv format', () => {
    expect(fileAcceptForConfig({ format: 'csv' })).toBe('.csv,text/csv');
  });

  it('returns json accept string for json format', () => {
    expect(fileAcceptForConfig({ format: 'json' })).toBe('.json,application/json,text/plain');
  });

  it('returns yaml accept string for yaml format', () => {
    const result = fileAcceptForConfig({ format: 'yaml' });
    expect(result).toContain('.yml');
    expect(result).toContain('.yaml');
  });

  it('is case-insensitive', () => {
    expect(fileAcceptForConfig({ format: 'CSV' })).toBe('.csv,text/csv');
  });

  it('returns fallback for null config', () => {
    const result = fileAcceptForConfig(null);
    expect(result).toContain('.csv');
    expect(result).toContain('.json');
    expect(result).toContain('.yaml');
  });

  it('returns fallback for unknown format', () => {
    const result = fileAcceptForConfig({ format: 'unknown' });
    expect(result).toContain('.csv');
  });

  it('uses custom accept map', () => {
    const custom = { txt: '.txt,text/plain' };
    expect(fileAcceptForConfig({ format: 'txt' }, custom)).toBe('.txt,text/plain');
  });
});
