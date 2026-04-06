import { Box, Group, Title } from '@mantine/core';
import React from 'react';

import UpdatedAtBadge from './UpdatedAtBadge';

interface PageShellProps {
  title: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  contentPadding?: string | number;
  updatedAt?: string | null;
}

/**
 * Consistent page content layout:
 * ┌────────────────────────────────────────────────────┐
 * │ Page title                         Page actions    │
 * ├────────────────────────────────────────────────────┤
 * │ Page content                                       │
 * └────────────────────────────────────────────────────┘
 */
const PageShell: React.FC<PageShellProps> = ({
  title,
  actions,
  children,
  contentPadding = 'lg',
  updatedAt,
}) => {
  return (
    <Box>
      <Group
        justify="space-between"
        align="center"
        px="lg"
        py="sm"
        style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
      >
        {/* Left side: title + updated-at badge */}
        <Group gap="sm" align="center">
          {typeof title === 'string' ? (
            <Title order={3}>{title}</Title>
          ) : (
            title
          )}
          <UpdatedAtBadge updatedAt={updatedAt} />
        </Group>

        {actions && <Group gap="xs">{actions}</Group>}
      </Group>
      <Box p={contentPadding}>
        {children}
      </Box>
    </Box>
  );
};

export default PageShell;