import { Badge, Button, Card, Group, Text, ThemeIcon, Timeline } from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconLock,
  IconPointFilled,
} from '@tabler/icons-react';
import React from 'react';

import SectionStatusBadge from '@components/common/SectionStatusBadge';

// ── Types ─────────────────────────────────────────────────────────────────────

export type StepStatus = 'complete' | 'warning' | 'stale' | 'not-started' | 'locked';

export interface SetupStep {
  label: string;
  status: StepStatus;
  summary: string;
  updatedAt?: string | null;
  fixLink: string;
}

// ── State visual config ───────────────────────────────────────────────────────

const STATE_CONFIG: Record<
  StepStatus,
  {
    iconColor: string;
    iconVariant: 'filled' | 'light' | 'outline';
    icon: React.ReactNode;
    badgeColor: string;
    stateLabel: string;
    ctaColor: string;
  }
> = {
  complete: {
    iconColor: 'green',
    iconVariant: 'filled',
    icon: <IconCheck size={14} />,
    badgeColor: 'green',
    stateLabel: 'Complete',
    ctaColor: 'blue',
  },
  warning: {
    iconColor: 'orange',
    iconVariant: 'filled',
    icon: <IconAlertTriangle size={14} />,
    badgeColor: 'orange',
    stateLabel: 'Incomplete',
    ctaColor: 'orange',
  },
  stale: {
    iconColor: 'yellow',
    iconVariant: 'filled',
    icon: <IconClock size={14} />,
    badgeColor: 'yellow',
    stateLabel: 'Stale',
    ctaColor: 'yellow',
  },
  'not-started': {
    iconColor: 'blue',
    iconVariant: 'outline',
    icon: <IconPointFilled size={10} />,
    badgeColor: 'gray',
    stateLabel: 'Not started',
    ctaColor: 'blue',
  },
  locked: {
    iconColor: 'gray',
    iconVariant: 'light',
    icon: <IconLock size={12} />,
    badgeColor: 'gray',
    stateLabel: 'Locked',
    ctaColor: 'gray',
  },
};

// ── StepItem ──────────────────────────────────────────────────────────────────

const StepItem: React.FC<{
  step: SetupStep;
  prevComplete: boolean;
  onNavigate: (link: string) => void;
}> = ({ step, prevComplete, onNavigate }) => {
  const cfg = STATE_CONFIG[step.status];
  const isLocked = step.status === 'locked';

  const showCta =
    !isLocked &&
    step.status !== 'complete' &&
    prevComplete;

  const ctaLabel =
    step.status === 'warning' || step.status === 'stale'
      ? 'Fix →'
      : 'Get started →';

  return (
    <Timeline.Item
      bullet={
        <ThemeIcon size={28} radius="xl" color={cfg.iconColor} variant={cfg.iconVariant}>
          {cfg.icon}
        </ThemeIcon>
      }
      title={
        <Group gap="xs" align="center" wrap="nowrap">
          <Text fw={600} size="sm" c={isLocked ? 'dimmed' : undefined}>
            {step.label}
          </Text>

          <Badge size="xs" variant="light" color={cfg.badgeColor}>
            {cfg.stateLabel}
          </Badge>

          {!isLocked && (
            <Badge size="xs" variant="outline" color="gray">
              {step.summary}
            </Badge>
          )}

          {!isLocked && step.updatedAt && (
            <SectionStatusBadge />
          )}
        </Group>
      }
    >
      {isLocked && (
        <Text size="xs" c="dimmed" mt={4}>
          {step.summary}
        </Text>
      )}

      {showCta && (
        <Button
          size="xs"
          variant="light"
          color={cfg.ctaColor}
          mt={6}
          onClick={() => onNavigate(step.fixLink)}
        >
          {ctaLabel}
        </Button>
      )}
    </Timeline.Item>
  );
};

// ── OverviewSetupTimeline ─────────────────────────────────────────────────────

interface Props {
  steps: SetupStep[];
  completeCount: number;
  onNavigate: (link: string) => void;
}

const OverviewSetupTimeline: React.FC<Props> = ({ steps, completeCount, onNavigate }) => (
  <Card withBorder radius="md" padding="lg">
    <Text
      fw={700}
      size="xs"
      tt="uppercase"
      c="dimmed"
      mb="md"
      style={{ letterSpacing: '0.06em' }}
    >
      Setup — {completeCount} of {steps.length} complete
    </Text>

    <Timeline bulletSize={28} lineWidth={2}>
      {steps.map((step, i) => (
        <StepItem
          key={step.label}
          step={step}
          prevComplete={i === 0 || steps[i - 1].status === 'complete'}
          onNavigate={onNavigate}
        />
      ))}
    </Timeline>
  </Card>
);

export default OverviewSetupTimeline;
