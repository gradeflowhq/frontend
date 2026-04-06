import { Alert, Button, Group, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import React from 'react';

export interface SectionStatusBadgeProps {
  isStale?: boolean | null;
  /**
   * Custom message shown in the stale alert. Defaults to a generic message.
   */
  staleMessage?: string;
  /**
   * Called when the user clicks "Mark as current". Should trigger a no-op save
   * to the backend so the section's updated_at is refreshed.
   */
  onDismiss?: () => void;
  /** True while the dismiss action is in flight. */
  isDismissing?: boolean;
  /** Optional className forwarded to the outer element. */
  className?: string;
}

const SectionStatusBadge: React.FC<SectionStatusBadgeProps> = ({
  isStale,
  staleMessage = 'This data may be out of date — a dependency has changed since the last update.',
  onDismiss,
  isDismissing = false,
  className,
}) => {
  if (!isStale) return null;

  return (
    <Alert
      icon={<IconAlertTriangle size={24} />}
      color="yellow"
      className={className}
    >
      <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
        <Text size="sm" style={{ flex: 1 }}>
          {staleMessage}
        </Text>
        {onDismiss && (
          <Button
            size="xs"
            color="red"
            loading={isDismissing}
            onClick={onDismiss}
          >
            Mark as current
          </Button>
        )}
      </Group>
    </Alert>
  );
};

export default SectionStatusBadge;