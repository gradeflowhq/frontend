import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import ErrorAlert from '@components/common/ErrorAlert';
import TableSkeleton from '@components/common/TableSkeleton';
import { Button } from '@components/ui/Button';
import { IconChevronLeft, IconLayout, IconChart, IconActivity } from '@components/ui/Icon';
import { useAssessment } from '@features/assessments/hooks';
import { AssessmentPassphraseProvider } from '@features/encryption/AssessmentPassphraseProvider';
import { useAssessmentPassphrase } from '@features/encryption/passphraseContext';
import { ResultsOverview, ResultsStats, QuestionAnalysis } from '@features/grading/components';
import { useGrading, useGradingJob, useJobStatus } from '@features/grading/hooks';
import { useQuestionSet } from '@features/questions/hooks';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { isEncrypted } from '@utils/crypto';
import { natsort } from '@utils/sort';

import type { AdjustableGradedSubmission, QuestionSetOutputQuestionMap } from '@api/models';

const ResultsShellInner: React.FC<{ assessmentId: string }> = ({ assessmentId }) => {
  const navigate = useNavigate();
  const safeId = assessmentId;
  const enabled = true;

  const { notifyEncryptedDetected } = useAssessmentPassphrase();
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'analysis'>('overview');

  const { data: assessmentRes, isLoading: loadingAssessment, isError: errorAssessment, error: assessmentError } =
    useAssessment(safeId, enabled);

  const { data: gradingData, isLoading, isError, error } =
    useGrading(safeId, enabled);

  const { data: qsRes } =
    useQuestionSet(safeId, enabled);

  const items: AdjustableGradedSubmission[] = useMemo(
    () => gradingData?.graded_submissions ?? [],
    [gradingData]
  );
  const hasItems = items.length > 0;
  const questionMap: QuestionSetOutputQuestionMap = useMemo(
    () => qsRes?.question_set?.question_map ?? {},
    [qsRes]
  );
  const questionIds = useMemo(() => Object.keys(questionMap).sort(natsort), [questionMap]);

  // Detect encrypted IDs to open passphrase guard when needed
  useEffect(() => {
    if (items.some((it) => isEncrypted(it.student_id))) {
      notifyEncryptedDetected();
    }
  }, [items, notifyEncryptedDetected]);

  // Job-aware grading state (show in-progress notice but keep showing existing results)
  const { data: gradingJob } = useGradingJob(safeId, enabled);
  const jobId = gradingJob?.job_id ?? null;
  const { data: jobStatusRes } = useJobStatus(jobId, !!jobId);
  const jobStatus = jobStatusRes?.status;
  const gradingInProgress = jobStatus === 'queued' || jobStatus === 'running';
  const loadingPage = loadingAssessment || isLoading;

  useDocumentTitle(`Results - ${assessmentRes?.name ?? 'Assessment'} - GradeFlow`);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => { void navigate(`/assessments/${safeId}/rules`); }}
            leftIcon={<IconChevronLeft />}
          >
            {assessmentRes?.name ?? 'Assessment'}
          </Button>
          <h2 className="text-xl font-semibold">Grading Results</h2>
        </div>
      </div>

      {errorAssessment && <ErrorAlert error={assessmentError} />}
      {isError && <ErrorAlert error={error} />}

      {loadingPage ? (
        <TableSkeleton cols={5} rows={6} withHeader className="mt-2" />
      ) : (
        <>
          {gradingInProgress && (
            <div className="alert alert-info">
              <span>Grading is in progress. Existing results are shown below and will update when the job completes.</span>
            </div>
          )}

          {!isError && !hasItems && !gradingInProgress && (
            <div className="alert alert-info">
              <span>No graded submissions found. Run grading first.</span>
            </div>
          )}

          <div className="tabs tabs-lift">
            <button
              className={`tab ${activeTab === 'overview' ? 'tab-active' : ''} flex items-center gap-2`}
              onClick={() => setActiveTab('overview')}
            >
              <IconLayout className="h-4 w-4" />
              <span>Overview</span>
            </button>
            <button
              className={`tab ${activeTab === 'stats' ? 'tab-active' : ''} flex items-center gap-2`}
              onClick={() => setActiveTab('stats')}
            >
              <IconChart className="h-4 w-4" />
              <span>Stats</span>
            </button>
            <button
              className={`tab ${activeTab === 'analysis' ? 'tab-active' : ''} flex items-center gap-2`}
              onClick={() => setActiveTab('analysis')}
            >
              <IconActivity className="h-4 w-4" />
              <span>Question Analysis</span>
            </button>
          </div>

          {!isError && hasItems && activeTab === 'overview' && (
            <ResultsOverview
              gradingInProgress={gradingInProgress}
              items={items}
              questionIds={questionIds}
              onView={(studentId) => { void navigate(`/results/${safeId}/${encodeURIComponent(studentId)}`); }}
              assessmentId={safeId}
            />
          )}

          {!isError && hasItems && activeTab === 'stats' && (
            <ResultsStats items={items} />
          )}

          {!isError && hasItems && activeTab === 'analysis' && (
            <QuestionAnalysis items={items} questionIds={questionIds} />
          )}
        </>
      )}
    </section>
  );
};

const ResultsShellPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  if (!assessmentId) {
    return <div className="alert alert-error"><span>Assessment ID is missing.</span></div>;
  }
  return (
    <AssessmentPassphraseProvider assessmentId={assessmentId}>
      <ResultsShellInner assessmentId={assessmentId} />
    </AssessmentPassphraseProvider>
  );
};

export default ResultsShellPage;