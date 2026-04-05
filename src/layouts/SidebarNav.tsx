import {
  AppShell,
  Avatar,
  Box,
  Group,
  Loader,
  Menu,
  NavLink,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAdjustments,
  IconArrowLeft,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconGridDots,
  IconInbox,
  IconLayoutDashboard,
  IconListCheck,
  IconLogout,
  IconQuestionMark,
  IconSend,
  IconSettings,
  IconUsers,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import React, { useCallback } from 'react';
import { Link, useMatch, useNavigate, useLocation } from 'react-router-dom';

import { api } from '@api';
import { useAssessment } from '@features/assessments/hooks';
import { useGradingJob, useJobStatus } from '@features/grading/hooks';
import { useAuthStore } from '@state/authStore';

import type { MeResponse } from '@api/models';

interface SidebarNavProps {
  expanded: boolean;
  onToggle: () => void;
  onOpenSettings: () => void;
}

const SIDEBAR_ICON_SIZE = 18;

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  expanded: boolean;
  badge?: React.ReactNode;
}

const SidebarNavItem: React.FC<NavItemProps> = ({ icon, label, to, expanded, badge }) => {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');

  const content = (
    <NavLink
      component={Link}
      to={to}
      active={isActive}
      label={expanded ? label : undefined}
      leftSection={icon}
      rightSection={expanded ? badge : undefined}
      styles={{
        root: {
          borderRadius: 6,
          padding: expanded ? '8px 12px' : '8px',
          justifyContent: expanded ? 'flex-start' : 'center',
        },
        label: { display: expanded ? 'block' : 'none' },
        section: { marginInlineEnd: expanded ? undefined : 0 },
      }}
    />
  );

  if (!expanded) {
    return (
      <Tooltip label={label} position="right" withArrow>
        {content}
      </Tooltip>
    );
  }
  return content;
};

const SectionLabel: React.FC<{ label: string; expanded: boolean }> = ({ label, expanded }) => {
  if (!expanded) return <Box h={4} />;
  return (
    <Text
      size="xs"
      c="dimmed"
      fw={600}
      tt="uppercase"
      px="sm"
      mt="sm"
      mb={4}
      style={{ letterSpacing: '0.05em' }}
    >
      {label}
    </Text>
  );
};

const AccountSection: React.FC<{ expanded: boolean; onOpenSettings: () => void }> = ({
  expanded,
  onOpenSettings,
}) => {
  const clearTokens = useAuthStore((s) => s.clearTokens);
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => (await api.meAuthMeGet()).data as MeResponse,
    staleTime: 5 * 60 * 1000,
  });

  const username = data?.name ?? data?.email ?? 'Account';
  const initial = username.charAt(0).toUpperCase();

  const handleLogout = useCallback(() => {
    void (async () => {
      try {
        await api.logoutAuthLogoutPost();
        notifications.show({ color: 'green', message: 'Logged out' });
      } catch {
        notifications.show({ color: 'red', message: 'Logout failed' });
      } finally {
        clearTokens();
        void navigate('/login');
      }
    })();
  }, [clearTokens, navigate]);

  const avatarEl = (
    <Avatar size="sm" radius="xl" color="blue">
      {initial}
    </Avatar>
  );

  if (!expanded) {
    return (
      <Menu position="right-end" withArrow>
        <Menu.Target>
          <Tooltip label={username} position="right" withArrow>
            <UnstyledButton p={8} style={{ borderRadius: 6, display: 'flex', justifyContent: 'center' }}>
              {avatarEl}
            </UnstyledButton>
          </Tooltip>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item leftSection={<IconSettings size={16} />} onClick={onOpenSettings}>
            Settings
          </Menu.Item>
          <Menu.Item leftSection={<IconLogout size={16} />} color="red" onClick={handleLogout}>
            Logout
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    );
  }

  return (
    <Menu position="top" withArrow>
      <Menu.Target>
        <UnstyledButton
          px="sm"
          py={8}
          style={{ borderRadius: 6, width: '100%' }}
          styles={{ root: { '&:hover': { backgroundColor: 'var(--mantine-color-default-hover)' } } }}
        >
          <Group gap="sm" wrap="nowrap">
            {avatarEl}
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Text size="sm" fw={500} truncate>
                {username}
              </Text>
            </Box>
            <IconChevronDown size={14} />
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconSettings size={16} />} onClick={onOpenSettings}>
          Settings
        </Menu.Item>
        <Menu.Item leftSection={<IconLogout size={16} />} color="red" onClick={handleLogout}>
          Logout
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

const AssessmentSidebarItems: React.FC<{ assessmentId: string; expanded: boolean }> = ({
  assessmentId,
  expanded,
}) => {
  const { data: assessment, isLoading: assessmentLoading } = useAssessment(assessmentId, !!assessmentId);
  const base = `/assessments/${assessmentId}`;

  const { data: gradingJob } = useGradingJob(assessmentId, !!assessmentId);
  const jobId = gradingJob?.job_id ?? null;
  const { data: jobStatusRes } = useJobStatus(jobId, !!jobId);
  const jobStatus = jobStatusRes?.status;
  const gradingInProgress = jobStatus === 'queued' || jobStatus === 'running';

  const gradingBadge = gradingInProgress ? (
    <Loader size={12} />
  ) : undefined;

  const assessmentLabel = expanded
    ? (assessmentLoading ? '...' : (assessment?.name ?? 'Back to Assessments'))
    : undefined;

  return (
    <Stack gap={2}>
      <NavLink
        component={Link}
        to="/assessments"
        label={assessmentLabel}
        leftSection={<IconArrowLeft size={SIDEBAR_ICON_SIZE} />}
        styles={{
          root: {
            borderRadius: 6,
            padding: expanded ? '8px 12px' : '8px',
            justifyContent: expanded ? 'flex-start' : 'center',
          },
          label: {
            display: expanded ? 'block' : 'none',
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          },
          section: { marginInlineEnd: expanded ? undefined : 0 },
        }}
      />

      <SectionLabel label="Setup" expanded={expanded} />
      <SidebarNavItem icon={<IconLayoutDashboard size={SIDEBAR_ICON_SIZE} />} label="Overview" to={`${base}/overview`} expanded={expanded} />
      <SidebarNavItem icon={<IconInbox size={SIDEBAR_ICON_SIZE} />} label="Submissions" to={`${base}/submissions`} expanded={expanded} />
      <SidebarNavItem icon={<IconQuestionMark size={SIDEBAR_ICON_SIZE} />} label="Questions" to={`${base}/questions`} expanded={expanded} />
      <SidebarNavItem icon={<IconAdjustments size={SIDEBAR_ICON_SIZE} />} label="Rules" to={`${base}/rules`} expanded={expanded} />

      <SectionLabel label="Output" expanded={expanded} />
      <SidebarNavItem icon={<IconListCheck size={SIDEBAR_ICON_SIZE} />} label="Results" to={`${base}/results`} expanded={expanded} badge={gradingBadge} />
      <SidebarNavItem icon={<IconSend size={SIDEBAR_ICON_SIZE} />} label="Publish" to={`${base}/publish`} expanded={expanded} />

      <SectionLabel label="Admin" expanded={expanded} />
      <SidebarNavItem icon={<IconUsers size={SIDEBAR_ICON_SIZE} />} label="Members" to={`${base}/members`} expanded={expanded} />
      <SidebarNavItem icon={<IconSettings size={SIDEBAR_ICON_SIZE} />} label="Settings" to={`${base}/settings`} expanded={expanded} />
    </Stack>
  );
};

const TopLevelSidebarItems: React.FC<{ expanded: boolean }> = ({ expanded }) => (
  <Stack gap={2}>
    <SidebarNavItem icon={<IconGridDots size={SIDEBAR_ICON_SIZE} />} label="Assessments" to="/assessments" expanded={expanded} />
  </Stack>
);

const SidebarNav: React.FC<SidebarNavProps> = ({
  expanded,
  onToggle,
  onOpenSettings,
}) => {
  const matchAssessment = useMatch('/assessments/:assessmentId/*');
  const assessmentId = matchAssessment?.params.assessmentId;

  return (
    <AppShell.Navbar
      style={{
        width: expanded ? 220 : 56,
        transition: 'width 200ms ease',
        overflow: 'hidden',
        backgroundColor: 'var(--mantine-color-default-hover)',
        borderRight: '1px solid var(--mantine-color-default-border)',
      }}
    >
      <Stack h="100%" justify="space-between" gap={0} p={8}>
        {/* Top: Logo + Toggle */}
        <Box>
          <Box mb={8}>
            <Group
              justify={expanded ? 'space-between' : 'center'}
              align="center"
              px={expanded ? 4 : 0}
              py={4}
            >
              {expanded && (
                <Text fw={700} size="md" c="black" style={{ cursor: 'default' }}>GradeFlow</Text>
              )}
              <Tooltip label={expanded ? 'Collapse sidebar' : 'Expand sidebar'} position="right" withArrow>
                <UnstyledButton
                  onClick={onToggle}
                  p={4}
                  style={{ borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {expanded ? <IconChevronLeft size={14} /> : <IconChevronRight size={14} />}
                </UnstyledButton>
              </Tooltip>
            </Group>
          </Box>

          {assessmentId ? (
            <AssessmentSidebarItems assessmentId={assessmentId} expanded={expanded} />
          ) : (
            <TopLevelSidebarItems expanded={expanded} />
          )}
        </Box>

        {/* Bottom: Account */}
        <AccountSection expanded={expanded} onOpenSettings={onOpenSettings} />
      </Stack>
    </AppShell.Navbar>
  );
};

export { SidebarNav };
export type { SidebarNavProps };
