/**
 * Generic Union-Find clustering: merges index pairs whose similarity ≥ threshold.
 *
 * Uses path compression + union by rank.
 *
 * @param n           Number of elements.
 * @param areSimilar  Predicate that returns `true` when index `i` and `j` should be merged.
 * @returns           Map from root index → array of member indices.
 */
export const clusterByPairwise = (
  n: number,
  areSimilar: (i: number, j: number) => boolean,
): Map<number, number[]> => {
  if (n === 0) return new Map();

  const parent = Array.from({ length: n }, (_, i) => i);
  const rank = new Array<number>(n).fill(0);

  const find = (x: number): number => {
    if (parent[x] !== x) parent[x] = find(parent[x]!);
    return parent[x]!;
  };

  const union = (x: number, y: number): void => {
    const rx = find(x);
    const ry = find(y);
    if (rx === ry) return;
    if (rank[rx]! < rank[ry]!) {
      parent[rx] = ry;
    } else if (rank[rx]! > rank[ry]!) {
      parent[ry] = rx;
    } else {
      parent[ry] = rx;
      rank[rx]!++;
    }
  };

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (areSimilar(i, j)) {
        union(i, j);
      }
    }
  }

  const clusters = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const existing = clusters.get(root);
    if (existing) {
      existing.push(i);
    } else {
      clusters.set(root, [i]);
    }
  }
  return clusters;
};
