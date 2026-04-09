import { Button, Group, Modal, Text } from '@mantine/core';
import React from 'react';

interface UnsavedChangesModalProps {
  opened: boolean;
  message: string;
  discardLabel?: string;
  onStay: () => void;
  onDiscard: () => void;
}

const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  opened,
  message,
  discardLabel = 'Discard & Continue',
  onStay,
  onDiscard,
}) => (
  <Modal opened={opened} onClose={onStay} title="Unsaved changes" size="sm">
    <Text mb="md">{message}</Text>
    <Group justify="flex-end" gap="sm">
      <Button variant="subtle" onClick={onStay}>Stay</Button>
      <Button color="red" onClick={onDiscard}>{discardLabel}</Button>
    </Group>
  </Modal>
);

export { UnsavedChangesModal };
