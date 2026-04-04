import { Alert, Button, Group, Modal, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconSearch } from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';

import { useAssessmentPassphrase } from '@features/encryption/passphraseContext';
import { useDecryptedIds } from '@features/encryption/useDecryptedIds';
import { useDeleteSubmissions } from '@features/submissions';
import { SubmissionsTable } from '@features/submissions/components';
import { getErrorMessages } from '@utils/error';

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
      <Group justify="space-between" wrap="wrap" mb="sm">
        <TextInput
          leftSection={<IconSearch size={16} />}
          placeholder="Search by Student ID"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          w={{ base: '100%', sm: 280 }}
        />
        {hasSubmissions && (
          <Button
            type="button"
            color="red"
            size="sm"
            variant="outline"
            onClick={() => setConfirmDelete(true)}
          >
            Delete all
          </Button>
        )}
      </Group>

      {isError && <Alert color="red" mb="sm">{getErrorMessages(error).join(' ')}</Alert>}
      {!isError && (
        <SubmissionsTable
          items={filteredItems}
          isLoading={isLoading}
          isDecryptingIds={isDecrypting}
        />
      )}

      <Modal
        opened={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete All Submissions"
      >
        <Text mb="md">Are you sure you want to delete all submissions for this assessment?</Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button
            color="red"
            loading={deleteMutation.isPending}
            onClick={() => {
              deleteMutation.mutate(undefined, {
                onSuccess: () => {
                  setConfirmDelete(false);
                  notifications.show({ color: 'green', message: 'Submissions deleted' });
                  onDeleted();
                },
                onError: () => notifications.show({ color: 'red', message: 'Delete failed' }),
              });
            }}
          >
            Delete
          </Button>
        </Group>
        {deleteMutation.isError && (
          <Alert color="red" mt="sm">{getErrorMessages(deleteMutation.error).join(' ')}</Alert>
        )}
      </Modal>
    </>
  );
};
