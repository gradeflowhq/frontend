import React, { useMemo } from 'react';

import ErrorAlert from '@components/common/ErrorAlert';
import { useAssessmentPassphrase } from '@features/encryption/PassphraseContext';
import { useDecryptedIds } from '@features/encryption/useDecryptedIds';
import { SubmissionsTable } from '@features/submissions/components';

import type { RawSubmission } from '@api/models';

export const ListStep: React.FC<{
  items: RawSubmission[];
  isError: boolean;
  error: unknown;
  searchQuery: string;
}> = ({ items, isError, error, searchQuery }) => {
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

  if (isError) return <ErrorAlert error={error} />;

  return (
    <SubmissionsTable
      items={filteredItems}
      isDecryptingIds={isDecrypting}
    />
  );
};
