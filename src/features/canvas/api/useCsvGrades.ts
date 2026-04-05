import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { api } from '@api';
import { parseCsvGrades } from '@features/canvas/helpers';
import { useDecryptedIds } from '@features/encryption/useDecryptedIds';
import { tryDecodeExportCsv } from '@features/submissions/helpers';
import { isEncrypted } from '@utils/crypto';

import type { GradingDownloadRequest, GradingDownloadResponse } from '@api/models';

export const useCsvGrades = (assessmentId: string, roundingBase: number, passphrase: string, notifyEncrypted: () => void) => {
  const csvQuery = useQuery({
    queryKey: ['grading', 'csv', assessmentId, roundingBase],
    enabled: Boolean(assessmentId),
    queryFn: async () => {
      const payload: GradingDownloadRequest = {
        serializer: {
          format: 'csv',
          student_id_column: 'student_id',
          include_answers: false,
          include_per_question_results: false,
          include_feedback: false,
          include_total: true,
          include_remarks: true,
          include_rounded_total: true,
          rounding_base: roundingBase,
        },
      };
      const res = await api.downloadGradingAssessmentsAssessmentIdGradingDownloadPost(assessmentId, payload);
      const download = res.data as GradingDownloadResponse;
      const raw = (download?.data ?? '') as unknown;
      
      if (raw instanceof Blob) return raw.text();
      if (raw instanceof Uint8Array) return new TextDecoder().decode(raw);
      return typeof raw === 'string' ? raw : String(raw ?? '');
    },
    staleTime: 60 * 1000,
  });

  const [decodedCsv, setDecodedCsv] = useState('');

  useEffect(() => {
    let cancelled = false;
    const decode = async () => {
      const raw = await csvQuery.data;
      if (!raw) {
        if (!cancelled) setDecodedCsv('');
        return;
      }
      const decoded = await tryDecodeExportCsv(raw, { passphrase });
      if (!cancelled) setDecodedCsv(decoded);
    };
    void decode();
    return () => { cancelled = true; };
  }, [csvQuery.data, passphrase]);

  const rows = useMemo(() => parseCsvGrades(decodedCsv), [decodedCsv]);
  const studentIds = useMemo(() => rows.map(row => row.studentId ?? ''), [rows]);
  
  useEffect(() => {
    if (rows.some(row => isEncrypted(row.studentId))) {
      notifyEncrypted();
    }
  }, [rows, notifyEncrypted]);

  const { decryptedIds, isDecrypting } = useDecryptedIds(studentIds, passphrase, notifyEncrypted);

  return {
    rows,
    decryptedIds,
    isLoading: csvQuery.isLoading || isDecrypting,
    isError: csvQuery.isError,
    error: csvQuery.error,
  };
};
