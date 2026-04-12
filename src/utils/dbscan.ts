/**
 * DBSCAN (Density-Based Spatial Clustering of Applications with Noise).
 *
 * Groups elements into clusters based on a pairwise similarity predicate.
 * DBSCAN requires density: a point must have at least `minPts` neighbors 
 * to be a core point that can expand a cluster. Non-core points within range 
 * of a core point join its cluster; otherwise they become noise (singleton clusters).
 *
 * @param n          Number of elements.
 * @param areSimilar Returns true when elements i and j are within neighborhood distance.
 * @param minPts     Minimum neighborhood size (including self) for a core point.
 *                   Default 1: every point is core (equivalent to single-linkage).
 * @returns          Map from representative index → array of member indices.
 *                   Noise points are placed in singleton clusters.
 */
export const clusterByDBSCAN = (
  n: number,
  areSimilar: (i: number, j: number) => boolean,
  minPts: number = 1,
): Map<number, number[]> => {
  if (n === 0) return new Map();

  // Pre-compute neighbor lists (O(n²), same cost as the pairwise scan)
  const neighbors: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    neighbors[i]!.push(i); // self is always in own neighborhood
    for (let j = i + 1; j < n; j++) {
      if (areSimilar(i, j)) {
        neighbors[i]!.push(j);
        neighbors[j]!.push(i);
      }
    }
  }

  const UNVISITED = -1;
  const NOISE = -2;
  const labels = new Int32Array(n).fill(UNVISITED);
  let clusterId = 0;

  for (let i = 0; i < n; i++) {
    if (labels[i] !== UNVISITED) continue;

    if (neighbors[i]!.length < minPts) {
      labels[i] = NOISE;
      continue;
    }

    // Expand new cluster from core point i
    const id = clusterId++;
    labels[i] = id;

    const seedSet = new Set(neighbors[i]!);
    const seeds = neighbors[i]!.filter((j) => j !== i);

    for (let k = 0; k < seeds.length; k++) {
      const q = seeds[k]!;
      if (labels[q] === NOISE) labels[q] = id;
      if (labels[q] !== UNVISITED) continue;

      labels[q] = id;
      if (neighbors[q]!.length >= minPts) {
        for (const nb of neighbors[q]!) {
          if (!seedSet.has(nb)) {
            seedSet.add(nb);
            seeds.push(nb);
          }
        }
      }
    }
  }

  // Build result map keyed by first member (matches legacy output format)
  const buckets = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const label = labels[i]!;
    const key = label === NOISE ? -(i + 1) : label;
    const arr = buckets.get(key);
    if (arr) arr.push(i);
    else buckets.set(key, [i]);
  }

  const result = new Map<number, number[]>();
  for (const members of buckets.values()) {
    result.set(members[0]!, members);
  }
  return result;
};
