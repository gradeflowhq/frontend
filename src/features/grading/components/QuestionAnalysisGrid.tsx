import { BarChart } from '@mantine/charts';
import { SimpleGrid, Card, Group, Text, Badge, Progress, Divider, SegmentedControl, ScrollArea, Tooltip } from '@mantine/core';
import React, { useMemo, useState } from 'react';

import SectionLabel from '@components/common/SectionLabel';

import { computeStats } from '../helpers';

import type { AdjustableSubmission, AdjustableQuestionResult } from '../types';


type Props = {
  items: AdjustableSubmission[];
  questionIds: string[];
};

// Maximum number of unique answer values to show in the answer distribution.
const MAX_ANSWER_ROWS = 15;

// ── Shared layout primitives ────────────────────────────────────────────────

/** One key/value row. Label is dark; value is monospace on the right. */
const StatRow = ({ label, right }: { label: string; right: React.ReactNode }) => (
  <Group justify="space-between" gap="xs" style={{ paddingBlock: 2 }}>
    <Text size="xs" fw={500}>{label}</Text>
    <div>{right}</div>
  </Group>
);

/** A labeled percentage bar. */
const ProgressRow = ({ label, pct, color = 'blue' }: { label: string; pct: number; color?: string }) => (
  <div style={{ paddingBlock: 2 }}>
    <Group justify="space-between" mb={2}>
      <Text size="xs" fw={500}>{label}</Text>
      <Text size="xs" ff="monospace" fw={600}>{pct.toFixed(1)}%</Text>
    </Group>
    <Progress value={Math.max(0, Math.min(100, Math.round(pct)))} size={5} color={color} />
  </div>
);

// ── Section header ───────────────────────────────────────────────────────────

// ── Answer distribution ──────────────────────────────────────────────────────

/** Serialize an answer value to a stable, human-readable string for grouping/display. */
const serializeAnswer = (value: unknown): string => {
  if (value === null || value === undefined) return '(blank)';
  if (Array.isArray(value)) {
    if (value.length === 0) return '(empty list)';
    return value.map((v) => String(v ?? '')).join(', ');
  }
  const s = String(value).trim();
  return s === '' ? '(blank)' : s;
};

type AnswerFreqRow = { answer: string; count: number; pct: number };

/** Build a sorted frequency table from raw answer values. */
const buildAnswerFrequency = (answers: unknown[], maxRows: number): AnswerFreqRow[] => {
  const freq = new Map<string, number>();
  for (const v of answers) {
    const key = serializeAnswer(v);
    freq.set(key, (freq.get(key) ?? 0) + 1);
  }
  const total = answers.length;
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxRows)
    .map(([answer, count]) => ({ answer, count, pct: total > 0 ? (count / total) * 100 : 0 }));
};

const AnswerDistributionTable: React.FC<{
  rows: AnswerFreqRow[];
  uniqueCount: number;
  truncated: boolean;
}> = ({ rows, uniqueCount, truncated }) => {
  if (rows.length === 0) return <Text size="xs" c="dimmed">No answers recorded.</Text>;

  return (
    <>
      <ScrollArea.Autosize mah={200} offsetScrollbars type="hover">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {rows.map(({ answer, count, pct }) => (
            <div key={answer}>
              <Group justify="space-between" mb={2} gap={6} wrap="nowrap">
                <Tooltip label={answer} disabled={answer.length <= 36} openDelay={400} withArrow>
                  <Text
                    size="xs"
                    ff="monospace"
                    fw={500}
                   
                    style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}
                  >
                    {answer}
                  </Text>
                </Tooltip>
                <Text size="xs" ff="monospace" fw={600} style={{ flexShrink: 0 }}>
                  {count} <Text span fw={400}>({pct.toFixed(0)}%)</Text>
                </Text>
              </Group>
              <Progress value={pct} size={4} color="teal.6" />
            </div>
          ))}
        </div>
      </ScrollArea.Autosize>
      {truncated && (
        <Text size="xs" c="dimmed" mt={4}>Top {rows.length} of {uniqueCount} unique answers</Text>
      )}
    </>
  );
};

// ── Main component ───────────────────────────────────────────────────────────

type DistributionView = 'scores' | 'answers';

const QuestionAnalysisGrid: React.FC<Props> = ({ items, questionIds }) => {
  const totalStudents = items.length;
  const [viewByQid, setViewByQid] = useState<Record<string, DistributionView>>({});

  const perQuestion = useMemo(() => {
    return questionIds.map((qid) => {
      const results: AdjustableQuestionResult[] = [];
      const rawAnswers: unknown[] = [];
      let maxPointsObserved = 0;

      items.forEach((gs) => {
        const res = gs.result_map?.[qid];
        if (res) {
          results.push(res);
          maxPointsObserved = Math.max(maxPointsObserved, res.max_points ?? 0);
        }
        const answerMap = gs.answer_map as Record<string, unknown> | undefined;
        if (answerMap && qid in answerMap) rawAnswers.push(answerMap[qid]);
      });

      const attempts = results.length;
      const missingRatePct = totalStudents > 0 ? (Math.max(0, totalStudents - attempts) / totalStudents) * 100 : 0;
      const awarded = results.map((r) => (r.adjusted_points ?? r.points) ?? 0);
      const stats = computeStats(awarded);

      const fullCreditCount = maxPointsObserved > 0
        ? results.filter((r) => ((r.adjusted_points ?? r.points) ?? 0) >= maxPointsObserved).length
        : 0;
      const difficultyPct = attempts > 0 ? (fullCreditCount / attempts) * 100 : 0;

      const adjustmentCount = results.filter(
        (r) => r.adjusted_points !== null && r.adjusted_points !== undefined
      ).length;

      // Score histogram
      const uniqueValues = Array.from(new Set(awarded)).sort((a, b) => a - b);
      const maxBins = 12;
      const binCount = Math.max(1, Math.min(maxBins, uniqueValues.length));
      const chunkSize = Math.max(1, Math.ceil(uniqueValues.length / binCount));
      const fmt = (v: number) => {
        if (!isFinite(v)) return '0';
        return Number(v.toFixed(Math.abs(v) >= 10 ? 1 : 2)).toString();
      };
      const histogramData = Array.from({ length: binCount }, (_, i) => {
        const s = uniqueValues[i * chunkSize] ?? 0;
        const e = uniqueValues[Math.min(uniqueValues.length, (i + 1) * chunkSize) - 1] ?? s;
        return {
          binLabel: s === e ? fmt(s) : `${fmt(s)}-${fmt(e)}`,
          count: awarded.filter((v) => v >= s && v <= e).length,
        };
      });

      // Answer frequency
      const answerFreqRows = buildAnswerFrequency(rawAnswers, MAX_ANSWER_ROWS);
      const uniqueAnswerCount = (() => {
        const m = new Map<string, number>();
        for (const v of rawAnswers) m.set(serializeAnswer(v), 1);
        return m.size;
      })();

      return {
        qid, attempts, missingRatePct, stats, maxPointsObserved,
        difficultyPct, adjustmentCount, histogramData,
        answerFreqRows, uniqueAnswerCount,
        answersTruncated: uniqueAnswerCount > MAX_ANSWER_ROWS,
      };
    });
  }, [items, questionIds, totalStudents]);

  return (
    <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
      {perQuestion.map((q) => {
        const view: DistributionView = viewByQid[q.qid] ?? 'scores';

        return (
          <Card key={q.qid} withBorder shadow="xs" p="sm" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* ── Header ── */}
            <Group justify="space-between" mb={6}>
              <Text ff="monospace" size="sm" fw={700}>{q.qid}</Text>
              <Group gap={4}>
                <Badge variant="filled" color="blue" size="xs">{q.maxPointsObserved} pts</Badge>
                <Badge variant="light" color="gray" size="xs">{q.attempts}/{totalStudents}</Badge>
              </Group>
            </Group>

            {/* ── Rates ── */}
              <SectionLabel style={{ marginTop: 8, marginBottom: 2 }}>Coverage &amp; Difficulty</SectionLabel>
            <ProgressRow label="Missing" pct={q.missingRatePct} color="orange" />
            <ProgressRow label="Full credit" pct={q.difficultyPct} color="green" />

            {/* ── Stats ── */}
              <SectionLabel style={{ marginTop: 8, marginBottom: 2 }}>Score Stats</SectionLabel>
            <StatRow
              label="Mean"
              right={
                <Text ff="monospace" size="xs" fw={600}>
                  {q.stats.mean.toFixed(2)}
                  <Text span fw={400}> ± {q.stats.stdev.toFixed(2)}</Text>
                  <Text span fw={400} ml={4}>
                    ({q.maxPointsObserved > 0 ? ((q.stats.mean / q.maxPointsObserved) * 100).toFixed(1) : '0.0'}%)
                  </Text>
                </Text>
              }
            />
            <StatRow label="Median" right={
              <Text ff="monospace" size="xs" fw={600}>
                {q.stats.q2.toFixed(2)}
              </Text>
            } />
            <StatRow label="Range" right={
              <Text ff="monospace" size="xs" fw={600}>
                {q.stats.min.toFixed(2)}–{q.stats.max.toFixed(2)}
              </Text>
            } />
            {q.adjustmentCount > 0 && (
              <StatRow label="Adjustments" right={
                <Badge variant="light" color="yellow" size="xs">{q.adjustmentCount}</Badge>
              } />
            )}

            {/* ── Distribution ── */}
            <Divider mt={8} mb={6} />
            <Group justify="space-between" align="center" mb={6}>
              <SectionLabel>
                Distribution
              </SectionLabel>
              <SegmentedControl
                size="xs"
                value={view}
                onChange={(v) => setViewByQid((prev) => ({ ...prev, [q.qid]: v as DistributionView }))}
                data={[
                  { label: 'Scores', value: 'scores' },
                  { label: 'Answers', value: 'answers' },
                ]}
                styles={{ root: { padding: 2 }, label: { paddingInline: 8, paddingBlock: 2 } }}
              />
            </Group>

            {view === 'scores' ? (
              q.maxPointsObserved <= 0 || q.histogramData.every((d) => d.count === 0) ? (
                <Text size="xs" c="dimmed">No data</Text>
              ) : (
                <BarChart
                  h={130}
                  data={q.histogramData}
                  dataKey="binLabel"
                  series={[{ name: 'count', color: 'blue.6', label: 'Count' }]}
                  tickLine="xy"
                  xAxisProps={{ tick: { fontSize: 9 } }}
                  yAxisProps={{ tick: { fontSize: 9 }, allowDecimals: false }}
                />
              )
            ) : (
              <AnswerDistributionTable
                rows={q.answerFreqRows}
                uniqueCount={q.uniqueAnswerCount}
                truncated={q.answersTruncated}
              />
            )}
          </Card>
        );
      })}
    </SimpleGrid>
  );
};

export default QuestionAnalysisGrid;