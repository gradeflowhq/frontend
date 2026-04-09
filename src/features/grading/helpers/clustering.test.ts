import { describe, expect, it } from 'vitest';

import {
  clusterByThreshold,
  editDistance,
  similarity,
} from '@features/grading/helpers/clustering';

describe('editDistance', () => {
  it('returns 0 for identical strings', () => {
    expect(editDistance('abc', 'abc')).toBe(0);
  });

  it('returns length of b when a is empty', () => {
    expect(editDistance('', 'abc')).toBe(3);
  });

  it('returns length of a when b is empty', () => {
    expect(editDistance('abc', '')).toBe(3);
  });

  it('returns 1 for single substitution', () => {
    expect(editDistance('abc', 'axc')).toBe(1);
  });

  it('returns 1 for single insertion', () => {
    expect(editDistance('abc', 'abcd')).toBe(1);
  });

  it('returns 1 for single deletion', () => {
    expect(editDistance('abcd', 'abc')).toBe(1);
  });

  it('computes distance for completely different strings', () => {
    expect(editDistance('abc', 'xyz')).toBe(3);
  });

  it('is commutative', () => {
    expect(editDistance('kitten', 'sitting')).toBe(editDistance('sitting', 'kitten'));
  });
});

describe('similarity', () => {
  it('returns 1 for identical strings', () => {
    expect(similarity('abc', 'abc')).toBe(1);
  });

  it('returns 1 for two empty strings', () => {
    expect(similarity('', '')).toBe(1);
  });

  it('returns value between 0 and 1 for partial matches', () => {
    const s = similarity('abc', 'axc');
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
  });

  it('returns lower similarity for more different strings', () => {
    expect(similarity('abc', 'axc')).toBeGreaterThan(similarity('abc', 'xyz'));
  });
});

describe('clusterByThreshold', () => {
  it('returns empty map for empty input', () => {
    expect(clusterByThreshold([], 0.8)).toEqual(new Map());
  });

  it('puts identical strings in the same cluster', () => {
    const items = [
      { id: 'a', normalized: 'hello' },
      { id: 'b', normalized: 'hello' },
    ];
    const result = clusterByThreshold(items, 1.0);
    const clusters = [...result.values()];
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toHaveLength(2);
  });

  it('creates separate clusters for very different strings at high threshold', () => {
    const items = [
      { id: 'a', normalized: 'apple' },
      { id: 'b', normalized: 'zzz' },
    ];
    const result = clusterByThreshold(items, 0.9);
    expect(result.size).toBe(2);
  });

  it('merges similar strings at lower threshold', () => {
    const items = [
      { id: 'a', normalized: 'cat' },
      { id: 'b', normalized: 'cats' },
    ];
    const result = clusterByThreshold(items, 0.5);
    const totalIds = [...result.values()].flat();
    expect(totalIds).toHaveLength(2);
  });

  it('each item appears exactly once across all clusters', () => {
    const items = [
      { id: 'a', normalized: 'foo' },
      { id: 'b', normalized: 'bar' },
      { id: 'c', normalized: 'baz' },
    ];
    const result = clusterByThreshold(items, 0.8);
    const allIds = [...result.values()].flat();
    expect(allIds.sort()).toEqual(['a', 'b', 'c']);
  });
});
