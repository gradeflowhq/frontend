import { AppShell, Box, Burger, Text } from '@mantine/core';
import React, { useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';

import ErrorBoundary from '@components/common/ErrorBoundary';

import { SidebarNav } from './SidebarNav';

const SIDEBAR_COLLAPSED_WIDTH = 56;

const AppLayoutInner: React.FC<{
  expanded: boolean;
  mobileOpened: boolean;
  onToggle: () => void;
  onMobileToggle: () => void;
}> = ({
  expanded,
  mobileOpened,
  onToggle,
  onMobileToggle,
}) => {
  return (
    <AppShell
      navbar={{
        width: expanded ? 220 : SIDEBAR_COLLAPSED_WIDTH,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened },
      }}
      transitionDuration={200}
      withBorder={false}
    >
      <SidebarNav
        expanded={expanded}
        onToggle={onToggle}
      />

      <AppShell.Main>
        {/* Mobile-only top bar */}
        <Box
          hiddenFrom="sm"
          px="md"
          py="xs"
          style={{
            borderBottom: '1px solid var(--mantine-color-default-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Burger opened={mobileOpened} onClick={onMobileToggle} size="sm" />
          <Text fw={800} size="sm" c="black">GradeFlow</Text>
        </Box>

        <Box
          hiddenFrom="sm"
          onClick={onMobileToggle}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.4)',
            opacity: mobileOpened ? 1 : 0,
            pointerEvents: mobileOpened ? 'auto' : 'none',
            transition: 'opacity 200ms ease',
          }}
        />

        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </AppShell.Main>
    </AppShell>
  );
};

const AppLayout: React.FC = () => {
  const [mobileOpened, setMobileOpened] = useState(false);
  const [expanded, setExpanded] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('sidebar_pinned');
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });
  const handleToggle = useCallback(() => {
    const next = !expanded;
    setExpanded(next);
    try {
      localStorage.setItem('sidebar_pinned', String(next));
    } catch {
      /* ignore */
    }
  }, [expanded]);

  return (
    <AppLayoutInner
      expanded={expanded}
      mobileOpened={mobileOpened}
      onToggle={handleToggle}
      onMobileToggle={() => setMobileOpened((o) => !o)}
    />
  );
};

export default AppLayout;