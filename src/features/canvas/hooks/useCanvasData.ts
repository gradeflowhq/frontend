import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { createCanvasClient, normalizeCanvasBaseUrl } from '@api/canvasClient';

import type { CanvasAssignmentGroup, CanvasAssignmentSummary, CanvasUserSummary } from '@api/canvasClient';

export const useCanvasData = (canvasBaseUrl: string, canvasToken: string) => {
  const missingConfig = !normalizeCanvasBaseUrl(canvasBaseUrl) || !canvasToken;

  const coursesQuery = useQuery({
    queryKey: ['canvas', 'courses', canvasBaseUrl, canvasToken],
    enabled: !missingConfig,
    queryFn: async () => {
      const client = createCanvasClient({ canvasBaseUrl, token: canvasToken });
      return (await client.listAllCourses()) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    courses: coursesQuery.data ?? [],
    isLoading: coursesQuery.isLoading || coursesQuery.isFetching,
    refetch: coursesQuery.refetch,
    missingConfig,
  };
};

export const useCourseData = (courseId: string, canvasBaseUrl: string, canvasToken: string) => {
  const missingConfig = !normalizeCanvasBaseUrl(canvasBaseUrl) || !canvasToken;

  const courseDataQuery = useQuery<{
    assignmentGroups: CanvasAssignmentGroup[];
    assignments: CanvasAssignmentSummary[];
    roster: CanvasUserSummary[];
  }>({
    queryKey: ['canvas', 'course-data', courseId, canvasBaseUrl, canvasToken],
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
    staleTime: 60 * 1000,
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
