import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { api } from '@api';
import { QK } from '@api/queryKeys';
import { isNotFoundError } from '@utils/error';

import type { JsonValue } from '@api/models';

const PUBLISH_CONFIG_METADATA_KEY = 'canvas_publish_config';
const SAVE_DEBOUNCE_MS = 350;

export type CanvasPublishConfig = {
  courseId: string;
  assignmentId: string;
  assignmentName: string;
  assignmentGroupId: string;
  newGroupName: string;
  newGroupWeight?: number;
  pointsPossible: number;
  enableRounding: boolean;
  roundingBase: number;
  gradeMode: 'points' | 'percent';
  includeQuestionRemarks: boolean;
  progressUrl?: string;
};

export type CanvasPublishConfigState = CanvasPublishConfig & {
  isLoading: boolean;
  isReady: boolean;
  isError: boolean;
  error: unknown;
  isSaving: boolean;
  setConfig: (patch: Partial<CanvasPublishConfig>) => void;
  reset: (overrides?: Partial<CanvasPublishConfig>) => void;
};

const DEFAULT_CONFIG: CanvasPublishConfig = {
  courseId: '',
  assignmentId: '',
  assignmentName: '',
  assignmentGroupId: '',
  newGroupName: '',
  newGroupWeight: undefined,
  pointsPossible: 0,
  enableRounding: true,
  roundingBase: 0.5,
  gradeMode: 'points',
  includeQuestionRemarks: true,
  progressUrl: undefined,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const stringValue = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const optionalStringValue = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const numberValue = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const optionalNumberValue = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const booleanValue = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const gradeModeValue = (value: unknown): CanvasPublishConfig['gradeMode'] =>
  value === 'percent' ? 'percent' : 'points';

const normalizeConfig = (value?: Partial<CanvasPublishConfig>): CanvasPublishConfig => {
  const merged = { ...DEFAULT_CONFIG, ...value };
  const roundingBase = numberValue(merged.roundingBase, DEFAULT_CONFIG.roundingBase);
  const pointsPossible = numberValue(merged.pointsPossible, DEFAULT_CONFIG.pointsPossible);

  return {
    courseId: stringValue(merged.courseId),
    assignmentId: stringValue(merged.assignmentId),
    assignmentName: stringValue(merged.assignmentName),
    assignmentGroupId: stringValue(merged.assignmentGroupId),
    newGroupName: stringValue(merged.newGroupName),
    newGroupWeight: optionalNumberValue(merged.newGroupWeight),
    pointsPossible: Math.max(0, pointsPossible),
    enableRounding: booleanValue(merged.enableRounding, DEFAULT_CONFIG.enableRounding),
    roundingBase: roundingBase > 0 ? roundingBase : DEFAULT_CONFIG.roundingBase,
    gradeMode: gradeModeValue(merged.gradeMode),
    includeQuestionRemarks: booleanValue(
      merged.includeQuestionRemarks,
      DEFAULT_CONFIG.includeQuestionRemarks
    ),
    progressUrl: optionalStringValue(merged.progressUrl),
  };
};

const parseConfig = (value: unknown): CanvasPublishConfig => {
  if (!isRecord(value)) return DEFAULT_CONFIG;
  return normalizeConfig({
    courseId: value.courseId,
    assignmentId: value.assignmentId,
    assignmentName: value.assignmentName,
    assignmentGroupId: value.assignmentGroupId,
    newGroupName: value.newGroupName,
    newGroupWeight: value.newGroupWeight,
    pointsPossible: value.pointsPossible,
    enableRounding: value.enableRounding,
    roundingBase: value.roundingBase,
    gradeMode: value.gradeMode,
    includeQuestionRemarks: value.includeQuestionRemarks,
    progressUrl: value.progressUrl,
  } as Partial<CanvasPublishConfig>);
};

const serializeConfig = (config: CanvasPublishConfig): JsonValue => {
  const value: Record<string, JsonValue> = {
    courseId: config.courseId,
    assignmentId: config.assignmentId,
    assignmentName: config.assignmentName,
    assignmentGroupId: config.assignmentGroupId,
    newGroupName: config.newGroupName,
    pointsPossible: config.pointsPossible,
    enableRounding: config.enableRounding,
    roundingBase: config.roundingBase,
    gradeMode: config.gradeMode,
    includeQuestionRemarks: config.includeQuestionRemarks,
  };

  if (config.newGroupWeight !== undefined) {
    value.newGroupWeight = config.newGroupWeight;
  }
  if (config.progressUrl) {
    value.progressUrl = config.progressUrl;
  }

  return value;
};

const configsEqual = (a: CanvasPublishConfig, b: CanvasPublishConfig): boolean =>
  a.courseId === b.courseId &&
  a.assignmentId === b.assignmentId &&
  a.assignmentName === b.assignmentName &&
  a.assignmentGroupId === b.assignmentGroupId &&
  a.newGroupName === b.newGroupName &&
  a.newGroupWeight === b.newGroupWeight &&
  a.pointsPossible === b.pointsPossible &&
  a.enableRounding === b.enableRounding &&
  a.roundingBase === b.roundingBase &&
  a.gradeMode === b.gradeMode &&
  a.includeQuestionRemarks === b.includeQuestionRemarks &&
  a.progressUrl === b.progressUrl;

export const useCanvasPublishConfig = (assessmentId: string): CanvasPublishConfigState => {
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => QK.assessments.metadataValue(assessmentId, PUBLISH_CONFIG_METADATA_KEY),
    [assessmentId]
  );

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        const response = await api.getAssessmentMetadataValueAssessmentsAssessmentIdMetadataKeyGet(
          assessmentId,
          PUBLISH_CONFIG_METADATA_KEY
        );
        return parseConfig(response.data.value);
      } catch (error) {
        if (isNotFoundError(error)) return DEFAULT_CONFIG;
        throw error;
      }
    },
    enabled: Boolean(assessmentId),
    staleTime: Infinity,
  });

  const mutation = useMutation({
    mutationKey: ['canvas-publish-config', assessmentId, 'save'],
    scope: { id: `canvas-publish-config:${assessmentId}` },
    mutationFn: async (config: CanvasPublishConfig) => {
      const response = await api.setAssessmentMetadataValueAssessmentsAssessmentIdMetadataKeyPut(
        assessmentId,
        PUBLISH_CONFIG_METADATA_KEY,
        { value: serializeConfig(config) }
      );
      return parseConfig(response.data.value);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QK.assessments.metadata(assessmentId) });
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
  const { mutate: saveConfig, isPending: isSaving } = mutation;
  const pendingSaveRef = useRef<CanvasPublishConfig | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  const config = query.data ?? DEFAULT_CONFIG;

  const flushSave = useCallback(() => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    const pendingConfig = pendingSaveRef.current;
    pendingSaveRef.current = null;

    if (pendingConfig) {
      saveConfig(pendingConfig);
    }
  }, [saveConfig]);

  const scheduleSave = useCallback(
    (nextConfig: CanvasPublishConfig) => {
      pendingSaveRef.current = nextConfig;

      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = window.setTimeout(() => {
        flushSave();
      }, SAVE_DEBOUNCE_MS);
    },
    [flushSave]
  );

  useEffect(() => flushSave, [flushSave]);

  const persist = useCallback(
    (nextConfig: CanvasPublishConfig) => {
      queryClient.setQueryData(queryKey, nextConfig);
      scheduleSave(nextConfig);
    },
    [queryClient, queryKey, scheduleSave]
  );

  const setConfig = useCallback(
    (patch: Partial<CanvasPublishConfig>) => {
      const current = queryClient.getQueryData<CanvasPublishConfig>(queryKey) ?? DEFAULT_CONFIG;
      const nextConfig = normalizeConfig({ ...current, ...patch });
      if (configsEqual(current, nextConfig)) return;
      persist(nextConfig);
    },
    [persist, queryClient, queryKey]
  );

  const reset = useCallback(
    (overrides?: Partial<CanvasPublishConfig>) => {
      const current = queryClient.getQueryData<CanvasPublishConfig>(queryKey) ?? DEFAULT_CONFIG;
      const nextConfig = normalizeConfig(overrides);
      if (configsEqual(current, nextConfig)) return;
      persist(nextConfig);
    },
    [persist, queryClient, queryKey]
  );

  return {
    ...config,
    isLoading: query.isPending,
    isReady: query.isSuccess,
    isError: query.isError,
    error: query.error,
    isSaving,
    setConfig,
    reset,
  };
};
