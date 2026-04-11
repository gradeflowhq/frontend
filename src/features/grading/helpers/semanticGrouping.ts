/**
 * Semantic similarity grouping using Transformers.js.
 *
 * The embedding model is loaded lazily on first use and cached in IndexedDB by
 * the runtime so subsequent page loads are fast.
 */

import { clusterByPairwise } from '@utils/unionFind';

import { answerToString, buildGroupEntry, buildGroupKey } from './grouping';

import type { AnswerGroup, GroupingMode } from './grouping';
import type { AdjustableSubmission } from '@api/models';

// ── Singleton pipeline ────────────────────────────────────────────────────────

type FeatureExtractionPipeline = (
  text: string,
  opts: { pooling: string; normalize: boolean },
) => Promise<{ data: Float32Array }>;

let pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;
let modelReady = false;

const TRANSFORMERS_CACHE_NAME = 'transformers-cache';
/** @internal Exported for tests. */
export const TRANSFORMERS_CACHE_VERSION_KEY = 'gradeflow:semantic-cache-version';
/** @internal Exported for tests. */
export const TRANSFORMERS_CACHE_VERSION = 'remote-only-xenova-minilm-v1';

const clearTransformersBrowserCache = async (): Promise<void> => {
  if (typeof caches === 'undefined') return;
  await caches.delete(TRANSFORMERS_CACHE_NAME);
};

const ensureTransformersCacheVersion = async (): Promise<void> => {
  if (typeof localStorage === 'undefined') return;
  try {
    const currentVersion = localStorage.getItem(TRANSFORMERS_CACHE_VERSION_KEY);
    if (currentVersion === TRANSFORMERS_CACHE_VERSION) return;

    await clearTransformersBrowserCache();
    localStorage.setItem(TRANSFORMERS_CACHE_VERSION_KEY, TRANSFORMERS_CACHE_VERSION);
  } catch {
    // Storage access is best-effort; loading failures should still surface to the user.
  }
};

const createEmbeddingPipeline = async (): Promise<FeatureExtractionPipeline> => {
  const { pipeline, env } = await import('@xenova/transformers');

  // Disable local-model lookup: the SPA fallback (nginx / Vite dev server)
  // serves index.html for any unmatched path, so an attempt to load
  // config.json from the local server returns HTML, causing a JSON parse
  // error ("Unrecognized token '<'"). Force remote-only fetching.
  env.allowLocalModels = false;
  env.useBrowserCache = true;

  return (pipeline as (
    task: string,
    model: string,
  ) => Promise<FeatureExtractionPipeline>)(
    'feature-extraction',
    'Xenova/all-MiniLM-L6-v2',
  );
};

export const isEmbeddingModelReady = (): boolean => modelReady;

export const getEmbeddingPipeline = (): Promise<FeatureExtractionPipeline> => {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      await ensureTransformersCacheVersion();

      const pipe = await createEmbeddingPipeline();
      modelReady = true;
      return pipe;
    })().catch((error) => {
      pipelinePromise = null;
      modelReady = false;
      throw error;
    });
  }
  return pipelinePromise;
};

// ── Math helpers ──────────────────────────────────────────────────────────────

const cosineSimilarity = (a: Float32Array, b: Float32Array): number => {
  let dot = 0;
  let aNorm = 0;
  let bNorm = 0;
  for (let i = 0; i < a.length; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0);
    aNorm += (a[i] ?? 0) ** 2;
    bNorm += (b[i] ?? 0) ** 2;
  }
  const magnitudeProduct = Math.sqrt(aNorm) * Math.sqrt(bNorm);
  if (magnitudeProduct === 0) return 0;
  return Math.max(-1, Math.min(1, dot / magnitudeProduct));
};

// ── Clustering ────────────────────────────────────────────────────────────────

/** Union-Find clustering that merges pairs whose cosine similarity ≥ threshold. */
const clusterByCosine = (
  embeddings: Float32Array[],
  threshold: number,
): Map<number, number[]> => {
  return clusterByPairwise(embeddings.length, (i, j) =>
    cosineSimilarity(embeddings[i]!, embeddings[j]!) >= threshold,
  );
};

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Async version of groupByCluster that uses semantic (cosine) similarity
 * between sentence embeddings rather than Levenshtein edit distance.
 *
 * @param threshold  Cosine similarity threshold in [0, 1].
 *                   1.0 → only exact semantic matches are merged.
 *                   0.85 → a sensible default for similar meaning.
 */
export const groupBySemantic = async (
  submissions: AdjustableSubmission[],
  qid: string,
  threshold: number,
  mode: GroupingMode = 'answer',
): Promise<AnswerGroup[]> => {
  const entries = submissions.map((sub) => buildGroupEntry(sub, qid));
  if (entries.length === 0) return [];

  const texts = entries.map((e) =>
    mode === 'answer'
      ? answerToString(e.rawAnswer)
      : e.effectiveFeedback ?? '',
  );

  // Embed unique texts to avoid spending model compute on duplicates.
  const uniqueTexts = [...new Set(texts)];
  const pipe = await getEmbeddingPipeline();

  const uniqueEmbeddings = await Promise.all(
    uniqueTexts.map((t) => pipe(t || '(empty)', { pooling: 'mean', normalize: true })),
  );

  const textToEmbedding = new Map<string, Float32Array>();
  uniqueTexts.forEach((t, i) => {
    textToEmbedding.set(t, uniqueEmbeddings[i]!.data);
  });

  const entryEmbeddings = texts.map((t) => textToEmbedding.get(t)!);
  const clusters = clusterByCosine(entryEmbeddings, threshold);

  const groups: AnswerGroup[] = [];

  for (const [, indices] of clusters.entries()) {
    const clusterEntries = indices.map((i) => entries[i]!);

    // Frequency-rank the raw texts so the most common becomes the group label.
    const rawFreqMap = new Map<string, number>();
    for (const i of indices) {
      const raw = texts[i]!;
      rawFreqMap.set(raw, (rawFreqMap.get(raw) ?? 0) + 1);
    }
    const sortedRaws = [...rawFreqMap.entries()]
      .sort(([a, fa], [b, fb]) => fb - fa || a.localeCompare(b))
      .map(([raw]) => raw);

    const headRaw = sortedRaws[0] ?? '';
    const safeLabel = headRaw || (mode === 'answer' ? '(empty)' : '(no feedback)');
    const mergedAnswers = sortedRaws.length > 1 ? sortedRaws.slice(0, 20) : undefined;

    const pts = clusterEntries.map((e) => e.effectivePoints);
    const pointsMin = Math.min(...pts);
    const pointsMax = Math.max(...pts);

    groups.push({
      key: buildGroupKey(mode, safeLabel, clusterEntries),
      label: safeLabel,
      mode,
      entries: clusterEntries,
      mergedAnswers,
      pointsMin,
      pointsMax,
      isUniform: pointsMin === pointsMax,
      hasAdjustments: clusterEntries.some((e) => e.hasManualAdjustment),
      adjustmentCount: clusterEntries.filter((e) => e.hasManualAdjustment).length,
    });
  }

  return groups.sort((a, b) => b.entries.length - a.entries.length);
};
