import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ErrorAlert from '@components/common/ErrorAlert';
import EncryptedDataGuard from '@components/common/encryptions/EncryptedDataGuard';
import { isEncrypted } from '@utils/crypto';
import { buildPassphraseKey } from '@utils/passphrase';
import { usePassphrase } from '@hooks/usePassphrase';
import { IconChevronLeft } from '@components/ui/Icon';
import { Button } from '@components/ui/Button';
import { useDocumentTitle } from '@hooks/useDocumentTitle';

// Grading feature
import { useGrading } from '@features/grading/hooks';
import { ResultsOverview, ResultsStats, QuestionAnalysis } from '@features/grading/components';
import { buildTotals } from '@features/grading/helpers';

// Assessments + questions (to show name and derive question IDs)
import { useAssessment } from '@features/assessments/hooks';
import { useQuestionSet } from '@features/questions/hooks';

import type { AdjustableGradedSubmission, QuestionSetOutputQuestionMap } from '@api/models';
import ResultsExportMenu from '@features/grading/components/ResultsExportMenu';

const natsort = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

const ResultsShellPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const enabled = Boolean(assessmentId);
  const safeId = assessmentId ?? '';

  // Passphrase state via hook (standardised storage key)
  const storageKey = buildPassphraseKey(safeId);
  const { passphrase, setPassphrase } = usePassphrase(storageKey);

  const [encryptedDetected, setEncryptedDetected] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'analysis'>('overview');

  const onPassphraseReady = useCallback((pp: string | null) => {
    setPassphrase(pp);
  }, [setPassphrase]);

  // Data hooks (top-level, stable order)
  const { data: assessmentRes, isLoading: loadingAssessment, isError: errorAssessment, error: assessmentError } =
    useAssessment(safeId, enabled);

  const { data: gradingData, isLoading, isError, error } =
    useGrading(safeId, enabled);

  const { data: qsRes } =
    useQuestionSet(safeId, enabled);

  const items: AdjustableGradedSubmission[] = gradingData?.graded_submissions ?? [];

  const questionMap: QuestionSetOutputQuestionMap = qsRes?.question_set?.question_map ?? {};
  const questionIds = useMemo(() => Object.keys(questionMap).sort(natsort), [questionMap]);

  useEffect(() => {
    setEncryptedDetected(items.some((it) => isEncrypted(it.student_id)));
  }, [items]);

  const totalsPerSubmission = useMemo(() => buildTotals(items), [items]);

  useDocumentTitle(`Results - ${assessmentRes?.name ?? 'Assessment'} - GradeFlow`);

  if (!enabled) {
    return <div className="alert alert-error"><span>Assessment ID is missing.</span></div>;
  }

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
            onClick={() => navigate(`/assessments/${safeId}/rules`)}
            leftIcon={<IconChevronLeft />}
          >
            <span>{assessmentRes?.name ?? 'Assessment'}</span>
          </Button>
          <h2 className="text-xl font-semibold">Grading Results</h2>
        </div>

        <div className="flex items-center gap-2">
          <ResultsExportMenu assessmentId={safeId} disabled={(items?.length ?? 0) === 0} />
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
        <ResultsOverview
          items={items}
          questionIds={questionIds}
          passphrase={passphrase}
          onView={(studentId) => navigate(`/results/${safeId}/${encodeURIComponent(studentId)}`)}
        />
      )}

      {!isLoading && !isError && items.length > 0 && activeTab === 'stats' && (
        <ResultsStats items={items} />
      )}

      {!isLoading && !isError && items.length > 0 && activeTab === 'analysis' && (
        <QuestionAnalysis items={items} questionIds={questionIds} />
      )}
    </section>
  );
};

export default ResultsShellPage;