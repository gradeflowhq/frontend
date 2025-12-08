import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ErrorAlert from '@components/common/ErrorAlert';
import { isEncrypted } from '@utils/crypto';
import { IconChevronLeft } from '@components/ui/Icon';
import { Button } from '@components/ui/Button';
import { useDocumentTitle } from '@hooks/useDocumentTitle';

// Grading feature
import { useGrading, useGradingJob, useJobStatus } from '@features/grading/hooks';
import { ResultsOverview, ResultsStats, QuestionAnalysis } from '@features/grading/components';

// Assessments + questions (to show name and derive question IDs)
import { useAssessment } from '@features/assessments/hooks';
import { useQuestionSet } from '@features/questions/hooks';

import type { AdjustableGradedSubmission, QuestionSetOutputQuestionMap } from '@api/models';
import { AssessmentPassphraseProvider, useAssessmentPassphrase } from '@features/encryption/AssessmentPassphraseProvider';

// Download modal and dropdown
import ResultsDownloadModal from '@features/grading/components/ResultsDownloadModal';
import ResultsDownloadDropdown from '@features/grading/components/ResultsDownloadDropdown';
import { api } from '@api';

const natsort = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

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

  const items: AdjustableGradedSubmission[] = gradingData?.graded_submissions ?? [];

  const questionMap: QuestionSetOutputQuestionMap = qsRes?.question_set?.question_map ?? {};
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

  useDocumentTitle(`Results - ${assessmentRes?.name ?? 'Assessment'} - GradeFlow`);

  // Download modal state
  const [openDownload, setOpenDownload] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);

  const hasItems = (items?.length ?? 0) > 0;

  // Fetch available download serializers from registry (CSV/JSON/YAML, etc.)
  const { data: serializerRegistry } = useQuery({
    queryKey: ['registry', 'gradedSubmissionsSerializers'],
    queryFn: async () => (await api.gradedSubmissionsSerializersRegistrySerializersGradedSubmissionsGet()).data as string[],
    staleTime: 5 * 60 * 1000,
    enabled: true,
  });

  const formats = useMemo<string[]>(() => {
    if (Array.isArray(serializerRegistry) && serializerRegistry.length > 0) return serializerRegistry;
    // Fallback to CSV if registry is empty/unavailable
    return ['CSV'];
  }, [serializerRegistry]);

  const canDownload = hasItems || gradingInProgress;

  const openFormatModal = (fmt: string) => {
    setSelectedFormat(fmt);
    setOpenDownload(true);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(`/assessments/${safeId}/rules`)}
            leftIcon={<IconChevronLeft />}
          >
            {assessmentRes?.name ?? 'Assessment'}
          </Button>
          <h2 className="text-xl font-semibold">Grading Results</h2>
        </div>

        <div className="flex items-center gap-2">
          <ResultsDownloadDropdown
            formats={formats}
            canDownload={canDownload}
            onSelect={openFormatModal}
          />
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

      {gradingInProgress && (
        <div className="alert alert-info">
          <span>Grading is in progress. Existing results are shown below and will update when the job completes.</span>
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && !gradingInProgress && (
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
          onView={(studentId) => navigate(`/results/${safeId}/${encodeURIComponent(studentId)}`)}
        />
      )}

      {!isLoading && !isError && items.length > 0 && activeTab === 'stats' && (
        <ResultsStats items={items} />
      )}

      {!isLoading && !isError && items.length > 0 && activeTab === 'analysis' && (
        <QuestionAnalysis items={items} questionIds={questionIds} />
      )}

      {/* Download modal for the selected format */}
      <ResultsDownloadModal
        open={openDownload}
        assessmentId={safeId}
        onClose={() => {
          setOpenDownload(false);
          setSelectedFormat(null);
        }}
        selectedFormat={selectedFormat ?? undefined}
      />
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