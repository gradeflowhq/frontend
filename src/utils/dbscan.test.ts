import { describe, expect, it } from 'vitest';

import { clusterByDBSCAN } from '@utils/dbscan';

describe('clusterByDBSCAN', () => {
  it('returns empty map for n=0', () => {
    expect(clusterByDBSCAN(0, () => true)).toEqual(new Map());
  });

  it('places every point in its own cluster when none are similar', () => {
    const result = clusterByDBSCAN(3, () => false);
    expect(result.size).toBe(3);
    for (const members of result.values()) {
      expect(members).toHaveLength(1);
    }
  });

  it('groups all points into one cluster when all are similar', () => {
    const result = clusterByDBSCAN(4, () => true);
    expect(result.size).toBe(1);
    const members = [...result.values()][0]!;
    expect(members.sort()).toEqual([0, 1, 2, 3]);
  });

  it('forms two clusters for two disjoint groups', () => {
    // 0,1 are similar; 2,3 are similar; no cross-group similarity
    const result = clusterByDBSCAN(4, (i, j) => {
      return (i < 2 && j < 2) || (i >= 2 && j >= 2);
    });
    expect(result.size).toBe(2);
    const clusters = [...result.values()].map((m) => m.sort());
    expect(clusters).toContainEqual([0, 1]);
    expect(clusters).toContainEqual([2, 3]);
  });

  it('respects minPts — noise points become singletons', () => {
    // Only 0 and 1 are similar (pair), minPts=3 means neither is core
    const result = clusterByDBSCAN(3, (i, j) => i <= 1 && j <= 1, 3);
    // All noise → 3 singleton clusters
    expect(result.size).toBe(3);
  });

  it('with minPts=2 border points join clusters via core points', () => {
    // Chain: 0-1-2 where 0~1 and 1~2 but not 0~2
    const result = clusterByDBSCAN(3, (i, j) => Math.abs(i - j) === 1, 2);
    // 1 is core (neighbors: 0,1,2 → size=3 ≥ 2). 0 and 2 each have 2 neighbors (self+1) ≥ 2
    expect(result.size).toBe(1);
    const members = [...result.values()][0]!;
    expect(members.sort()).toEqual([0, 1, 2]);
  });

  it('single element returns one cluster', () => {
    const result = clusterByDBSCAN(1, () => false);
    expect(result.size).toBe(1);
    expect([...result.values()][0]).toEqual([0]);
  });

  it('cluster keys are the first member index', () => {
    const result = clusterByDBSCAN(2, () => true);
    expect(result.has(0)).toBe(true);
  });
});
