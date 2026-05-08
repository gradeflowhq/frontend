import { useMemo } from 'react';

import { useAssessmentContext } from '@app/contexts/AssessmentContext';
import { PATHS } from '@app/routes/paths';
import { useQuestionSet } from '@features/questions/api';
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

  const { data: rubricOverview, isLoading: rubricOverviewLoading } = useRubricOverview(
    assessmentId,
    !!assessmentId && questionCount > 0,
  );

  const coverage = rubricOverview?.coverage;
  const covTotal = coverage?.total ?? 0;
  const covCovered = coverage?.covered ?? 0;
  const covPct = coverage?.percentage ?? 0;

  const uncoveredIds = useMemo(() => {
    return [...(coverage?.uncovered_question_ids ?? [])].sort(natsort);
  }, [coverage?.uncovered_question_ids]);

  const hasRules =
    (rubricOverview?.question_rules.length ?? 0) + (rubricOverview?.global_rules.length ?? 0) > 0;
  const rulesAreStale = Boolean(
    rubricOverview?.status?.is_stale || (rubricOverview?.stale_rules.length ?? 0) > 0,
  );
  const hasSubmissions = subsCount > 0;
  const hasQuestions = questionCount > 0 && hasSubmissions;

  const subsStatus: StepStatus = subsCount === 0 ? 'not-started' : 'complete';

  const qsStatus: StepStatus =
    !hasSubmissions         ? 'locked'      :
    questionCount === 0     ? 'not-started' :
    qsRes?.status?.is_stale ? 'stale'       : 'complete';

  const rulesStatus: StepStatus =
    !hasQuestions               ? 'locked'      :
    !hasRules                   ? 'not-started' :
    rulesAreStale               ? 'stale'       :
    covPct >= 1                 ? 'complete'    : 'warning';

  const setupSteps = useMemo<SetupStep[]>(() => {
    const ap = PATHS.assessment(assessmentId);
    return [
    {
      label:     'Submissions',
      status:    subsStatus,
      summary:   subsCount > 0 ? `${subsCount} students` : 'No submissions yet',
      updatedAt: assessment?.source_updated_at ?? null,
      fixLink:   ap.submissions,
    },
    {
      label:     'Questions',
      status:    qsStatus,
      summary:
        qsStatus === 'locked' ? 'Complete submissions first' :
        questionCount > 0     ? `${questionCount} questions`  : 'Not configured',
      updatedAt: qsRes?.status?.updated_at ?? null,
      fixLink:   ap.questions,
    },
    {
      label:     'Rules',
      status:    rulesStatus,
      summary:
        rulesStatus === 'locked' ? 'Complete questions first'          :
        hasRules                 ? `${covCovered}/${covTotal} covered` : 'No rules configured',
      updatedAt: rubricOverview?.status?.updated_at ?? null,
      fixLink:   ap.rules,
    },
  ];}, [
    subsStatus, subsCount, assessment,
    qsStatus, questionCount, qsRes,
    rulesStatus, covCovered, covTotal, hasRules, rubricOverview,
    assessmentId,
  ]);

  const completeCount = setupSteps.filter((s) => s.status === 'complete').length;

  return {
    setupSteps,
    completeCount,
    allComplete: completeCount === setupSteps.length,
    isLoading:   subsLoading || qsLoading || rubricOverviewLoading,
    subsCount,
    questionCount,
    covPct,
    covTotal,
    covCovered,
    uncoveredIds,
  };
};
