import { useCallback, useMemo } from 'react';

import { buildUserIdMap, mapCanvasId, pickValue } from '@features/canvas/helpers';

import type { CanvasUserSummary } from '@api/canvasClient';
import type { CsvGradeRow } from '@features/canvas/helpers';
import type { PreparedRow } from '@features/canvas/types';

export const usePreparedRows = (
  csvRows: CsvGradeRow[],
  decryptedIds: Record<string, string>,
  roster: CanvasUserSummary[],
  enableRounding: boolean,
  includeComments: boolean
) => {
  const userIdMap = useMemo(() => buildUserIdMap(roster), [roster]);

  const mapToCanvasId = useCallback(
    (rawId: string) => mapCanvasId(rawId, decryptedIds, userIdMap),
    [decryptedIds, userIdMap]
  );

  const preparedRows = useMemo<PreparedRow[]>(() => {
    return csvRows.map(row => {
      const csvStudentId = row.studentId ?? '';
      const decryptedStudentId = decryptedIds[csvStudentId] ?? csvStudentId;
      const canvasId = mapToCanvasId(csvStudentId);
      const rosterUser = roster.find(u => u.id?.toString() === canvasId);

      const selectedPoints = pickValue(row.roundedTotalPoints, row.totalPoints, enableRounding);
      const selectedPercent = pickValue(row.roundedTotalPercent, row.totalPercent, enableRounding);

      return {
        csvStudentId,
        decryptedStudentId,
        canvasId,
        studentName: rosterUser?.name ?? rosterUser?.short_name ?? rosterUser?.sortable_name,
        selectedPercent,
        selectedPoints,
        maxPoints: pickValue(row.roundedTotalMaxPoints, row.totalMaxPoints, enableRounding),
        originalPoints: row.totalPoints,
        roundedPoints: row.roundedTotalPoints,
        originalPercent: row.totalPercent,
        roundedPercent: row.roundedTotalPercent,
        comments: includeComments ? row.remarks : undefined,
      };
    });
  }, [csvRows, decryptedIds, mapToCanvasId, roster, enableRounding, includeComments]);

  const mappedRows = useMemo(() => preparedRows.filter(r => r.canvasId), [preparedRows]);
  const unmappedRows = useMemo(() => preparedRows.filter(r => !r.canvasId), [preparedRows]);

  return { preparedRows, mappedRows, unmappedRows };
};
