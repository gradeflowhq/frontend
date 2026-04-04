import { Alert, ActionIcon, Button, Group, Modal, Skeleton, Stack, Text } from '@mantine/core';
import { Menu } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAdjustments, IconInbox, IconListCheck, IconLock, IconPencil, IconQuestionMark, IconSettings, IconUsers } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { NavLink, Outlet, useParams, useNavigate } from 'react-router-dom';

import { QK } from '@api/queryKeys';
import PageHeader from '@components/common/PageHeader';
import { MembersDialog } from '@features/assessments/components';
import AssessmentEditModal from '@features/assessments/components/AssessmentEditModal';
import { useAssessment, useUpdateAssessment } from '@features/assessments/hooks';
import { AssessmentPassphraseProvider } from '@features/encryption/AssessmentPassphraseProvider';
import { useAssessmentPassphrase } from '@features/encryption/passphraseContext';
import { useGrading, useRunGrading, useGradingJob, useJobStatus } from '@features/grading/hooks';
import { useRubric, useRubricCoverage } from '@features/rubric/hooks';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { getErrorMessages } from '@utils/error';
import { buildPassphraseKey, clearPassphrase } from '@utils/passphrase';

import type { AssessmentResponse, AssessmentUpdateRequest } from '@api/models';

const TabsNav: React.FC<{ basePath: string }> = ({ basePath }) => {
  return (
    <nav
      style={{
        display: 'flex',
        gap: 4,
        borderBottom: '1px solid var(--mantine-color-default-border)',
        marginBottom: 16,
        flexWrap: 'wrap',
      }}
    >
      {[
        { to: `${basePath}/submissions`, icon: <IconInbox size={16} />, label: 'Submissions' },
        { to: `${basePath}/questions`, icon: <IconQuestionMark size={16} />, label: 'Questions' },
        { to: `${basePath}/rules`, icon: <IconAdjustments size={16} />, label: 'Rules' },
      ].map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          style={({ isActive }: { isActive: boolean }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderBottom: isActive ? '2px solid var(--mantine-color-blue-6)' : '2px solid transparent',
            color: isActive ? 'var(--mantine-color-blue-6)' : 'inherit',
            textDecoration: 'none',
            fontWeight: isActive ? 600 : 400,
            fontSize: 14,
          })}
        >
          {icon}
          {label}
        </NavLink>
      ))}
    </nav>
  );
};

const HeaderActions: React.FC<{
  assessmentId: string;
  rulesCount: number;
  hasGrading: boolean;
  onRunGrading: () => void;
  isGradingPending: boolean;
  onOpenResults: () => void;
  onOpenEdit: () => void;
  onOpenMembers: () => void;
}> = ({
  assessmentId,
  rulesCount,
  hasGrading,
  onRunGrading,
  isGradingPending,
  onOpenResults,
  onOpenEdit,
  onOpenMembers,
}) => {
  const { passphrase, clear } = useAssessmentPassphrase();
  const [confirmForget, setConfirmForget] = React.useState(false);

  const canForget = !!passphrase;

  return (
    <>
      <Group gap="xs" justify="flex-end" wrap="wrap">
        <Group gap={0}>
          {rulesCount > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={onRunGrading}
              loading={isGradingPending}
              disabled={isGradingPending}
              leftSection={<IconListCheck size={16} />}
              style={{ borderRadius: '4px 0 0 4px' }}
            >
              Run
            </Button>
          )}
          {hasGrading && (
            <Button
              type="button"
              variant="outline"
              onClick={onOpenResults}
              title="View grading results"
              style={{ borderRadius: rulesCount > 0 ? '0 4px 4px 0' : undefined, borderLeft: rulesCount > 0 ? 'none' : undefined }}
            >
              Results
            </Button>
          )}
        </Group>

        <Menu position="bottom-end">
          <Menu.Target>
            <ActionIcon variant="outline" size="lg" aria-label="Settings">
              <IconSettings size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconPencil size={14} />} onClick={onOpenEdit}>
              Assessment
            </Menu.Item>
            <Menu.Item leftSection={<IconUsers size={14} />} onClick={onOpenMembers}>
              Members
            </Menu.Item>
            {canForget && (
              <>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconLock size={14} />}
                  onClick={() => setConfirmForget(true)}
                >
                  Forget passphrase
                </Menu.Item>
              </>
            )}
          </Menu.Dropdown>
        </Menu>
      </Group>

      <Modal
        opened={confirmForget}
        onClose={() => setConfirmForget(false)}
        title="Forget Passphrase"
      >
        <Text mb="md">
          This will remove your locally stored passphrase and require re-entry to decrypt encrypted IDs. Proceed?
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setConfirmForget(false)}>Cancel</Button>
          <Button
            onClick={() => {
              clearPassphrase(buildPassphraseKey(assessmentId));
              clear();
              setConfirmForget(false);
            }}
          >
            Forget
          </Button>
        </Group>
      </Modal>
    </>
  );
};

const AssessmentShellPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();

  const [showEdit, setShowEdit] = React.useState(false);
  const [showMembers, setShowMembers] = React.useState(false);

  const {
    data: assessmentRes,
    isLoading: isLoadingAssessment,
    isError: isErrorAssessment,
    error: assessmentError,
  } = useAssessment(assessmentId!, !!assessmentId);

  const { data: gradingRes } = useGrading(assessmentId!, !!assessmentId);
  const { data: rubricRes } = useRubric(assessmentId!);
  const { data: coverageRes } = useRubricCoverage(assessmentId!);

  const { data: gradingJob } = useGradingJob(assessmentId!, !!assessmentId);
  const jobId = gradingJob?.job_id ?? null;
  const { data: jobStatusRes } = useJobStatus(jobId, !!jobId);
  const jobStatus = jobStatusRes?.status;
  const isGradingInProgress = jobStatus === 'queued' || jobStatus === 'running';

  const runGradingMutation = useRunGrading(assessmentId!);
  const updateAssessmentMutation = useUpdateAssessment();

  const rulesCount = rubricRes?.rubric?.rules?.length ?? 0;
  const cov = coverageRes?.coverage;
  const coveragePct = cov?.percentage ?? 0;
  const uncoveredIds = React.useMemo(() => {
    const all = cov?.question_ids ?? [];
    const covered = new Set(cov?.covered_question_ids ?? []);
    return all.filter((qid) => !covered.has(qid));
  }, [cov]);

  const hasGrading = (gradingRes?.submissions?.length ?? 0) > 0;
  const basePath = `/assessments/${assessmentId}`;

  const [confirmCoverage, setConfirmCoverage] = React.useState(false);
  const [confirmOverride, setConfirmOverride] = React.useState(false);

  const [awaitingNavigation, setAwaitingNavigation] = React.useState(false);
  const [runError, setRunError] = React.useState<unknown | null>(null);

  const qc = useQueryClient();

  const startRunAndAwait = () => {
    setRunError(null);
    runGradingMutation.mutate(undefined, {
      onSuccess: () => {
        setAwaitingNavigation(true);
        notifications.show({ color: 'blue', message: 'Grading job started' });
      },
      onError: (e) => {
        setRunError(e);
        setAwaitingNavigation(false);
        notifications.show({ color: 'red', message: 'Failed to start grading' });
      },
    });
  };

  React.useEffect(() => {
    if (!awaitingNavigation) return;
    if (jobStatus === 'completed') {
      setAwaitingNavigation(false);
      notifications.show({ color: 'green', message: 'Grading completed' });
      void (async () => {
        await qc.invalidateQueries({ queryKey: QK.grading.item(assessmentId!) });
        await navigate(`/results/${assessmentId}`);
      })();
    } else if (jobStatus === 'failed') {
      setRunError(new Error('Grading job failed'));
      setAwaitingNavigation(false);
      notifications.show({ color: 'red', message: 'Grading job failed' });
    }
  }, [awaitingNavigation, jobStatus, navigate, assessmentId, qc]);

  const handleGradeClick = () => {
    if ((coveragePct ?? 0) < 1) {
      setConfirmCoverage(true);
      return;
    }
    const alreadyGraded = (gradingRes?.submissions?.length ?? 0) > 0;
    if (alreadyGraded) {
      setConfirmOverride(true);
      return;
    }
    startRunAndAwait();
  };

  const proceedAfterCoverage = () => {
    setConfirmCoverage(false);
    const alreadyGraded = (gradingRes?.submissions?.length ?? 0) > 0;
    if (alreadyGraded) setConfirmOverride(true);
    else startRunAndAwait();
  };

  const proceedAfterOverride = () => {
    setConfirmOverride(false);
    startRunAndAwait();
  };

  useDocumentTitle(`${assessmentRes?.name ?? 'Assessment'} - GradeFlow`);

  return (
    <section>
      <AssessmentPassphraseProvider assessmentId={assessmentId!}>
        <PageHeader
          title={assessmentRes?.name ?? 'Assessment'}
          actions={
            <HeaderActions
              assessmentId={assessmentId!}
              rulesCount={rulesCount}
              hasGrading={hasGrading}
              onRunGrading={handleGradeClick}
              isGradingPending={isGradingInProgress || runGradingMutation.isPending}
              onOpenResults={() => {
                void navigate(`/results/${assessmentId}`);
              }}
              onOpenEdit={() => setShowEdit(true)}
              onOpenMembers={() => setShowMembers(true)}
            />
          }
        />

        {isLoadingAssessment && (
          <Stack gap="xs" mb="md">
            <Skeleton height={40} />
          </Stack>
        )}
        {isErrorAssessment && (
          <Alert color="red" mb="md">{getErrorMessages(assessmentError).join(' ')}</Alert>
        )}

        {!!runError && (
          <Alert color="red" mb="md">{getErrorMessages(runError).join(' ')}</Alert>
        )}

        {!isLoadingAssessment && !isErrorAssessment && (
          <>
            <TabsNav basePath={basePath} />
            <Outlet />
          </>
        )}
      </AssessmentPassphraseProvider>

      <Modal
        opened={confirmCoverage}
        onClose={() => setConfirmCoverage(false)}
        title="Incomplete Coverage"
      >
        <Text mb="md">
          {uncoveredIds.length
            ? `The following questions are not covered by any rules: ${uncoveredIds.join(', ')}. Proceed with grading anyway?`
            : 'Rubric coverage is below 100%. Proceed with grading anyway?'}
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setConfirmCoverage(false)}>Cancel</Button>
          <Button onClick={proceedAfterCoverage}>Proceed</Button>
        </Group>
      </Modal>

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
          <Button
            loading={runGradingMutation.isPending}
            onClick={proceedAfterOverride}
          >
            Proceed
          </Button>
        </Group>
      </Modal>

      <AssessmentEditModal
        openItem={showEdit ? (assessmentRes as AssessmentResponse) : null}
        isSubmitting={updateAssessmentMutation.isPending}
        error={updateAssessmentMutation.isError ? updateAssessmentMutation.error : null}
        onClose={() => setShowEdit(false)}
        onSubmit={async (id: string, formData: AssessmentUpdateRequest) => {
          await updateAssessmentMutation.mutateAsync({ id, payload: formData }, {
            onSuccess: () => {
              setShowEdit(false);
              notifications.show({ color: 'green', message: 'Assessment updated' });
            },
            onError: () => notifications.show({ color: 'red', message: 'Update failed' }),
          });
        }}
      />

      <MembersDialog open={showMembers} assessmentId={assessmentId!} onClose={() => setShowMembers(false)} />
    </section>
  );
};

export default AssessmentShellPage;
