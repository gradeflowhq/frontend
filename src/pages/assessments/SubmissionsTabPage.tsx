import React, { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import ErrorAlert from '@components/common/ErrorAlert';
import ConfirmDialog from '@components/common/ConfirmDialog';
import EncryptedDataGuard from '@components/common/encryptions/EncryptedDataGuard';
import { buildPassphraseKey } from '@utils/passphrase';
import { usePassphrase } from '@hooks/usePassphrase';

import {
  useSubmissions,
  useDeleteSubmissions,
} from '@features/submissions';
import {
  SubmissionsHeader,
  SubmissionsTable,
  SubmissionsLoadWizardModal,
} from '@features/submissions/components';

import type { RawSubmission } from '@api/models';

const SubmissionsTabPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  if (!assessmentId) {
    return <div className="alert alert-error"><span>Assessment ID is missing.</span></div>;
  }

  const storageKey = buildPassphraseKey(assessmentId);
  const { passphrase, setPassphrase } = usePassphrase(storageKey);

  const [showLoadCsv, setShowLoadCsv] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [encryptedDetected, setEncryptedDetected] = useState(false);

  const onPassphraseReady = useCallback((pp: string | null) => setPassphrase(pp), [setPassphrase]);

  const { data, isLoading, isError, error } = useSubmissions(assessmentId);
  const deleteMutation = useDeleteSubmissions(assessmentId);

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

      {isLoading && <div className="alert alert-info"><span>Loading submissions...</span></div>}
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
        assessmentId={assessmentId}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete All Submissions"
        message="Are you sure you want to delete all submissions for this assessment?"
        confirmText={deleteMutation.isPending ? 'Deleting...' : 'Delete'}
        onConfirm={() => deleteMutation.mutate(undefined, { onSuccess: () => setConfirmDelete(false) })}
        onCancel={() => setConfirmDelete(false)}
      />
      {deleteMutation.isError && <ErrorAlert error={deleteMutation.error} className="mt-2" />}
    </section>
  );
};

export default SubmissionsTabPage;