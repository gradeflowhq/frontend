import React from 'react';

import { type CanvasCourse } from '@api/canvasClient';
import { Button } from '@components/ui/Button';

import { InfoRow, LoadingBadge } from './InfoRow';

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
        variant="ghost"
        onClick={() => void onRefresh()}
        disabled={loadingCourses || missingCanvasConfig}
      >
        {loadingCourses ? <LoadingBadge label="Refreshing" /> : 'Refresh courses'}
      </Button>
    }
  >
    <div className="space-y-2">
      <select
        className="select select-bordered w-full"
        disabled={loadingCourses || missingCanvasConfig || !courses.length}
        value={courseId}
        onChange={(e) => onCourseChange(e.target.value)}
      >
        <option value="" disabled>
          Select a course
        </option>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} {c.course_code ? `(${c.course_code})` : ''}
          </option>
        ))}
      </select>
      {loadingCourses && <LoadingBadge label="Loading courses" />}
      {!courses.length && !loadingCourses && !missingCanvasConfig && (
        <p className="text-sm text-base-content/60">No courses found. Check your Canvas access.</p>
      )}
    </div>
  </InfoRow>
);

export default CourseSelector;
