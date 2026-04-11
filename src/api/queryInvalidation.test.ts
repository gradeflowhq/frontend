import { describe, expect, it, vi } from 'vitest';

import { invalidateQuestionSetQueries, invalidateRubricQueries } from './queryInvalidation';
import { QK } from './queryKeys';

describe('queryInvalidation helpers', () => {
  it('invalidates the question-set related query keys for an assessment', async () => {
    const queryClient = {
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    };

    await invalidateQuestionSetQueries(queryClient as never, 'assessment-1');

    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: QK.questionSet.item('assessment-1'),
    });
    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: QK.questionSet.parsed('assessment-1'),
    });
    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(3, {
      queryKey: QK.assessments.item('assessment-1'),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(3);
  });

  it('invalidates the rubric related query keys for an assessment', async () => {
    const queryClient = {
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    };

    await invalidateRubricQueries(queryClient as never, 'assessment-1');

    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: QK.rubric.item('assessment-1'),
    });
    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: QK.rubric.coverage('assessment-1'),
    });
    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(3, {
      queryKey: QK.assessments.item('assessment-1'),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(3);
  });
});