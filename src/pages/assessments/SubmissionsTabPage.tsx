import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import ErrorAlert from '@components/common/ErrorAlert';
import ConfirmDialog from '@components/common/ConfirmDialog';
import { useAssessmentPassphrase } from '@features/encryption/AssessmentPassphraseProvider';
import { useDecryptedIds } from '@features/encryption/useDecryptedIds';
import { useSubmissions, useDeleteSubmissions } from '@features/submissions';
import {
  SubmissionsHeader,
  SubmissionsTable,
  SubmissionsLoadWizardModal,
} from '@features/submissions/components';
import { useToast } from '@components/common/ToastProvider';

import type { RawSubmission } from '@api/models';

const SubmissionsTabPage: React.FC = () => {
  const { assessmentId = '' } = useParams<{ assessmentId: string }>();
  const [showLoadWizard, setShowLoadWizard] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, isError, error } = useSubmissions(assessmentId);
  const deleteMutation = useDeleteSubmissions(assessmentId);
  const toast = useToast();
  const { passphrase, notifyEncryptedDetected } = useAssessmentPassphrase();

  const items: RawSubmission[] = useMemo(() => data?.raw_submissions ?? [], [data]);

  const studentIds = useMemo(() => items.map((item) => item.student_id ?? ''), [items]);
  const decryptedIds = useDecryptedIds(studentIds, passphrase, notifyEncryptedDetected);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;

    return items.filter((item) => {
      const original = item.student_id ?? '';
      const plain = decryptedIds[original] ?? original;
      return plain.toLowerCase().includes(q);
    });
  }, [items, decryptedIds, searchQuery]);

  return (
    <section className="space-y-6">
      <SubmissionsHeader
        onLoadCsv={() => setShowLoadWizard(true)}
        onDeleteAll={() => setConfirmDelete(true)}
        showDeleteAll={items.length > 0}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {isLoading && <div className="alert alert-info"><span>Loading submissions...</span></div>}
      {isError && <ErrorAlert error={error} />}

      {!isLoading && !isError && (
        <SubmissionsTable items={filteredItems} />
      )}

      {/* Load Wizard (CSV -> Blob + adapter import) */}
      <SubmissionsLoadWizardModal
        open={showLoadWizard}
        onClose={() => setShowLoadWizard(false)}
        assessmentId={assessmentId}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete All Submissions"
        message="Are you sure you want to delete all submissions for this assessment?"
        confirmLoading={deleteMutation.isPending}
        confirmLoadingLabel="Deleting..."
        confirmText="Delete"
        onConfirm={() => {
          deleteMutation.mutate(undefined, {
            onSuccess: () => {
              setConfirmDelete(false);
              toast.success('Submissions deleted');
            },
            onError: () => toast.error('Delete failed'),
          });
        }}
        onCancel={() => setConfirmDelete(false)}
      />
      {deleteMutation.isError && <ErrorAlert error={deleteMutation.error} className="mt-2" />}
    </section>
  );
};

export default SubmissionsTabPage;