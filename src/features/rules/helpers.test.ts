import { describe, expect, it } from 'vitest';

import { getRuleDescriptionText } from './helpers';

describe('getRuleDescriptionText', () => {
  it('returns description string from rule object', () => {
    expect(getRuleDescriptionText({ description: 'My rule' })).toBe('My rule');
  });

  it('returns null for empty string description', () => {
    expect(getRuleDescriptionText({ description: '' })).toBeNull();
  });

  it('returns null when description is missing', () => {
    expect(getRuleDescriptionText({ type: 'TEXT_MATCH' })).toBeNull();
  });

  it('returns null for null input', () => {
    expect(getRuleDescriptionText(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(getRuleDescriptionText(undefined)).toBeNull();
  });

  it('returns null for non-string description', () => {
    expect(getRuleDescriptionText({ description: 42 })).toBeNull();
    expect(getRuleDescriptionText({ description: true })).toBeNull();
  });
});
