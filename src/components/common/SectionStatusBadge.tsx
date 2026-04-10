import { Alert, Button, Group, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import React from 'react';

import type { ButtonProps } from '@mantine/core';

export interface SectionStatusAction {
  label: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  color?: ButtonProps['color'];
  variant?: ButtonProps['variant'];
}

export interface SectionStatusBadgeProps {
  isStale?: boolean | null;
  /** Forces the banner to render even when isStale is false. */
  show?: boolean;
  /**
   * Custom message shown in the stale alert. Defaults to a generic message.
   */
  staleMessage?: React.ReactNode;
  /**
    * Called when the user clicks "Dismiss". Callers can acknowledge the warning
    * persistently (for example with a no-op save) or dismiss it locally.
   */
  onDismiss?: () => void;
  /** True while the dismiss action is in flight. */
  isDismissing?: boolean;
  /** Optional actions rendered on the right side of the banner. */
  actions?: SectionStatusAction[];
  /** Override the default dismiss action label. */
  dismissLabel?: string;
  /** Override the default dismiss action color. */
  dismissColor?: ButtonProps['color'];
  /** Override the default dismiss action variant. */
  dismissVariant?: ButtonProps['variant'];
  /** Optional className forwarded to the outer element. */
  className?: string;
}

const SectionStatusBadge: React.FC<SectionStatusBadgeProps> = ({
  isStale,
  show,
  staleMessage = 'This data may be out of date — a dependency has changed since the last update.',
  onDismiss,
  isDismissing = false,
  actions,
  dismissLabel = 'Dismiss',
  dismissColor = 'red',
  dismissVariant = 'default',
  className,
}) => {
  const resolvedActions = actions && actions.length > 0
    ? actions
    : onDismiss
      ? [{
          label: dismissLabel,
          onClick: onDismiss,
          loading: isDismissing,
          color: dismissColor,
          variant: dismissVariant,
        } satisfies SectionStatusAction]
      : [];

  if (!(show ?? Boolean(isStale))) return null;

  return (
    <Alert
      icon={<IconAlertTriangle size={24} />}
      color="yellow"
      className={className}
    >
      <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
        <Text size="sm" style={{ flex: 1, minWidth: 0 }}>
          {staleMessage}
        </Text>
        {resolvedActions.length > 0 && (
          <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
            {resolvedActions.map((action, index) => (
              <Button
                key={`${action.label}:${index}`}
                size="xs"
                color={action.color}
                variant={action.variant ?? 'default'}
                loading={action.loading}
                disabled={action.disabled}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ))}
          </Group>
        )}
      </Group>
    </Alert>
  );
};

export default SectionStatusBadge;