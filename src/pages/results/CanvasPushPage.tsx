import { useQuery } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { api } from '@api';
import {
  createCanvasClient,
  normalizeCanvasBaseUrl,
  type CanvasAssignmentGroup,
  type CanvasAssignmentSummary,
  type CanvasUserSummary,
} from '@api/canvasClient';
import ErrorAlert from '@components/common/ErrorAlert';
import UserSettingsDialog from '@components/common/UserSettingsDialog';
import { Button } from '@components/ui/Button';
import { IconChevronLeft } from '@components/ui/Icon';
import LoadingButton from '@components/ui/LoadingButton';
import { useAssessment } from '@features/assessments/hooks';
import { buildUserIdMap, formatNumericValue, mapCanvasId, parseCsvGrades, pickValue, truncateText } from '@features/canvas/helpers';
import { AssessmentPassphraseProvider, useAssessmentPassphrase } from '@features/encryption/AssessmentPassphraseProvider';
import { useDecryptedIds } from '@features/encryption/useDecryptedIds';
import { tryDecodeExportCsv } from '@features/submissions/helpers';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { useCanvasPushStore } from '@state/canvasSettingsStore';
import { useUserSettingsStore } from '@state/userSettingsStore';
import { isEncrypted } from '@utils/crypto';

import AssignmentSection from '../../features/canvas/components/AssignmentSection';
import CourseSelector from '../../features/canvas/components/CourseSelector';
import PreviewSection from '../../features/canvas/components/PreviewSection';
import { type PreviewRow, type PreviewTab } from '../../features/canvas/types';

import type { GradingDownloadRequest, GradingDownloadResponse } from '@api/models';
import type { AxiosError } from 'axios';

type Status = { kind: 'idle' | 'success' | 'error'; message?: string };

type CanvasPushHeaderProps = {
  assignmentName?: string;
  onBack: () => void;
};

const CanvasPushHeader: React.FC<CanvasPushHeaderProps> = ({ assignmentName, onBack }) => (
  <div className="flex items-center gap-3">
    <Button variant="outline" onClick={onBack} leftIcon={<IconChevronLeft />}>
      {assignmentName} Results
    </Button>
    <div>
      <h2 className="text-xl font-semibold">Push to Canvas</h2>
    </div>
  </div>
);

const CanvasPushInner: React.FC<{ assessmentId: string }> = ({ assessmentId }) => {
  const navigate = useNavigate();
  const { passphrase, notifyEncryptedDetected } = useAssessmentPassphrase();
  const { data: assessmentRes } = useAssessment(assessmentId, true);

  useDocumentTitle(`Push to Canvas - ${assessmentRes?.name ?? 'Assessment'} - GradeFlow`);

  const { canvasBaseUrl, canvasToken } = useUserSettingsStore();
  const {
    courseId,
    assignmentId,
    assignmentName,
    assignmentGroupId,
    pointsPossible,
    enableRounding,
    roundingBase,
    gradeMode,
    setConfig,
  } = useCanvasPushStore(assessmentId);
  const [includeComments, setIncludeComments] = useState(true);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [isPushing, setIsPushing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [previewTab, setPreviewTab] = useState<PreviewTab>('mapped');

  const csvDownloadQuery = useQuery({
    queryKey: ['grading', 'csv', assessmentId, roundingBase],
    enabled: Boolean(assessmentId),
    queryFn: async () => {
      const payload: GradingDownloadRequest = {
        serializer: {
          format: 'csv',
          student_id_column: 'student_id',
          include_answers: false,
          include_per_question_results: false,
          include_feedback: false,
          include_total: true,
          include_remarks: true,
          include_rounded_total: true,
          rounding_base: roundingBase,
        },
      };
      const res = await api.downloadGradingAssessmentsAssessmentIdGradingDownloadPost(assessmentId, payload);
      const download = res.data as GradingDownloadResponse;
      const raw = (download?.data ?? '') as unknown;
      if (raw instanceof Blob) {
        return raw.text();
      }
      if (raw instanceof Uint8Array) {
        return new TextDecoder().decode(raw);
      }
      return typeof raw === 'string' ? raw : String(raw ?? '');
    },
    staleTime: 60 * 1000,
  });

  const [decodedCsv, setDecodedCsv] = useState('');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const raw = await csvDownloadQuery.data;
      if (!raw) {
        if (!cancelled) setDecodedCsv('');
        return;
      }
      const decoded = await tryDecodeExportCsv(raw, { passphrase });
      if (!cancelled) setDecodedCsv(decoded);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [csvDownloadQuery.data, passphrase]);

  const csvGradeRows = useMemo(() => parseCsvGrades(decodedCsv), [decodedCsv]);

  useEffect(() => {
    if (csvGradeRows.some((row) => isEncrypted(row.studentId))) {
      notifyEncryptedDetected();
    }
  }, [csvGradeRows, notifyEncryptedDetected]);

  const studentIds = useMemo(() => csvGradeRows.map((row) => row.studentId ?? ''), [csvGradeRows]);
  const decryptedIds = useDecryptedIds(studentIds, passphrase, notifyEncryptedDetected);

  const csvTotalMax = useMemo(() => {
    const first = csvGradeRows.find((row) => Number.isFinite(row.roundedTotalMaxPoints ?? row.totalMaxPoints));
    const raw = first?.totalMaxPoints ?? 0;
    const rounded = first?.roundedTotalMaxPoints ?? undefined;
    return pickValue(rounded, raw, enableRounding) ?? 0;
  }, [csvGradeRows, enableRounding]);

  const totalMax = useMemo(() => csvTotalMax, [csvTotalMax]);

  const numericPoints = useMemo(() => {
    const parsed = Number(pointsPossible);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    if (totalMax > 0) return totalMax;
    return gradeMode === 'percent' ? 100 : 0;
  }, [pointsPossible, totalMax, gradeMode]);

  useEffect(() => {
    if (!assignmentName && assessmentRes?.name) {
      setConfig({ assignmentName: assessmentRes.name });
    }
  }, [assignmentName, assessmentRes?.name, setConfig]);

  useEffect(() => {
    const nextPoints = gradeMode === 'percent' ? 100 : totalMax;
    if (Number.isFinite(nextPoints) && nextPoints > 0 && nextPoints !== pointsPossible) {
      setConfig({ pointsPossible: nextPoints });
    }
  }, [gradeMode, totalMax, pointsPossible, setConfig]);

  const missingCanvasConfig = !normalizeCanvasBaseUrl(canvasBaseUrl) || !canvasToken;

  const coursesQuery = useQuery({
    queryKey: ['canvas', 'courses', canvasBaseUrl, canvasToken],
    enabled: !missingCanvasConfig,
    queryFn: async () => {
      const client = createCanvasClient({ canvasBaseUrl, token: canvasToken });
      const courses = await client.listAllCourses();
      return courses ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const courseDataQuery = useQuery<{
    assignmentGroups: CanvasAssignmentGroup[];
    assignments: CanvasAssignmentSummary[];
    roster: CanvasUserSummary[];
  }>({
    queryKey: ['canvas', 'course-data', courseId, canvasBaseUrl, canvasToken],
    enabled: Boolean(courseId && !missingCanvasConfig),
    queryFn: async () => {
      const course = courseId.trim();
      const client = createCanvasClient({ canvasBaseUrl, token: canvasToken });
      const [groups, assigns, users] = await Promise.all([
        client.listAssignmentGroups(course),
        client.listAllAssignments(course),
        client.listAllCourseUsers(course),
      ]);
      return { assignmentGroups: groups.data ?? [], assignments: assigns ?? [], roster: users ?? [] };
    },
    staleTime: 60 * 1000,
  });

  const courses = coursesQuery.data ?? [];
  const courseData = courseDataQuery.data;
  const assignmentGroups = courseData?.assignmentGroups ?? [];
  const assignments = useMemo(() => courseData?.assignments ?? [], [courseData]);
  const roster = useMemo(() => courseData?.roster ?? [], [courseData]);
  const loadingCourses = coursesQuery.isLoading || coursesQuery.isFetching;
  const loadingCourseData = courseDataQuery.isLoading || courseDataQuery.isFetching;
  const refetchCourses = coursesQuery.refetch;

  const userIdMap = useMemo(() => buildUserIdMap(roster), [roster]);

  const filteredAssignments = useMemo(() => {
    if (!assignmentGroupId) return [];
    const groupId = Number(assignmentGroupId);
    return assignments.filter((a) => Number(a.assignment_group_id) === groupId);
  }, [assignments, assignmentGroupId]);

  const mapToCanvasId = useCallback(
    (rawId: string) => mapCanvasId(rawId, decryptedIds, userIdMap),
    [decryptedIds, userIdMap]
  );

  const preparedRows = useMemo(() => {
    return csvGradeRows.map((row) => {
      const rawId = row.studentId ?? '';
      const gfId = decryptedIds[rawId] ?? rawId;
      const canvasId = mapToCanvasId(rawId);
      const rosterUser = roster.find((u) => u.id?.toString() === canvasId);

      const baseMax = pickValue(row.roundedTotalMaxPoints, row.totalMaxPoints, enableRounding);
      const csvPoints = row.totalPoints;
      const csvRoundedPoints = row.roundedTotalPoints;
      const csvPercent = row.totalPercent;
      const csvRoundedPercent = row.roundedTotalPercent;

      const selectedPoints = pickValue(csvRoundedPoints, csvPoints, enableRounding);
      const selectedPercent = pickValue(csvRoundedPercent, csvPercent, enableRounding);

      const percentFromPoints = baseMax && selectedPoints !== undefined && baseMax !== 0
        ? (selectedPoints / baseMax) * 100
        : undefined;
      const percentForCanvas = selectedPercent ?? percentFromPoints;

      const pointsForCanvas = gradeMode === 'points'
        ? (percentForCanvas !== undefined && Number.isFinite(percentForCanvas)
          ? (percentForCanvas / 100) * numericPoints
          : selectedPoints)
        : selectedPoints;

      const remarksFull = includeComments ? row.remarks ?? undefined : undefined;

      return {
        rawId,
        gradeflowId: gfId,
        canvasId,
        studentName: rosterUser?.name ?? rosterUser?.short_name ?? rosterUser?.sortable_name,
        percentForCanvas: percentForCanvas,
        pointsForCanvas,
        baseMax,
        csvPoints,
        csvRoundedPoints,
        csvPercent,
        csvRoundedPercent,
        remarksFull,
      };
    });
  }, [csvGradeRows, decryptedIds, mapToCanvasId, roster, enableRounding, gradeMode, numericPoints, includeComments]);

  const previewRows = useMemo(() => {
    return preparedRows.map((row) => {
      const pointsDisplay = gradeMode === 'points' ? row.pointsForCanvas : row.csvPoints;
      const roundedPointsDisplay = gradeMode === 'points' ? row.pointsForCanvas : row.csvRoundedPoints ?? row.csvPoints;
      const percentDisplay = gradeMode === 'percent' ? row.percentForCanvas : row.csvPercent;
      const roundedPercentDisplay = gradeMode === 'percent' ? row.percentForCanvas : row.csvRoundedPercent ?? row.csvPercent;

      const remarks = row.remarksFull ? truncateText(row.remarksFull, 160) : undefined;

      return {
        gradeflowId: row.gradeflowId,
        canvasId: row.canvasId,
        studentName: row.studentName,
        points: formatNumericValue(pointsDisplay),
        roundedPoints: formatNumericValue(roundedPointsDisplay),
        percent: formatNumericValue(percentDisplay),
        roundedPercent: formatNumericValue(roundedPercentDisplay),
        remarks,
        mapped: Boolean(row.canvasId),
      } as PreviewRow;
    });
  }, [preparedRows, gradeMode]);

  const mappedRows = previewRows.filter((r) => r.mapped);
  const unmappedRows = previewRows.filter((r) => !r.mapped);

  const handleCourseChange = (value: string) => {
    if (value === courseId) return;
    setStatus({ kind: 'idle' });
    setPreviewTab('mapped');
    setConfig({ courseId: value, assignmentId: '', assignmentName: assessmentRes?.name ?? '', assignmentGroupId: '' });
  };

  const handleAssignmentGroupChange = (value: string) => {
    setConfig({ assignmentGroupId: value, assignmentId: '', assignmentName: assessmentRes?.name ?? '' });
  };

  const handleAssignmentSelect = (value: string) => {
    if (value === '__new__') {
      setConfig({ assignmentId: '', assignmentName: assessmentRes?.name ?? '' });
      return;
    }
    const found = filteredAssignments.find((a) => a.id.toString() === value);
    setConfig({ assignmentId: value, assignmentName: found?.name ?? assignmentName, pointsPossible: found?.points_possible ?? pointsPossible });
  };

  const handlePush = async () => {
    setStatus({ kind: 'idle' });
    if (!courseId.trim()) {
      setStatus({ kind: 'error', message: 'Select a Canvas course first.' });
      return;
    }
    const name = (assignmentId ? assignmentName : assignmentName || assessmentRes?.name || 'GradeFlow Assignment').trim();
    if (!name) {
      setStatus({ kind: 'error', message: 'Assignment name is required.' });
      return;
    }
    if (missingCanvasConfig) {
      setStatus({ kind: 'error', message: 'Configure Canvas base URL and token first.' });
      setShowSettings(true);
      return;
    }

    setIsPushing(true);
    try {
      const client = createCanvasClient({ canvasBaseUrl, token: canvasToken });
      let targetAssignmentId = assignmentId.trim();

      if (!targetAssignmentId) {
        const existing = assignments.find((a) => a.name.trim().toLowerCase() === name.toLowerCase());
        if (existing) {
          targetAssignmentId = existing.id.toString();
          setConfig({ assignmentId: targetAssignmentId, assignmentName: existing.name, pointsPossible: existing.points_possible ?? pointsPossible });
        } else {
          const created = await client.createAssignment(courseId, {
            name,
            points_possible: numericPoints,
            assignment_group_id: assignmentGroupId ? Number(assignmentGroupId) : undefined,
            grading_type: gradeMode === 'percent' ? 'percent' : 'points',
          });
          targetAssignmentId = created.data.id.toString();
          setConfig({ assignmentId: targetAssignmentId });
        }
      }

      const gradeData: Record<string, { posted_grade: number | string; text_comment?: string }> = {};
      const missing: string[] = [];

      for (const row of preparedRows) {
        if (!row.canvasId) {
          missing.push(row.gradeflowId || '(empty)');
          continue;
        }

        const percentGrade = Number.isFinite(row.percentForCanvas as number)
          ? Number(row.percentForCanvas)
          : undefined;
        const pointsGrade = Number.isFinite(row.pointsForCanvas as number)
          ? Number(row.pointsForCanvas)
          : undefined;

        const postedGrade = gradeMode === 'percent'
          ? (percentGrade !== undefined ? `${percentGrade.toFixed(3).replace(/\.0+$/, '').replace(/\.([1-9]*)0+$/, '.$1')}%` : undefined)
          : pointsGrade;

        if (postedGrade === undefined) {
          missing.push(row.gradeflowId || '(empty)');
          continue;
        }

        gradeData[row.canvasId] = {
          posted_grade: postedGrade,
          text_comment: includeComments ? row.remarksFull : undefined,
        };
      }

      if (!Object.keys(gradeData).length) {
        setStatus({ kind: 'error', message: 'No student IDs could be mapped to Canvas users.' });
        return;
      }

      await client.updateGrades(courseId, targetAssignmentId, gradeData);
      setStatus({
        kind: 'success',
        message: `Pushed ${Object.keys(gradeData).length} grades to assignment #${targetAssignmentId}.` +
          (missing.length ? ` Skipped ${missing.length} unmapped IDs.` : ''),
      });
    } catch (err) {
      const axiosErr = err as AxiosError<{ errors?: string[]; message?: string }>;
      const detail = axiosErr.response?.data?.errors?.[0] ?? axiosErr.response?.data?.message;
      setStatus({ kind: 'error', message: detail || axiosErr.message || 'Failed to push to Canvas.' });
    } finally {
      setIsPushing(false);
    }
  };

  const isLoadingData = csvDownloadQuery.isLoading;
  const canRenderContent = !isLoadingData && !csvDownloadQuery.isError;
  const disablePush = missingCanvasConfig || !courseId || !csvGradeRows.length;

  return (
    <section className="space-y-4">
      <CanvasPushHeader
        assignmentName={assignmentName || assessmentRes?.name || 'Assessment'}
        onBack={() => void navigate(`/results/${assessmentId}`)}
      />

      {isLoadingData && (
        <div className="alert alert-info"><span>Loading grading results...</span></div>
      )}

      {!isLoadingData && csvDownloadQuery.isError && (
        <ErrorAlert error={csvDownloadQuery.error as Error} />
      )}

      {canRenderContent && (
        <>
          {missingCanvasConfig && (
            <div className="alert alert-warning flex items-center gap-3">
              <span>Set your Canvas base URL and token first.</span>
              <Button className="ml-auto" size="sm" variant="outline" onClick={() => setShowSettings(true)}>Open Settings</Button>
            </div>
          )}

          <CourseSelector
            courseId={courseId}
            courses={courses}
            loadingCourses={loadingCourses}
            missingCanvasConfig={missingCanvasConfig}
            onCourseChange={handleCourseChange}
            onRefresh={async () => {
              await refetchCourses();
            }}
          />

          {courseId && (
            <AssignmentSection
              loadingCourseData={loadingCourseData}
              assignments={filteredAssignments}
              assignmentGroups={assignmentGroups}
              assignmentId={assignmentId}
              assignmentName={assignmentName}
              assessmentName={assessmentRes?.name}
              assignmentGroupId={assignmentGroupId}
              enableRounding={enableRounding}
              roundingBase={roundingBase ?? 0}
              includeComments={includeComments}
              gradeMode={gradeMode}
              onAssignmentSelect={handleAssignmentSelect}
              onAssignmentNameChange={(value) => setConfig({ assignmentName: value })}
              onAssignmentGroupChange={handleAssignmentGroupChange}
              onEnableRoundingChange={(value) => setConfig({ enableRounding: value })}
              onRoundingBaseChange={(value) => setConfig({ roundingBase: value })}
              onIncludeCommentsChange={(value) => setIncludeComments(value)}
              onGradeModeChange={(value) => setConfig({ gradeMode: value })}
            />
          )}

          {courseId && (
            <PreviewSection
              mappedRows={mappedRows}
              unmappedRows={unmappedRows}
              previewTab={previewTab}
              onTabChange={setPreviewTab}
              loadingCourseData={loadingCourseData}
              gradeMode={gradeMode}
              roundingEnabled={enableRounding}
            />
          )}

          {status.kind === 'error' && (
            <ErrorAlert error={new Error(status.message || 'Failed to push to Canvas.')} />
          )}
          {status.kind === 'success' && (
            <div className="alert alert-success">
              <span>{status.message}</span>
            </div>
          )}

          <div className="flex items-center gap-2 justify-end">
            <LoadingButton
              variant="primary"
              onClick={() => void handlePush()}
              isLoading={isPushing}
              idleLabel="Push to Canvas"
              loadingLabel="Pushing..."
              disabled={disablePush}
            />
          </div>

          <UserSettingsDialog open={showSettings} onClose={() => setShowSettings(false)} />
        </>
      )}
    </section>
  );
};

const CanvasPushPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  if (!assessmentId) {
    return <div className="alert alert-error"><span>Assessment ID is missing.</span></div>;
  }
  return (
    <AssessmentPassphraseProvider assessmentId={assessmentId}>
      <CanvasPushInner assessmentId={assessmentId} />
    </AssessmentPassphraseProvider>
  );
};

export default CanvasPushPage;
