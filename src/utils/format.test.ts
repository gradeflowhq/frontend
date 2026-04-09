import { describe, expect, it } from 'vitest';

import { formatNumericValue, parseNumber, truncateText } from '@utils/format';

describe('parseNumber', () => {
  it('returns undefined for undefined input', () => {
    expect(parseNumber(undefined)).toBeUndefined();
  });

  it('returns undefined for null input', () => {
    expect(parseNumber(null)).toBeUndefined();
  });

  it('parses a valid integer string', () => {
    expect(parseNumber('42')).toBe(42);
  });

  it('parses a valid float string', () => {
    expect(parseNumber('3.14')).toBe(3.14);
  });

  it('parses a numeric value directly', () => {
    expect(parseNumber(7)).toBe(7);
  });

  it('returns undefined for non-numeric string', () => {
    expect(parseNumber('abc')).toBeUndefined();
  });

  it('returns undefined for NaN', () => {
    expect(parseNumber(NaN)).toBeUndefined();
  });

  it('parses negative numbers', () => {
    expect(parseNumber(-5)).toBe(-5);
  });

  it('parses zero', () => {
    expect(parseNumber(0)).toBe(0);
  });

  it('trims whitespace before parsing', () => {
    expect(parseNumber('  10  ')).toBe(10);
  });
});

describe('formatNumericValue', () => {
  it('returns undefined for undefined input', () => {
    expect(formatNumericValue(undefined)).toBeUndefined();
  });

  it('returns null for null input', () => {
    expect(formatNumericValue(null)).toBeNull();
  });

  it('rounds to 3 decimal places', () => {
    expect(formatNumericValue(1.23456789)).toBe(1.235);
  });

  it('removes trailing zeros', () => {
    expect(formatNumericValue(1.5)).toBe(1.5);
  });

  it('handles integer values', () => {
    expect(formatNumericValue(5)).toBe(5);
  });

  it('parses a numeric string', () => {
    expect(formatNumericValue('2.7')).toBe(2.7);
  });

  it('returns original value for non-finite numbers', () => {
    expect(formatNumericValue(Infinity)).toBe(Infinity);
  });
});

describe('truncateText', () => {
  it('returns the original string if within limit', () => {
    expect(truncateText('hello', 10)).toBe('hello');
  });

  it('truncates and appends ellipsis when over limit', () => {
    expect(truncateText('hello world', 5)).toBe('hello...');
  });

  it('uses default limit of 160', () => {
    const long = 'a'.repeat(200);
    const result = truncateText(long);
    expect(result).toBe('a'.repeat(160) + '...');
  });

  it('returns empty string for empty input', () => {
    expect(truncateText('')).toBe('');
  });

  it('returns falsy values unchanged', () => {
    expect(truncateText(null as unknown as string)).toBeFalsy();
  });
});
