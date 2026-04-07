import { Button, Checkbox, Group, NumberInput, Popover, Text, Textarea } from '@mantine/core';
import React, { useState } from 'react';

import type { AnswerGroup } from '@features/grading/helpers/grouping';

export type BulkAdjustArgs = {
  points: number | null;
  feedback: string | null;
  skipExisting: boolean;
};

interface BulkAdjustPopoverProps {
  group: AnswerGroup;
  maxPoints: number;
  onApply: (args: BulkAdjustArgs) => void;
  isLoading: boolean;
}

const BulkAdjustPopover: React.FC<BulkAdjustPopoverProps> = ({
  group,
  maxPoints,
  onApply,
  isLoading,
}) => {
  const [opened, setOpened] = useState(false);
  const [points, setPoints] = useState<number | string>('');
  const [feedback, setFeedback] = useState('');
  const [skipExisting, setSkipExisting] = useState(true);

  const effectiveCount = skipExisting
    ? group.entries.length - group.adjustmentCount
    : group.entries.length;

  const handleApply = () => {
    onApply({
      points: points === '' ? null : Number(points),
      feedback: feedback.trim() === '' ? null : feedback.trim(),
      skipExisting,
    });
    setOpened(false);
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Popover
        opened={opened}
        onChange={setOpened}
        width={300}
        position="bottom-end"
        withArrow
        shadow="md"
      >
        <Popover.Target>
          <Button size="xs" variant="light" onClick={() => setOpened((o) => !o)}>
            Adjust {effectiveCount} / {group.entries.length}
          </Button>
        </Popover.Target>

        <Popover.Dropdown>
          <Text fw={600} size="sm" mb="sm">
            Adjust {effectiveCount} students
          </Text>

          <NumberInput
            label="Points"
            min={0}
            max={maxPoints}
            step={0.5}
            placeholder="Unchanged"
            value={points}
            onChange={setPoints}
            mb="sm"
          />

          <Textarea
            label="Feedback"
            autosize
            minRows={2}
            placeholder="Unchanged"
            value={feedback}
            onChange={(e) => setFeedback(e.currentTarget.value)}
            mb="sm"
          />

          <Checkbox
            checked={skipExisting}
            onChange={(e) => setSkipExisting(e.currentTarget.checked)}
            label={
              <Text size="sm">
                Skip students with existing adjustments
                {group.adjustmentCount > 0 && (
                  <Text component="span" c="dimmed" size="sm">
                    {' '}({group.adjustmentCount})
                  </Text>
                )}
              </Text>
            }
            mb="sm"
          />

          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" size="sm" onClick={() => setOpened(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              loading={isLoading}
              disabled={isLoading}
              onClick={handleApply}
            >
              Apply to {effectiveCount}
            </Button>
          </Group>
        </Popover.Dropdown>
      </Popover>
    </div>
  );
};

export default BulkAdjustPopover;
