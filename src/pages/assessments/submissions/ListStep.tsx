import React, { useMemo, useState } from 'react';
import ErrorAlert from '@components/common/ErrorAlert';
import ConfirmDialog from '@components/common/ConfirmDialog';
import { Button } from '@components/ui/Button';
import { IconSearch } from '@components/ui/Icon';
import { useAssessmentPassphrase } from '@features/encryption/passphraseContext';
import { useDecryptedIds } from '@features/encryption/useDecryptedIds';
import { useDeleteSubmissions } from '@features/submissions';
import { SubmissionsTable } from '@features/submissions/components';
import { useToast } from '@components/common/ToastProvider';

import type { RawSubmission } from '@api/models';

export const ListStep: React.FC<{
  assessmentId: string;
  items: RawSubmission[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  hasSubmissions: boolean;
  onDeleted: () => void;
}> = ({ assessmentId, items, isLoading, isError, error, hasSubmissions, onDeleted }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toast = useToast();
  const { passphrase, notifyEncryptedDetected } = useAssessmentPassphrase();
  const deleteMutation = useDeleteSubmissions(assessmentId);

  const studentIds = useMemo(() => items.map((item) => item.student_id ?? ''), [items]);
  const { decryptedIds, isDecrypting } = useDecryptedIds(studentIds, passphrase, notifyEncryptedDetected);

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
    <>
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <label className="input input-bordered flex items-center gap-2 sm:w-72">
          <IconSearch className="h-4 w-4 shrink-0 opacity-50" />
          <input
            type="search"
            className="grow bg-transparent focus:outline-none"
            placeholder="Search by Student ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </label>
        {hasSubmissions && (
          <Button
            type="button" variant="error" size="sm"
            onClick={() => setConfirmDelete(true)}
          >
            Delete all
          </Button>
        )}
      </div>

      {isError && <ErrorAlert error={error} />}
      {!isError && (
        <SubmissionsTable
          items={filteredItems}
          isLoading={isLoading}
          isDecryptingIds={isDecrypting}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
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
              onDeleted();
            },
            onError: () => toast.error('Delete failed'),
          });
        }}
        onCancel={() => setConfirmDelete(false)}
      />
      {deleteMutation.isError && <ErrorAlert error={deleteMutation.error} className="mt-2" />}
    </>
  );
};
