import {
  Stack, Checkbox, NumberInput, SegmentedControl, Text,
} from '@mantine/core';
import React from 'react';

import { InfoRow } from './InfoRow';

export type GradeSettingsProps = {
  enableRounding: boolean;
  roundingBase: number;
  includeQuestionRemarks: boolean;
  gradeMode: 'points' | 'percent';
  onEnableRoundingChange: (value: boolean) => void;
  onRoundingBaseChange: (value: number) => void;
  onIncludeQuestionRemarksChange: (value: boolean) => void;
  onGradeModeChange: (value: 'points' | 'percent') => void;
};

const GradeSettings: React.FC<GradeSettingsProps> = ({
  enableRounding,
  roundingBase,
  includeQuestionRemarks,
  gradeMode,
  onEnableRoundingChange,
  onRoundingBaseChange,
  onIncludeQuestionRemarksChange,
  onGradeModeChange,
}) => (
  <InfoRow>
    <Stack gap="md">
      <Stack gap={4}>
        <Text size="sm" fw={500}>Mode</Text>
        <SegmentedControl
          value={gradeMode}
          onChange={(v) => onGradeModeChange(v as 'points' | 'percent')}
          data={[
            { label: 'Points', value: 'points' },
            { label: 'Percentage', value: 'percent' },
          ]}
        />
      </Stack>

      <Stack gap={4}>
        <Text size="sm" fw={500}>Rounding</Text>
        <Checkbox
          label="Round scores"
          checked={enableRounding}
          onChange={(e) => onEnableRoundingChange(e.currentTarget.checked)}
        />
        {enableRounding && (
          <NumberInput
            label="Base"
            value={roundingBase}
            onChange={(v) => onRoundingBaseChange(Number(v))}
            min={0.01}
            step={0.05}
            maw={120}
          />
        )}
      </Stack>

      <Checkbox
        label="Include per-question remarks"
        checked={includeQuestionRemarks}
        onChange={(e) => onIncludeQuestionRemarksChange(e.currentTarget.checked)}
      />
    </Stack>
  </InfoRow>
);

export default GradeSettings;
