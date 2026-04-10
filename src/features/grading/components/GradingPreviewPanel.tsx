import { Alert, Skeleton, Text } from '@mantine/core';
import { IconCircleCheck, IconAlertCircle } from '@tabler/icons-react';
import { DataTable } from 'mantine-datatable';
import React, { useMemo } from 'react';

import AnswerText from '@components/common/AnswerText';
import DecryptedText from '@features/encryption/components/DecryptedText';
import { useAssessmentPassphrase } from '@features/encryption/PassphraseContext';
import { usePagination } from '@hooks/usePagination';
import { getErrorMessage } from '@utils/error';
import { natsort } from '@utils/sort';

import type { AdjustableSubmission, AdjustableQuestionResult } from '@features/grading/types';

type Props = {
  items: AdjustableSubmission[];
  loading?: boolean;
  error?: unknown;
  initialPageSize?: number;
};

const GradingPreviewPanel: React.FC<Props> = ({
  items,
  loading,
  error,
  initialPageSize = 5,
}) => {
  const { passphrase } = useAssessmentPassphrase();

  const sorted = useMemo(
    () => [...(items ?? [])].sort((a, b) => natsort(a.student_id, b.student_id)),
    [items]
  );

  const allQids = useMemo(() => {
    const seen = new Set<string>();
    for (const gs of sorted) {
      for (const qid of Object.keys(gs.result_map ?? {})) {
        seen.add(qid);
      }
    }
    return [...seen].sort((a, b) => natsort(a, b));
  }, [sorted]);

  const columns = useMemo(() => {
    return [
      {
        accessor: 'student_id' as const,
        title: 'Student ID',
        render: (row: AdjustableSubmission) => (
          <DecryptedText value={row.student_id} passphrase={passphrase} mono size="sm" />
        ),
      },
      ...allQids.flatMap((qid) => [
        {
          accessor: `answer_${qid}` as keyof AdjustableSubmission,
          title: allQids.length > 1 ? `Answer (${qid})` : 'Answer',
          render: (row: AdjustableSubmission) => {
            const r: AdjustableQuestionResult | undefined = row.result_map?.[qid];
            const answerRaw = row.answer_map?.[qid] as unknown;
            return r ? <AnswerText value={answerRaw} /> : <span style={{ color: 'var(--mantine-color-dimmed)' }}>—</span>;
          },
        },
        {
          accessor: `passed_${qid}` as keyof AdjustableSubmission,
          title: allQids.length > 1 ? `Passed (${qid})` : 'Passed',
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
          title: allQids.length > 1 ? `Points (${qid})` : 'Points',
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
          title: allQids.length > 1 ? `Feedback (${qid})` : 'Feedback',
          render: (row: AdjustableSubmission) => {
            const r: AdjustableQuestionResult | undefined = row.result_map?.[qid];
            if (!r) return <span style={{ color: 'var(--mantine-color-dimmed)' }}>—</span>;
            const feedback = r.adjusted_feedback ?? r.feedback ?? '';
            return feedback
              ? <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 14 }}>{feedback}</span>
              : <span style={{ color: 'var(--mantine-color-dimmed)' }}>—</span>;
          },
        },
      ]),
    ];
  }, [allQids, passphrase]);

  const { page, setPage, pageSize, setPageSize, paginate } = usePagination([], initialPageSize);

  if (loading) {
    return (
      <div>
        <Skeleton height={200} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Alert color="red" title="Error">
          <Text size="sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {getErrorMessage(error)}
          </Text>
        </Alert>
      </div>
    );
  }

  if (!sorted.length) return null;

  const records = paginate(sorted);

  return (
    <DataTable
      columns={columns}
      records={records}
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