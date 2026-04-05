import {
  Alert,
  Button,
  Group,
  Modal,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconLoader,
  IconPlayerPlay,
} from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { QK } from '@api/queryKeys';
import { useAssessmentContext } from '@app/contexts/AssessmentContext';
import PageShell from '@components/common/PageShell';
import { useAssessment } from '@features/assessments/api';
import { OverviewSetupTimeline } from '@features/assessments/components';
import { useSetupSteps } from '@features/assessments/hooks/useSetupSteps';
import { useGrading, useGradingJob, useJobStatus, useRunGrading } from '@features/grading/api';
import { GradingResultsCard } from '@features/grading/components';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { getErrorMessage } from '@utils/error';

import type { AdjustableSubmission } from '@api/models';

// ── Page ──────────────────────────────────────────────────────────────────────

const OverviewPage: React.FC = () => {
  const { assessmentId = '' } = useParams<{ assessmentId: string }>();
  const { assessment: assessmentCtx } = useAssessmentContext();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useDocumentTitle(`Overview - ${assessmentCtx?.name ?? 'Assessment'} - GradeFlow`);

  // Fetch assessment directly with short staleTime so timestamps stay fresh
  // without needing to navigate away. Falls back to context value on first render.
  const { data: assessmentData } = useAssessment(assessmentId, !!assessmentId, {
    staleTime: 10_000,
  });
  const assessment = assessmentData ?? assessmentCtx;

  // Setup steps (submissions / questions / rules) — data fetching + derivation
  const {
    setupSteps,
    completeCount,
    allComplete,
    isLoading: setupLoading,
    covPct,
    covTotal,
    uncoveredIds,
  } = useSetupSteps(assessmentId);

  // Grading data
  const { data: gradingData, isLoading: gradingLoading } = useGrading(assessmentId, !!assessmentId);
  const { data: gradingJob }   = useGradingJob(assessmentId, !!assessmentId);

  const jobId = gradingJob?.job_id ?? null;
  const { data: jobStatusRes } = useJobStatus(jobId, !!jobId);
  const jobStatus         = jobStatusRes?.status;
  const gradingInProgress = jobStatus === 'queued' || jobStatus === 'running';

  const runGradingMutation = useRunGrading(assessmentId);

  const [confirmCoverage, setConfirmCoverage] = useState(false);
  const [confirmOverride, setConfirmOverride] = useState(false);
  const [awaitingNav,     setAwaitingNav    ] = useState(false);

  const submissions = (gradingData?.submissions ?? []) as AdjustableSubmission[];
  const hasGrading    = submissions.length > 0;
  const hasGradingJob = !!gradingJob?.job_id;

  // ── Grading actions ───────────────────────────────────────────────────────

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
      void (async () => {
        await qc.invalidateQueries({ queryKey: QK.grading.item(assessmentId) });
        // Also invalidate assessment so results_updated_at refreshes
        await qc.invalidateQueries({ queryKey: QK.assessments.item(assessmentId) });
        const notifId = `grading-complete-${assessmentId}-${Date.now()}`;
        notifications.show({
          id: notifId,
          color: 'green',
          title: 'Grading completed',
          message: (
            <Group gap="xs" mt={4}>
              <Button
                size="xs"
                variant="light"
                onClick={() => {
                  notifications.hide(notifId);
                  void navigate(`/assessments/${assessmentId}/results`);
                }}
              >
                See Results
              </Button>
              <Button
                size="xs"
                variant="subtle"
                color="gray"
                onClick={() => notifications.hide(notifId)}
              >
                Dismiss
              </Button>
            </Group>
          ),
          autoClose: false,
        });
      })();
    } else if (jobStatus === 'failed') {
      setAwaitingNav(false);
      notifications.show({ color: 'red', message: 'Grading job failed' });
    }
  }, [awaitingNav, jobStatus, navigate, assessmentId, qc]);

  const handleGradeClick = () => {
    if (covPct < 1 && covTotal > 0) { setConfirmCoverage(true); return; }
    if (hasGrading)                  { setConfirmOverride(true); return; }
    startRunAndAwait();
  };

  const isRunning = gradingInProgress || runGradingMutation.isPending || awaitingNav;

  // ── Loading ───────────────────────────────────────────────────────────────

  if (setupLoading || gradingLoading) {
    return (
      <PageShell title={<Skeleton height={24} width={160} />}>
        <Stack gap="md">
          <Skeleton height={180} radius="md" />
          <Skeleton height={120} radius="md" />
        </Stack>
      </PageShell>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <PageShell
      title={
        <Stack gap={2}>
          <Title order={3}>{assessment?.name ?? 'Overview'}</Title>
          {assessment?.description && (
            <Text size="sm" c="dimmed">{assessment.description}</Text>
          )}
        </Stack>
      }
      actions={
        <Button
          leftSection={<IconPlayerPlay size={16} />}
          onClick={handleGradeClick}
          loading={isRunning}
          disabled={isRunning}
          variant={allComplete ? 'filled' : 'default'}
        >
          Run Grading
        </Button>
      }
    >
      <Stack gap="md">

        {/* ── In-progress banner ── */}
        {gradingInProgress && (
          <Alert icon={<IconLoader size={16} />} color="blue" radius="md">
            Grading in progress...
          </Alert>
        )}

        {/* ── Setup timeline ── */}
        <OverviewSetupTimeline
          steps={setupSteps}
          completeCount={completeCount}
          onNavigate={(link) => void navigate(link)}
        />

        {/* ── Grading results card ── */}
        <GradingResultsCard
          assessmentId={assessmentId}
          assessment={assessment}
          hasGrading={hasGrading}
          hasGradingJob={hasGradingJob}
          submissions={submissions}
          gradingData={gradingData}
        />

        {/* ── Confirm: incomplete coverage ── */}
        <Modal
          opened={confirmCoverage}
          onClose={() => setConfirmCoverage(false)}
          title="Incomplete Coverage"
          radius="md"
        >
          <Text mb="md">
            {uncoveredIds.length > 0
              ? `The following questions have no rules: ${uncoveredIds.join(', ')}. Proceed anyway?`
              : 'Rubric coverage is below 100%. Proceed anyway?'}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmCoverage(false)}>Cancel</Button>
            <Button
              onClick={() => {
                setConfirmCoverage(false);
                if (hasGrading) setConfirmOverride(true);
                else startRunAndAwait();
              }}
            >
              Proceed
            </Button>
          </Group>
        </Modal>

        {/* ── Confirm: override existing ── */}
        <Modal
          opened={confirmOverride}
          onClose={() => setConfirmOverride(false)}
          title="Override Existing Grading"
          radius="md"
        >
          <Text mb="md">
            Submissions have already been graded. This will override all results and
            adjustments. Proceed?
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmOverride(false)}>Cancel</Button>
            <Button
              loading={runGradingMutation.isPending}
              onClick={() => { setConfirmOverride(false); startRunAndAwait(); }}
            >
              Proceed
            </Button>
          </Group>
        </Modal>

      </Stack>
    </PageShell>
  );
};

export default OverviewPage;