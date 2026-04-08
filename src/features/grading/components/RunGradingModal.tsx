import { Alert, Button, Checkbox, Group, Modal, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import React, { useState } from 'react';

export interface GradingWarning {
  key: string;
  message: React.ReactNode;
}

interface Props {
  opened: boolean;
  onClose: () => void;
  onConfirm: (removeAdjustments: boolean) => void;
  warnings: GradingWarning[];
  isLoading?: boolean;
  hasExistingAdjustments?: boolean;
}

const RunGradingModal: React.FC<Props> = ({
  opened,
  onClose,
  onConfirm,
  warnings,
  isLoading,
  hasExistingAdjustments,
}) => {
  const [removeAdjustments, setRemoveAdjustments] = useState(false);

  // Reset checkbox whenever modal opens
  React.useEffect(() => {
    if (opened) setRemoveAdjustments(false);
  }, [opened]);

  const hasWarnings = warnings.length > 0;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Run Grading"
      size="md"
      radius="md"
    >
      <Stack gap="md">
        {hasWarnings && (
          <Stack gap="xs">
            {warnings.map((w) => (
              <Alert
                key={w.key}
                icon={<IconAlertTriangle size={16} />}
                color="yellow"
                variant="light"
              >
                {w.message}
              </Alert>
            ))}
          </Stack>
        )}

        {!hasWarnings && (
          <Text size="sm">
            This will grade all submissions using the current rubric.
          </Text>
        )}

        {hasExistingAdjustments && (
          <Checkbox
            label="Remove all manual adjustments before re-grading"
            description="Clears any per-student point or feedback overrides."
            checked={removeAdjustments}
            onChange={(e) => setRemoveAdjustments(e.currentTarget.checked)}
          />
        )}

        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            color={hasWarnings ? 'orange' : 'blue'}
            loading={isLoading}
            onClick={() => onConfirm(removeAdjustments)}
          >
            {hasWarnings ? 'Proceed Anyway' : 'Run Grading'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default RunGradingModal;