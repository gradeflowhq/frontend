import { Stepper } from '@mantine/core';
import React from 'react';

export type Step = 'upload' | 'configure' | 'list';

export const StepIndicator: React.FC<{
  current: Step;
  hasSource: boolean;
  hasSubmissions: boolean;
  onNavigate: (step: Step) => void;
}> = ({ current, hasSource, hasSubmissions, onNavigate }) => {
  const items: { key: Step; label: string; enabled: boolean }[] = [
    { key: 'upload', label: 'Upload Data', enabled: true },
    { key: 'configure', label: 'Configure Columns', enabled: hasSource },
    { key: 'list', label: 'Preview', enabled: hasSubmissions },
  ];
  const currentIdx = items.findIndex((s) => s.key === current);
  // When on the final step (review), mark all steps as complete
  const activeIdx = currentIdx === items.length - 1 ? items.length : currentIdx;
  return (
    <Stepper
      active={activeIdx}
      size="sm"
      mb="xl"
      onStepClick={(idx) => {
        if (items[idx].enabled) onNavigate(items[idx].key);
      }}
    >
      {items.map((item) => (
        <Stepper.Step
          key={item.key}
          label={item.label}
          allowStepClick={item.enabled}
        />
      ))}
    </Stepper>
  );
};
