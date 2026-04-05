import { Box, Group, Title } from '@mantine/core';
import React from 'react';

interface PageShellProps {
  title: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  /** Additional padding for the content area. Default: 'lg' */
  contentPadding?: string | number;
}

/**
 * Consistent page content layout:
 * ┌────────────────────────────────────────────────────┐
 * │ Page title                         Page actions    │
 * ├────────────────────────────────────────────────────┤
 * │ Page content                                       │
 * └────────────────────────────────────────────────────┘
 */
const PageShell: React.FC<PageShellProps> = ({ title, actions, children, contentPadding = 'lg' }) => {
  return (
    <Box>
      <Group
        justify="space-between"
        align="center"
        px="lg"
        py="sm"
        style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
      >
        {typeof title === 'string' ? (
          <Title order={3}>{title}</Title>
        ) : (
          title
        )}
        {actions && <Group gap="xs">{actions}</Group>}
      </Group>
      <Box p={contentPadding}>
        {children}
      </Box>
    </Box>
  );
};

export default PageShell;
