import { Alert, Group, Skeleton, Stack, Tabs } from '@mantine/core';
import { IconActivity, IconChartBar } from '@tabler/icons-react';
import React, { lazy, Suspense, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { useAssessmentContext } from '@app/contexts/AssessmentContext';
import ErrorAlert from '@components/common/ErrorAlert';
import PageShell from '@components/common/PageShell';
import { useGrading } from '@features/grading/api';
import GradingStatusBanner from '@features/grading/components/GradingStatusBanner';
import NoGradingResults from '@features/grading/components/NoGradingResults';
import QuestionAnalysisGridSkeleton from '@features/grading/components/QuestionAnalysisGridSkeleton';
import ResultsStatsSkeleton from '@features/grading/components/ResultsStatsSkeleton';
const ResultsStatsPanel = lazy(
  () => import('@features/grading/components/ResultsStatsPanel'),
);
const QuestionAnalysisGrid = lazy(
  () => import('@features/grading/components/QuestionAnalysisGrid'),
);
import { useGradingStatus } from '@features/grading/hooks/useGradingStatus';
import { useQuestionSet } from '@features/questions/api';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { natsort } from '@utils/sort';

import type { AdjustableSubmission, QuestionSetOutputQuestionMap } from '@api/models';

const StatisticsTabsSkeleton: React.FC = () => (
  <Stack gap="md" aria-label="Loading statistics page">
    <Group gap="xs">
      <Skeleton height={36} width={112} radius="sm" />
      <Skeleton height={36} width={112} radius="sm" />
    </Group>
    <ResultsStatsSkeleton />
  </Stack>
);

const StatisticsPageInner: React.FC<{ assessmentId: string }> = ({ assessmentId }) => {
  const { assessment } = useAssessmentContext();

  const [activeTab, setActiveTab] = useState<string>('stats');

  const { data: gradingData, isLoading, isError, error } = useGrading(assessmentId, true);
  const { data: qsRes } = useQuestionSet(assessmentId, true);
  const { gradingInProgress, updatedAt } = useGradingStatus(assessmentId);

  const items: AdjustableSubmission[] = useMemo(() => gradingData?.submissions ?? [], [gradingData]);
  const hasItems = items.length > 0;

  const questionMap: QuestionSetOutputQuestionMap = useMemo(
    () => qsRes?.question_set?.question_map ?? {},
    [qsRes],
  );
  const questionIds = useMemo(() => Object.keys(questionMap).sort(natsort), [questionMap]);

  useDocumentTitle(`Statistics - ${assessment?.name ?? 'Assessment'} - GradeFlow`);

  return (
    <PageShell title="Statistics" updatedAt={updatedAt}>
      {isError && <ErrorAlert error={error} mb="md" />}

      <GradingStatusBanner assessmentId={assessmentId} />

      {isLoading ? (
        <StatisticsTabsSkeleton />
      ) : !isError && !hasItems && !gradingInProgress ? (
        <NoGradingResults assessmentId={assessmentId} />
      ) : (
        <Tabs value={activeTab} onChange={(v) => setActiveTab(v ?? 'stats')}>
          <Tabs.List>
            <Tabs.Tab value="stats" leftSection={<IconChartBar size={14} />}>Overview</Tabs.Tab>
            <Tabs.Tab value="analysis" leftSection={<IconActivity size={14} />}>Questions</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="stats" pt="md">
            {!isError && hasItems && (
              <Suspense fallback={<ResultsStatsSkeleton />}>
                <ResultsStatsPanel items={items} />
              </Suspense>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="analysis" pt="md">
            {!isError && hasItems && (
              <Suspense fallback={<QuestionAnalysisGridSkeleton />}>
                <QuestionAnalysisGrid items={items} questionIds={questionIds} />
              </Suspense>
            )}
          </Tabs.Panel>
        </Tabs>
      )}
    </PageShell>
  );
};

const StatisticsPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  if (!assessmentId) {
    return <Alert color="red">Assessment ID is missing.</Alert>;
  }
  return <StatisticsPageInner assessmentId={assessmentId} />;
};

export default StatisticsPage;
