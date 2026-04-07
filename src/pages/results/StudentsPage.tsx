import { Alert, Button, Menu, Skeleton, TextInput } from '@mantine/core';
import { IconChevronDown, IconDownload, IconSearch } from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAssessmentContext } from '@app/contexts/AssessmentContext';
import PageShell from '@components/common/PageShell';
import { useGrading } from '@features/grading/api';
import {
  GradingStatusBanner,
  NoGradingResults,
  ResultsOverviewTable,
} from '@features/grading/components';
import ResultsDownloadModal from '@features/grading/components/ResultsDownloadModal';
import { useGradingStatus } from '@features/grading/hooks/useGradingStatus';
import { useQuestionSet } from '@features/questions/api';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { getErrorMessage } from '@utils/error';
import { natsort } from '@utils/sort';

import type { AdjustableSubmission } from '@api/models';

const StudentsPage: React.FC = () => {
  const { assessmentId = '' } = useParams<{ assessmentId: string }>();
  const { assessment } = useAssessmentContext();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadFormat, setDownloadFormat] = useState<string | null>(null);

  const { data: gradingData, isLoading, isError, error } = useGrading(assessmentId, true);
  const { data: qsRes } = useQuestionSet(assessmentId, true);
  const { gradingInProgress, updatedAt } = useGradingStatus(assessmentId);

  useDocumentTitle(`Students - ${assessment?.name ?? 'Assessment'} - GradeFlow`);

  const items = useMemo<AdjustableSubmission[]>(
    () => gradingData?.submissions ?? [],
    [gradingData],
  );

  const questionIds = useMemo(
    () => Object.keys(qsRes?.question_set?.question_map ?? {}).sort(natsort),
    [qsRes],
  );

  return (
    <PageShell
      title="Students"
      actions={
        <>
          <TextInput
            leftSection={<IconSearch size={14} />}
            placeholder="Search by Student ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
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
      updatedAt={updatedAt}
    >
      <GradingStatusBanner assessmentId={assessmentId} />

      {isLoading && <Skeleton height={300} />}
      {isError && <Alert color="red">{getErrorMessage(error)}</Alert>}

      {!isLoading && !isError && items.length === 0 && !gradingInProgress && (
        <NoGradingResults assessmentId={assessmentId} />
      )}

      {!isLoading && !isError && items.length > 0 && (
        <ResultsOverviewTable
          items={items}
          questionIds={questionIds}
          onView={(studentId) =>
            void navigate(
              `/assessments/${assessmentId}/results/students/${encodeURIComponent(studentId)}`,
            )
          }
          searchQuery={searchQuery}
        />
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

export default StudentsPage;