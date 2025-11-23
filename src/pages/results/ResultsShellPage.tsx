import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api';
import ErrorAlert from '../../components/common/ErrorAlert';
import EncryptedDataGuard from '../../components/common/EncryptedDataGuard';
import { isEncrypted } from '../../utils/crypto';
import { buildPassphraseKey } from '../../utils/passphrase';
import { usePassphrase } from '../../hooks/usePassphrase';
import type {
  GradingResponse,
  AdjustableGradedSubmission,
  QuestionSetResponse,
  AssessmentResponse,
} from '../../api/models';
import ResultsOverviewTab from './ResultsOverviewTab';
import ResultsStatsTab from './ResultsStatsTab';
import QuestionAnalysisTab from './QuestionAnalysisTab';
import ResultsExportMenu from '../../components/results/ResultsExportMenu';
import { IconChevronLeft } from '../../components/ui/icons';
import { Button } from '../../components/ui/Button';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const natsort = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

const ResultsShellPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();

  if (!assessmentId) {
    return <div className="alert alert-error"><span>Assessment ID is missing.</span></div>;
  }

  const storageKey = buildPassphraseKey(assessmentId);
  const { passphrase, setPassphrase } = usePassphrase(storageKey);

  const [encryptedDetected, setEncryptedDetected] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'analysis'>('overview');

  const onPassphraseReady = useCallback((pp: string | null) => {
    setPassphrase(pp);
  }, [setPassphrase]);

  const {
    data: assessmentRes,
    isLoading: loadingAssessment,
    isError: errorAssessment,
    error: assessmentError,
  } = useQuery({
    queryKey: ['assessment', assessmentId],
    queryFn: async () =>
      (await api.getAssessmentAssessmentsAssessmentIdGet(assessmentId)).data as AssessmentResponse,
    enabled: !!assessmentId,
    staleTime: 60_000,
  });

  const {
    data: gradingData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['grading', assessmentId],
    queryFn: async () =>
      (await api.getGradingAssessmentsAssessmentIdGradingGet(assessmentId)).data as GradingResponse,
    enabled: !!assessmentId,
    staleTime: 30_000,
  });
  const items: AdjustableGradedSubmission[] = gradingData?.graded_submissions ?? [];

  const { data: qsRes } = useQuery({
    queryKey: ['questionSet', assessmentId],
    queryFn: async () =>
      (await api.getQuestionSetAssessmentsAssessmentIdQuestionSetGet(assessmentId)).data as QuestionSetResponse,
    enabled: !!assessmentId,
    staleTime: 30_000,
  });
  const questionMap = qsRes?.question_set?.question_map ?? {};
  const questionIds = useMemo(() => Object.keys(questionMap).sort(natsort), [questionMap]);

  useEffect(() => {
    setEncryptedDetected(items.some((it) => isEncrypted(it.student_id)));
  }, [items]);

  const totalsPerSubmission = useMemo(
    () =>
      items.map((gs) => {
        const totalPoints = (gs.results ?? []).reduce(
          (sum, r) => sum + (r.adjusted_points ?? r.points),
          0
        );
        const totalMax = (gs.results ?? []).reduce((sum, r) => sum + r.max_points, 0);
        return { id: gs.student_id, totalPoints, totalMax };
      }),
    [items]
  );

  useDocumentTitle(`Results - ${assessmentRes?.name ?? 'Assessment'} - GradeFlow`, []);

  return (
    <section className="space-y-4">
      <EncryptedDataGuard
        storageKey={storageKey}
        encryptedDetected={encryptedDetected}
        onPassphraseReady={onPassphraseReady}
        currentPassphrase={passphrase}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(`/assessments/${assessmentId}/rules`)}
            leftIcon={<IconChevronLeft />}
          >
            <span>{assessmentRes?.name ?? 'Assessment'}</span>
          </Button>
          <h2 className="text-xl font-semibold">Grading Results</h2>
        </div>
        <div className="flex items-center gap-2">
          <ResultsExportMenu assessmentId={assessmentId} disabled={items.length === 0} />
        </div>
      </div>

      {loadingAssessment && (
        <div className="alert alert-info">
          <span>Loading assessment…</span>
        </div>
      )}
      {errorAssessment && <ErrorAlert error={assessmentError} />}

      {isLoading && (
        <div className="alert alert-info">
          <span>Loading grading results...</span>
        </div>
      )}
      {isError && <ErrorAlert error={error} />}

      {!isLoading && !isError && items.length === 0 && (
        <div className="alert alert-info">
          <span>No graded submissions found. Run grading first.</span>
        </div>
      )}

      <div className="tabs tabs-lift">
        <button
          className={`tab ${activeTab === 'overview' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'stats' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Stats
        </button>
        <button
          className={`tab ${activeTab === 'analysis' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('analysis')}
        >
          Question Analysis
        </button>
      </div>

      {!isLoading && !isError && items.length > 0 && activeTab === 'overview' && (
        <ResultsOverviewTab
          assessmentId={assessmentId}
          items={items}
          questionIds={questionIds}
          navigate={navigate}
          passphrase={passphrase}
        />
      )}

      {!isLoading && !isError && items.length > 0 && activeTab === 'stats' && (
        <ResultsStatsTab items={items} totals={totalsPerSubmission} />
      )}

      {!isLoading && !isError && items.length > 0 && activeTab === 'analysis' && (
        <QuestionAnalysisTab items={items} questionIds={questionIds} />
      )}
    </section>
  );
};

export default ResultsShellPage;