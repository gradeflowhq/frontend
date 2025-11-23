import React from 'react';
import { NavLink, Outlet, useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../../components/common/PageHeader';
import ErrorAlert from '../../components/common/ErrorAlert';
import AssessmentEditModal from '../../components/assessments/AssessmentEditModal';
import SettingsDropdown from '../../components/assessment/SettingsDropdown';
import { Button } from '../../components/ui/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import MembersDialog from '../../components/assessment/MembersDialog';
import { api } from '../../api';
import type {
  AssessmentResponse,
  AssessmentUpdateRequest,
  GradingResponse,
  RubricResponse,
  CoverageResponse,
} from '../api/models';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const TabsNav: React.FC<{ basePath: string }> = ({ basePath }) => {
  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `tab ${isActive ? 'tab-active' : ''}`;
  return (
    <div className="tabs tabs-lift mb-4">
      <NavLink className={tabClass} to={`${basePath}/submissions`}>Submissions</NavLink>
      <NavLink className={tabClass} to={`${basePath}/questions`}>Questions</NavLink>
      <NavLink className={tabClass} to={`${basePath}/rules`}>Rules</NavLink>
      {/* No Results tab here (Results are a separate page) */}
    </div>
  );
};

const AssessmentShellPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showEdit, setShowEdit] = React.useState(false);
  const [showMembers, setShowMembers] = React.useState(false);

  const { data: assessmentRes, isLoading, isError, error } = useQuery({
    queryKey: ['assessment', assessmentId],
    queryFn: async () => (await api.getAssessmentAssessmentsAssessmentIdGet(assessmentId!)).data as AssessmentResponse,
    enabled: !!assessmentId,
  });

  const { data: gradingRes } = useQuery({
    queryKey: ['grading', assessmentId],
    queryFn: async () => (await api.getGradingAssessmentsAssessmentIdGradingGet(assessmentId!)).data as GradingResponse,
    enabled: !!assessmentId,
    staleTime: 30000,
  });

  // Rubric & coverage for grading flow warnings
  const { data: rubricRes } = useQuery({
    queryKey: ['rubric', assessmentId],
    queryFn: async () => (await api.getRubricAssessmentsAssessmentIdRubricGet(assessmentId!)).data as RubricResponse,
    enabled: !!assessmentId,
  });
  const rulesCount = rubricRes?.rubric?.rules?.length ?? 0;

  const { data: coverageRes } = useQuery({
    queryKey: ['rubricCoverage', assessmentId],
    queryFn: async () =>
      (await api.rubricCoverageAssessmentsAssessmentIdRubricCoveragePost(assessmentId!, {
        use_stored_rubric: true,
        use_stored_question_set: true,
      })).data as CoverageResponse,
    enabled: !!assessmentId,
    staleTime: 30000,
  });
  const cov = coverageRes?.coverage;
  const coveragePct = cov?.percentage ?? 0;
  const uncoveredIds = React.useMemo(() => {
    const all = cov?.question_ids ?? [];
    const covered = new Set(cov?.covered_question_ids ?? []);
    return all.filter((qid) => !covered.has(qid));
  }, [cov]);

  // Confirm dialogs
  const [confirmCoverage, setConfirmCoverage] = React.useState(false);
  const [confirmOverride, setConfirmOverride] = React.useState(false);

  const gradeMutation = useMutation({
    mutationKey: ['grading', assessmentId, 'run'],
    mutationFn: async () => (await api.runGradingAssessmentsAssessmentIdGradingRunPost(assessmentId!, {})).data as GradingResponse,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['grading', assessmentId] });
      navigate(`/results/${assessmentId}`);
    },
  });

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
    gradeMutation.mutate();
  };

  const proceedAfterCoverage = () => {
    setConfirmCoverage(false);
    const alreadyGraded = (gradingRes?.graded_submissions?.length ?? 0) > 0;
    if (alreadyGraded) setConfirmOverride(true);
    else gradeMutation.mutate();
  };

  const proceedAfterOverride = () => {
    setConfirmOverride(false);
    gradeMutation.mutate();
  };

  const updateMutation = useMutation({
    mutationKey: ['assessment', assessmentId, 'update'],
    mutationFn: async ({ id, payload }: { id: string; payload: AssessmentUpdateRequest }) =>
      (await api.updateAssessmentAssessmentsAssessmentIdPatch(id, payload)).data as AssessmentResponse,
    onSuccess: async () => {
      setShowEdit(false);
      await qc.invalidateQueries({ queryKey: ['assessment', assessmentId] });
      await qc.invalidateQueries({ queryKey: ['assessments', 'list'] });
    },
  });

  const hasGrading = (gradingRes?.graded_submissions?.length ?? 0) > 0;
  const basePath = `/assessments/${assessmentId}`;

  useDocumentTitle(`${assessmentRes?.name} - GradeFlow`, []);

  return (
    <section>
      <PageHeader
        title={assessmentRes?.name ?? 'Assessment'}
        actions={
          <div className="flex gap-2 items-center">
            {/* Grade button appears when at least one rule is set */}
            {rulesCount > 0 && (
              <Button
                type="button"
                variant="outline"
                className="btn-primary"
                onClick={handleGradeClick}
                disabled={gradeMutation.isPending}
              >
                {gradeMutation.isPending ? 'Grading…' : 'Grade submissions'}
              </Button>
            )}

            {/* Results link appears only when grading results exist */}
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

            <SettingsDropdown
              onEditAssessment={() => setShowEdit(true)}
              onOpenMembers={() => setShowMembers(true)}
            />

            <MembersDialog
              open={showMembers}
              assessmentId={assessmentId!}
              onClose={() => setShowMembers(false)}
            />
          </div>
        }
      />

      {isLoading && (
        <div className="animate-pulse">
          <div className="h-10 bg-base-200 rounded mb-2" />
        </div>
      )}
      {isError && <ErrorAlert error={error} />}

      {!isLoading && !isError && (
        <>
          <TabsNav basePath={basePath} />
          <Outlet />
        </>
      )}

      {/* Coverage warning dialog */}
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

      {/* Override warning dialog */}
      <ConfirmDialog
        open={confirmOverride}
        title="Override Existing Grading"
        message="Submissions have already been graded. Continuing will override all results and adjustments. Proceed?"
        confirmText={gradeMutation.isPending ? 'Grading…' : 'Proceed'}
        onConfirm={proceedAfterOverride}
        onCancel={() => setConfirmOverride(false)}
      />

      {gradeMutation.isError && <ErrorAlert error={gradeMutation.error} className="mt-2" />}

      <AssessmentEditModal
        openItem={showEdit ? (assessmentRes as AssessmentResponse) : null}
        isSubmitting={updateMutation.isPending}
        error={updateMutation.isError ? updateMutation.error : null}
        onClose={() => setShowEdit(false)}
        onSubmit={async (id, formData) => {
          await updateMutation.mutateAsync({ id, payload: formData });
        }}
      />
    </section>
  );
};

export default AssessmentShellPage;