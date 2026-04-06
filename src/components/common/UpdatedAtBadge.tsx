import { Group, Text, Tooltip } from '@mantine/core';
import { IconClock } from '@tabler/icons-react';
import React from 'react';

import { formatAbsolute, formatSmartLabel } from '@utils/datetime';

export interface UpdatedAtBadgeProps {
  updatedAt?: string | null;
  className?: string;
}

const UpdatedAtBadge: React.FC<UpdatedAtBadgeProps> = ({ updatedAt, className }) => {
  if (!updatedAt) return null;

  const absoluteLabel = formatAbsolute(updatedAt, { includeTime: true });
  const relativeLabel = formatSmartLabel(updatedAt);

  return (
    <Tooltip label={absoluteLabel} withArrow>
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

export default UpdatedAtBadge;