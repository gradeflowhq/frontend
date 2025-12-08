import React from 'react';
import { useParams } from 'react-router-dom';
import ErrorAlert from '@components/common/ErrorAlert';
import ConfirmDialog from '@components/common/ConfirmDialog';
import { SingleTargetRulesSection, MultiTargetRulesSection, RulesHeader } from '@features/rules/components';
import RubricUploadModal from '@features/rules/components/RubricUploadModal';
import RubricImportModal from '@features/rules/components/RubricImportModal';
import { useRubric, useRubricCoverage, useDeleteRubric } from '@features/rubric/hooks';
import { useQuestionSet } from '@features/questions/hooks';
import type { RubricOutput, QuestionSetOutputQuestionMap } from '@api/models';

const RulesTabPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();

  const enabled = Boolean(assessmentId);
  const safeId = assessmentId ?? '';

  // Question set (needed for compatibility, labels, constraints)
  const {
    data: qsRes,
    isLoading: loadingQS,
    isError: errorQS,
    error: qsError,
  } = useQuestionSet(safeId, enabled);

  // Rubric & coverage
  const {
    data: rubricRes,
    isLoading: loadingRubric,
    isError: errorRubric,
    error: rubricError,
  } = useRubric(safeId);

  const {
    data: coverageRes,
    isLoading: loadingCoverage,
    isError: errorCoverage,
    error: coverageError,
  } = useRubricCoverage(safeId);

  // Derive view data safely
  const questionMap: QuestionSetOutputQuestionMap = qsRes?.question_set?.question_map ?? {};
  const questionIds = React.useMemo(
    () => Object.keys(questionMap).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [questionMap]
  );
  const questionTypesById = React.useMemo(() => {
    const m: Record<string, string> = {};
    for (const [qid, def] of Object.entries<any>(questionMap)) m[qid] = def?.type ?? 'TEXT';
    return m;
  }, [questionMap]);

  const rubric: RubricOutput = rubricRes?.rubric ?? { rules: [] };

  const cov = coverageRes?.coverage;
  const coveredQuestionIds = React.useMemo(
    () => new Set<string>(cov?.covered_question_ids ?? []),
    [cov]
  );

  const [openRubricUpload, setOpenRubricUpload] = React.useState(false);
  const [openRubricImport, setOpenRubricImport] = React.useState(false);
  const [confirmDeleteRubric, setConfirmDeleteRubric] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const deleteRubric = useDeleteRubric(safeId);

  const hasRules = (rubric?.rules?.length ?? 0) > 0;

  if (!enabled) {
    return <div className="alert alert-error"><span>Assessment ID is missing.</span></div>;
  }

  return (
    <section className="space-y-6">
      <RulesHeader
        onUpload={() => setOpenRubricUpload(true)}
        onImport={() => setOpenRubricImport(true)}
        onDelete={() => setConfirmDeleteRubric(true)}
        disableDelete={deleteRubric.isPending}
        hasRules={hasRules}
        searchQuery={searchQuery}
        onSearchChange={(v) => setSearchQuery(v)}
      />

      {/* Stats */}
      {!loadingCoverage && !errorCoverage && cov && (
        <div className="stats shadow bg-base-100 w-full">
          <div className="stat">
            <div className="stat-title">Total Questions</div>
            <div className="stat-value">{cov.total ?? 0}</div>
          </div>
          <div className="stat">
            <div className="stat-title">Covered</div>
            <div className="stat-value">{cov.covered ?? 0}</div>
          </div>
          <div className="stat">
            <div className="stat-title">Coverage</div>
            <div className="stat-value">{((cov.percentage ?? 0) * 100).toFixed(1)}%</div>
          </div>
        </div>
      )}

      {/* Loading/Error states */}
      {loadingQS && <div className="alert alert-info"><span>Loading questions...</span></div>}
      {errorQS && <ErrorAlert error={qsError} />}

      {loadingRubric && <div className="alert alert-info"><span>Loading rubric...</span></div>}
      {errorRubric && <ErrorAlert error={rubricError} />}

      {loadingCoverage && <div className="alert alert-info"><span>Computing coverage...</span></div>}
      {errorCoverage && <ErrorAlert error={coverageError} />}

      {/* Sections */}
      {!loadingQS && !errorQS && !loadingRubric && !errorRubric && (
        <>
          <SingleTargetRulesSection
            rubric={rubric}
            questionIds={questionIds}
            questionTypesById={questionTypesById}
            assessmentId={safeId}
            questionMap={questionMap}
            coveredQuestionIds={coveredQuestionIds}
            searchQuery={searchQuery}
          />

          <MultiTargetRulesSection
            rubric={rubric}
            assessmentId={safeId}
            questionMap={questionMap}
            searchQuery={searchQuery}
          />
        </>
      )}

      {openRubricUpload && <RubricUploadModal
        open={openRubricUpload}
        assessmentId={safeId}
        onClose={() => setOpenRubricUpload(false)}
      />}
      {openRubricImport && <RubricImportModal
        open={openRubricImport}
        assessmentId={safeId}
        onClose={() => setOpenRubricImport(false)}
      />}

      <ConfirmDialog
        open={confirmDeleteRubric}
        title="Delete Rules"
        message="This will remove all rules in the rubric. Continue?"
        confirmText="Delete"
        confirmLoading={deleteRubric.isPending}
        confirmLoadingLabel="Deleting..."
        onConfirm={() => deleteRubric.mutate(undefined, { onSuccess: () => setConfirmDeleteRubric(false) })}
        onCancel={() => setConfirmDeleteRubric(false)}
      />
      {deleteRubric.isError && <ErrorAlert error={deleteRubric.error} />}
    </section>
  );
};

export default RulesTabPage;