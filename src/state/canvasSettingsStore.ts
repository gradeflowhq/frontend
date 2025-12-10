import { useCallback } from 'react';
import { create } from 'zustand';

export type CanvasPushConfig = {
  courseId: string;
  assignmentId: string;
  assignmentName: string;
  assignmentGroupId: string;
  pointsPossible: number;
  enableRounding: boolean;
  roundingBase: number;
  gradeMode: 'points' | 'percent';
  progressUrl?: string;
};

export type CanvasPushStore = CanvasPushConfig & {
  setConfig: (patch: Partial<CanvasPushConfig>) => void;
  reset: (overrides?: Partial<CanvasPushConfig>) => void;
};

type CanvasPushState = {
  configs: Record<string, CanvasPushConfig>;
  setConfigForAssessment: (assessmentId: string, patch: Partial<CanvasPushConfig>) => void;
  resetForAssessment: (assessmentId: string, overrides?: Partial<CanvasPushConfig>) => void;
};

const STORAGE_KEY = 'canvas_sync_config_v1';

const DEFAULT_CONFIG: CanvasPushConfig = {
  courseId: '',
  assignmentId: '',
  assignmentName: '',
  assignmentGroupId: '',
  pointsPossible: 0,
  enableRounding: true,
  roundingBase: 0.5,
  gradeMode: 'points',
  progressUrl: undefined,
};

const pickPersistable = (state: CanvasPushConfig): CanvasPushConfig => ({
  courseId: state.courseId,
  assignmentId: state.assignmentId,
  assignmentName: state.assignmentName,
  assignmentGroupId: state.assignmentGroupId,
  pointsPossible: state.pointsPossible,
  enableRounding: state.enableRounding,
  roundingBase: state.roundingBase,
  gradeMode: state.gradeMode,
  progressUrl: state.progressUrl,
});

const parseConfig = (value?: Partial<CanvasPushConfig>): CanvasPushConfig => ({
  ...DEFAULT_CONFIG,
  ...value,
});

const loadConfigs = (): Record<string, CanvasPushConfig> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<CanvasPushConfig>> | undefined;
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.fromEntries(
      Object.entries(parsed).map(([assessmentId, cfg]) => [assessmentId, parseConfig(cfg)])
    );
  } catch {
    return {};
  }
};

const persistConfigs = (configs: Record<string, CanvasPushConfig>) => {
  try {
    const persistable = Object.fromEntries(
      Object.entries(configs).map(([assessmentId, cfg]) => [assessmentId, pickPersistable(cfg)])
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
  } catch {
    // ignore persistence errors
  }
};

const useCanvasPushState = create<CanvasPushState>((set) => ({
  configs: loadConfigs(),
  setConfigForAssessment: (assessmentId, patch) =>
    set((state) => {
      const previous = state.configs[assessmentId] ?? DEFAULT_CONFIG;
      const nextConfig = parseConfig({ ...previous, ...patch });
      const configs = { ...state.configs, [assessmentId]: nextConfig };
      persistConfigs(configs);
      return { configs };
    }),
  resetForAssessment: (assessmentId, overrides) =>
    set((state) => {
      const nextConfig = parseConfig(overrides);
      const configs = { ...state.configs, [assessmentId]: nextConfig };
      persistConfigs(configs);
      return { configs };
    }),
}));

export const useCanvasPushStore = (assessmentId: string): CanvasPushStore => {
  const config = useCanvasPushState(
    (state) => state.configs[assessmentId] ?? DEFAULT_CONFIG
  );

  const setConfigForAssessment = useCanvasPushState((state) => state.setConfigForAssessment);
  const resetForAssessment = useCanvasPushState((state) => state.resetForAssessment);

  const setConfig = useCallback(
    (patch: Partial<CanvasPushConfig>) => setConfigForAssessment(assessmentId, patch),
    [assessmentId, setConfigForAssessment]
  );

  const reset = useCallback(
    (overrides?: Partial<CanvasPushConfig>) => resetForAssessment(assessmentId, overrides),
    [assessmentId, resetForAssessment]
  );

  return { ...config, setConfig, reset };
};
