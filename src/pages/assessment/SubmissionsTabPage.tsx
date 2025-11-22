import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ErrorAlert from '../../components/common/ErrorAlert';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EncryptedDataGuard from '../../components/common/EncryptedDataGuard';
import SubmissionsHeader from '../../components/submissions/SubmissionsHeader';
import SubmissionsTable from '../../components/submissions/SubmissionsTable';
import SubmissionsLoadWizardModal from '../../components/submissions/SubmissionsLoadWizardModal';
import { api } from '../../api';
import { decryptString } from '../../utils/crypto';

import type { SubmissionsResponse, RawSubmission, SetSubmissionsByDataRequest } from '../../api/models';

const SubmissionsTabPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const qc = useQueryClient();

  if (!assessmentId) {
    return (
      <div className="alert alert-error">
        <span>Assessment ID is missing.</span>
      </div>
    );
  }

  const storageKey = `submissions_passphrase:${assessmentId}`;
  const [showLoadCsv, setShowLoadCsv] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // hydrate synchronously
  const [passphrase, setPassphrase] = useState<string | null>(() => localStorage.getItem(storageKey));
  const [encryptedDetected, setEncryptedDetected] = useState(false);
  const [displayedIdsMap, setDisplayedIdsMap] = useState<Map<string, string>>(new Map());

  const onPassphraseReady = useCallback((pp: string | null) => {
    setPassphrase(pp);
  }, []);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['submissions', assessmentId],
    queryFn: async () => {
      const res = await api.getSubmissionsAssessmentsAssessmentIdSubmissionsGet(assessmentId);
      return res.data as SubmissionsResponse;
    },
  });
  

const loadMutation = useMutation({
  mutationKey: ['submissions', assessmentId, 'load'],
  mutationFn: async (csv: string) => {
    const payload: SetSubmissionsByDataRequest = {
      data: csv,
      loader_name: 'CSV',
      loader_kwargs: {},
    };
    const res = await api.setSubmissionsByDataAssessmentsAssessmentIdSubmissionsLoadPut(
      assessmentId,
      payload
    );
    return res.data as SubmissionsResponse;
  },
  onSuccess: async () => {
    setShowLoadCsv(false);

    // 1) Refresh submissions list
    await qc.invalidateQueries({ queryKey: ['submissions', assessmentId] });

    // 2) Auto-infer questions from the newly uploaded submissions
    try {
      await api.inferQuestionSetAssessmentsAssessmentIdQuestionSetInferPost(assessmentId, {
        use_stored_submissions: true,
        commit: true,
      });
      // 3) Reparse submissions with the new question set (so example answers are based on parsed Submissions)
      await api.parseSubmissionsAssessmentsAssessmentIdQuestionSetParsePost(assessmentId, {
        use_stored_question_set: true,
        use_stored_submissions: true,
      });
      // 4) Invalidate questions and parsed submissions so UI updates
      await qc.invalidateQueries({ queryKey: ['questionSet', assessmentId] });
      await qc.invalidateQueries({ queryKey: ['parsedSubmissions', assessmentId] });
    } catch (e) {
      // Optional: surface a non-blocking warning; you can integrate ErrorAlert state if desired
      console.warn('Inference or parsing failed after upload:', e);
    }
  },
});

  const deleteMutation = useMutation({
    mutationKey: ['submissions', assessmentId, 'delete'],
    mutationFn: async () => {
      const res = await api.deleteSubmissionsAssessmentsAssessmentIdSubmissionsDelete(assessmentId);
      return res.data;
    },
    onSuccess: () => {
      setConfirmDelete(false);
      qc.invalidateQueries({ queryKey: ['submissions', assessmentId] });
    },
  });

  const items: RawSubmission[] = data?.raw_submissions ?? [];

  // Build displayed student IDs (decrypt once per dataset/passphrase change)
  useEffect(() => {
    let cancelled = false;
    const buildMap = async () => {
      const m = new Map<string, string>();
      const work: Promise<void>[] = [];
      for (const it of items) {
        const sid = it.student_id;
        // If passphrase provided, try decrypt; else mask encrypted entries in table
        if (passphrase) {
          work.push(
            decryptString(sid, passphrase)
              .then((plain) => {
                if (!cancelled) m.set(sid, plain);
              })
              .catch(() => {
                if (!cancelled) m.set(sid, '••••');
              })
          );
        } else {
          // No passphrase; leave plaintext as-is, mask encrypted (handled by table if needed),
          // but we still set a value to avoid undefined flickers
          m.set(sid, sid);
        }
      }
      await Promise.all(work);
      if (!cancelled) setDisplayedIdsMap(m);
    };
    buildMap();
    return () => {
      cancelled = true;
    };
  }, [items, passphrase]);

  return (
    <section className="space-y-6">
          <EncryptedDataGuard
            storageKey={storageKey}
            encryptedDetected={encryptedDetected}
            onPassphraseReady={onPassphraseReady}
          />

          <SubmissionsHeader
            onLoadCsv={() => setShowLoadCsv(true)}
            onDeleteAll={() => setConfirmDelete(true)}
            showDeleteAll={items.length > 0}
            // search={search}
            // setSearch={setSearch}
          />

          {isLoading && (
            <div className="alert alert-info">
              <span>Loading submissions...</span>
            </div>
          )}
          {isError && <ErrorAlert error={error} />}

          {!isLoading && !isError && (
            <SubmissionsTable
              items={items}
              displayedIdsMap={passphrase ? displayedIdsMap : new Map()}
              onEncryptionDetected={() => setEncryptedDetected(true)}
            />
          )}

      <SubmissionsLoadWizardModal
        open={showLoadCsv}
        onClose={() => setShowLoadCsv(false)}
        isSubmitting={loadMutation.isPending}
        error={loadMutation.isError ? loadMutation.error : null}
        onSubmitCsv={async (csv) => {
          await loadMutation.mutateAsync(csv);
        }}
        assessmentId={assessmentId}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete All Submissions"
        message="Are you sure you want to delete all submissions for this assessment?"
        confirmText={deleteMutation.isPending ? 'Deleting...' : 'Delete'}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmDelete(false)}
      />
      {deleteMutation.isError && <ErrorAlert error={deleteMutation.error} className="mt-2" />}
    </section>
  );
};

export default SubmissionsTabPage;