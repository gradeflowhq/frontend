import React from 'react';
import { NavLink, Outlet, useParams, useNavigate } from 'react-router-dom';
import PageHeader from '@components/common/PageHeader';
import ErrorAlert from '@components/common/ErrorAlert';
import { Button } from '@components/ui/Button';
import ConfirmDialog from '@components/common/ConfirmDialog';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import {
  useAssessment,
} from '@features/assessments/hooks';
import {
  useGrading,
  useRunGrading,
} from '@features/grading/hooks';
import {
  useRubric,
  useRubricCoverage,
} from '@features/rubric/hooks';
import {
  MembersDialog,
} from '@features/assessments/components';
import SettingsDropdown from '@features/assessments/components/SettingsDropdown';
import AssessmentEditModal from '@features/assessments/components/AssessmentEditModal';
import type { AssessmentResponse, AssessmentUpdateRequest } from '@api/models';
import { useUpdateAssessment } from '@features/assessments/hooks';
import { AssessmentPassphraseProvider } from '@features/encryption/AssessmentPassphraseProvider';
import { IconGrade } from '@components/ui/Icon';

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

const AssessmentShellPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();

  const [showEdit, setShowEdit] = React.useState(false);
  const [showMembers, setShowMembers] = React.useState(false);

  const { data: assessmentRes, isLoading: isLoadingAssessment, isError: isErrorAssessment, error: assessmentError } =
    useAssessment(assessmentId!, !!assessmentId);

  const { data: gradingRes } = useGrading(assessmentId!, !!assessmentId);
  const { data: rubricRes } = useRubric(assessmentId!);
  const { data: coverageRes } = useRubricCoverage(assessmentId!);

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
    runGradingMutation.mutate(undefined, {
      onSuccess: () => navigate(`/results/${assessmentId}`),
    });
  };

  const proceedAfterCoverage = () => {
    setConfirmCoverage(false);
    const alreadyGraded = (gradingRes?.graded_submissions?.length ?? 0) > 0;
    if (alreadyGraded) setConfirmOverride(true);
    else runGradingMutation.mutate(undefined, { onSuccess: () => navigate(`/results/${assessmentId}`) });
  };

  const proceedAfterOverride = () => {
    setConfirmOverride(false);
    runGradingMutation.mutate(undefined, { onSuccess: () => navigate(`/results/${assessmentId}`) });
  };

  useDocumentTitle(`${assessmentRes?.name ?? 'Assessment'} - GradeFlow`);

  return (
    <section>
      <PageHeader
        title={assessmentRes?.name ?? 'Assessment'}
        actions={
          <div className="flex gap-2 items-center">
            {rulesCount > 0 && (
              <Button
                type="button"
                variant="outline"
                className="btn-primary"
                onClick={handleGradeClick}
                disabled={runGradingMutation.isPending}
                leftIcon={<IconGrade />}
              >
                {runGradingMutation.isPending ? 'Grading…' : 'Run Grading'}
              </Button>
            )}
            {hasGrading && (
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/results/${assessmentId}`)}
                title="View grading results"
              >
                Results
              </Button>
            )}
            <SettingsDropdown onEditAssessment={() => setShowEdit(true)} onOpenMembers={() => setShowMembers(true)} />
            <MembersDialog open={showMembers} assessmentId={assessmentId!} onClose={() => setShowMembers(false)} />
          </div>
        }
      />

      {isLoadingAssessment && (
        <div className="animate-pulse">
          <div className="h-10 bg-base-200 rounded mb-2" />
        </div>
      )}
      {isErrorAssessment && <ErrorAlert error={assessmentError} />}

      {!isLoadingAssessment && !isErrorAssessment && (
        <AssessmentPassphraseProvider assessmentId={assessmentId!}>
          <TabsNav basePath={basePath} />
          <Outlet />
        </AssessmentPassphraseProvider>
      )}

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
        confirmText={runGradingMutation.isPending ? 'Grading…' : 'Proceed'}
        onConfirm={proceedAfterOverride}
        onCancel={() => setConfirmOverride(false)}
      />
      {runGradingMutation.isError && <ErrorAlert error={runGradingMutation.error} className="mt-2" />}

      <AssessmentEditModal
        openItem={showEdit ? (assessmentRes as AssessmentResponse) : null}
        isSubmitting={updateAssessmentMutation.isPending}
        error={updateAssessmentMutation.isError ? updateAssessmentMutation.error : null}
        onClose={() => setShowEdit(false)}
        onSubmit={async (id: string, formData: AssessmentUpdateRequest) => {
          await updateAssessmentMutation.mutateAsync({ id, payload: formData }, { onSuccess: () => setShowEdit(false) });
        }}
      />
    </section>
  );
};

export default AssessmentShellPage;