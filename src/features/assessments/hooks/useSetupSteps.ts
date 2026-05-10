import { useMemo } from 'react';

import { useAssessmentContext } from '@app/contexts/AssessmentContext';
import { PATHS } from '@app/routes/paths';
import { useQuestionSet, useQuestionSetStatus } from '@features/questions/api';
import { useRubricOverview } from '@features/rubric/api';
import { useSubmissions } from '@features/submissions/api';
import { isNotFoundError } from '@utils/error';
import { natsort } from '@utils/sort';

import type { SetupStep, StepStatus } from '../components/OverviewSetupTimeline';

export interface SetupStepsResult {
  setupSteps: SetupStep[];
  completeCount: number;
  allComplete: boolean;
  isLoading: boolean;
  subsCount: number;
  questionCount: number;
  covPct: number;
  covTotal: number;
  covCovered: number;
  uncoveredIds: string[];
  rubricValidationErrors: string[];
}

export const useSetupSteps = (assessmentId: string): SetupStepsResult => {
  const { assessment } = useAssessmentContext();

  const { data: subsRes, isLoading: subsLoading } = useSubmissions(assessmentId);
  const {
    data: qsRes,
    isLoading: qsLoading,
    isError: qsError,
    error: qsErrorData,
  } = useQuestionSet(assessmentId, !!assessmentId);

  const isQsMissing = useMemo(() => {
    return qsError && (isNotFoundError(qsErrorData) || !qsRes?.question_set);
  }, [qsError, qsErrorData, qsRes]);

  const questionMap = useMemo(
    () => (isQsMissing ? {} : (qsRes?.question_set?.question_map ?? {})),
    [isQsMissing, qsRes],
  );
  const questionIds = useMemo(() => Object.keys(questionMap), [questionMap]);
  const questionCount = questionIds.length;
  const subsCount = subsRes?.raw_submissions?.length ?? 0;
  const hasSubmissions = subsCount > 0;

  const { data: questionSetStatus, isLoading: questionSetStatusLoading } =
    useQuestionSetStatus(assessmentId, !!assessmentId && hasSubmissions);

  const { data: rubricOverview, isLoading: rubricOverviewLoading } = useRubricOverview(
    assessmentId,
    !!assessmentId && questionCount > 0,
  );
  const rubricValidationErrors = rubricOverview?.validation_errors ?? [];

  const coverage = rubricOverview?.coverage;
  const covTotal = coverage?.total ?? 0;
  const covCovered = coverage?.covered ?? 0;
  const covPct = coverage?.percentage ?? 0;

  const uncoveredIds = useMemo(() => {
    return [...(coverage?.uncovered_question_ids ?? [])].sort(natsort);
  }, [coverage?.uncovered_question_ids]);

  const hasRules =
    (rubricOverview?.question_rules.length ?? 0) + (rubricOverview?.global_rules.length ?? 0) > 0;
  const invalidRuleCount = rubricValidationErrors.length;
  const invalidRuleSummary = `${invalidRuleCount} invalid rule${invalidRuleCount === 1 ? '' : 's'}`;
  const rulesAreStale = Boolean(
    rubricOverview?.status?.is_stale || (rubricOverview?.stale_rules.length ?? 0) > 0,
  );
  const questionsNeedAttention = Boolean(
    questionSetStatus?.status?.is_stale || questionSetStatus?.drift?.has_drift,
  );
  const hasQuestions = questionCount > 0 && hasSubmissions;

  const subsStatus: StepStatus = subsCount === 0 ? 'not-started' : 'complete';

  const qsStatus: StepStatus =
    !hasSubmissions         ? 'locked'      :
    questionCount === 0     ? 'not-started' :
    questionsNeedAttention  ? 'stale'       : 'complete';

  const rulesStatus: StepStatus =
    !hasQuestions               ? 'locked'      :
    invalidRuleCount > 0        ? 'warning'     :
    !hasRules                   ? 'not-started' :
    rulesAreStale               ? 'stale'       :
    covPct >= 1                 ? 'complete'    : 'warning';

  const setupSteps = useMemo<SetupStep[]>(() => {
    const ap = PATHS.assessment(assessmentId);
    return [
      {
        label: 'Submissions',
        status: subsStatus,
        summary: subsCount > 0 ? `${subsCount} students` : 'No submissions yet',
        updatedAt: assessment?.source_updated_at ?? null,
        fixLink: ap.submissions,
      },
      {
        label: 'Questions',
        status: qsStatus,
        summary:
          qsStatus === 'locked' ? 'Complete submissions first' :
          questionCount > 0     ? `${questionCount} questions`  : 'Not configured',
        updatedAt: questionSetStatus?.status?.updated_at ?? qsRes?.status?.updated_at ?? null,
        fixLink: ap.questions,
      },
      {
        label: 'Rules',
        status: rulesStatus,
        summary:
          rulesStatus === 'locked'  ? 'Complete questions first'              :
          invalidRuleCount > 0      ? invalidRuleSummary                      :
          hasRules                  ? `${covCovered}/${covTotal} covered`     : 'No rules configured',
        updatedAt: rubricOverview?.status?.updated_at ?? null,
        fixLink: ap.rules,
      },
    ];
  }, [
    assessment,
    assessmentId,
    covCovered,
    covTotal,
    hasRules,
    invalidRuleCount,
    invalidRuleSummary,
    qsRes,
    qsStatus,
    questionCount,
    questionSetStatus,
    rubricOverview,
    rulesStatus,
    subsCount,
    subsStatus,
  ]);

  const completeCount = setupSteps.filter((s) => s.status === 'complete').length;

  return {
    setupSteps,
    completeCount,
    allComplete: completeCount === setupSteps.length,
    isLoading: subsLoading || qsLoading || questionSetStatusLoading || rubricOverviewLoading,
    subsCount,
    questionCount,
    covPct,
    covTotal,
    covCovered,
    uncoveredIds,
    rubricValidationErrors,
  };
};
