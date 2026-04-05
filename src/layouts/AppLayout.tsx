import { AppShell, Box, Burger, Text } from '@mantine/core';
import React, { useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';

import ErrorBoundary from '@components/common/ErrorBoundary';
import UserSettingsDialog from '@components/common/UserSettingsDialog';

import { SidebarNav } from './SidebarNav';

const SIDEBAR_COLLAPSED_WIDTH = 56;

const AppLayoutInner: React.FC<{
  expanded: boolean;
  mobileOpened: boolean;
  onToggle: () => void;
  onMobileToggle: () => void;
  onOpenSettings: () => void;
}> = ({
  expanded,
  mobileOpened,
  onToggle,
  onMobileToggle,
  onOpenSettings,
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
        onOpenSettings={onOpenSettings}
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
  const [showSettings, setShowSettings] = useState(false);

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
    <>
      <AppLayoutInner
        expanded={expanded}
        mobileOpened={mobileOpened}
        onToggle={handleToggle}
        onMobileToggle={() => setMobileOpened((o) => !o)}
        onOpenSettings={() => setShowSettings(true)}
      />
      <UserSettingsDialog open={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
};

export default AppLayout;
