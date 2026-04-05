import { Alert, Button, Group, Text, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconClock } from '@tabler/icons-react';
import React from 'react';

import { formatAbsolute, formatSmartLabel } from '@utils/datetime';

export interface SectionStatusBadgeProps {
  updatedAt?: string | null;
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

/**
 * Shows data-freshness information for a page section.
 *
 * - When `isStale` is true, renders a yellow alert banner.
 * - When `updatedAt` is present (and not stale), renders a compact
 *   "Updated X ago" label with a tooltip. Renders nothing otherwise.
 */
const SectionStatusBadge: React.FC<SectionStatusBadgeProps> = ({
  updatedAt,
  isStale,
  staleMessage = 'This data may be out of date — a dependency has changed since the last update.',
  onDismiss,
  isDismissing = false,
  className,
}) => {
  const absoluteLabel = updatedAt ? formatAbsolute(updatedAt, { includeTime: true }) : null;
  const relativeLabel = updatedAt ? formatSmartLabel(updatedAt) : null;

  if (isStale) {
    const staleDetail = relativeLabel ? ` Last updated: ${relativeLabel}.` : '';
    return (
      <Alert
        icon={<IconAlertTriangle size={24} />}
        color="yellow"
        className={className}
      >
        <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
          <Text size="sm" style={{ flex: 1 }}>
            {staleMessage}{staleDetail}
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
  }

  if (!updatedAt) return null;

  return (
    <Tooltip label={absoluteLabel!} withArrow>
      <Group
        gap={4}
        align="center"
        style={{ display: 'inline-flex', cursor: 'default' }}
        className={className}
      >
        <IconClock size={12} color="var(--mantine-color-dimmed)" />
        <Text size="xs" c="dimmed">
          Updated {relativeLabel}
        </Text>
      </Group>
    </Tooltip>
  );
};

export default SectionStatusBadge;

