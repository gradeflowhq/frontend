import { Badge, Group, Progress, Select, RangeSlider, Stack, Text, Tooltip, useComputedColorScheme } from '@mantine/core';
import { IconAdjustments } from '@tabler/icons-react';
import { DataTable } from 'mantine-datatable';
import React, { useMemo, useState } from 'react';

import DecryptedText from '@features/encryption/components/DecryptedText';
import { useAssessmentPassphrase } from '@features/encryption/PassphraseContext';
import { useDecryptedIds } from '@features/encryption/useDecryptedIds';
import { usePagination } from '@hooks/usePagination';

import type { AdjustableSubmission } from '../types';
import type { DataTableSortStatus } from 'mantine-datatable';

type Props = {
  items: AdjustableSubmission[];
  questionIds: string[];
  onView: (studentId: string) => void;
  initialPageSize?: number;
  searchQuery?: string;
};

type RowT = AdjustableSubmission & {
  _totalPoints: number;
  _totalMax: number;
  _pct: number;
  _hasAdjustment: boolean;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const rowColour = (pct: number, isDark: boolean): string => {
  if (pct < 40)  return isDark ? 'var(--mantine-color-red-light)' : 'var(--mantine-color-red-0)';
  if (pct < 60)  return isDark ? 'var(--mantine-color-orange-light)' : 'var(--mantine-color-orange-0)';
  if (pct >= 80) return isDark ? 'var(--mantine-color-green-light)' : 'var(--mantine-color-green-0)';
  return 'var(--mantine-color-body)';
};

const pctBarColour = (pct: number): string => {
  if (pct < 40)  return 'red';
  if (pct < 60)  return 'orange';
  if (pct >= 80) return 'green';
  return 'blue';
};

const adjustmentHighlightBackground = 'var(--mantine-color-yellow-light)';
const adjustmentHighlightColor = 'var(--mantine-color-yellow-light-color)';

const MiniBar: React.FC<{ value: number; max: number }> = ({ value, max }) => {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return <Progress value={pct} size={3} mt={3} color={pctBarColour(pct)} style={{ minWidth: 40 }} />;
};

const PAGE_SIZE_OPTIONS = ['10', '20', '50', '100'];

// ── Component ────────────────────────────────────────────────────────────────

const ResultsOverviewTable: React.FC<Props> = ({
  items,
  questionIds,
  onView,
  initialPageSize = 10,
  searchQuery = '',
}) => {
  const { passphrase, notifyEncryptedDetected } = useAssessmentPassphrase();
  const colorScheme = useComputedColorScheme('light');
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<RowT>>({
    columnAccessor: '_totalPoints',
    direction: 'desc',
  });
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100]);

  const studentIds = useMemo(() => items.map((it) => it.student_id ?? ''), [items]);
  const { decryptedIds, isDecrypting } = useDecryptedIds(studentIds, passphrase, notifyEncryptedDetected);

  // ── Enrich ──
  const enriched = useMemo<RowT[]>(() => {
    return items.map((it) => {
      const resultValues  = Object.values(it.result_map ?? {});
      const totalPoints   = resultValues.reduce((s, r) => s + ((r.adjusted_points ?? r.points) ?? 0), 0);
      const totalMax      = resultValues.reduce((s, r) => s + (r.max_points ?? 0), 0);
      const pct           = totalMax > 0 ? (totalPoints / totalMax) * 100 : 0;
      const hasAdjustment = resultValues.some(
        (r) => r.adjusted_points !== null && r.adjusted_points !== undefined,
      );
      return { ...it, _totalPoints: totalPoints, _totalMax: totalMax, _pct: pct, _hasAdjustment: hasAdjustment };
    });
  }, [items]);

  // ── Per-question means ──
  const qMean = useMemo(() => {
    const out: Record<string, { mean: number; max: number }> = {};
    for (const qid of questionIds) {
      const vals = enriched
        .map((r) => {
          const res = r.result_map?.[qid];
          return res ? ((res.adjusted_points ?? res.points) ?? 0) : null;
        })
        .filter((v): v is number => v !== null);
      const max = Math.max(0, ...enriched.map((r) => r.result_map?.[qid]?.max_points ?? 0));
      out[qid] = {
        mean: vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0,
        max,
      };
    }
    return out;
  }, [enriched, questionIds]);

  // ── Total mean / max ──
  const totalMean = useMemo(() => {
    if (enriched.length === 0) return { mean: 0, max: 0 };
    const mean = enriched.reduce((s, r) => s + r._totalPoints, 0) / enriched.length;
    const max  = enriched[0]._totalMax;
    return { mean, max };
  }, [enriched]);

  // ── Filter ──
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enriched.filter((it) => {
      if (q) {
        const plain = decryptedIds[it.student_id ?? ''] ?? it.student_id ?? '';
        if (!plain.toLowerCase().includes(q)) return false;
      }
      // Clamp to [0, 100] so students with adjusted scores above 100% are still
      // included when the "max" filter is at its default of 100.
      const clampedPct = Math.max(0, Math.min(100, it._pct));
      if (clampedPct < scoreRange[0] || clampedPct > scoreRange[1]) return false;
      return true;
    });
  }, [enriched, decryptedIds, searchQuery, scoreRange]);

  // ── Sort ──
  const sortedRows = useMemo(() => {
    const key = sortStatus.columnAccessor as string;
    const dir = sortStatus.direction === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (key.startsWith('q:')) {
        const qid = key.slice(2);
        const av = a.result_map?.[qid];
        const bv = b.result_map?.[qid];
        const ap = av ? ((av.adjusted_points ?? av.points) ?? 0) : -Infinity;
        const bp = bv ? ((bv.adjusted_points ?? bv.points) ?? 0) : -Infinity;
        return (ap - bp) * dir;
      }
      const av = a[key as keyof RowT];
      const bv = b[key as keyof RowT];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
    });
  }, [filtered, sortStatus]);

  const { page, setPage, pageSize, setPageSize, paginate } = usePagination(
    [searchQuery, scoreRange, sortStatus],
    initialPageSize,
  );

  // ── Columns ──
  const columns = useMemo(() => {
    return [
      // Student ID
      {
        accessor: 'student_id' as keyof RowT,
        title: 'Student ID',
        sortable: true,
        render: (row: RowT) => (
          <Group gap={4} wrap="nowrap">
            <Text
              ff="monospace"
              size="sm"
              fw={600}
              style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
              onClick={() => onView(row.student_id)}
            >
              <DecryptedText
                value={row.student_id}
                passphrase={passphrase}
                mono
                size="sm"
                showSkeletonWhileDecrypting={isDecrypting}
                showLockIcon
              />
            </Text>
            {row._hasAdjustment && (
              <Tooltip label="Has manual adjustments" withArrow position="right">
                <IconAdjustments size={13} color={adjustmentHighlightColor} style={{ flexShrink: 0 }} />
              </Tooltip>
            )}
          </Group>
        ),
      },

      // Per-question columns
      ...questionIds.map((qid) => {
        const { mean, max: qMax } = qMean[qid] ?? { mean: 0, max: 0 };

        return {
          accessor: `q:${qid}` as keyof RowT,
          sortable: true,          
          title: (
            <Stack gap={0}>
              <Text size="xs" fw={700}>{qid}</Text>
              <Text size="xs" c="dimmed">{mean.toFixed(1)}/{qMax}</Text>
            </Stack>
          ),
          render: (row: RowT) => {
            const r = row.result_map?.[qid];
            if (!r) return <Text size="xs">—</Text>;

            const adjusted = r.adjusted_points !== null && r.adjusted_points !== undefined;
            const points   = adjusted ? (r.adjusted_points as number) : r.points;
            const maxPts   = r.max_points ?? 0;

            if (!r.graded) {
              return <Badge color="yellow" size="xs" variant="light">Ungraded</Badge>;
            }

            return (
              <div style={adjusted ? {
                background: adjustmentHighlightBackground,
                margin: '-4px', padding: '4px', borderRadius: 4,
              } : undefined}>
                <Text ff="monospace" size="xs" fw={600}>
                  {points.toFixed(1)}
                  <Text span fw={400}>/{maxPts}</Text>
                </Text>
                <MiniBar value={points} max={maxPts} />
                {adjusted && (
                  <Text ff="monospace" size="xs" mt={1}>
                    was {r.points.toFixed(1)}
                  </Text>
                )}
              </div>
            );
          },
        };
      }),

      // Total
      {
        accessor: '_totalPoints' as keyof RowT,
        title: (
          <Stack gap={0}>
            <Text size="xs" fw={700}>Total</Text>
            <Text size="xs" c="dimmed">{totalMean.mean.toFixed(1)}/{totalMean.max}</Text>
          </Stack>
        ),
        sortable: true,
        render: (row: RowT) => (
          <Stack gap={3} style={{ minWidth: 100 }}>
            <Group gap={6} align="baseline">
              <Text ff="monospace" size="sm" fw={700}>
                {row._totalPoints.toFixed(1)}
              </Text>
              <Text ff="monospace" size="xs">
                / {row._totalMax}
              </Text>
            </Group>
            <Group gap={6} align="center" wrap="nowrap">
              <Progress
                value={row._pct}
                size="sm"
                color={pctBarColour(row._pct)}
                style={{ flex: 1 }}
              />
              <Text ff="monospace" size="xs" fw={600}>
                {row._pct.toFixed(1)}%
              </Text>
            </Group>
          </Stack>
        ),
      },
    ];
  }, [passphrase, questionIds, onView, isDecrypting, qMean, totalMean]);

  const records = paginate(sortedRows);
  const isFiltered = scoreRange[0] > 0 || scoreRange[1] < 100;

  return (
    <Stack gap="md">
      {/* ── Filter + per-page toolbar ── */}
      <div style={{
        border: '1px solid var(--mantine-color-default-border)',
        borderRadius: 'var(--mantine-radius-sm)',
        padding: 'var(--mantine-spacing-sm)',
      }}>
        <Group justify="space-between" align="center">
          <Group gap="md" align="center" style={{ flex: 1 }}>
            <Text size="xs" fw={600} style={{ whiteSpace: 'nowrap' }}>Score filter</Text>
            {isFiltered && (
              <Text
                size="xs"
                c="blue"
                style={{ cursor: 'pointer', textDecoration: 'underline', whiteSpace: 'nowrap' }}
                onClick={() => setScoreRange([0, 100])}
              >
                Reset
              </Text>
            )}
            <Group gap="xs" align="center" style={{ flex: 1, minWidth: 160 }}>
              <Text size="xs" c="dimmed" ff="monospace">{scoreRange[0]}%</Text>
              <RangeSlider
                min={0}
                max={100}
                step={5}
                value={scoreRange}
                onChange={setScoreRange}
                onChangeEnd={() => setPage(1)}
                label={(v) => `${v}%`}
                style={{ flex: 1 }}
                minRange={0}
              />
              <Text size="xs" c="dimmed" ff="monospace">{scoreRange[1]}%</Text>
            </Group>
          </Group>
          <Group gap="xs" align="center" ml="md">
            <Text size="xs" fw={600}>Per page</Text>
            <Select
              size="xs"
              w={88}
              aria-label="Items per page"
              data={PAGE_SIZE_OPTIONS}
              value={String(pageSize)}
              onChange={(v) => { setPageSize(Number(v ?? '10')); setPage(1); }}
            />
          </Group>
        </Group>
      </div>

      {/* ── Table ── */}
      <DataTable
        columns={columns}
        records={records}
        totalRecords={filtered.length}
        recordsPerPage={pageSize}
        page={page}
        onPageChange={setPage}
        sortStatus={sortStatus}
        onSortStatusChange={(s) => setSortStatus(s as DataTableSortStatus<RowT>)}
        rowStyle={(row) => ({ background: rowColour(row._pct, colorScheme === 'dark') })}
        highlightOnHover
        pinFirstColumn
        pinLastColumn
      />
    </Stack>
  );
};

export default ResultsOverviewTable;