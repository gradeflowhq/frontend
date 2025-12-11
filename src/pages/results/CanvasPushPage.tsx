import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import ErrorAlert from '@components/common/ErrorAlert';
import UserSettingsDialog from '@components/common/UserSettingsDialog';
import { Button } from '@components/ui/Button';
import { IconChevronLeft } from '@components/ui/Icon';
import LoadingButton from '@components/ui/LoadingButton';
import { useAssessment } from '@features/assessments/hooks';
import { pickValue } from '@features/canvas/helpers';
import { useCanvasData, useCourseData } from '@features/canvas/hooks/useCanvasData';
import { useCanvasProgress } from '@features/canvas/hooks/useCanvasProgress';
import { useCanvasPush } from '@features/canvas/hooks/useCanvasPush';
import { useCsvGrades } from '@features/canvas/hooks/useCsvGrades';
import { usePreparedRows } from '@features/canvas/hooks/usePreparedRows';
import { AssessmentPassphraseProvider, useAssessmentPassphrase } from '@features/encryption/AssessmentPassphraseProvider';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { useCanvasPushStore } from '@state/canvasSettingsStore';
import { useUserSettingsStore } from '@state/userSettingsStore';
import { useToast } from '@components/common/ToastProvider';

import AssignmentSection from '../../features/canvas/components/AssignmentSection';
import CanvasPushProgressBanner from '../../features/canvas/components/CanvasPushProgressBanner';
import CourseSelector from '../../features/canvas/components/CourseSelector';
import PreviewSection from '../../features/canvas/components/PreviewSection';
import { type PreviewTab } from '../../features/canvas/types';

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
  const toast = useToast();

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
    progressUrl,
    setConfig,
  } = useCanvasPushStore(assessmentId);
  
  const [includeComments, setIncludeComments] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [previewTab, setPreviewTab] = useState<PreviewTab>('mapped');

  // Load CSV grades
  const csvGrades = useCsvGrades(assessmentId, roundingBase ?? 0, passphrase ?? '', notifyEncryptedDetected);

  // Load Canvas data
  const canvasData = useCanvasData(canvasBaseUrl, canvasToken);
  const courseData = useCourseData(courseId, canvasBaseUrl, canvasToken);

  // Compute numeric points
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

  // Prepare rows for preview and pushing
  const { preparedRows, mappedRows, unmappedRows } = usePreparedRows(
    csvGrades.rows,
    csvGrades.decryptedIds,
    courseData.roster,
    enableRounding,
    includeComments
  );

  // Push logic
  const { pushState, push, setPushState } = useCanvasPush();

  // Poll Canvas progress if we have a progress URL
  const progressQuery = useCanvasProgress(
    canvasBaseUrl,
    canvasToken,
    progressUrl,
    !!progressUrl
  );

  // Store progress URL when push succeeds
  useEffect(() => {
    if (pushState.status === 'success' && pushState.progressUrl && pushState.progressUrl !== progressUrl) {
      setConfig({ progressUrl: pushState.progressUrl });
    }
  }, [pushState, progressUrl, setConfig]);

  useEffect(() => {
    if (pushState.status === 'error') {
      toast.error(pushState.message, 'Canvas push failed');
    } else if (pushState.status === 'success' && !progressUrl) {
      toast.success(pushState.message);
    }
  }, [pushState, progressUrl, toast]);

  const handleClearProgress = () => {
    setConfig({ progressUrl: undefined });
  };

  // Filter assignments by group
  const filteredAssignments = useMemo(() => {
    if (!assignmentGroupId) return [];
    const groupId = Number(assignmentGroupId);
    return courseData.assignments.filter(a => Number(a.assignment_group_id) === groupId);
  }, [courseData.assignments, assignmentGroupId]);

  // Clear assignment ID if the selected assignment no longer exists
  useEffect(() => {
    if (assignmentId && assignmentGroupId && filteredAssignments.length > 0) {
      const assignmentExists = filteredAssignments.some(a => a.id.toString() === assignmentId);
      if (!assignmentExists) {
        setConfig({ assignmentId: '', assignmentName: assessmentRes?.name ?? '' });
      }
    }
  }, [assignmentId, assignmentGroupId, filteredAssignments, assessmentRes?.name, setConfig]);

  // Sync assignment name from assessment
  useEffect(() => {
    if (!assignmentName && assessmentRes?.name) {
      setConfig({ assignmentName: assessmentRes.name });
    }
  }, [assignmentName, assessmentRes?.name, setConfig]);

  // Sync points possible based on grade mode
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
      pointsPossible: found?.points_possible ?? pointsPossible
    });
  };

  const handlePush = () => {
    const name = (assignmentName || assessmentRes?.name || 'GradeFlow Assignment').trim();
    
    if (canvasData.missingConfig) {
      setPushState({ status: 'error', message: 'Configure Canvas base URL and token first.' });
      setShowSettings(true);
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
  const disablePush = canvasData.missingConfig || !courseId || !csvGrades.rows.length || hasActiveJob;

  return (
    <section className="space-y-4">
      <CanvasPushHeader
        assignmentName={assessmentRes?.name || 'Assessment'}
        onBack={() => void navigate(`/results/${assessmentId}`)}
      />

      {/* Show progress banner if there's an active push job */}
      {(pushState.status === 'pushing' || (progressUrl && progressQuery.data)) && (
        <CanvasPushProgressBanner
          progress={progressQuery.data}
          isPushing={pushState.status === 'pushing'}
          onClear={handleClearProgress}
        />
      )}

      {canvasData.missingConfig && (
        <div className="alert alert-warning flex items-center gap-3">
          <span>Set your Canvas base URL and token first.</span>
          <Button className="ml-auto" size="sm" variant="outline" onClick={() => setShowSettings(true)}>
            Open Settings
          </Button>
        </div>
      )}

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

      {courseId && (
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
        />
      )}

      {!isLoadingData && csvGrades.isError && (
        <ErrorAlert error={csvGrades.error as Error} />
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
        <ErrorAlert error={new Error(pushState.message)} />
      )}
      {pushState.status === 'success' && !progressUrl && (
        <div className="alert alert-success">
          <span>{pushState.message}</span>
        </div>
      )}

      <div className="flex items-center gap-2 justify-end">
        <LoadingButton
          variant="primary"
          onClick={handlePush}
          isLoading={pushState.status === 'pushing' || !!hasActiveJob}
          idleLabel="Push to Canvas"
          loadingLabel="Pushing..."
          disabled={disablePush}
        />
      </div>

      <UserSettingsDialog open={showSettings} onClose={() => setShowSettings(false)} />
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
