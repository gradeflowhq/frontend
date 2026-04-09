import {
  Alert,
  Button,
  Group,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconLoader,
  IconPlayerPlay,
  IconX,
} from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import React, { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { QK } from '@api/queryKeys';
import { useAssessmentContext } from '@app/contexts/AssessmentContext';
import { PATHS } from '@app/routes/paths';
import PageShell from '@components/common/PageShell';
import { useAssessment } from '@features/assessments/api';
import { OverviewSetupTimeline } from '@features/assessments/components';
import { useSetupSteps } from '@features/assessments/hooks/useSetupSteps';
import { useGrading, useRunGrading, useCancelGrading } from '@features/grading/api';
import { GradingResultsCard } from '@features/grading/components';
const RunGradingModal = lazy(
  () => import('@features/grading/components/RunGradingModal'),
);
import { useGradingStatus } from '@features/grading/hooks/useGradingStatus';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { getErrorMessage } from '@utils/error';

import type { AdjustableSubmission } from '@api/models';
import type { GradingWarning } from '@features/grading/components/RunGradingModal';

// ── Page ──────────────────────────────────────────────────────────────────────

const OverviewPage: React.FC = () => {
  const { assessmentId, assessment: assessmentCtx } = useAssessmentContext();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useDocumentTitle(`Overview - ${assessmentCtx?.name ?? 'Assessment'} - GradeFlow`);

  const { data: assessmentData } = useAssessment(assessmentId, !!assessmentId, {
    staleTime: 10_000,
  });
  const assessment = assessmentData ?? assessmentCtx;

  const {
    setupSteps,
    allComplete,
    isLoading: setupLoading,
    covPct,
    covTotal,
    uncoveredIds,
  } = useSetupSteps(assessmentId);

  const { data: gradingData, isLoading: gradingLoading } = useGrading(assessmentId, !!assessmentId);
  const { gradingInProgress, jobStatus } = useGradingStatus(assessmentId);

  const runGradingMutation = useRunGrading(assessmentId);
  const cancelGradingMutation = useCancelGrading(assessmentId);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [awaitingNav, setAwaitingNav] = useState(false);

  const submissions = (gradingData?.submissions ?? []) as AdjustableSubmission[];
  const hasGrading = submissions.length > 0;
  const hasGradingJob = jobStatus !== undefined;

  // Detect whether any manual adjustments exist across all submissions
  const hasExistingAdjustments = submissions.some((s) =>
    Object.values(s.result_map ?? {}).some(
      (r) =>
        (r.adjusted_points !== null && r.adjusted_points !== undefined) ||
        (r.adjusted_feedback !== null && r.adjusted_feedback !== undefined),
    ),
  );

  // ── Build warnings list ───────────────────────────────────────────────────

  const warnings: GradingWarning[] = [];

  if (covPct < 1 && covTotal > 0) {
    warnings.push({
      key: 'coverage',
      message:
        uncoveredIds.length > 0
          ? `${uncoveredIds.length} question${uncoveredIds.length !== 1 ? 's' : ''} have no rules: ${uncoveredIds.join(', ')}.`
          : 'Rubric coverage is below 100%.',
    });
  }

  if (hasGrading) {
    warnings.push({
      key: 'override',
      message: 'Submissions have already been graded. Running again will override all existing results.',
    });
  }

  // ── Grading actions ───────────────────────────────────────────────────────

  const startRunAndAwait = (removeAdjustments: boolean) => {
    runGradingMutation.mutate(removeAdjustments, {
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

  const handleCancelGrading = () => {
    cancelGradingMutation.mutate(undefined, {
      onSuccess: () => {
        setAwaitingNav(false);
        notifications.show({ color: 'yellow', message: 'Grading job cancelled' });
      },
      onError: (e) => {
        notifications.show({ color: 'red', message: getErrorMessage(e) || 'Failed to cancel grading' });
      },
    });
  };

  useEffect(() => {
    if (!awaitingNav) return;
    if (jobStatus === 'completed') {
      setAwaitingNav(false);
      void (async () => {
        await qc.invalidateQueries({ queryKey: QK.grading.item(assessmentId) });
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
                  void navigate(PATHS.assessment(assessmentId).results.statistics);
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
    // Always open the unified modal — it shows a simple confirmation when
    // there are no warnings, and lists all issues when there are.
    setConfirmOpen(true);
  };

  const handleConfirm = (removeAdjustments: boolean) => {
    setConfirmOpen(false);
    startRunAndAwait(removeAdjustments);
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

        {gradingInProgress && (
          <Alert icon={<IconLoader size={16} />} color="blue" radius="md">
            <Group justify="space-between" align="center">
              <Text size="sm">Grading in progress...</Text>
              <Button
                size="xs"
                color="red"
                leftSection={<IconX size={13} />}
                loading={cancelGradingMutation.isPending}
                onClick={handleCancelGrading}
              >
                Cancel
              </Button>
            </Group>
          </Alert>
        )}

        <OverviewSetupTimeline
          steps={setupSteps}
          onNavigate={(link) => void navigate(link)}
        />

        <GradingResultsCard
          assessmentId={assessmentId}
          hasGrading={hasGrading}
          hasGradingJob={hasGradingJob}
          submissions={submissions}
          gradingData={gradingData}
        />

        <Suspense fallback={null}>
          <RunGradingModal
            opened={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={handleConfirm}
            warnings={warnings}
            isLoading={runGradingMutation.isPending}
            hasExistingAdjustments={hasExistingAdjustments}
          />
        </Suspense>

      </Stack>
    </PageShell>
  );
};

export default OverviewPage;