import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AdjustableSubmission } from '@api/models';

const SEMANTIC_CACHE_VERSION_KEY = 'gradeflow:semantic-cache-version';
const SEMANTIC_CACHE_VERSION = 'remote-only-xenova-minilm-v1';

const makeStorageMock = (initialEntries: Record<string, string> = {}) => {
  const store = new Map(Object.entries(initialEntries));

  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
  };
};

const makeSubmission = (
  id: string,
  answer: unknown,
  feedback = '',
): AdjustableSubmission => ({
  student_id: id,
  answer_map: { q1: answer } as AdjustableSubmission['answer_map'],
  result_map: {
    q1: {
      output: true,
      passed: true,
      feedback,
      rule: 'rule-1',
      points: 1,
      max_points: 1,
      graded: true,
    },
  } as AdjustableSubmission['result_map'],
} as AdjustableSubmission);

describe('getEmbeddingPipeline', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('@xenova/transformers');
    vi.unstubAllGlobals();
  });

  it('clears stale transformers cache once before first initialization and keeps browser caching enabled', async () => {
    const mockPipe = vi.fn();
    const env = { allowLocalModels: true, useBrowserCache: true };
    const pipelineMock = vi.fn().mockResolvedValue(mockPipe);
    const deleteMock = vi.fn().mockResolvedValue(true);
    const storageMock = makeStorageMock();

    vi.stubGlobal('caches', { delete: deleteMock });
    vi.stubGlobal('localStorage', storageMock);
    vi.doMock('@xenova/transformers', () => ({ env, pipeline: pipelineMock }));

    const { getEmbeddingPipeline, isEmbeddingModelReady } = await import('./semanticGrouping');

    const loadedPipe = await getEmbeddingPipeline();

    expect(loadedPipe).toBe(mockPipe);
    expect(deleteMock).toHaveBeenCalledWith('transformers-cache');
    expect(storageMock.setItem).toHaveBeenCalledWith(
      SEMANTIC_CACHE_VERSION_KEY,
      SEMANTIC_CACHE_VERSION,
    );
    expect(pipelineMock).toHaveBeenCalledWith(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
    );
    expect(env.useBrowserCache).toBe(true);
    expect(pipelineMock).toHaveBeenCalledTimes(1);
    expect(isEmbeddingModelReady()).toBe(true);
  });

  it('reuses the loaded pipeline after a successful initialization', async () => {
    const mockPipe = vi.fn();
    const env = { allowLocalModels: true, useBrowserCache: true };
    const pipelineMock = vi.fn().mockResolvedValue(mockPipe);
    const deleteMock = vi.fn().mockResolvedValue(true);
    const storageMock = makeStorageMock({
      [SEMANTIC_CACHE_VERSION_KEY]: SEMANTIC_CACHE_VERSION,
    });

    vi.stubGlobal('caches', { delete: deleteMock });
    vi.stubGlobal('localStorage', storageMock);
    vi.doMock('@xenova/transformers', () => ({ env, pipeline: pipelineMock }));

    const { getEmbeddingPipeline } = await import('./semanticGrouping');

    const first = await getEmbeddingPipeline();
    const second = await getEmbeddingPipeline();

    expect(first).toBe(mockPipe);
    expect(second).toBe(mockPipe);
    expect(deleteMock).not.toHaveBeenCalled();
    expect(pipelineMock).toHaveBeenCalledTimes(1);
  });

  it('clusters identical answers together at a 1.0 semantic threshold', async () => {
    const embeddingByText = new Map<string, Float32Array>([
      ['same answer', new Float32Array([1, 0])],
      ['different answer', new Float32Array([0, 1])],
    ]);
    const env = { allowLocalModels: true, useBrowserCache: true };
    const storageMock = makeStorageMock({
      [SEMANTIC_CACHE_VERSION_KEY]: SEMANTIC_CACHE_VERSION,
    });
    const pipelineMock = vi.fn().mockResolvedValue(
      vi.fn(async (text: string) => ({ data: embeddingByText.get(text) ?? new Float32Array([0, 0]) })),
    );

    vi.stubGlobal('caches', { delete: vi.fn().mockResolvedValue(true) });
    vi.stubGlobal('localStorage', storageMock);
    vi.doMock('@xenova/transformers', () => ({ env, pipeline: pipelineMock }));

    const { groupBySemantic } = await import('./semanticGrouping');

    const groups = await groupBySemantic(
      [
        makeSubmission('s1', 'same answer'),
        makeSubmission('s2', 'same answer'),
        makeSubmission('s3', 'different answer'),
      ],
      'q1',
      1.0,
    );

    expect(groups).toHaveLength(2);
    expect(groups[0]?.entries).toHaveLength(2);
    expect(groups[0]?.label).toBe('same answer');
  });

  it('supports semantic grouping for feedback comments', async () => {
    const embeddingByText = new Map<string, Float32Array>([
      ['Strong explanation', new Float32Array([1, 0])],
      ['Clear reasoning', new Float32Array([1, 0])],
      ['Needs revision', new Float32Array([0, 1])],
    ]);
    const env = { allowLocalModels: true, useBrowserCache: true };
    const storageMock = makeStorageMock({
      [SEMANTIC_CACHE_VERSION_KEY]: SEMANTIC_CACHE_VERSION,
    });
    const pipelineMock = vi.fn().mockResolvedValue(
      vi.fn(async (text: string) => ({ data: embeddingByText.get(text) ?? new Float32Array([0, 0]) })),
    );

    vi.stubGlobal('caches', { delete: vi.fn().mockResolvedValue(true) });
    vi.stubGlobal('localStorage', storageMock);
    vi.doMock('@xenova/transformers', () => ({ env, pipeline: pipelineMock }));

    const { groupBySemantic } = await import('./semanticGrouping');

    const groups = await groupBySemantic(
      [
        makeSubmission('s1', 'answer one', 'Strong explanation'),
        makeSubmission('s2', 'answer two', 'Clear reasoning'),
        makeSubmission('s3', 'answer three', 'Needs revision'),
      ],
      'q1',
      0.85,
      'feedback',
    );

    expect(groups).toHaveLength(2);
    expect(groups[0]?.mode).toBe('feedback');
    expect(groups[0]?.entries).toHaveLength(2);
  });
});