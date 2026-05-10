import { Stack } from '@mantine/core';
import { IconCircleCheck, IconAlertCircle } from '@tabler/icons-react';
import { DataTable } from 'mantine-datatable';
import React, { useMemo } from 'react';

import { JobStatusResponseStatus as JobStatus } from '@api/models/jobStatusResponseStatus';
import AnswerText from '@components/common/AnswerText';
import ErrorAlert from '@components/common/ErrorAlert';
import { TableSkeleton } from '@components/common/Skeletons';
import DecryptedText from '@features/encryption/components/DecryptedText';
import { useAssessmentPassphrase } from '@features/encryption/PassphraseContext';
import JobProgressAlert from '@features/grading/components/JobProgressAlert';
import { usePagination } from '@hooks/usePagination';
import { natsort } from '@utils/sort';

import type { JobStatusResponseStatus } from '@api/models/jobStatusResponseStatus';
import type { JobProgress } from '@features/grading/helpers/jobProgress';
import type { AdjustableSubmission, AdjustableQuestionResult } from '@features/grading/types';

type Props = {
  items: AdjustableSubmission[];
  loading?: boolean;
  error?: unknown;
  status?: JobStatusResponseStatus | null;
  progress?: JobProgress;
  initialPageSize?: number;
  answerQuestionIds?: string[];
  resultQuestionIds?: string[];
};

const GradingPreviewPanel: React.FC<Props> = ({
  items,
  loading,
  error,
  status,
  progress,
  initialPageSize = 5,
  answerQuestionIds = [],
  resultQuestionIds = [],
}) => {
  const { passphrase } = useAssessmentPassphrase();

  const sorted = useMemo(
    () => [...(items ?? [])].sort((a, b) => natsort(a.student_id, b.student_id)),
    [items]
  );

  const answerQids = useMemo(
    () => [...answerQuestionIds].sort((a, b) => natsort(a, b)),
    [answerQuestionIds]
  );
  const resultQids = useMemo(
    () => [...resultQuestionIds].sort((a, b) => natsort(a, b)),
    [resultQuestionIds]
  );
  const displayQids = useMemo(() => {
    const seen = new Set([...answerQids, ...resultQids]);
    return [...seen].sort((a, b) => natsort(a, b));
  }, [answerQids, resultQids]);

  const columns = useMemo(() => {
    const answerQidSet = new Set(answerQids);
    const resultQidSet = new Set(resultQids);

    return [
      {
        accessor: 'student_id' as const,
        title: 'Student ID',
        render: (row: AdjustableSubmission) => (
          <DecryptedText value={row.student_id} passphrase={passphrase} mono size="sm" />
        ),
      },
      ...displayQids.flatMap((qid) => [
        ...(answerQidSet.has(qid) ? [{
          accessor: `answer_${qid}` as keyof AdjustableSubmission,
          title: answerQids.length > 1 ? `Answer (${qid})` : 'Answer',
          render: (row: AdjustableSubmission) => {
            const answerRaw = row.answer_map?.[qid] as unknown;
            return <AnswerText value={answerRaw} />;
          },
        }] : []),
        ...(resultQidSet.has(qid) ? [{
          accessor: `passed_${qid}` as keyof AdjustableSubmission,
          title: resultQids.length > 1 ? `Passed (${qid})` : 'Passed',
          render: (row: AdjustableSubmission) => {
            const r: AdjustableQuestionResult | undefined = row.result_map?.[qid];
            if (!r) return <span style={{ color: 'var(--mantine-color-dimmed)' }}>—</span>;
            return r.passed
              ? <IconCircleCheck color="var(--mantine-color-green-6)" />
              : <IconAlertCircle color="var(--mantine-color-red-6)" />;
          },
        },
        {
          accessor: `points_${qid}` as keyof AdjustableSubmission,
          title: resultQids.length > 1 ? `Points (${qid})` : 'Points',
          render: (row: AdjustableSubmission) => {
            const r: AdjustableQuestionResult | undefined = row.result_map?.[qid];
            if (!r) return <span style={{ color: 'var(--mantine-color-dimmed)' }}>—</span>;
            const points = (r.adjusted_points ?? r.points) ?? 0;
            const max = r.max_points ?? 0;
            return (
              <span style={{ fontFamily: 'monospace', fontSize: 14 }}>
                {points.toFixed(2)} / {max}
              </span>
            );
          },
        },
        {
          accessor: `feedback_${qid}` as keyof AdjustableSubmission,
          title: resultQids.length > 1 ? `Feedback (${qid})` : 'Feedback',
          render: (row: AdjustableSubmission) => {
            const r: AdjustableQuestionResult | undefined = row.result_map?.[qid];
            if (!r) return <span style={{ color: 'var(--mantine-color-dimmed)' }}>—</span>;
            const feedback = r.adjusted_feedback ?? r.feedback ?? '';
            return feedback
              ? <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 14 }}>{feedback}</span>
              : <span style={{ color: 'var(--mantine-color-dimmed)' }}>—</span>;
          },
        }] : []),
      ]),
    ];
  }, [answerQids, displayQids, passphrase, resultQids]);

  const { page, setPage, pageSize, setPageSize, paginate } = usePagination([], initialPageSize);

  if (loading) {
    const statusLabel = status === JobStatus.queued ? 'queued' : 'running';
    return (
      <Stack gap="sm">
        <JobProgressAlert
          statusText={`Preview job ${statusLabel}`}
          progress={progress}
        />
        <TableSkeleton
          columns={5}
          rows={5}
          columnTemplate="1fr 1.5fr 96px 100px 1.8fr"
          minWidth={760}
          headerWidths={[72, 52, 44, 52, 64]}
          cellWidths={['58%', '84%', 44, 54, '88%']}
          secondaryLine={{ columns: [1, 4], width: '64%' }}
          ariaLabel="Loading grading preview table"
        />
      </Stack>
    );
  }

  if (error) {
    return <ErrorAlert error={error} title="Error" />;
  }

  if (!sorted.length) return null;

  const records = paginate(sorted);

  return (
    <DataTable
      columns={columns}
      records={records}
      idAccessor="student_id"
      totalRecords={sorted.length}
      recordsPerPage={pageSize}
      page={page}
      onPageChange={setPage}
      recordsPerPageOptions={[5, 10, 20, 50]}
      onRecordsPerPageChange={(size) => { setPageSize(size); setPage(1); }}
      withTableBorder
      withColumnBorders
      striped
      highlightOnHover
      verticalAlign="top"
      pinFirstColumn
    />
  );
};

export default GradingPreviewPanel;
