/**
 * Pure string-similarity helpers for group-view clustering.
 */

import { clusterByPairwise } from '@utils/unionFind';

/**
 * Standard Levenshtein edit distance using a two-row rolling array.
 * O(m * n) time, O(min(m, n)) space.
 */
export const editDistance = (a: string, b: string): number => {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Always iterate over the shorter string as the inner loop
  const [s, t] = a.length <= b.length ? [a, b] : [b, a];

  const n = t.length;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);

  for (let i = 1; i <= s.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,       // deletion
        curr[j - 1] + 1,   // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
};

/**
 * Normalised similarity in [0, 1].
 * similarity("", "") === 1.0
 */
export const similarity = (a: string, b: string): number => {
  const maxLen = Math.max(a.length, b.length, 1);
  return 1 - editDistance(a, b) / maxLen;
};

/**
 * Groups items into clusters where every pair within a cluster has
 * similarity >= threshold.
 *
 * @param items     Array of { id: string; normalized: string }
 * @param threshold 0–1; pairs with similarity >= threshold are merged
 * @returns Map from cluster-root's normalized string → array of ids
 */
export const clusterByThreshold = (
  items: { id: string; normalized: string }[],
  threshold: number,
): Map<string, string[]> => {
  const n = items.length;
  if (n === 0) return new Map();

  const clusters = clusterByPairwise(n, (i, j) =>
    similarity(items[i]!.normalized, items[j]!.normalized) >= threshold,
  );

  const result = new Map<string, string[]>();
  for (const [root, members] of clusters) {
    const key = items[root]!.normalized;
    result.set(key, members.map((idx) => items[idx]!.id));
  }

  return result;
};
