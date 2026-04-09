import {
  Stack, Select, TextInput, Button, Text,
} from '@mantine/core';
import React from 'react';

import { type CanvasAssignmentGroup, type CanvasAssignmentSummary } from '@api/canvasClient';

import { InfoRow } from './InfoRow';

export type AssignmentPickerProps = {
  loadingCourseData: boolean;
  assignments: CanvasAssignmentSummary[];
  assignmentGroups: CanvasAssignmentGroup[];
  assignmentId: string;
  assignmentName: string;
  assessmentName?: string;
  assignmentGroupId: string;
  onAssignmentSelect: (value: string) => void;
  onAssignmentNameChange: (value: string) => void;
  onAssignmentGroupChange: (value: string) => void;
  onRefresh: () => void | Promise<void>;
};

const AssignmentPicker: React.FC<AssignmentPickerProps> = ({
  loadingCourseData,
  assignments,
  assignmentGroups,
  assignmentId,
  assignmentName,
  assessmentName,
  assignmentGroupId,
  onAssignmentSelect,
  onAssignmentNameChange,
  onAssignmentGroupChange,
  onRefresh,
}) => {
  const showNameInput = assignmentGroupId && (!assignmentId || assignments.length === 0);
  const assignmentDisabled = loadingCourseData || !assignmentGroupId;

  return (
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
  );
};

export default AssignmentPicker;
