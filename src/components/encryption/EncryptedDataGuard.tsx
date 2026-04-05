import { Modal, PasswordInput, Checkbox, Text, Group, Button, Stack } from '@mantine/core';
import React, { useMemo, useState } from 'react';

import { normalizePresent, readPassphrase } from '@utils/passphrase';

type Props = {
  storageKey: string;                         // e.g., submissions_passphrase:<assessmentId>
  encryptedDetected: boolean;                 // whether page contains encrypted data
  onPassphraseReady: (passphrase: string | null, persist?: boolean) => void;
  currentPassphrase?: string | null;          // optional: parent-provided passphrase state
};

const EncryptedDataGuard: React.FC<Props> = ({
  storageKey,
  encryptedDetected,
  onPassphraseReady,
  currentPassphrase,
}) => {
  const [ignored, setIgnored] = useState(false);
  const [passphraseInput, setPassphraseInput] = useState('');
  const [store, setStore] = useState(false);

  const effectivePassphrase = useMemo(
    () => normalizePresent(currentPassphrase ?? readPassphrase(storageKey)),
    [currentPassphrase, storageKey]
  );

  const open = encryptedDetected && !ignored && !effectivePassphrase;

  const handleUse = () => {
    const effective = normalizePresent(passphraseInput);
    if (!effective) return;
    onPassphraseReady(effective, store);
    setIgnored(true);
  };

  const handleIgnore = () => {
    onPassphraseReady(null, false);
    setIgnored(true);
  };

  if (!open) return null;

  return (
    <Modal
      opened={open}
      onClose={handleIgnore}
      title="Encrypted Data Detected"
      size="md"
    >
      <Stack gap="md">
        <Text>
          This page contains encrypted data. Enter a passphrase to decrypt student IDs,
          or ignore to view masked IDs.
        </Text>
        <PasswordInput
          label="Passphrase"
          placeholder="Enter passphrase"
          value={passphraseInput}
          onChange={(e) => setPassphraseInput(e.currentTarget.value)}
        />
        <Stack gap={4}>
          <Checkbox
            label="Store passphrase locally"
            checked={store}
            onChange={(e) => setStore(e.currentTarget.checked)}
          />
          <Text size="xs" c="dimmed">
            Stored in your browser's local storage. Do not use on shared devices.
          </Text>
        </Stack>
      </Stack>
      <Group justify="flex-end" mt="md">
        <Button variant="subtle" onClick={handleIgnore}>Ignore</Button>
        <Button onClick={handleUse} disabled={!passphraseInput}>Use Passphrase</Button>
      </Group>
    </Modal>
  );
};

export default EncryptedDataGuard;
