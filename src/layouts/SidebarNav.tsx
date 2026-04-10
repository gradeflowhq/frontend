import {
  AppShell,
  Avatar,
  Box,
  Collapse,
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
  IconChartBar,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconGridDots,
  IconInbox,
  IconLayersSubtract,
  IconLayoutDashboard,
  IconListCheck,
  IconLogout,
  IconQuestionMark,
  IconSend,
  IconSettings,
  IconUsers,
} from '@tabler/icons-react';
import React, { useCallback, useState } from 'react';
import { Link, useMatch, useNavigate, useLocation } from 'react-router-dom';

import { PATHS } from '@app/routes/paths';
import { prefetchRoute } from '@app/routes/prefetch';
import { useAssessment } from '@features/assessments/api';
import { useMe, useLogout } from '@features/auth/api';
import { useGradingJob, useJobStatus } from '@features/grading/api';
import { SIDEBAR_EXPANDED_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from '@lib/constants';
import { useAuthStore } from '@state/authStore';

interface SidebarNavProps {
  expanded: boolean;
  onToggle: () => void;
}

const SIDEBAR_ICON_SIZE = 18;

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  expanded: boolean;
  badge?: React.ReactNode;
  prefetchKey?: Parameters<typeof prefetchRoute>[0];
}

const SidebarNavItem: React.FC<NavItemProps> = ({ icon, label, to, expanded, badge, prefetchKey }) => {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');

  const handleMouseEnter = React.useCallback(() => {
    if (prefetchKey) prefetchRoute(prefetchKey);
  }, [prefetchKey]);

  const content = (
    <NavLink
      component={Link}
      to={to}
      active={isActive}
      label={expanded ? label : undefined}
      leftSection={icon}
      rightSection={expanded ? badge : undefined}
      onMouseEnter={handleMouseEnter}
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

interface SidebarNavSectionProps {
  icon: React.ReactNode;
  label: string;
  basePath: string;
  expanded: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

const SidebarNavSection: React.FC<SidebarNavSectionProps> = ({
  icon,
  label,
  basePath,
  expanded,
  badge,
  children,
}) => {
  const location = useLocation();
  const isActive = location.pathname.startsWith(basePath);
  const [isOpen, setIsOpen] = useState(false);

  if (!expanded) {
    return (
      <Tooltip label={label} position="right" withArrow>
        <NavLink
          component={Link}
          to={basePath}
          active={isActive}
          leftSection={icon}
          styles={{
            root: {
              borderRadius: 6,
              padding: '8px',
              justifyContent: 'center',
            },
            label: { display: 'none' },
            section: { marginInlineEnd: 0 },
          }}
        />
      </Tooltip>
    );
  }

  return (
    <Box>
      <NavLink
        active={false}
        label={label}
        leftSection={icon}
        rightSection={
          <Group gap={4} wrap="nowrap">
            {badge}
            {isActive || isOpen ? (
              <IconChevronDown size={12} />
            ) : (
              <IconChevronRight size={12} />
            )}
          </Group>
        }
        onClick={() => setIsOpen((o) => !o)}
        styles={{
          root: {
            borderRadius: 6,
            padding: '8px 12px',
          },
        }}
      />
      <Collapse expanded={isActive || isOpen}>
        <Stack gap={2} pl={12}>
          {children}
        </Stack>
      </Collapse>
    </Box>
  );
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

const AccountSection: React.FC<{ expanded: boolean }> = ({ expanded }) => {
  const clearTokens = useAuthStore((s) => s.clearTokens);
  const navigate = useNavigate();

  const { data } = useMe();
  const logoutMutation = useLogout();

  const username = data?.name ?? data?.email ?? 'Account';
  const initial = username.charAt(0).toUpperCase();

  const handleLogout = useCallback(() => {
    void logoutMutation.mutateAsync(undefined, {
      onSuccess: () => notifications.show({ color: 'green', message: 'Logged out' }),
      onError: () => notifications.show({ color: 'red', message: 'Logout failed' }),
    }).finally(() => {
      clearTokens();
      void navigate(PATHS.LOGIN);
    });
  }, [logoutMutation, clearTokens, navigate]);

  const avatarEl = (
    <Avatar size="sm" radius="xl" color="blue">
      {initial}
    </Avatar>
  );

  if (!expanded) {
    return (
      <Box pt={8} style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
        <Menu position="right-end" withArrow>
          <Menu.Target>
            <Tooltip label={username} position="right" withArrow>
              <UnstyledButton
                p={8}
                style={{
                  borderRadius: 6,
                  display: 'flex',
                  justifyContent: 'center',
                  width: '100%',
                  border: '1px solid var(--mantine-color-default-border)',
                  backgroundColor: 'var(--mantine-color-body)',
                }}
              >
                {avatarEl}
              </UnstyledButton>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconLogout size={16} />} color="red" onClick={handleLogout}>
              Logout
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Box>
    );
  }

  return (
    <Box pt={8} style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
      <Menu position="top" withArrow>
        <Menu.Target>
          <UnstyledButton
            px="sm"
            py={8}
            style={{
              borderRadius: 6,
              width: '100%',
              border: '1px solid var(--mantine-color-default-border)',
              backgroundColor: 'var(--mantine-color-body)',
            }}
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
          <Menu.Item leftSection={<IconLogout size={16} />} color="red" onClick={handleLogout}>
            Logout
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Box>
  );
};

const AssessmentSidebarItems: React.FC<{ assessmentId: string; expanded: boolean }> = ({
  assessmentId,
  expanded,
}) => {
  const { data: assessment, isLoading: assessmentLoading } = useAssessment(assessmentId, !!assessmentId);
  const ap = PATHS.assessment(assessmentId);

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
        to={PATHS.ASSESSMENTS}
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
      <SidebarNavItem icon={<IconLayoutDashboard size={SIDEBAR_ICON_SIZE} />} label="Overview" to={ap.overview} expanded={expanded} prefetchKey="overview" />
      <SidebarNavItem icon={<IconInbox size={SIDEBAR_ICON_SIZE} />} label="Submissions" to={ap.submissions} expanded={expanded} prefetchKey="submissions" />
      <SidebarNavItem icon={<IconQuestionMark size={SIDEBAR_ICON_SIZE} />} label="Questions" to={ap.questions} expanded={expanded} prefetchKey="questions" />
      <SidebarNavItem icon={<IconAdjustments size={SIDEBAR_ICON_SIZE} />} label="Rules" to={ap.rules} expanded={expanded} prefetchKey="rules" />
      <SectionLabel label="Output" expanded={expanded} />
      <SidebarNavSection
        icon={<IconListCheck size={SIDEBAR_ICON_SIZE} />}
        label="Results"
        basePath={ap.results.index}
        expanded={expanded}
        badge={gradingBadge}
      >
        <SidebarNavItem
          icon={<IconChartBar size={SIDEBAR_ICON_SIZE} />}
          label="Statistics"
          to={ap.results.statistics}
          expanded={expanded}
          prefetchKey="statistics"
        />
        <SidebarNavItem
          icon={<IconUsers size={SIDEBAR_ICON_SIZE} />}
          label="Students"
          to={ap.results.students}
          expanded={expanded}
          prefetchKey="students"
        />
        <SidebarNavItem
          icon={<IconLayersSubtract size={SIDEBAR_ICON_SIZE} />}
          label="Groups"
          to={ap.results.groups}
          expanded={expanded}
          prefetchKey="groups"
        />
      </SidebarNavSection>
      <SidebarNavItem icon={<IconSend size={SIDEBAR_ICON_SIZE} />} label="Publish" to={ap.publish} expanded={expanded} prefetchKey="publish" />

      <SectionLabel label="Admin" expanded={expanded} />
      <SidebarNavItem icon={<IconUsers size={SIDEBAR_ICON_SIZE} />} label="Members" to={ap.members} expanded={expanded} prefetchKey="members" />
      <SidebarNavItem icon={<IconSettings size={SIDEBAR_ICON_SIZE} />} label="Settings" to={ap.settings} expanded={expanded} prefetchKey="settings" />
    </Stack>
  );
};

const TopLevelSidebarItems: React.FC<{ expanded: boolean }> = ({ expanded }) => (
  <Stack gap={2}>
    <SidebarNavItem icon={<IconGridDots size={SIDEBAR_ICON_SIZE} />} label="Assessments" to={PATHS.ASSESSMENTS} expanded={expanded} prefetchKey="assessments" />
  </Stack>
);

const SidebarNav: React.FC<SidebarNavProps> = ({ expanded, onToggle }) => {
  const matchAssessment = useMatch(`${PATHS.ASSESSMENTS}/:assessmentId/*`);
  const matchAssessmentList = useMatch(PATHS.ASSESSMENTS);
  const assessmentId = matchAssessment?.params.assessmentId;

  const [lastAssessmentId, setLastAssessmentId] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (assessmentId) {
      setLastAssessmentId(assessmentId);
    } else if (matchAssessmentList) {
      setLastAssessmentId(undefined);
    }
  }, [assessmentId, matchAssessmentList]);

  const effectiveAssessmentId = assessmentId ?? lastAssessmentId;

  return (
    <AppShell.Navbar
      style={{
        width: expanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH,
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
                <Text fw={700} size="md" style={{ cursor: 'default' }}>GradeFlow</Text>
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

          {effectiveAssessmentId ? (
            <AssessmentSidebarItems assessmentId={effectiveAssessmentId} expanded={expanded} />
          ) : (
            <TopLevelSidebarItems expanded={expanded} />
          )}
        </Box>

        {/* Bottom: Settings + Account */}
        <Stack gap={2}>
          <SectionLabel label="General" expanded={expanded} />
          <SidebarNavItem
            icon={<IconSettings size={SIDEBAR_ICON_SIZE} />}
            label="Settings"
            to={PATHS.SETTINGS}
            expanded={expanded}
          />
          <AccountSection expanded={expanded} />
        </Stack>
      </Stack>
    </AppShell.Navbar>
  );
};

export { SidebarNav };
export type { SidebarNavProps };