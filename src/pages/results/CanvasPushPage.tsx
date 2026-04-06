import { Accordion, Alert, Box, Button, Group, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconSettings } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { createCanvasClient, parseCanvasBaseUrl } from '@api/canvasClient';
import PageShell from '@components/common/PageShell';
import SectionStatusBadge from '@components/common/SectionStatusBadge';
import { useAssessment } from '@features/assessments/api';
import { useCanvasData, useCourseData } from '@features/canvas/api/useCanvasData';
import { useCanvasProgress } from '@features/canvas/api/useCanvasProgress';
import { useCanvasPush } from '@features/canvas/api/useCanvasPush';
import { useCsvGrades } from '@features/canvas/api/useCsvGrades';
import { usePreparedRows } from '@features/canvas/api/usePreparedRows';
import { pickValue } from '@features/canvas/helpers';
import { useAssessmentPassphrase } from '@features/encryption/passphraseContext';
import { useGrading } from '@features/grading/api';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { useCanvasPushStore } from '@state/canvasStore';
import { useUserSettingsStore } from '@state/userStore';
import { getErrorMessage } from '@utils/error';

import AssignmentSection from '../../features/canvas/components/AssignmentSection';
import CourseSelector from '../../features/canvas/components/CourseSelector';
import PreviewSection from '../../features/canvas/components/PreviewSection';
import PushProgressBanner from '../../features/canvas/components/PushProgressBanner';
import { type PreviewTab } from '../../features/canvas/types';

const CanvasPushInner: React.FC<{ assessmentId: string }> = ({ assessmentId }) => {
  const { passphrase, notifyEncryptedDetected } = useAssessmentPassphrase();
  const { data: assessmentRes } = useAssessment(assessmentId, true);

  useDocumentTitle(`Push to Canvas - ${assessmentRes?.name ?? 'Assessment'} - GradeFlow`);

  const navigate = useNavigate();
  const goToSettings = () => void navigate('/settings?tab=integrations');

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
    progressUrl,
    setConfig,
  } = useCanvasPushStore(assessmentId);

  const [includeComments, setIncludeComments] = useState(true);
  const [previewTab, setPreviewTab] = useState<PreviewTab>('mapped');
  const [openSteps, setOpenSteps] = useState<string[]>(() => ['connection']);

  const csvGrades = useCsvGrades(assessmentId, roundingBase ?? 0, passphrase ?? '', notifyEncryptedDetected);
  const { data: gradingData } = useGrading(assessmentId, Boolean(assessmentId));
  const canvasData = useCanvasData(canvasBaseUrl, canvasToken);
  const courseData = useCourseData(courseId, canvasBaseUrl, canvasToken);

  // Fetch Canvas current user for display in the connection step
  const parsedCanvasUrl = parseCanvasBaseUrl(canvasBaseUrl);
  const { data: canvasUser } = useQuery({
    queryKey: ['canvas', 'me', canvasBaseUrl, canvasToken],
    queryFn: async () => {
      const client = createCanvasClient({ canvasBaseUrl: parsedCanvasUrl!, token: canvasToken });
      const res = await client.getCurrentUser();
      return res.data;
    },
    enabled: !!parsedCanvasUrl && !!canvasToken && !canvasData.missingConfig && !canvasData.isError,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const canvasUserLabel =
    canvasUser?.name ??
    canvasUser?.short_name ??
    canvasUser?.sortable_name ??
    canvasUser?.login_id ??
    null;

  const csvTotalMax = useMemo(() => {
    const first = csvGrades.rows.find(row => Number.isFinite(row.roundedTotalMaxPoints ?? row.totalMaxPoints));
    const raw = first?.totalMaxPoints ?? 0;
    const rounded = first?.roundedTotalMaxPoints ?? undefined;
    return pickValue(rounded, raw, enableRounding) ?? 0;
  }, [csvGrades.rows, enableRounding]);

  const numericPoints = useMemo(() => {
    const parsed = Number(pointsPossible);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    if (csvTotalMax > 0) return csvTotalMax;
    return gradeMode === 'percent' ? 100 : 0;
  }, [pointsPossible, csvTotalMax, gradeMode]);

  const { preparedRows, mappedRows, unmappedRows } = usePreparedRows(
    csvGrades.rows,
    csvGrades.decryptedIds,
    courseData.roster,
    enableRounding,
    includeComments
  );

  const { pushState, push, setPushState } = useCanvasPush();

  const progressQuery = useCanvasProgress(
    canvasBaseUrl,
    canvasToken,
    progressUrl,
    !!progressUrl
  );

  useEffect(() => {
    if (pushState.status === 'success' && pushState.progressUrl && pushState.progressUrl !== progressUrl) {
      setConfig({ progressUrl: pushState.progressUrl });
    }
  }, [pushState, progressUrl, setConfig]);

  useEffect(() => {
    if (pushState.status === 'error') {
      notifications.show({ color: 'red', message: pushState.message || 'Canvas push failed' });
    } else if (pushState.status === 'success' && !pushState.progressUrl) {
      // Canvas returned no progress URL — push completed synchronously
      notifications.show({ color: 'green', message: pushState.message || 'Push complete' });
    }
  }, [pushState]);

  const handleClearProgress = () => {
    setConfig({ progressUrl: undefined });
  };

  const filteredAssignments = useMemo(() => {
    if (!assignmentGroupId) return [];
    const groupId = Number(assignmentGroupId);
    return courseData.assignments.filter(a => Number(a.assignment_group_id) === groupId);
  }, [courseData.assignments, assignmentGroupId]);

  useEffect(() => {
    if (assignmentId && assignmentGroupId && !courseData.isLoading && courseData.assignments.length > 0) {
      const assignmentExists = filteredAssignments.some(a => a.id.toString() === assignmentId);
      if (!assignmentExists) {
        setConfig({ assignmentId: '', assignmentName: assessmentRes?.name ?? '' });
      }
    }
  }, [assignmentId, assignmentGroupId, filteredAssignments, courseData.isLoading, courseData.assignments.length, assessmentRes?.name, setConfig]);

  useEffect(() => {
    if (!assignmentName && assessmentRes?.name) {
      setConfig({ assignmentName: assessmentRes.name });
    }
  }, [assignmentName, assessmentRes?.name, setConfig]);

  useEffect(() => {
    const nextPoints = gradeMode === 'percent' ? 100 : csvTotalMax;
    if (Number.isFinite(nextPoints) && nextPoints > 0 && nextPoints !== pointsPossible) {
      setConfig({ pointsPossible: nextPoints });
    }
  }, [gradeMode, csvTotalMax, pointsPossible, setConfig]);

  const handleCourseChange = (value: string) => {
    if (value === courseId) return;
    setPushState({ status: 'idle' });
    setPreviewTab('mapped');
    setConfig({ courseId: value, assignmentId: '', assignmentName: assessmentRes?.name ?? '', assignmentGroupId: '' });
  };

  const handleAssignmentGroupChange = (value: string) => {
    setConfig({ assignmentGroupId: value, assignmentId: '', assignmentName: assessmentRes?.name ?? '' });
  };

  const handleAssignmentSelect = (value: string) => {
    if (!value) {
      setConfig({ assignmentId: '', assignmentName: assessmentRes?.name ?? '' });
      return;
    }
    const found = filteredAssignments.find(a => a.id.toString() === value);
    setConfig({
      assignmentId: value,
      assignmentName: found?.name ?? assignmentName,
      pointsPossible: found?.points_possible ?? pointsPossible,
    });
  };

  const handlePush = () => {
    const name = (assignmentName || assessmentRes?.name || 'GradeFlow Assignment').trim();

    if (canvasData.missingConfig) {
      setPushState({ status: 'error', message: 'Configure Canvas base URL and token first.' });
      goToSettings();
      return;
    }

    void push(
      preparedRows,
      courseData.assignments,
      {
        canvasBaseUrl,
        canvasToken,
        courseId,
        assignmentId,
        assignmentName: name,
        assignmentGroupId,
        gradeMode,
        includeComments,
        numericPoints,
      },
      (id, name, points) => setConfig({ assignmentId: id, assignmentName: name, pointsPossible: points })
    );
  };

  const isLoadingData = csvGrades.isLoading;
  const hasActiveJob = progressQuery.data &&
    (progressQuery.data.workflow_state === 'queued' || progressQuery.data.workflow_state === 'running');
  const disablePush = canvasData.missingConfig || !courseId || !csvGrades.rows.length || !!hasActiveJob;

  const isConnected = !canvasData.missingConfig && !canvasData.isError;
  const courseLabel = courseId
    ? canvasData.courses.find(c => String(c.id) === courseId)?.name ?? courseId
    : null;

  // Assignment accordion summary — requires at minimum a group to be selected
  const selectedGroupName = useMemo(
    () => courseData.assignmentGroups.find(g => g.id.toString() === assignmentGroupId)?.name ?? null,
    [courseData.assignmentGroups, assignmentGroupId]
  );
  const selectedAssignmentName = useMemo(() => {
    if (!assignmentId) return null;
    return filteredAssignments.find(a => a.id.toString() === assignmentId)?.name ?? assignmentName ?? null;
  }, [assignmentId, filteredAssignments, assignmentName]);

  const assignmentSummary = useMemo(() => {
    if (!assignmentGroupId || !selectedGroupName) return null;
    const parts: string[] = [selectedGroupName];
    parts.push(selectedAssignmentName ?? (assignmentName || 'New assignment'));
    return parts.join(' · ');
  }, [assignmentGroupId, selectedGroupName, selectedAssignmentName, assignmentName]);

  // Grade settings accordion summary
  const gradeSettingsSummary = useMemo(() => {
    if (!courseId) return null;
    const parts: string[] = [];
    parts.push(gradeMode === 'percent' ? 'Percentage' : 'Points');
    if (enableRounding) parts.push(`Round to ${roundingBase}`);
    parts.push(includeComments ? 'With comments' : 'No comments');
    return parts.join(' · ');
  }, [courseId, gradeMode, enableRounding, roundingBase, includeComments]);

  return (
    <PageShell title="Push to Canvas">
      <Stack gap="md" pb={72}>

        {(pushState.status === 'pushing' || (progressUrl && progressQuery.data)) && (
          <PushProgressBanner
            progress={progressQuery.data}
            isPushing={pushState.status === 'pushing'}
            onClear={handleClearProgress}
          />
        )}

        <SectionStatusBadge
          isStale={gradingData?.status?.is_stale}
          staleMessage="Grading results may be out of date — submissions or rules changed since the last run. Consider re-running grading before publishing."
        />

        <Accordion
          multiple
          value={openSteps}
          onChange={setOpenSteps}
          variant="separated"
        >
          {/* Step 1: Canvas Connection */}
          <Accordion.Item value="connection">
            <Accordion.Control>
              <Group gap="xs" align="center">
                {isConnected && <IconCheck size={14} color="var(--mantine-color-green-6)" />}
                <Text fw={500}>Canvas Connection</Text>
                {isConnected && canvasUserLabel && (
                  <Text size="sm" c="dimmed" ml="xs">Connected as {canvasUserLabel}</Text>
                )}
                {isConnected && !canvasUserLabel && (
                  <Text size="sm" c="dimmed" ml="xs">Connected</Text>
                )}
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              {canvasData.missingConfig ? (
                <Group align="center" gap="sm">
                  <Text size="sm">Not configured. Set your Canvas base URL and token.</Text>
                  <Button
                    size="xs"
                    leftSection={<IconSettings size={14} />}
                    variant="default"
                    onClick={goToSettings}
                  >
                    Open Settings
                  </Button>
                </Group>
              ) : canvasData.isError ? (
                <Group align="center" gap="sm">
                  <Text size="sm" c="red">Connection error — check your Canvas URL and token.</Text>
                  <Button size="xs" variant="default" onClick={goToSettings}>Update Settings</Button>
                  <Button size="xs" variant="default" onClick={() => void canvasData.refetch()}>Retry</Button>
                </Group>
              ) : (
                <Group align="center" gap="sm">
                  <Text size="sm" c="dimmed">
                    Connected{canvasUserLabel ? ` as ${canvasUserLabel}` : ''}.
                  </Text>
                  <Button size="xs" variant="subtle" onClick={goToSettings}>Change</Button>
                </Group>
              )}
            </Accordion.Panel>
          </Accordion.Item>

          {/* Step 2: Course */}
          <Accordion.Item value="course">
            <Accordion.Control>
              <Group gap="xs" align="center">
                {courseId && <IconCheck size={14} color="var(--mantine-color-green-6)" />}
                <Text fw={500}>Course</Text>
                {courseLabel && (
                  <Text size="sm" c="dimmed" ml="xs">{courseLabel}</Text>
                )}
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <CourseSelector
                courseId={courseId}
                courses={canvasData.courses}
                loadingCourses={canvasData.isLoading}
                missingCanvasConfig={canvasData.missingConfig}
                onCourseChange={handleCourseChange}
                onRefresh={async () => {
                  await canvasData.refetch();
                }}
              />
            </Accordion.Panel>
          </Accordion.Item>

          {/* Step 3: Assignment */}
          <Accordion.Item value="assignment">
            <Accordion.Control>
              <Group gap="xs" align="center">
                {assignmentSummary && <IconCheck size={14} color="var(--mantine-color-green-6)" />}
                <Text fw={500}>Assignment</Text>
                {assignmentSummary && (
                  <Text size="sm" c="dimmed" ml="xs">{assignmentSummary}</Text>
                )}
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <AssignmentSection
                loadingCourseData={courseData.isLoading}
                assignments={filteredAssignments}
                assignmentGroups={courseData.assignmentGroups}
                assignmentId={assignmentId}
                assignmentName={assignmentName}
                assessmentName={assessmentRes?.name}
                assignmentGroupId={assignmentGroupId}
                enableRounding={enableRounding}
                roundingBase={roundingBase ?? 0}
                includeComments={includeComments}
                gradeMode={gradeMode}
                onAssignmentSelect={handleAssignmentSelect}
                onAssignmentNameChange={value => setConfig({ assignmentName: value })}
                onAssignmentGroupChange={handleAssignmentGroupChange}
                onEnableRoundingChange={value => setConfig({ enableRounding: value })}
                onRoundingBaseChange={value => setConfig({ roundingBase: value })}
                onIncludeCommentsChange={setIncludeComments}
                onGradeModeChange={value => setConfig({ gradeMode: value })}
                onRefresh={async () => {
                  await courseData.refetch();
                }}
                showAssignment
                showGradeSettings={false}
              />
            </Accordion.Panel>
          </Accordion.Item>

          {/* Step 4: Grade Settings */}
          <Accordion.Item value="grade-settings">
            <Accordion.Control>
              <Group gap="xs" align="center">
                {gradeSettingsSummary && <IconCheck size={14} color="var(--mantine-color-green-6)" />}
                <Text fw={500}>Grade Settings</Text>
                {gradeSettingsSummary && (
                  <Text size="sm" c="dimmed" ml="xs">{gradeSettingsSummary}</Text>
                )}
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <AssignmentSection
                loadingCourseData={courseData.isLoading}
                assignments={filteredAssignments}
                assignmentGroups={courseData.assignmentGroups}
                assignmentId={assignmentId}
                assignmentName={assignmentName}
                assessmentName={assessmentRes?.name}
                assignmentGroupId={assignmentGroupId}
                enableRounding={enableRounding}
                roundingBase={roundingBase ?? 0}
                includeComments={includeComments}
                gradeMode={gradeMode}
                onAssignmentSelect={handleAssignmentSelect}
                onAssignmentNameChange={value => setConfig({ assignmentName: value })}
                onAssignmentGroupChange={handleAssignmentGroupChange}
                onEnableRoundingChange={value => setConfig({ enableRounding: value })}
                onRoundingBaseChange={value => setConfig({ roundingBase: value })}
                onIncludeCommentsChange={setIncludeComments}
                onGradeModeChange={value => setConfig({ gradeMode: value })}
                onRefresh={async () => {
                  await courseData.refetch();
                }}
                showAssignment={false}
                showGradeSettings
              />
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>

        {!isLoadingData && csvGrades.isError && (
          <Alert color="red">{getErrorMessage(csvGrades.error as Error)}</Alert>
        )}

        {courseId && (
          <PreviewSection
            mappedRows={mappedRows}
            unmappedRows={unmappedRows}
            previewTab={previewTab}
            onTabChange={setPreviewTab}
            loadingCourseData={courseData.isLoading || isLoadingData}
            gradeMode={gradeMode}
          />
        )}

        {pushState.status === 'error' && (
          <Alert color="red">{pushState.message || 'Push failed'}</Alert>
        )}
        {pushState.status === 'success' && !progressUrl && (
          <Alert color="green">{pushState.message}</Alert>
        )}
      </Stack>

      {/* Sticky footer */}
      <Box
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: '12px 24px',
          backgroundColor: 'var(--mantine-color-body)',
          borderTop: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <Group justify="flex-end">
          <Button
            onClick={handlePush}
            loading={pushState.status === 'pushing' || !!hasActiveJob}
            disabled={disablePush}
          >
            Push {mappedRows.length > 0 ? `${mappedRows.length} ` : ''}Grades to Canvas
          </Button>
        </Group>
      </Box>
    </PageShell>
  );
};

const CanvasPushPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  if (!assessmentId) {
    return <Alert color="red">Assessment ID is missing.</Alert>;
  }
  return <CanvasPushInner assessmentId={assessmentId} />;
};

export default CanvasPushPage;