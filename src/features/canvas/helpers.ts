import Papa from 'papaparse';

import type { CanvasUserSummary } from '@api/canvasClient';

export type CsvGradeRow = {
  studentId: string;
  totalPoints?: number;
  totalMaxPoints?: number;
  roundedTotalPoints?: number;
  roundedTotalMaxPoints?: number;
  totalPercent?: number;
  roundedTotalPercent?: number;
  remarks?: string;
};

export type IdMap = Record<string, string>;

const parseNumber = (value?: string | number | null): number | undefined => {
  if (value === undefined || value === null) return undefined;
  const parsed = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const pickValue = (rounded?: number, raw?: number, useRounded = false): number | undefined => {
  if (useRounded) return rounded ?? raw;
  return raw ?? rounded;
};

export const parseCsvGrades = (csvText: string): CsvGradeRow[] => {
  if (!csvText) return [];
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });
  const rows = (parsed.data ?? []) as Record<string, string>[];
  return rows
    .map((row) => {
      const studentId = String(row.student_id ?? row.studentId ?? '').trim();
      return {
        studentId,
        totalPoints: parseNumber(row.total_points),
        totalMaxPoints: parseNumber(row.total_max_points),
        roundedTotalPoints: parseNumber(row.rounded_total_points),
        roundedTotalMaxPoints: parseNumber(row.rounded_total_max_points),
        totalPercent: parseNumber(row.total_percent),
        roundedTotalPercent: parseNumber(row.rounded_total_percent),
        remarks: typeof row.remarks === 'string' ? row.remarks : undefined,
      } as CsvGradeRow;
    })
    .filter((r) => r.studentId);
};

const normalizeId = (value?: string | number | null) => value?.toString().trim().toLowerCase() ?? '';

export const buildUserIdMap = (users: CanvasUserSummary[]): IdMap => {
  const map: IdMap = {};
  users.forEach((u) => {
    const canvasId = u.id.toString();
    const candidates = [canvasId, u.login_id, u.sis_user_id, u.integration_id];
    candidates.forEach((candidate) => {
      const norm = normalizeId(candidate);
      if (norm) map[norm] = canvasId;
    });
  });
  return map;
};

export const mapCanvasId = (
  rawId: string,
  decryptedIds: Record<string, string>,
  idMap: IdMap
): string | undefined => {
  const decrypted = decryptedIds[rawId] ?? rawId;
  const normalized = normalizeId(decrypted);
  return idMap[normalized];
};

export const truncateText = (value: string, limit = 160) => {
  if (!value) return value;
  return value.length > limit ? `${value.slice(0, limit)}...` : value;
};

export const formatNumericValue = (value?: number | string | null) => {
  if (value === undefined || value === null) return value as number | undefined;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? Number(num.toFixed(3)) : value;
};
