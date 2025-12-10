import React from 'react';

import { type CanvasAssignmentGroup, type CanvasAssignmentSummary } from '@api/canvasClient';

import { InfoRow, LoadingBadge } from './InfoRow';

type AssignmentSectionProps = {
  loadingCourseData: boolean;
  assignments: CanvasAssignmentSummary[];
  assignmentGroups: CanvasAssignmentGroup[];
  assignmentId: string;
  assignmentName: string;
  assessmentName?: string;
  assignmentGroupId: string;
  enableRounding: boolean;
  roundingBase: number;
  includeComments: boolean;
  gradeMode: 'points' | 'percent';
  onAssignmentSelect: (value: string) => void;
  onAssignmentNameChange: (value: string) => void;
  onAssignmentGroupChange: (value: string) => void;
  onEnableRoundingChange: (value: boolean) => void;
  onRoundingBaseChange: (value: number) => void;
  onIncludeCommentsChange: (value: boolean) => void;
  onGradeModeChange: (value: 'points' | 'percent') => void;
};

const AssignmentSection: React.FC<AssignmentSectionProps> = ({
  loadingCourseData,
  assignments,
  assignmentGroups,
  assignmentId,
  assignmentName,
  assessmentName,
  assignmentGroupId,
  enableRounding,
  roundingBase,
  includeComments,
  gradeMode,
  onAssignmentSelect,
  onAssignmentNameChange,
  onAssignmentGroupChange,
  onEnableRoundingChange,
  onRoundingBaseChange,
  onIncludeCommentsChange,
  onGradeModeChange,
}) => {
  const showNameInput = !assignmentId || assignmentId === '__new__';
  const assignmentDisabled = loadingCourseData || !assignmentGroupId;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <InfoRow
        title="Assignment"
        action={loadingCourseData ? <LoadingBadge label="Loading Canvas data" /> : undefined}
      >
        <div className="space-y-4">
          <fieldset className="fieldset space-y-2">
            <legend className="fieldset-legend">Assignment group</legend>
            <select
              className="select select-bordered"
              value={assignmentGroupId}
              disabled={loadingCourseData}
              onChange={(e) => onAssignmentGroupChange(e.target.value)}
            >
              <option value="" disabled>
                Select a group first
              </option>
              {assignmentGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </fieldset>

          <fieldset className="fieldset space-y-2">
            <legend className="fieldset-legend">Assignment</legend>
            <select
              className="select select-bordered"
              value={assignmentId || '__new__'}
              onChange={(e) => onAssignmentSelect(e.target.value)}
              disabled={assignmentDisabled}
            >
              <option value="__new__">Create new assignment...</option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </fieldset>

          {showNameInput && (
            <fieldset className="fieldset space-y-2">
              <legend className="fieldset-legend">New assignment name</legend>
              <input
                className="input input-bordered"
                value={assignmentName || assessmentName || ''}
                onChange={(e) => onAssignmentNameChange(e.target.value)}
                placeholder="GradeFlow Results"
              />
            </fieldset>
          )}
        </div>
      </InfoRow>

      <InfoRow title="Grading">
        <div className="space-y-4">
          <fieldset className="fieldset space-y-2">
            <legend className="fieldset-legend">Mode</legend>
            <div className="join">
              <button
                type="button"
                className={`btn btn-sm join-item ${gradeMode === 'points' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => onGradeModeChange('points')}
              >
                Points
              </button>
              <button
                type="button"
                className={`btn btn-sm join-item ${gradeMode === 'percent' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => onGradeModeChange('percent')}
              >
                Percentage
              </button>
            </div>
          </fieldset>

          <fieldset className="fieldset space-y-2">
            <legend className="fieldset-legend">Rounding</legend>
            <label className="cursor-pointer label justify-start gap-3">
              <input
                type="checkbox"
                className="checkbox"
                checked={enableRounding}
                onChange={(e) => onEnableRoundingChange(e.target.checked)}
              />
              <span className="label-text">Round scores</span>
            </label>
            {enableRounding && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-base-content/70">Base</span>
                <input
                  type="number"
                  className="input input-bordered"
                  value={roundingBase}
                  onChange={(e) => onRoundingBaseChange(Number(e.target.value))}
                  min={0.01}
                  step={0.05}
                  style={{ maxWidth: 120 }}
                />
              </div>
            )}
          </fieldset>

          <fieldset className="fieldset space-y-2">
            <legend className="fieldset-legend">Comments</legend>
            <label className="cursor-pointer label justify-start gap-3">
              <input
                type="checkbox"
                className="checkbox"
                checked={includeComments}
                onChange={(e) => onIncludeCommentsChange(e.target.checked)}
              />
              <span className="label-text">Include per-question remarks</span>
            </label>
          </fieldset>
        </div>
      </InfoRow>
    </div>
  );
};

export default AssignmentSection;
