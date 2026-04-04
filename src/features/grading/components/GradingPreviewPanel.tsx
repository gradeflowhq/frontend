import { Title, Alert, Skeleton, Paper, ScrollArea, Text } from '@mantine/core';
import { IconAlertCircle, IconCircleCheck } from '@tabler/icons-react';
import React, { useMemo } from 'react';

import AnswerText from '@components/common/AnswerText';
import DecryptedText from '@components/common/encryptions/DecryptedText';
import { useAssessmentPassphrase } from '@features/encryption/passphraseContext';
import { getErrorMessages } from '@utils/error';
import { natsort } from '@utils/sort';

import type { AdjustableSubmission, AdjustableQuestionResult } from '@features/grading/types';

type Props = {
  items: AdjustableSubmission[];
  loading?: boolean;
  error?: unknown;
  maxHeightVh?: number;
};

const GradingPreviewPanel: React.FC<Props> = ({ items, loading, error, maxHeightVh = 60 }) => {
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

  if (loading) {
    return (
      <div>
        <Title order={4} mb="sm">Preview</Title>
        <Skeleton height={200} />
      </div>
    );
  }
  if (error) {
    return (
      <div>
        <Title order={4} mb="xs">Preview</Title>
        <Alert color="red" title="Error">{getErrorMessages(error).join(' ')}</Alert>
      </div>
    );
  }
  if (!sorted.length) return null;

  return (
    <div>
      <Title order={4} mb="sm">Preview</Title>
      <Paper withBorder shadow="xs">
        <ScrollArea style={{ maxHeight: `${maxHeightVh}vh` }}>
          <table style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse', fontSize: 14 }}>
            <thead style={{ position: 'sticky', top: 0 }}>
              <tr>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Student ID</th>
                {allQids.map((qid) => (
                  <React.Fragment key={qid}>
                    <td style={{ padding: '6px 8px' }}>Answer ({qid})</td>
                    <td style={{ padding: '6px 8px' }}>Passed</td>
                    <td style={{ padding: '6px 8px' }}>Points</td>
                    <td style={{ padding: '6px 8px' }}>Feedback</td>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((gs) => (
                <tr key={gs.student_id} style={{ verticalAlign: 'top' }}>
                  <th style={{ padding: '6px 8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    <DecryptedText value={gs.student_id} passphrase={passphrase} mono size="sm" />
                  </th>
                  {allQids.map((qid) => {
                    const r: AdjustableQuestionResult | undefined = gs.result_map?.[qid];
                    const passed = !!r?.passed;
                    const points = r ? (r.adjusted_points ?? r.points) : 0;
                    const max = r?.max_points ?? 0;
                    const feedback = r?.adjusted_feedback ?? r?.feedback ?? '';
                    const answerRaw = gs.answer_map?.[qid] as unknown;

                    return (
                      <React.Fragment key={qid}>
                        <td style={{ padding: '6px 8px' }}>
                          {r ? <AnswerText value={answerRaw} /> : <Text c="dimmed">—</Text>}
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          {r ? (
                            passed ? (
                              <IconCircleCheck color="var(--mantine-color-green-6)" />
                            ) : (
                              <IconAlertCircle color="var(--mantine-color-red-6)" />
                            )
                          ) : (
                            <Text c="dimmed">—</Text>
                          )}
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          {r ? (
                            <Text ff="monospace" size="sm">{points} / {max}</Text>
                          ) : (
                            <Text c="dimmed">—</Text>
                          )}
                        </td>
                        <td style={{ padding: '6px 8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {r ? (feedback || <Text c="dimmed">—</Text>) : <Text c="dimmed">—</Text>}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </Paper>
    </div>
  );
};

export default GradingPreviewPanel;
