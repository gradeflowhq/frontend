export type PreparedRow = {
  csvStudentId: string;
  decryptedStudentId: string;
  canvasId?: string;
  studentName?: string;
  selectedPoints?: number;
  selectedPercent?: number;
  maxPoints?: number;
  originalPoints?: number;
  roundedPoints?: number;
  originalPercent?: number;
  roundedPercent?: number;
  comments?: string;
};

export type PreviewTab = 'mapped' | 'unmapped';
