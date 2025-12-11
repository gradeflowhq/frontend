import React from 'react';
import { NavLink, Outlet, useParams, useNavigate } from 'react-router-dom';
import PageHeader from '@components/common/PageHeader';
import ErrorAlert from '@components/common/ErrorAlert';
import LoadingButton from '@components/ui/LoadingButton';
import { Button } from '@components/ui/Button';
import ConfirmDialog from '@components/common/ConfirmDialog';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { buildPassphraseKey, clearPassphrase } from '@utils/passphrase';

import { useAssessment } from '@features/assessments/hooks';
import { useGrading, useRunGrading, useGradingJob, useJobStatus } from '@features/grading/hooks';
import { useRubric, useRubricCoverage } from '@features/rubric/hooks';
import { MembersDialog } from '@features/assessments/components';
import SettingsDropdown from '@features/assessments/components/SettingsDropdown';
import AssessmentEditModal from '@features/assessments/components/AssessmentEditModal';
import type { AssessmentResponse, AssessmentUpdateRequest } from '@api/models';
import { useUpdateAssessment } from '@features/assessments/hooks';
import {
  AssessmentPassphraseProvider,
  useAssessmentPassphrase,
} from '@features/encryption/AssessmentPassphraseProvider';
import { IconGrade } from '@components/ui/Icon';
import { useQueryClient } from '@tanstack/react-query';
import { QK } from '@api/queryKeys';
import { useToast } from '@components/common/ToastProvider';

const TabsNav: React.FC<{ basePath: string }> = ({ basePath }) => {
  const tabClass = ({ isActive }: { isActive: boolean }) => `tab ${isActive ? 'tab-active' : ''}`;
  return (
    <div className="tabs tabs-lift mb-4">
      <NavLink className={tabClass} to={`${basePath}/submissions`}>Submissions</NavLink>
      <NavLink className={tabClass} to={`${basePath}/questions`}>Questions</NavLink>
      <NavLink className={tabClass} to={`${basePath}/rules`}>Rules</NavLink>
    </div>
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

  const handleForgetPassphrase = () => setConfirmForget(true);

  const confirmForgetHandler = () => {
    clearPassphrase(buildPassphraseKey(assessmentId));
    clear();
    setConfirmForget(false);
  };

  return (
    <>
      <div className="flex gap-2 items-center">
        {rulesCount > 0 && (
          <LoadingButton
            type="button"
            variant="outline"
            className="btn-primary"
            onClick={onRunGrading}
            isLoading={isGradingPending}
            disabled={isGradingPending}
            leftIcon={<IconGrade />}
          >
            Run Grading
          </LoadingButton>
        )}
        {hasGrading && (
          <Button type="button" variant="outline" onClick={onOpenResults} title="View grading results">
            Results
          </Button>
        )}
        <SettingsDropdown
          onEditAssessment={onOpenEdit}
          onOpenMembers={onOpenMembers}
          onForgetPassphrase={handleForgetPassphrase}
          showForgetPassphrase={canForget}
        />
      </div>

      <ConfirmDialog
        open={confirmForget}
        title="Forget Passphrase"
        message="This will remove your locally stored passphrase and require re-entry to decrypt encrypted IDs. Proceed?"
        confirmText="Forget"
        onConfirm={confirmForgetHandler}
        onCancel={() => setConfirmForget(false)}
      />
    </>
  );
};

const AssessmentShellPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

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

  // Job-aware grading state
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

  const hasGrading = (gradingRes?.graded_submissions?.length ?? 0) > 0;
  const basePath = `/assessments/${assessmentId}`;

  const [confirmCoverage, setConfirmCoverage] = React.useState(false);
  const [confirmOverride, setConfirmOverride] = React.useState(false);

  // Track a run we just started, so we only auto-navigate when this user action triggers completion.
  const [awaitingNavigation, setAwaitingNavigation] = React.useState(false);
  const [runError, setRunError] = React.useState<unknown | null>(null);

  const startRunAndAwait = () => {
    setRunError(null);
    runGradingMutation.mutate(undefined, {
      onSuccess: () => {
        // We started a job; wait for jobStatus to report 'completed' or 'failed'
        setAwaitingNavigation(true);
        toast.info('Grading job started');
      },
      onError: (e) => {
        setRunError(e);
        setAwaitingNavigation(false);
        toast.error('Failed to start grading');
      },
    });
  };

  const qc = useQueryClient();

  // Auto-navigate to Results only when the job completes successfully after user-triggered run
  React.useEffect(() => {
    if (!awaitingNavigation) return;
    if (jobStatus === 'completed') {
      setAwaitingNavigation(false);
      toast.success('Grading completed');
      qc.invalidateQueries({ queryKey: QK.grading.item(assessmentId!) }).then(() => {
        navigate(`/results/${assessmentId}`);
      });
    } else if (jobStatus === 'failed') {
      // Show errors; do not navigate
      setRunError(new Error('Grading job failed'));
      setAwaitingNavigation(false);
      toast.error('Grading job failed');
    }
  }, [awaitingNavigation, jobStatus, navigate, assessmentId, qc, toast]);

  const handleGradeClick = () => {
    if ((coveragePct ?? 0) < 1) {
      setConfirmCoverage(true);
      return;
    }
    const alreadyGraded = (gradingRes?.graded_submissions?.length ?? 0) > 0;
    if (alreadyGraded) {
      setConfirmOverride(true);
      return;
    }
    startRunAndAwait();
  };

  const proceedAfterCoverage = () => {
    setConfirmCoverage(false);
    const alreadyGraded = (gradingRes?.graded_submissions?.length ?? 0) > 0;
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
              onOpenResults={() => navigate(`/results/${assessmentId}`)}
              onOpenEdit={() => setShowEdit(true)}
              onOpenMembers={() => setShowMembers(true)}
            />
          }
        />

        {isLoadingAssessment && (
          <div className="animate-pulse">
            <div className="h-10 bg-base-200 rounded mb-2" />
          </div>
        )}
        {isErrorAssessment && <ErrorAlert error={assessmentError} />}

        {/* Show job failure or run errors */}
        {!!runError && <ErrorAlert error={runError} className="mb-2" />}

        {!isLoadingAssessment && !isErrorAssessment && (
          <>
            <TabsNav basePath={basePath} />
            <Outlet />
          </>
        )}
      </AssessmentPassphraseProvider>

      <ConfirmDialog
        open={confirmCoverage}
        title="Incomplete Coverage"
        message={
          uncoveredIds.length
            ? `The following questions are not covered by any rules:\n${uncoveredIds.join(', ')}\nProceed with grading anyway?`
            : 'Rubric coverage is below 100%. Proceed with grading anyway?'
        }
        confirmText="Proceed"
        onConfirm={proceedAfterCoverage}
        onCancel={() => setConfirmCoverage(false)}
      />
      <ConfirmDialog
        open={confirmOverride}
        title="Override Existing Grading"
        message="Submissions have already been graded. Continuing will override all results and adjustments. Proceed?"
        confirmLoading={runGradingMutation.isPending}
        confirmLoadingLabel="Grading…"
        confirmText="Proceed"
        onConfirm={proceedAfterOverride}
        onCancel={() => setConfirmOverride(false)}
      />

      <AssessmentEditModal
        openItem={showEdit ? (assessmentRes as AssessmentResponse) : null}
        isSubmitting={updateAssessmentMutation.isPending}
        error={updateAssessmentMutation.isError ? updateAssessmentMutation.error : null}
        onClose={() => setShowEdit(false)}
        onSubmit={async (id: string, formData: AssessmentUpdateRequest) => {
          await updateAssessmentMutation.mutateAsync({ id, payload: formData }, {
            onSuccess: () => {
              setShowEdit(false);
              toast.success('Assessment updated');
            },
            onError: (err) => toast.error(err, 'Update failed'),
          });
        }}
      />

      <MembersDialog open={showMembers} assessmentId={assessmentId!} onClose={() => setShowMembers(false)} />
    </section>
  );
};

export default AssessmentShellPage;