import { Alert, Skeleton, Stack, Tabs } from '@mantine/core';
import { IconActivity, IconChartBar } from '@tabler/icons-react';
import React, { lazy, Suspense, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { useAssessmentContext } from '@app/contexts/AssessmentContext';
import PageShell from '@components/common/PageShell';
import { useGrading } from '@features/grading/api';
import GradingStatusBanner from '@features/grading/components/GradingStatusBanner';
import NoGradingResults from '@features/grading/components/NoGradingResults';
const ResultsStatsPanel = lazy(
  () => import('@features/grading/components/ResultsStatsPanel'),
);
const QuestionAnalysisGrid = lazy(
  () => import('@features/grading/components/QuestionAnalysisGrid'),
);
import { useGradingStatus } from '@features/grading/hooks/useGradingStatus';
import { useQuestionSet } from '@features/questions/api';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { getErrorMessage } from '@utils/error';
import { natsort } from '@utils/sort';

import type { AdjustableSubmission, QuestionSetOutputQuestionMap } from '@api/models';

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
      {isError && <Alert color="red" mb="md">{getErrorMessage(error)}</Alert>}

      <GradingStatusBanner assessmentId={assessmentId} />

      {isLoading ? (
        <Stack gap="xs">
          <Skeleton height={40} />
          <Skeleton height={300} />
        </Stack>
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
              <Suspense fallback={<Skeleton height={300} />}>
                <ResultsStatsPanel items={items} />
              </Suspense>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="analysis" pt="md">
            {!isError && hasItems && (
              <Suspense fallback={<Skeleton height={300} />}>
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