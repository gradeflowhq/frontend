import {
  Stack, Select, TextInput, NumberInput, Button, Text,
} from '@mantine/core';
import React from 'react';

import { type CanvasAssignmentGroup, type CanvasAssignmentSummary } from '@api/canvasClient';
import { NEW_GROUP_VALUE } from '@features/canvas/constants';

import { InfoRow } from './InfoRow';

export type AssignmentPickerProps = {
  loadingCourseData: boolean;
  assignments: CanvasAssignmentSummary[];
  assignmentGroups: CanvasAssignmentGroup[];
  assignmentId: string;
  assignmentName: string;
  assessmentName?: string;
  assignmentGroupId: string;
  newGroupName?: string;
  newGroupWeight?: number;
  onAssignmentSelect: (value: string) => void;
  onAssignmentNameChange: (value: string) => void;
  onAssignmentGroupChange: (value: string) => void;
  onNewGroupNameChange?: (value: string) => void;
  onNewGroupWeightChange?: (value: number | undefined) => void;
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
  newGroupName = '',
  newGroupWeight,
  onAssignmentSelect,
  onAssignmentNameChange,
  onAssignmentGroupChange,
  onNewGroupNameChange,
  onNewGroupWeightChange,
  onRefresh,
}) => {
  const isCreatingGroup = assignmentGroupId === NEW_GROUP_VALUE;
  // Show name input when: selecting an existing group with no matching assignment,
  // OR when creating a new group (which always creates a new assignment too).
  const showNameInput = !!assignmentGroupId && (isCreatingGroup || !assignmentId || assignments.length === 0);
  const assignmentDisabled = loadingCourseData || !assignmentGroupId || isCreatingGroup;

  const groupSelectData = [
    ...assignmentGroups.map((g) => ({ value: String(g.id), label: g.name })),
    { value: NEW_GROUP_VALUE, label: '+ Create new group...' },
  ];

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
            searchable
            data={groupSelectData}
            placeholder="Select a group"
            nothingFoundMessage="No matching groups"
          />
        </Stack>

        {isCreatingGroup && (
          <>
            <TextInput
              label="New group name"
              value={newGroupName}
              onChange={(e) => onNewGroupNameChange?.(e.currentTarget.value)}
              placeholder="e.g. Midterm Exams"
              data-autofocus
            />
            <NumberInput
              label="Group weight (%)"
              description="Optional. Sets the assignment group weight in Canvas."
              value={newGroupWeight ?? ''}
              onChange={(v) => onNewGroupWeightChange?.(v === '' ? undefined : Number(v))}
              min={0}
              max={100}
              step={5}
              placeholder="e.g. 30"
              suffix="%"
            />
          </>
        )}

        {assignmentGroupId && !isCreatingGroup && (
          <Stack gap={4}>
            <Text size="sm" fw={500}>Assignment</Text>
            <Select
              value={assignmentId || ''}
              onChange={(v) => onAssignmentSelect(v ?? '')}
              disabled={assignmentDisabled}
              searchable
              data={[
                { value: '', label: 'Create new assignment...' },
                ...assignments.map((a) => ({ value: String(a.id), label: a.name })),
              ]}
              nothingFoundMessage="No matching assignments"
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
