import { useMemo } from 'react';

import { useAssessmentContext } from '@app/contexts/AssessmentContext';
import { PATHS } from '@app/routes/paths';
import { useQuestionSet } from '@features/questions/api';
import { useRubric, useRubricCoverage } from '@features/rubric/api';
import { useSubmissions } from '@features/submissions/api';

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
  const { data: coverageRes, isLoading: covLoading } = useRubricCoverage(assessmentId);
  const { data: rubricRes, isLoading: rubricLoading } = useRubric(assessmentId);

  const isQsMissing = useMemo(() => {
    const err = qsErrorData as { response?: { status?: number } } | undefined;
    return qsError && (err?.response?.status === 404 || !qsRes?.question_set);
  }, [qsError, qsErrorData, qsRes]);

  const questionMap = isQsMissing ? {} : (qsRes?.question_set?.question_map ?? {});
  const questionCount = Object.keys(questionMap).length;
  const subsCount = subsRes?.raw_submissions?.length ?? 0;

  const cov = coverageRes?.coverage;
  const covPct = cov?.percentage ?? 0;
  const covTotal = cov?.total ?? 0;
  const covCovered = cov?.covered ?? 0;

  const uncoveredIds = useMemo(() => {
    const all = cov?.question_ids ?? [];
    const covered = new Set(cov?.covered_question_ids ?? []);
    return all.filter((qid) => !covered.has(qid));
  }, [cov]);

  const hasRules = (rubricRes?.rubric?.rules?.length ?? 0) > 0;
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
    rubricRes?.status?.is_stale ? 'stale'       :
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
      updatedAt: rubricRes?.status?.updated_at ?? null,
      fixLink:   ap.rules,
    },
  ];}, [
    subsStatus, subsCount, assessment,
    qsStatus, questionCount, qsRes,
    rulesStatus, covCovered, covTotal, hasRules, rubricRes,
    assessmentId,
  ]);

  const completeCount = setupSteps.filter((s) => s.status === 'complete').length;

  return {
    setupSteps,
    completeCount,
    allComplete: completeCount === setupSteps.length,
    isLoading:   subsLoading || qsLoading || covLoading || rubricLoading,
    subsCount,
    questionCount,
    covPct,
    covTotal,
    covCovered,
    uncoveredIds,
  };
};
