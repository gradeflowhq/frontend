import { QK } from './queryKeys';

import type { QueryClient } from '@tanstack/react-query';

const invalidateQueryKeys = async (
  queryClient: QueryClient,
  queryKeys: readonly (readonly unknown[])[]
): Promise<void> => {
  await Promise.all(
    queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey }))
  );
};

export const invalidateQuestionSetQueries = async (
  queryClient: QueryClient,
  assessmentId: string
): Promise<void> => {
  await invalidateQueryKeys(queryClient, [
    QK.questionSet.item(assessmentId),
    QK.questionSet.parsed(assessmentId),
    QK.assessments.item(assessmentId),
  ]);
};

export const invalidateRubricQueries = async (
  queryClient: QueryClient,
  assessmentId: string
): Promise<void> => {
  await invalidateQueryKeys(queryClient, [
    QK.rubric.item(assessmentId),
    QK.rubric.coverage(assessmentId),
    QK.assessments.item(assessmentId),
  ]);
};

export const invalidateSubmissionQueries = async (
  queryClient: QueryClient,
  assessmentId: string
): Promise<void> => {
  await invalidateQueryKeys(queryClient, [
    QK.submissions.list(assessmentId),
    QK.submissions.source(assessmentId),
    QK.submissions.config(assessmentId),
    QK.assessments.item(assessmentId),
  ]);
};