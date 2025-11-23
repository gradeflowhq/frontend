import React, { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ErrorAlert from '../../components/common/ErrorAlert';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EncryptedDataGuard from '../../components/common/EncryptedDataGuard';
import SubmissionsHeader from '../../components/submissions/SubmissionsHeader';
import SubmissionsTable from '../../components/submissions/SubmissionsTable';
import SubmissionsLoadWizardModal from '../../components/submissions/SubmissionsLoadWizardModal';
import { api } from '../../api';
import { buildPassphraseKey } from '../../utils/passphrase';
import { usePassphrase } from '../../hooks/usePassphrase';

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

  const storageKey = buildPassphraseKey(assessmentId);
  const { passphrase, setPassphrase } = usePassphrase(storageKey);

  const [showLoadCsv, setShowLoadCsv] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [encryptedDetected, setEncryptedDetected] = useState(false);

  const onPassphraseReady = useCallback((pp: string | null) => {
    setPassphrase(pp);
  }, [setPassphrase]);

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
      const res = await api.setSubmissionsByDataAssessmentsAssessmentIdSubmissionsLoadPut(assessmentId, payload);
      return res.data as SubmissionsResponse;
    },
    onSuccess: async () => {
      setShowLoadCsv(false);
      await qc.invalidateQueries({ queryKey: ['submissions', assessmentId] });
      try {
        await api.inferQuestionSetAssessmentsAssessmentIdQuestionSetInferPost(assessmentId, {
          use_stored_submissions: true,
          commit: true,
        });
        await api.parseSubmissionsAssessmentsAssessmentIdQuestionSetParsePost(assessmentId, {
          use_stored_question_set: true,
          use_stored_submissions: true,
        });
        await qc.invalidateQueries({ queryKey: ['questionSet', assessmentId] });
        await qc.invalidateQueries({ queryKey: ['parsedSubmissions', assessmentId] });
      } catch (e) {
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

  return (
    <section className="space-y-6">
      <EncryptedDataGuard
        storageKey={storageKey}
        encryptedDetected={encryptedDetected}
        onPassphraseReady={onPassphraseReady}
        currentPassphrase={passphrase}
      />

      <SubmissionsHeader
        onLoadCsv={() => setShowLoadCsv(true)}
        onDeleteAll={() => setConfirmDelete(true)}
        showDeleteAll={items.length > 0}
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
          passphrase={passphrase}
          onEncryptionDetected={() => setEncryptedDetected((prev) => prev || true)}
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