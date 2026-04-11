import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { createCanvasClient, parseCanvasBaseUrl } from '@api/canvasClient';
import { QK } from '@api/queryKeys';
import { CACHE_STALE_TIME_CANVAS, CACHE_STALE_TIME_CANVAS_ASSIGNMENTS } from '@lib/constants';

import type { CanvasAssignmentGroup, CanvasAssignmentSummary, CanvasUserSummary } from '@api/canvasClient';

export const useCanvasData = (canvasBaseUrl: string, canvasToken: string) => {
  const missingConfig = !parseCanvasBaseUrl(canvasBaseUrl) || !canvasToken;

  const coursesQuery = useQuery({
    queryKey: QK.canvas.courses(canvasBaseUrl),
    enabled: !missingConfig,
    queryFn: async () => {
      const client = createCanvasClient({ canvasBaseUrl, token: canvasToken });
      return (await client.listAllCourses()) ?? [];
    },
    staleTime: CACHE_STALE_TIME_CANVAS,
  });

  return {
    courses: coursesQuery.data ?? [],
    isLoading: coursesQuery.isLoading || coursesQuery.isFetching,
    isError: coursesQuery.isError,
    error: coursesQuery.error,
    refetch: coursesQuery.refetch,
    missingConfig,
  };
};

export const useCourseData = (courseId: string, canvasBaseUrl: string, canvasToken: string) => {
  const missingConfig = !parseCanvasBaseUrl(canvasBaseUrl) || !canvasToken;

  const courseDataQuery = useQuery<{
    assignmentGroups: CanvasAssignmentGroup[];
    assignments: CanvasAssignmentSummary[];
    roster: CanvasUserSummary[];
  }>({
    queryKey: QK.canvas.courseData(courseId, canvasBaseUrl),
    enabled: Boolean(courseId && !missingConfig),
    queryFn: async () => {
      const client = createCanvasClient({ canvasBaseUrl, token: canvasToken });
      const [groups, assigns, users] = await Promise.all([
        client.listAssignmentGroups(courseId.trim()),
        client.listAllAssignments(courseId.trim()),
        client.listAllCourseUsers(courseId.trim()),
      ]);
      return {
        assignmentGroups: groups.data ?? [],
        assignments: assigns ?? [],
        roster: users ?? [],
      };
    },
    staleTime: CACHE_STALE_TIME_CANVAS_ASSIGNMENTS,
  });

  const assignmentGroups = courseDataQuery.data?.assignmentGroups ?? [];
  const assignments = useMemo(() => courseDataQuery.data?.assignments ?? [], [courseDataQuery.data]);
  const roster = useMemo(() => courseDataQuery.data?.roster ?? [], [courseDataQuery.data]);

  return {
    assignmentGroups,
    assignments,
    roster,
    isLoading: courseDataQuery.isLoading || courseDataQuery.isFetching,
    refetch: courseDataQuery.refetch,
  };
};
