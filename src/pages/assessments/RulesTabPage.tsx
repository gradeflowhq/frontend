import React from 'react';
import { useParams } from 'react-router-dom';

import ConfirmDialog from '@components/common/ConfirmDialog';
import EmptyState from '@components/common/EmptyState';
import ErrorAlert from '@components/common/ErrorAlert';
import { useToast } from '@components/common/ToastProvider';
import { IconRules } from '@components/ui/Icon';
import { useQuestionSet } from '@features/questions/hooks';
import { useRubric, useRubricCoverage, useDeleteRubric } from '@features/rubric/hooks';
import { MultiTargetRulesSection, RulesHeader, SingleTargetRulesSection } from '@features/rules/components';
import RubricImportModal from '@features/rules/components/RubricImportModal';
import RubricUploadModal from '@features/rules/components/RubricUploadModal';

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

  const qsNotFound = React.useMemo(() => {
    const err = qsError as { response?: { status?: number } } | undefined;
    return err?.response?.status === 404;
  }, [qsError]);

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
  const questionMap: QuestionSetOutputQuestionMap = React.useMemo(() => {
    return qsNotFound ? {} : (qsRes?.question_set?.question_map ?? {});
  }, [qsNotFound, qsRes]);
  const hasQuestions = Object.keys(questionMap).length > 0;
  const questionIds = React.useMemo(
    () => Object.keys(questionMap).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [questionMap]
  );
  const questionTypesById = React.useMemo(() => {
    const m: Record<string, string> = {};
    for (const [qid, def] of Object.entries(questionMap)) {
      const typedDef = def as { type?: string } | undefined;
      m[qid] = typedDef?.type ?? 'TEXT';
    }
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
  const toast = useToast();

  const hasRules = (rubric?.rules?.length ?? 0) > 0;

  const renderSkeleton = () => (
    <div className="space-y-4">
      <div className="stats shadow bg-base-100 w-full animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="stat">
            <div className="stat-title skeleton h-4 w-24 mb-1" />
            <div className="stat-value skeleton h-6 w-20" />
          </div>
        ))}
      </div>
      <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm space-y-3 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-3">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );

  if (!enabled) {
    return <div className="alert alert-error"><span>Assessment ID is missing.</span></div>;
  }

  if (!loadingQS && (qsNotFound || !hasQuestions)) {
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
          disabled
        />

        <EmptyState
          title="Rules are locked"
          description="Set up questions first to configure rules."
          icon={<IconRules />}
        />
      </section>
    );
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
      {(loadingQS || loadingRubric || loadingCoverage) && renderSkeleton()}
      {errorQS && !qsNotFound && <ErrorAlert error={qsError} />}
      {errorRubric && <ErrorAlert error={rubricError} />}
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
        onConfirm={() =>
          deleteRubric.mutate(undefined, {
            onSuccess: () => {
              setConfirmDeleteRubric(false);
              toast.success('Rules deleted');
            },
            onError: () => toast.error('Delete failed'),
          })
        }
        onCancel={() => setConfirmDeleteRubric(false)}
      />
      {deleteRubric.isError && <ErrorAlert error={deleteRubric.error} />}
    </section>
  );
};

export default RulesTabPage;