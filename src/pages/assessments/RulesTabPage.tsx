import React from 'react';
import { useParams } from 'react-router-dom';
import ErrorAlert from '@components/common/ErrorAlert';
import { SingleTargetRulesSection, MultiTargetRulesSection } from '@features/rules/components';
import { useRubric, useRubricCoverage } from '@features/rubric/hooks';
import { useQuestionSet } from '@features/questions/hooks';
import type { RubricOutput, QuestionSetOutputQuestionMap } from '@api/models';

const RulesTabPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();

  // Always call hooks in the same order; use enabled flags rather than early return.
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

  if (!enabled) {
    return <div className="alert alert-error"><span>Assessment ID is missing.</span></div>;
  }

  return (
    <section className="space-y-6">
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
          />

          <MultiTargetRulesSection
            rubric={rubric}
            assessmentId={safeId}
            questionMap={questionMap}
          />
        </>
      )}
    </section>
  );
};

export default RulesTabPage;