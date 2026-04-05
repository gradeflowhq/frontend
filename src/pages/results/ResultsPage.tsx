import { Alert, Button, Menu, Skeleton, Stack, Tabs, TextInput } from '@mantine/core';
import { IconActivity, IconArrowRight, IconChartBar, IconChevronDown, IconDownload, IconLayout, IconLoader, IconSearch } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { QK } from '@api/queryKeys';
import { useAssessmentContext } from '@app/contexts/AssessmentContext';
import EmptyState from '@components/common/EmptyState';
import PageShell from '@components/common/PageShell';
import SectionStatusBadge from '@components/common/SectionStatusBadge';
import { useAssessmentPassphrase } from '@features/encryption/passphraseContext';
import { useGrading, useGradingJob, useJobStatus } from '@features/grading/api';
import { ResultsOverviewTable, ResultsStatsPanel, QuestionAnalysisGrid } from '@features/grading/components';
import ResultsDownloadModal from '@features/grading/components/ResultsDownloadModal';
import { useQuestionSet } from '@features/questions/api';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { isEncrypted } from '@utils/crypto';
import { getErrorMessage } from '@utils/error';
import { natsort } from '@utils/sort';

import type { AdjustableSubmission, QuestionSetOutputQuestionMap } from '@api/models';

const ResultsPageInner: React.FC<{ assessmentId: string }> = ({ assessmentId }) => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { assessment } = useAssessmentContext();

  const { notifyEncryptedDetected } = useAssessmentPassphrase();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [downloadFormat, setDownloadFormat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: gradingData, isLoading, isError, error } = useGrading(assessmentId, true);
  const { data: qsRes } = useQuestionSet(assessmentId, true);

  const items: AdjustableSubmission[] = useMemo(() => gradingData?.submissions ?? [], [gradingData]);
  const hasItems = items.length > 0;

  const questionMap: QuestionSetOutputQuestionMap = useMemo(
    () => qsRes?.question_set?.question_map ?? {},
    [qsRes],
  );
  const questionIds = useMemo(() => Object.keys(questionMap).sort(natsort), [questionMap]);

  useEffect(() => {
    if (items.some((it) => isEncrypted(it.student_id))) {
      notifyEncryptedDetected();
    }
  }, [items, notifyEncryptedDetected]);

  const { data: gradingJob } = useGradingJob(assessmentId, true);
  const jobId = gradingJob?.job_id ?? null;
  const { data: jobStatusRes } = useJobStatus(jobId, !!jobId);
  const jobStatus = jobStatusRes?.status;
  const gradingInProgress = jobStatus === 'queued' || jobStatus === 'running';

  // Auto-refresh when job completes
  useEffect(() => {
    if (jobStatus === 'completed') {
      void qc.invalidateQueries({ queryKey: QK.grading.item(assessmentId) });
    }
  }, [jobStatus, assessmentId, qc]);

  useDocumentTitle(`Results - ${assessment?.name ?? 'Assessment'} - GradeFlow`);

  return (
    <PageShell
      title="Results"
      actions={
        <>
          <TextInput
            leftSection={<IconSearch size={14} />}
            placeholder="Search by Student ID"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.currentTarget.value);
              if (e.currentTarget.value) setActiveTab('overview');
            }}
            size="sm"
            w={200}
          />
          <Menu position="bottom-end" withArrow>
            <Menu.Target>
              <Button
                variant="outline"
                size="sm"
                leftSection={<IconDownload size={14} />}
                rightSection={<IconChevronDown size={12} />}
              >
                Download
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={() => setDownloadFormat('csv')}>CSV</Menu.Item>
              <Menu.Item onClick={() => setDownloadFormat('json')}>JSON</Menu.Item>
              <Menu.Item onClick={() => setDownloadFormat('yaml')}>YAML</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </>
      }
    >

      {isError && <Alert color="red" mb="md">{getErrorMessage(error)}</Alert>}

      {/* Grading in progress banner */}
      {gradingInProgress && (
        <Alert icon={<IconLoader size={16} />} color="blue" mb="md">
          Grading in progress... Showing previous results. This page will update automatically.
        </Alert>
      )}

      <Stack mb="md">
        <SectionStatusBadge
          updatedAt={gradingData?.status?.updated_at}
          isStale={gradingData?.status?.is_stale}
          staleMessage="Results may be out of date — submissions or rules have changed since the last grading run."
        />
      </Stack>

      {isLoading ? (
        <Stack gap="xs">
          <Skeleton height={40} />
          <Skeleton height={300} />
        </Stack>
      ) : !isError && !hasItems && !gradingInProgress ? (
        <EmptyState
          icon={<IconChartBar size={48} opacity={0.3} />}
          title="No grading results yet"
          description="Run grading from the Overview page to see results here."
          action={
            <Button
              variant="light"
              rightSection={<IconArrowRight size={14} />}
              onClick={() => void navigate(`/assessments/${assessmentId}/overview`)}
            >
              Go to Overview
            </Button>
          }
        />
      ) : (
        <Tabs value={activeTab} onChange={(v) => setActiveTab(v ?? 'overview')}>
          <Tabs.List>
            <Tabs.Tab value="overview" leftSection={<IconLayout size={14} />}>Overview</Tabs.Tab>
            <Tabs.Tab value="stats" leftSection={<IconChartBar size={14} />}>Stats</Tabs.Tab>
            <Tabs.Tab value="analysis" leftSection={<IconActivity size={14} />}>Question Analysis</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview" pt="md">
            {!isError && hasItems && (
              <ResultsOverviewTable
                items={items}
                questionIds={questionIds}
                onView={(studentId) => {
                  void navigate(`/assessments/${assessmentId}/results/${encodeURIComponent(studentId)}`);
                }}
                searchQuery={searchQuery}
              />
            )}
          </Tabs.Panel>

          <Tabs.Panel value="stats" pt="md">
            {!isError && hasItems && <ResultsStatsPanel items={items} />}
          </Tabs.Panel>

          <Tabs.Panel value="analysis" pt="md">
            {!isError && hasItems && <QuestionAnalysisGrid items={items} questionIds={questionIds} />}
          </Tabs.Panel>
        </Tabs>
      )}

      {downloadFormat && (
        <ResultsDownloadModal
          open={!!downloadFormat}
          assessmentId={assessmentId}
          selectedFormat={downloadFormat}
          onClose={() => setDownloadFormat(null)}
        />
      )}
    </PageShell>
  );
};

// The outer shell now just uses the AssessmentPassphraseProvider from AssessmentShell
const ResultsPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  if (!assessmentId) {
    return <Alert color="red">Assessment ID is missing.</Alert>;
  }
  return <ResultsPageInner assessmentId={assessmentId} />;
};

export default ResultsPage;
