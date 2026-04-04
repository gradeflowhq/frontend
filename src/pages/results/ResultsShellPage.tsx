import { Alert, Button, Group, Skeleton, Stack, Tabs, Title } from '@mantine/core';
import { IconActivity, IconChartBar, IconChevronLeft, IconLayout } from '@tabler/icons-react';
import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';


import { useAssessment } from '@features/assessments/hooks';
import { AssessmentPassphraseProvider } from '@features/encryption/AssessmentPassphraseProvider';
import { useAssessmentPassphrase } from '@features/encryption/passphraseContext';
import { ResultsOverview, ResultsStats, QuestionAnalysis } from '@features/grading/components';
import { useGrading, useGradingJob, useJobStatus } from '@features/grading/hooks';
import { useQuestionSet } from '@features/questions/hooks';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { isEncrypted } from '@utils/crypto';
import { getErrorMessages } from '@utils/error';
import { natsort } from '@utils/sort';

import type { AdjustableSubmission, QuestionSetOutputQuestionMap } from '@api/models';

const ResultsShellInner: React.FC<{ assessmentId: string }> = ({ assessmentId }) => {
  const navigate = useNavigate();
  const safeId = assessmentId;
  const enabled = true;

  const { notifyEncryptedDetected } = useAssessmentPassphrase();
  const [activeTab, setActiveTab] = useState<string>('overview');

  const { data: assessmentRes, isLoading: loadingAssessment, isError: errorAssessment, error: assessmentError } =
    useAssessment(safeId, enabled);

  const { data: gradingData, isLoading, isError, error } =
    useGrading(safeId, enabled);

  const { data: qsRes } =
    useQuestionSet(safeId, enabled);

  const items: AdjustableSubmission[] = useMemo(
    () => gradingData?.submissions ?? [],
    [gradingData]
  );
  const hasItems = items.length > 0;
  const questionMap: QuestionSetOutputQuestionMap = useMemo(
    () => qsRes?.question_set?.question_map ?? {},
    [qsRes]
  );
  const questionIds = useMemo(() => Object.keys(questionMap).sort(natsort), [questionMap]);

  useEffect(() => {
    if (items.some((it) => isEncrypted(it.student_id))) {
      notifyEncryptedDetected();
    }
  }, [items, notifyEncryptedDetected]);

  const { data: gradingJob } = useGradingJob(safeId, enabled);
  const jobId = gradingJob?.job_id ?? null;
  const { data: jobStatusRes } = useJobStatus(jobId, !!jobId);
  const jobStatus = jobStatusRes?.status;
  const gradingInProgress = jobStatus === 'queued' || jobStatus === 'running';
  const loadingPage = loadingAssessment || isLoading;

  useDocumentTitle(`Results - ${assessmentRes?.name ?? 'Assessment'} - GradeFlow`);

  return (
    <Stack gap="md">
      <Group align="center" justify="space-between">
        <Group align="center" gap="sm">
          <Button
            variant="outline"
            onClick={() => { void navigate(`/assessments/${safeId}/rules`); }}
            leftSection={<IconChevronLeft size={16} />}
            size="sm"
          >
            {assessmentRes?.name ?? 'Assessment'}
          </Button>
          <Title order={4}>Grading Results</Title>
        </Group>
      </Group>

      {errorAssessment && (
        <Alert color="red">{getErrorMessages(assessmentError).join(' ')}</Alert>
      )}
      {isError && (
        <Alert color="red">{getErrorMessages(error).join(' ')}</Alert>
      )}

      {loadingPage ? (
        <Stack gap="xs">
          <Skeleton height={40} />
          <Skeleton height={300} />
        </Stack>
      ) : (
        <>
          {gradingInProgress && (
            <Alert color="blue">
              Grading is in progress. Existing results are shown below and will update when the job completes.
            </Alert>
          )}

          {!isError && !hasItems && !gradingInProgress && (
            <Alert color="blue">
              No graded submissions found. Run grading first.
            </Alert>
          )}

          <Tabs value={activeTab} onChange={(v) => setActiveTab(v ?? 'overview')}>
            <Tabs.List>
              <Tabs.Tab value="overview" leftSection={<IconLayout size={14} />}>
                Overview
              </Tabs.Tab>
              <Tabs.Tab value="stats" leftSection={<IconChartBar size={14} />}>
                Stats
              </Tabs.Tab>
              <Tabs.Tab value="analysis" leftSection={<IconActivity size={14} />}>
                Question Analysis
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="overview" pt="md">
              {!isError && hasItems && (
                <ResultsOverview
                  gradingInProgress={gradingInProgress}
                  items={items}
                  questionIds={questionIds}
                  onView={(studentId) => { void navigate(`/results/${safeId}/${encodeURIComponent(studentId)}`); }}
                  assessmentId={safeId}
                />
              )}
            </Tabs.Panel>

            <Tabs.Panel value="stats" pt="md">
              {!isError && hasItems && (
                <ResultsStats items={items} />
              )}
            </Tabs.Panel>

            <Tabs.Panel value="analysis" pt="md">
              {!isError && hasItems && (
                <QuestionAnalysis items={items} questionIds={questionIds} />
              )}
            </Tabs.Panel>
          </Tabs>
        </>
      )}
    </Stack>
  );
};

const ResultsShellPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  if (!assessmentId) {
    return <Alert color="red">Assessment ID is missing.</Alert>;
  }
  return (
    <AssessmentPassphraseProvider assessmentId={assessmentId}>
      <ResultsShellInner assessmentId={assessmentId} />
    </AssessmentPassphraseProvider>
  );
};

export default ResultsShellPage;
