import {
  Alert,
  Box,
  Button,
  Divider,
  Group,
  Modal,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCheck,
  IconCircle,
  IconSend,
  IconListCheck,
  IconPlayerPlay,
  IconLoader,
} from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { QK } from '@api/queryKeys';
import { useAssessmentContext } from '@app/contexts/AssessmentContext';
import PageShell from '@components/common/PageShell';
import { useGrading, useGradingJob, useJobStatus, useRunGrading } from '@features/grading/api';
import { computeStats, buildTotals } from '@features/grading/helpers';
import { useQuestionSet } from '@features/questions/api';
import { useRubricCoverage } from '@features/rubric/api';
import { useSubmissions } from '@features/submissions/api';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { getErrorMessage } from '@utils/error';

import type { AdjustableSubmission } from '@api/models';

type StepStatus = 'complete' | 'warning' | 'not-started';

interface SetupStep {
  label: string;
  status: StepStatus;
  summary: string;
  fixLink?: string;
}

const StepIcon: React.FC<{ status: StepStatus }> = ({ status }) => {
  if (status === 'complete') {
    return (
      <ThemeIcon color="green" size="sm" radius="xl" variant="filled">
        <IconCheck size={12} />
      </ThemeIcon>
    );
  }
  if (status === 'warning') {
    return (
      <ThemeIcon color="yellow" size="sm" radius="xl" variant="filled">
        <IconAlertTriangle size={12} />
      </ThemeIcon>
    );
  }
  return (
    <ThemeIcon color="gray" size="sm" radius="xl" variant="light">
      <IconCircle size={12} />
    </ThemeIcon>
  );
};

const OverviewPage: React.FC = () => {
  const { assessmentId = '' } = useParams<{ assessmentId: string }>();
  const { assessment } = useAssessmentContext();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useDocumentTitle(`Overview - ${assessment?.name ?? 'Assessment'} - GradeFlow`);

  const { data: subsRes, isLoading: subsLoading } = useSubmissions(assessmentId);
  const { data: qsRes, isLoading: qsLoading, isError: qsError } = useQuestionSet(assessmentId, !!assessmentId);
  const { data: coverageRes, isLoading: covLoading } = useRubricCoverage(assessmentId);
  const { data: gradingData, isLoading: gradingLoading } = useGrading(assessmentId, !!assessmentId);
  const { data: gradingJob } = useGradingJob(assessmentId, !!assessmentId);
  const jobId = gradingJob?.job_id ?? null;
  const { data: jobStatusRes } = useJobStatus(jobId, !!jobId);
  const jobStatus = jobStatusRes?.status;
  const gradingInProgress = jobStatus === 'queued' || jobStatus === 'running';

  const runGradingMutation = useRunGrading(assessmentId);

  const [confirmCoverage, setConfirmCoverage] = useState(false);
  const [confirmOverride, setConfirmOverride] = useState(false);
  const [awaitingNav, setAwaitingNav] = useState(false);

  const submissions = useMemo<AdjustableSubmission[]>(() => gradingData?.submissions ?? [], [gradingData]);
  const hasGrading = submissions.length > 0;
  const hasGradingJob = !!gradingJob?.job_id;

  const isQsMissing = useMemo(() => {
    const err = qsError as unknown as { response?: { status?: number } } | undefined;
    return err?.response?.status === 404 || !qsRes?.question_set;
  }, [qsError, qsRes]);

  const questionMap = isQsMissing ? {} : (qsRes?.question_set?.question_map ?? {});
  const questionCount = Object.keys(questionMap).length;

  const subsCount = subsRes?.raw_submissions?.length ?? 0;
  const studentIdColumn = subsRes?.raw_submissions?.[0]?.student_id ? 'student_id' : null;
  const cov = coverageRes?.coverage;
  const covPct = cov?.percentage ?? 0;
  const covTotal = cov?.total ?? 0;
  const covCovered = cov?.covered ?? 0;
  const uncoveredIds = useMemo(() => {
    const all = cov?.question_ids ?? [];
    const covered = new Set(cov?.covered_question_ids ?? []);
    return all.filter((qid) => !covered.has(qid));
  }, [cov]);

  const setupSteps: SetupStep[] = useMemo(() => {
    const subsStatus: StepStatus = subsCount > 0 ? 'complete' : 'not-started';
    const subsLabel = subsCount > 0
      ? `${subsCount} students${studentIdColumn ? ' · student_id column' : ''}`
      : 'Not started';

    const qsStatus: StepStatus = questionCount > 0 ? 'complete' : 'not-started';
    const qsLabel = questionCount > 0 ? `${questionCount} questions configured` : 'Not started';

    let rulesStatus: StepStatus = 'not-started';
    let rulesLabel = 'Not started';
    let rulesFixLink: string | undefined;
    if (covTotal > 0) {
      if (covPct >= 1) {
        rulesStatus = 'complete';
        rulesLabel = `${covCovered}/${covTotal} questions covered`;
      } else if (covPct > 0) {
        rulesStatus = 'warning';
        rulesLabel = `${covCovered}/${covTotal} questions covered (${Math.round(covPct * 100)}%)`;
        rulesFixLink = `/assessments/${assessmentId}/rules`;
      } else {
        rulesStatus = 'not-started';
        rulesLabel = 'No rules configured';
      }
    }

    return [
      { label: 'Submissions', status: subsStatus, summary: subsLabel, fixLink: subsStatus !== 'complete' ? `/assessments/${assessmentId}/submissions` : undefined },
      { label: 'Questions', status: qsStatus, summary: qsLabel, fixLink: qsStatus !== 'complete' ? `/assessments/${assessmentId}/questions` : undefined },
      { label: 'Rules', status: rulesStatus, summary: rulesLabel, fixLink: rulesFixLink },
    ];
  }, [subsCount, studentIdColumn, questionCount, covPct, covTotal, covCovered, assessmentId]);

  const isPageLoading = subsLoading || qsLoading || covLoading || gradingLoading;

  const quickStats = useMemo(() => {
    if (!hasGrading) return null;
    const totals = buildTotals(submissions);
    const pcts = totals.map((t) => (t.totalMax > 0 ? (t.totalPoints / t.totalMax) * 100 : 0));
    return computeStats(pcts);
  }, [hasGrading, submissions]);

  const startRunAndAwait = () => {
    runGradingMutation.mutate(undefined, {
      onSuccess: () => {
        setAwaitingNav(true);
        notifications.show({ color: 'blue', message: 'Grading job started' });
      },
      onError: (e) => {
        setAwaitingNav(false);
        notifications.show({ color: 'red', message: getErrorMessage(e) || 'Failed to start grading' });
      },
    });
  };

  useEffect(() => {
    if (!awaitingNav) return;
    if (jobStatus === 'completed') {
      setAwaitingNav(false);
      notifications.show({ color: 'green', message: 'Grading completed' });
      void (async () => {
        await qc.invalidateQueries({ queryKey: QK.grading.item(assessmentId) });
        void navigate(`/assessments/${assessmentId}/results`);
      })();
    } else if (jobStatus === 'failed') {
      setAwaitingNav(false);
      notifications.show({ color: 'red', message: 'Grading job failed' });
    }
  }, [awaitingNav, jobStatus, navigate, assessmentId, qc]);

  const handleGradeClick = () => {
    if (covPct < 1 && covTotal > 0) {
      setConfirmCoverage(true);
      return;
    }
    if (hasGrading) {
      setConfirmOverride(true);
      return;
    }
    startRunAndAwait();
  };

  const isRunning = gradingInProgress || runGradingMutation.isPending || awaitingNav;

  if (isPageLoading) {
    return (
      <PageShell title={<Skeleton height={20} width={120} />}>
        <Skeleton height={40} mb="md" />
        <Skeleton height={120} mb="md" />
        <Skeleton height={80} />
      </PageShell>
    );
  }

  return (
    <PageShell
      title={assessment?.name ?? 'Overview'}
      actions={
        <Button
          leftSection={<IconPlayerPlay size={16} />}
          onClick={handleGradeClick}
          loading={isRunning}
          disabled={isRunning}
        >
          Run Grading
        </Button>
      }
    >

      {/* Grading in-progress banner */}
      {gradingInProgress && (
        <Alert icon={<IconLoader size={16} />} color="blue" mb="md">
          Grading in progress...
        </Alert>
      )}

      {/* Setup Progress */}
      <Box mb="md">
        <Text fw={600} tt="uppercase" size="xs" c="dimmed" mb="sm">Setup Progress</Text>
        <Stack gap="xs">
          {setupSteps.map((step, i) => (
            <Group key={step.label} gap="sm" align="center">
              <Text fw={600} size="sm" w={20} ta="center" c="dimmed">{i + 1}</Text>
              <StepIcon status={step.status} />
              <Text size="sm" fw={500} w={100}>{step.label}</Text>
              <Text size="sm" c="dimmed">{step.summary}</Text>
              {step.status === 'warning' && step.fixLink && (
                <Button
                  variant="subtle"
                  size="xs"
                  rightSection={<IconArrowRight size={12} />}
                  onClick={() => void navigate(step.fixLink!)}
                >
                  Fix
                </Button>
              )}
              {step.status === 'not-started' && step.fixLink && (
                <Button
                  variant="subtle"
                  size="xs"
                  c="dimmed"
                  rightSection={<IconArrowRight size={12} />}
                  onClick={() => void navigate(step.fixLink!)}
                >
                  Start
                </Button>
              )}
            </Group>
          ))}
        </Stack>
      </Box>

      {/* Grading Status */}
      {(hasGrading || hasGradingJob) && (
        <>
          <Divider mb="md" />
          <Box mb="md">
            <Text fw={600} tt="uppercase" size="xs" c="dimmed" mb="sm">Grading Status</Text>
            <Text size="sm" c="dimmed" mb="sm">
              {hasGrading ? `${submissions.length} results` : 'No results yet'}
            </Text>
            <Group gap="sm">
              <Button variant="default" size="sm" leftSection={<IconListCheck size={14} />} onClick={() => void navigate(`/assessments/${assessmentId}/results`)}>
                View Results
              </Button>
              <Button variant="default" size="sm" leftSection={<IconSend size={14} />} onClick={() => void navigate(`/assessments/${assessmentId}/publish`)}>
                Publish to Canvas
              </Button>
            </Group>
          </Box>
        </>
      )}

      {/* Quick Stats */}
      {quickStats && quickStats.count > 0 && (
        <>
          <Divider mb="md" />
          <Box>
            <Text fw={600} tt="uppercase" size="xs" c="dimmed" mb="sm">Quick Stats</Text>
            <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="xs">
              {[
                { label: 'Mean', value: `${quickStats.mean.toFixed(1)}%` },
                { label: 'Median', value: `${quickStats.q2.toFixed(1)}%` },
                { label: 'Std dev', value: `${quickStats.stdev.toFixed(1)}` },
                { label: 'Min', value: `${quickStats.min.toFixed(1)}%` },
                { label: 'Max', value: `${quickStats.max.toFixed(1)}%` },
              ].map(({ label, value }) => (
                <Box key={label} style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 8, padding: '12px 16px' }}>
                  <Text size="xs" c="dimmed">{label}</Text>
                  <Text size="lg" fw={600}>{value}</Text>
                </Box>
              ))}
            </SimpleGrid>
          </Box>
        </>
      )}

      {/* Confirm: incomplete coverage */}
      <Modal
        opened={confirmCoverage}
        onClose={() => setConfirmCoverage(false)}
        title="Incomplete Coverage"
      >
        <Text mb="md">
          {uncoveredIds.length > 0
            ? `The following questions are not covered by any rules: ${uncoveredIds.join(', ')}. Proceed with grading anyway?`
            : 'Rubric coverage is below 100%. Proceed with grading anyway?'}
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setConfirmCoverage(false)}>Cancel</Button>
          <Button onClick={() => {
            setConfirmCoverage(false);
            if (hasGrading) setConfirmOverride(true);
            else startRunAndAwait();
          }}>
            Proceed
          </Button>
        </Group>
      </Modal>

      {/* Confirm: override existing */}
      <Modal
        opened={confirmOverride}
        onClose={() => setConfirmOverride(false)}
        title="Override Existing Grading"
      >
        <Text mb="md">
          Submissions have already been graded. Continuing will override all results and adjustments. Proceed?
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setConfirmOverride(false)}>Cancel</Button>
          <Button loading={runGradingMutation.isPending} onClick={() => { setConfirmOverride(false); startRunAndAwait(); }}>
            Proceed
          </Button>
        </Group>
      </Modal>
    </PageShell>
  );
};

export default OverviewPage;
