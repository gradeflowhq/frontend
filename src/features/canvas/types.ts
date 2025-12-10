export type PreviewRow = {
  gradeflowId: string;
  canvasId?: string;
  studentName?: string;
  points?: number | string;
  roundedPoints?: number | string;
  percent?: number | string;
  roundedPercent?: number | string;
  remarks?: string;
  mapped: boolean;
};

export type PreviewTab = 'mapped' | 'unmapped';
