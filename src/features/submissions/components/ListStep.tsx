import { Alert } from '@mantine/core';
import React, { useMemo } from 'react';

import { useAssessmentPassphrase } from '@features/encryption/PassphraseContext';
import { useDecryptedIds } from '@features/encryption/useDecryptedIds';
import { SubmissionsTable } from '@features/submissions/components';
import { getErrorMessage } from '@utils/error';

import type { RawSubmission } from '@api/models';

export const ListStep: React.FC<{
  items: RawSubmission[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  searchQuery: string;
}> = ({ items, isLoading, isError, error, searchQuery }) => {
  const { passphrase, notifyEncryptedDetected } = useAssessmentPassphrase();

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

  if (isError) return <Alert color="red">{getErrorMessage(error)}</Alert>;

  return (
    <SubmissionsTable
      items={filteredItems}
      isLoading={isLoading}
      isDecryptingIds={isDecrypting}
    />
  );
};
