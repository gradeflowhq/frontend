import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  formatAbsolute,
  formatDuration,
  formatSmartLabel,
  getTimestampMs,
  secondsToMs,
} from '@utils/datetime';

describe('formatAbsolute', () => {
  it('returns em-dash for invalid dates', () => {
    expect(formatAbsolute('not-a-date')).toBe('—');
  });

  it('formats a valid ISO date with default pattern', () => {
    const result = formatAbsolute('2024-03-15T10:30:00Z');
    // Should contain "Mar 15" at minimum
    expect(result).toContain('Mar');
    expect(result).toContain('15');
  });

  it('applies a custom pattern', () => {
    const result = formatAbsolute('2024-06-01T00:00:00Z', { pattern: 'YYYY-MM-DD' });
    expect(result).toBe('2024-06-01');
  });

  it('includes year for dates not in the current year', () => {
    const result = formatAbsolute('2020-01-01T00:00:00Z');
    expect(result).toContain('2020');
  });
});

describe('formatSmartLabel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns em-dash for invalid dates', () => {
    expect(formatSmartLabel('garbage')).toBe('—');
  });

  it('returns relative string for recent dates', () => {
    const twoHoursAgo = new Date('2024-06-15T10:00:00Z').toISOString();
    const result = formatSmartLabel(twoHoursAgo);
    expect(result).toContain('hours ago');
  });

  it('returns absolute string for old dates', () => {
    const oldDate = new Date('2024-01-01T00:00:00Z').toISOString();
    const result = formatSmartLabel(oldDate);
    expect(result).toContain('Jan');
  });

  it('respects custom recentThresholdMs', () => {
    // 3 hours ago with 1 hour threshold → should use absolute
    const threeHoursAgo = new Date('2024-06-15T09:00:00Z').toISOString();
    const result = formatSmartLabel(threeHoursAgo, {
      recentThresholdMs: 60 * 60 * 1000, // 1 hour
    });
    expect(result).toContain('Jun');
  });

  it('omits suffix when withRelativeSuffix is false', () => {
    const oneHourAgo = new Date('2024-06-15T11:00:00Z').toISOString();
    const result = formatSmartLabel(oneHourAgo, { withRelativeSuffix: false });
    expect(result).not.toContain('ago');
  });
});

describe('datetime primitives', () => {
  it('parses valid timestamps and returns null for invalid input', () => {
    expect(getTimestampMs('2024-06-15T12:00:00Z')).toBe(Date.UTC(2024, 5, 15, 12));
    expect(getTimestampMs('not-a-date')).toBeNull();
    expect(getTimestampMs(null)).toBeNull();
  });

  it('converts positive second durations to milliseconds', () => {
    expect(secondsToMs(12.5)).toBe(12_500);
    expect(secondsToMs(0)).toBeNull();
    expect(secondsToMs(null)).toBeNull();
  });

  it('formats durations compactly with seconds', () => {
    expect(formatDuration(30_000)).toBe('30 sec');
    expect(formatDuration(61_000)).toBe('1 min 1 sec');
    expect(formatDuration(65 * 60_000)).toBe('1 hr 5 min');
    expect(formatDuration(3_601_000)).toBe('1 hr 1 min');
  });
});
