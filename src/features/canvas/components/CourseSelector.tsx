import { Select, Button, Text, Stack } from '@mantine/core';
import React from 'react';

import { type CanvasCourse } from '@api/canvasClient';

import { InfoRow } from './InfoRow';

type CourseSelectorProps = {
  courseId: string;
  courses: CanvasCourse[];
  loadingCourses: boolean;
  missingCanvasConfig: boolean;
  onCourseChange: (value: string) => void;
  onRefresh: () => void | Promise<void>;
};

const CourseSelector: React.FC<CourseSelectorProps> = ({
  courseId,
  courses,
  loadingCourses,
  missingCanvasConfig,
  onCourseChange,
  onRefresh,
}) => (
  <InfoRow
    title="Course"
    action={
      <Button
        size="sm"
        variant="subtle"
        loading={loadingCourses}
        disabled={missingCanvasConfig}
        onClick={() => void onRefresh()}
      >
        Refresh
      </Button>
    }
  >
    <Stack gap="xs">
      <Select
        label="Course"
        disabled={loadingCourses || missingCanvasConfig || !courses.length}
        value={courseId || null}
        onChange={(v) => onCourseChange(v ?? '')}
        data={courses.map((c) => ({
          value: String(c.id),
          label: `${c.name}${c.course_code ? ` (${c.course_code})` : ''}`,
        }))}
        placeholder="Select a course"
      />
      {!courses.length && !loadingCourses && !missingCanvasConfig && (
        <Text size="sm" c="dimmed">No courses found. Check your Canvas access.</Text>
      )}
    </Stack>
  </InfoRow>
);

export default CourseSelector;
