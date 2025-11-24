import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import ErrorAlert from '../../components/common/ErrorAlert';
import SingleTargetRulesSection from '../../components/rules/SingleTargetRulesSection';
import MultiTargetRulesSection from '../../components/rules/MultiTargetRulesSection';
import { api } from '../../api';

import type {
  RubricResponse,
  RubricOutput,
  CoverageResponse,
  SetRubricByModelRequest,
  QuestionSetResponse,
} from '../../api/models';

const RulesTabPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const qc = useQueryClient();
  if (!assessmentId) return null;

  const { data: qsRes } = useQuery({
    queryKey: ['questionSet', assessmentId],
    queryFn: async () => (await api.getQuestionSetAssessmentsAssessmentIdQuestionSetGet(assessmentId)).data as QuestionSetResponse,
  });
  const questionMap = qsRes?.question_set?.question_map ?? {};
  const questionIds = React.useMemo(
    () => Object.keys(questionMap).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [questionMap]
  );
  const questionTypesById = React.useMemo(() => {
    const m: Record<string, string> = {};
    for (const [qid, def] of Object.entries<any>(questionMap)) m[qid] = def?.type ?? 'TEXT';
    return m;
  }, [questionMap]);

  const replaceRubricMutation = useMutation({
    mutationKey: ['rubric', assessmentId, 'setByModel'],
    mutationFn: async (nextRubric: RubricOutput) => {
      const payload: SetRubricByModelRequest = { rubric: nextRubric };
      const res = await api.setRubricByModelAssessmentsAssessmentIdRubricPut(assessmentId, payload);
      return res.data as RubricResponse;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['rubric', assessmentId] });
      await qc.invalidateQueries({ queryKey: ['rubricCoverage', assessmentId] });
    },
  });

  const { data: rubricRes } = useQuery({
    queryKey: ['rubric', assessmentId],
    queryFn: async () => {
      try {
        const res = await api.getRubricAssessmentsAssessmentIdRubricGet(assessmentId);
        return res.data as RubricResponse;
      } catch (e) {
        const axErr = e as AxiosError;
        if (axErr?.response?.status === 404) {
          const created = await api.setRubricByModelAssessmentsAssessmentIdRubricPut(assessmentId, { rubric: { rules: [] } });
          return created.data as RubricResponse;
        }
        throw e;
      }
    },
  });

  const { data: coverageRes } = useQuery({
    queryKey: ['rubricCoverage', assessmentId],
    queryFn: async () => {
      const res = await api.rubricCoverageAssessmentsAssessmentIdRubricCoveragePost(assessmentId, {
        use_stored_rubric: true,
        use_stored_question_set: true,
      });
      return res.data as CoverageResponse;
    },
  });

  const rubric = rubricRes?.rubric ?? { rules: [] };
  const cov = coverageRes?.coverage;

  return (
    <section className="space-y-6">
      {cov && (
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

      <SingleTargetRulesSection
        rubric={rubric}
        questionIds={questionIds}
        questionTypesById={questionTypesById}
        onReplaceRubric={async (next) => { await replaceRubricMutation.mutateAsync(next); }}
        saving={replaceRubricMutation.isPending}
        error={replaceRubricMutation.isError ? replaceRubricMutation.error : null}
        assessmentId={assessmentId}
        questionMap={questionMap}
      />

      <MultiTargetRulesSection
        rubric={rubric}
        onReplaceRubric={async (next) => { await replaceRubricMutation.mutateAsync(next); }}
        saving={replaceRubricMutation.isPending}
        error={replaceRubricMutation.isError ? replaceRubricMutation.error : null}
        assessmentId={assessmentId}
        questionMap={questionMap}
      />
    </section>
  );
};

export default RulesTabPage;