import { useState } from 'react';

import { createCanvasClient } from '@api/canvasClient';

import type { CanvasAssignmentSummary } from '@api/canvasClient';
import type { PreparedRow } from '@features/canvas/types';
import type { AxiosError } from 'axios';

type PushState = 
  | { status: 'idle' }
  | { status: 'pushing' }
  | { status: 'success'; message: string; progressUrl?: string }
  | { status: 'error'; message: string };

type PushConfig = {
  canvasBaseUrl: string;
  canvasToken: string;
  courseId: string;
  assignmentId: string;
  assignmentName: string;
  assignmentGroupId: string;
  gradeMode: 'points' | 'percent';
  includeComments: boolean;
  numericPoints: number;
};

export const useCanvasPush = () => {
  const [pushState, setPushState] = useState<PushState>({ status: 'idle' });

  const push = async (
    preparedRows: PreparedRow[],
    assignments: CanvasAssignmentSummary[],
    config: PushConfig,
    onAssignmentCreated: (id: string, name: string, points: number) => void
  ) => {
    setPushState({ status: 'idle' });

    if (!config.courseId.trim()) {
      setPushState({ status: 'error', message: 'Select a Canvas course first.' });
      return;
    }

    const name = (config.assignmentId ? config.assignmentName : config.assignmentName || 'GradeFlow Assignment').trim();
    if (!name) {
      setPushState({ status: 'error', message: 'Assignment name is required.' });
      return;
    }

    setPushState({ status: 'pushing' });

    try {
      const client = createCanvasClient({ canvasBaseUrl: config.canvasBaseUrl, token: config.canvasToken });
      let targetAssignmentId = config.assignmentId.trim();

      // Create or find assignment
      if (!targetAssignmentId) {
        const existing = assignments.find(a => a.name.trim().toLowerCase() === name.toLowerCase());
        if (existing) {
          targetAssignmentId = existing.id.toString();
          onAssignmentCreated(targetAssignmentId, existing.name, existing.points_possible ?? config.numericPoints);
        } else {
          const created = await client.createAssignment(config.courseId, {
            name,
            points_possible: config.numericPoints,
            assignment_group_id: config.assignmentGroupId ? Number(config.assignmentGroupId) : undefined,
            grading_type: config.gradeMode === 'percent' ? 'percent' : 'points',
          });
          targetAssignmentId = created.data.id.toString();
          onAssignmentCreated(targetAssignmentId, name, config.numericPoints);
        }
      }

      // Prepare grade data
      const gradeData: Record<string, { posted_grade: number | string; text_comment?: string }> = {};
      const missing: string[] = [];

      for (const row of preparedRows) {
        if (!row.canvasId) {
          missing.push(row.decryptedStudentId || '(empty)');
          continue;
        }

        const percentGrade = Number.isFinite(row.selectedPercent) ? Number(row.selectedPercent) : undefined;
        const pointsGrade = Number.isFinite(row.selectedPoints) ? Number(row.selectedPoints) : undefined;

        const postedGrade = config.gradeMode === 'percent' ? percentGrade : pointsGrade;

        if (postedGrade === undefined) {
          missing.push(row.decryptedStudentId || '(empty)');
          continue;
        }

        gradeData[row.canvasId] = {
          posted_grade: postedGrade,
          text_comment: config.includeComments ? row.comments : undefined,
        };
      }

      if (!Object.keys(gradeData).length) {
        setPushState({ status: 'error', message: 'No student IDs could be mapped to Canvas users.' });
        return;
      }

      // Push grades
      const response = await client.updateGrades(config.courseId, targetAssignmentId, gradeData);
      
      // Canvas returns the progress object directly
      const progressUrl = response.data?.url;
      
      setPushState({
        status: 'success',
        message: `Pushed ${Object.keys(gradeData).length} grades to assignment #${targetAssignmentId}.` +
          (missing.length ? ` Skipped ${missing.length} unmapped IDs.` : ''),
        progressUrl,
      });
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: string; errors?: string[]; message?: string }>;
      const responseData = axiosErr.response?.data;
      
      // Extract error message from various possible response formats
      const detail = 
        responseData?.error ?? 
        responseData?.errors?.[0] ?? 
        responseData?.message;
      
      const errorMessage = detail 
        ? `Canvas API error: ${detail}`
        : axiosErr.message || 'Failed to push to Canvas.';
      
      setPushState({ status: 'error', message: errorMessage });
    }
  };

  return { pushState, push, setPushState };
};
