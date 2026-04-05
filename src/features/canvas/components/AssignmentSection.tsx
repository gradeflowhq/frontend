import {
  SimpleGrid, Stack, Select, TextInput, Checkbox, NumberInput,
  SegmentedControl, Button, Text,
} from '@mantine/core';
import React from 'react';

import { type CanvasAssignmentGroup, type CanvasAssignmentSummary } from '@api/canvasClient';

import { InfoRow } from './InfoRow';

type AssignmentSectionProps = {
  loadingCourseData: boolean;
  assignments: CanvasAssignmentSummary[];
  assignmentGroups: CanvasAssignmentGroup[];
  assignmentId: string;
  assignmentName: string;
  assessmentName?: string;
  assignmentGroupId: string;
  enableRounding: boolean;
  roundingBase: number;
  includeComments: boolean;
  gradeMode: 'points' | 'percent';
  onAssignmentSelect: (value: string) => void;
  onAssignmentNameChange: (value: string) => void;
  onAssignmentGroupChange: (value: string) => void;
  onEnableRoundingChange: (value: boolean) => void;
  onRoundingBaseChange: (value: number) => void;
  onIncludeCommentsChange: (value: boolean) => void;
  onGradeModeChange: (value: "points" | "percent") => void;
  onRefresh: () => void | Promise<void>;
  /** When true (default), renders only the assignment selection fields */
  showAssignment?: boolean;
  /** When true (default), renders only the grade settings fields */
  showGradeSettings?: boolean;
};

const AssignmentSection: React.FC<AssignmentSectionProps> = ({
  loadingCourseData,
  assignments,
  assignmentGroups,
  assignmentId,
  assignmentName,
  assessmentName,
  assignmentGroupId,
  enableRounding,
  roundingBase,
  includeComments,
  gradeMode,
  onAssignmentSelect,
  onAssignmentNameChange,
  onAssignmentGroupChange,
  onEnableRoundingChange,
  onRoundingBaseChange,
  onIncludeCommentsChange,
  onGradeModeChange,
  onRefresh,
  showAssignment = true,
  showGradeSettings = true,
}) => {
  const showNameInput = assignmentGroupId && (!assignmentId || assignments.length === 0);
  const assignmentDisabled = loadingCourseData || !assignmentGroupId;

  return (
    <SimpleGrid cols={{ base: 1, lg: showAssignment && showGradeSettings ? 2 : 1 }} spacing="md">
      {showAssignment && (
        <InfoRow
          bottomAction={
            <Button
              size="xs"
              variant="default"
              loading={loadingCourseData}
              onClick={() => void onRefresh()}
            >
              Refresh assignments
            </Button>
          }
        >
          <Stack gap="xs">
            <Stack gap={4}>
              <Text size="sm" fw={500}>Assignment group</Text>
              <Select
                disabled={loadingCourseData}
                value={assignmentGroupId || null}
                onChange={(v) => onAssignmentGroupChange(v ?? '')}
                data={assignmentGroups.map((g) => ({ value: String(g.id), label: g.name }))}
                placeholder="Select a group"
              />
            </Stack>

            {assignmentGroupId && (
              <Stack gap={4}>
                <Text size="sm" fw={500}>Assignment</Text>
                <Select
                  value={assignmentId || ''}
                  onChange={(v) => onAssignmentSelect(v ?? '')}
                  disabled={assignmentDisabled}
                  data={[
                    { value: '', label: 'Create new assignment...' },
                    ...assignments.map((a) => ({ value: String(a.id), label: a.name })),
                  ]}
                />
              </Stack>
            )}

            {showNameInput && (
              <TextInput
                label="New assignment name"
                value={assignmentName || assessmentName || ''}
                onChange={(e) => onAssignmentNameChange(e.currentTarget.value)}
                placeholder="GradeFlow Results"
              />
            )}
          </Stack>
        </InfoRow>
      )}

      {showGradeSettings && (
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
              checked={includeComments}
              onChange={(e) => onIncludeCommentsChange(e.currentTarget.checked)}
            />
          </Stack>
        </InfoRow>
      )}
    </SimpleGrid>
  );
};

export default AssignmentSection;
