import type { CsvMapping } from '@features/submissions/types';

/**
 * Question column inference with confidence scoring in [0, 1].
 * Constants are grouped at the top for easy tuning.
 */

// ======================= Constants (tunable) =======================

// Threshold for auto-selection
export const DEFAULT_MIN_CONFIDENCE = 0.75;

// Header keyword signals
export const HEADER_KEYWORDS = [
  'question',
  'q',
  'answer',
  'ans',
  'response',
  'choice',
  'options',
  'mcq',
  'mrq',
];

// Auxiliary terms (treated as secondary info for series like Q1, Q1 Pts, Q1 Marks, etc.)
export const AUXILIARY_TERMS = ['pts', 'points', 'marks', 'score', 'rubric', 'explain', 'comment'];

// Patterns for header detection (lowercased)
export const HEADER_PATTERNS = {
  qNum: /\bq[_\-\s]*\d+\b/,
  questionNum: /\bquestion[_\-\s]*\d+\b/,
  endsWithNum: /\d+\s*$/,
};

// Common token separators for MRQ (multi-answers)
export const TOKEN_SEPARATORS = /[,|;~]+/;

// Value-level metadata patterns
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const TIMESTAMP_REGEX = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?$/;
export const SHORT_ID_REGEX = /^[A-Za-z0-9\-_]{6,12}$/;

// Choice signals (case-insensitive via toUpperCase)
export const CHOICE_LETTERS = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
export const CHOICE_WORDS = new Set([
  'true',
  'false',
  'yes',
  'no',
  'y',
  'n',
]);

// Sigmoid baseline bias (negative value reduces "select everything")
export const SIGMOID_BIAS = -0.4;

// Weights for the confidence model (weighted sum -> sigmoid)
export const WEIGHTS = {
  headerKeyword: 0.8,
  headerPattern: 0.6,
  isAuxiliary: -1.0,
  normLen: 0.5,
  sentencePunctRate: 0.7,
  uniqueRate: 0.4,
  singleLetterRate: 0.8,
  choiceWordRate: 0.8,
  smallAlphabet: 0.5,
  smallTokens: 0.4,
  emailRate: -0.8,
  tsRate: -0.6,
  shortIdRate: -0.5,
};

// Normalization cap for average length (characters)
export const AVG_LEN_CAP = 200;

// ======================= Utilities =======================

export const arraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

export const ensureValidStudentId = (
  headers: string[],
  candidate: string | undefined | null
): string => {
  if (candidate && headers.includes(candidate)) return candidate;
  return headers[0] ?? '';
};

export const sanitizeQuestions = (
  headers: string[],
  studentId: string,
  selected: string[] | undefined | null
): string[] => {
  const set = new Set(headers);
  return Array.isArray(selected) ? selected.filter((q) => set.has(q) && q !== studentId) : [];
};

// ======================= Header signals =======================

const headerContainsKeyword = (h: string): boolean => {
  const s = h.toLowerCase();
  return HEADER_KEYWORDS.some((kw) => s.includes(kw));
};

const headerMatchesPattern = (h: string): boolean => {
  const s = h.toLowerCase();
  return (
    HEADER_PATTERNS.qNum.test(s) ||
    HEADER_PATTERNS.questionNum.test(s) ||
    HEADER_PATTERNS.endsWithNum.test(s)
  );
};

/**
 * Build series map to group headers like "q1", "q1 pts", "q1 marks".
 */
const buildSeriesAuxiliaryMap = (headers: string[]): Map<string, Set<string>> => {
  const map = new Map<string, Set<string>>();
  const norm = (s: string) => s.toLowerCase().trim();

  const baseOf = (h: string): string | null => {
    const s = norm(h);
    const mQ = s.match(HEADER_PATTERNS.qNum);
    if (mQ) return `q${mQ[0].match(/\d+/)?.[0] ?? ''}`.trim();
    const mQuestion = s.match(HEADER_PATTERNS.questionNum);
    if (mQuestion) return `question${mQuestion[0].match(/\d+/)?.[0] ?? ''}`.trim();
    return null;
  };

  headers.forEach((h) => {
    const base = baseOf(h);
    if (!base) return;
    const set = map.get(base) ?? new Set<string>();
    set.add(norm(h));
    map.set(base, set);
  });

  return map;
};

/**
 * Treat headers like "Q1 Pts", "Question 1 marks" as auxiliary of their base.
 */
const isAuxiliaryOfSeries = (h: string, seriesMap: Map<string, Set<string>>): boolean => {
  const s = h.toLowerCase().trim();

  const baseMatchQ = s.match(HEADER_PATTERNS.qNum);
  const baseMatchQuestion = s.match(HEADER_PATTERNS.questionNum);
  const base =
    baseMatchQ ? `q${baseMatchQ[0].match(/\d+/)?.[0] ?? ''}`.trim()
    : baseMatchQuestion ? `question${baseMatchQuestion[0].match(/\d+/)?.[0] ?? ''}`.trim()
    : null;

  if (!base) return false;
  if (s === base) return false;
  if (AUXILIARY_TERMS.some((kw) => s.includes(kw))) return true;
  const members = seriesMap.get(base);
  return !!members && members.size > 1;
};

// ======================= Value signals (MCQ/MRQ aware) =======================

const detectChoiceLike = (values: string[]): {
  singleLetterRate: number;
  choiceWordRate: number;
  smallAlphabet: boolean;
  smallTokens: boolean;
} => {
  if (values.length === 0) {
    return { singleLetterRate: 0, choiceWordRate: 0, smallAlphabet: false, smallTokens: false };
  }

  const trimmed = values.map((v) => String(v ?? '').trim()).filter((v) => v.length > 0);
  if (trimmed.length === 0) {
    return { singleLetterRate: 0, choiceWordRate: 0, smallAlphabet: false, smallTokens: false };
  }

  const splitTokens = (v: string) =>
    v.split(TOKEN_SEPARATORS).map((s) => s.trim()).filter(Boolean);

  const allTokens = trimmed.flatMap(splitTokens);
  if (allTokens.length === 0) {
    return { singleLetterRate: 0, choiceWordRate: 0, smallAlphabet: false, smallTokens: false };
  }

  const lowerTokens = allTokens.map((t) => t.toLowerCase());
  const uniqueTokens = Array.from(new Set(lowerTokens));

  const tokenCount = uniqueTokens.length;
  const smallAlphabet = tokenCount >= 2 && tokenCount <= 10;

  const singleLetterRate =
    lowerTokens.filter((t) => t.length === 1 && CHOICE_LETTERS.has(t.toUpperCase())).length /
    lowerTokens.length;

  const choiceWordRate = lowerTokens.filter((t) => CHOICE_WORDS.has(t)).length / lowerTokens.length;

  const avgTokenLen = lowerTokens.reduce((s, t) => s + t.length, 0) / lowerTokens.length;
  const smallTokens = avgTokenLen <= 3;

  return { singleLetterRate, choiceWordRate, smallAlphabet, smallTokens };
};

// ======================= Confidence scoring =======================

const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z));

type ColumnSignals = {
  headerKeyword: boolean;
  headerPattern: boolean;
  isAuxiliary: boolean;
  avgLen: number;
  sentencePunctRate: number;
  uniqueRate: number;
  emailRate: number;
  tsRate: number;
  shortIdRate: number;
  singleLetterRate: number;
  choiceWordRate: number;
  smallAlphabet: boolean;
  smallTokens: boolean;
};

const computeConfidence = (s: ColumnSignals): number => {
  const normLen = Math.min(s.avgLen / AVG_LEN_CAP, 1);

  const z =
    (s.headerKeyword ? WEIGHTS.headerKeyword : 0) +
    (s.headerPattern ? WEIGHTS.headerPattern : 0) +
    (s.isAuxiliary ? WEIGHTS.isAuxiliary : 0) +
    (normLen * WEIGHTS.normLen) +
    (s.sentencePunctRate * WEIGHTS.sentencePunctRate) +
    (s.uniqueRate * WEIGHTS.uniqueRate) +
    (s.singleLetterRate * WEIGHTS.singleLetterRate) +
    (s.choiceWordRate * WEIGHTS.choiceWordRate) +
    (s.smallAlphabet ? WEIGHTS.smallAlphabet : 0) +
    (s.smallTokens ? WEIGHTS.smallTokens : 0) +
    (s.emailRate * WEIGHTS.emailRate) +
    (s.tsRate * WEIGHTS.tsRate) +
    (s.shortIdRate * WEIGHTS.shortIdRate) +
    SIGMOID_BIAS;

  return Math.max(0, Math.min(1, sigmoid(z)));
};

type ColumnScoreInput = {
  header: string;
  values: string[];
  seriesMap: Map<string, Set<string>>;
};

const confidenceForColumn = ({ header, values, seriesMap }: ColumnScoreInput): number => {
  const headerKeyword = headerContainsKeyword(header);
  const headerPattern = headerMatchesPattern(header);
  const isAuxiliary = isAuxiliaryOfSeries(header, seriesMap);

  const trimmed = values.map((v) => String(v ?? '').trim());
  const avgLen = trimmed.reduce((s, v) => s + v.length, 0) / (trimmed.length || 1);
  const sentencePunctRate =
    trimmed.reduce((s, v) => s + (/[.!?]/.test(v) ? 1 : 0), 0) / (trimmed.length || 1);
  const emailRate = trimmed.reduce((s, v) => s + (EMAIL_REGEX.test(v) ? 1 : 0), 0) / (trimmed.length || 1);
  const tsRate = trimmed.reduce((s, v) => s + (TIMESTAMP_REGEX.test(v) ? 1 : 0), 0) / (trimmed.length || 1);
  const shortIdRate = trimmed.reduce((s, v) => s + (SHORT_ID_REGEX.test(v) ? 1 : 0), 0) / (trimmed.length || 1);

  const uniqueSet = new Set(trimmed.filter((v) => v.length > 0));
  const uniqueRate = uniqueSet.size / (trimmed.length || 1);

  const { singleLetterRate, choiceWordRate, smallAlphabet, smallTokens } = detectChoiceLike(trimmed);

  return computeConfidence({
    headerKeyword,
    headerPattern,
    isAuxiliary,
    avgLen,
    sentencePunctRate,
    uniqueRate,
    emailRate,
    tsRate,
    shortIdRate,
    singleLetterRate,
    choiceWordRate,
    smallAlphabet,
    smallTokens,
  });
};

// ======================= Public API (answer columns) =======================

export const computeAutoScores = (
  headers: string[],
  rows: string[][]
): { header: string; confidence: number }[] => {
  const seriesMap = buildSeriesAuxiliaryMap(headers);
  const colValues: string[][] = headers.map((_h, ci) => rows.map((r) => String(r[ci] ?? '').trim()));

  return headers
    .map((h, ci) => ({
      header: h,
      confidence: confidenceForColumn({ header: h, values: colValues[ci], seriesMap }),
    }))
    .sort((a, b) => b.confidence - a.confidence);
};

export const computeAutoQuestions = (
  headers: string[],
  rows: string[][],
  studentId: string,
  opts?: { minConfidence?: number }
): string[] => {
  if (!headers.length) return [];
  const minConfidence = Math.max(0, Math.min(1, opts?.minConfidence ?? DEFAULT_MIN_CONFIDENCE));

  const scores = computeAutoScores(headers, rows);
  const filtered = scores.filter((s) => s.header !== studentId && s.confidence >= minConfidence);

  if (filtered.length > 0) return filtered.map((f) => f.header);

  const fallbacks = scores.filter((s) => s.header !== studentId);
  return fallbacks.length ? [fallbacks[0].header] : [];
};

export const computeNextMapping = (
  headers: string[],
  prev: CsvMapping,
  opts?: { rowsForHeuristic?: string[][]; minConfidence?: number }
): CsvMapping => {
  const rows = opts?.rowsForHeuristic ?? [];
  const minConfidence = Math.max(0, Math.min(1, opts?.minConfidence ?? DEFAULT_MIN_CONFIDENCE));

  const nextSID = ensureValidStudentId(headers, prev.studentIdColumn);
  let nextQs = sanitizeQuestions(headers, nextSID, prev.questionColumns);

  if (nextQs.length === 0 && headers.length > 1) {
    nextQs =
      rows.length > 0
        ? computeAutoQuestions(headers, rows, nextSID, { minConfidence })
        : headers.filter((h) => h !== nextSID);
  }

  const sidChanged = nextSID !== prev.studentIdColumn;
  const qsChanged = !arraysEqual(nextQs, prev.questionColumns);

  if (sidChanged || qsChanged) {
    return { studentIdColumn: nextSID, questionColumns: nextQs };
  }
  return prev;
};

// ======================= Points column inference =======================

const POINTS_HEADER_KEYWORDS = ['pts', 'points', 'marks', 'score', 'grade', 'mark'];

const isPointsHeader = (h: string): boolean => {
  const s = h.toLowerCase();
  return POINTS_HEADER_KEYWORDS.some((kw) => s.includes(kw));
};

const numericRate = (values: string[]): number => {
  if (!values.length) return 0;
  const nonEmpty = values.filter((v) => v.trim().length > 0);
  if (!nonEmpty.length) return 0;
  const numericCount = nonEmpty.filter((v) => Number.isFinite(Number(v.trim()))).length;
  return numericCount / nonEmpty.length;
};

const MIN_POINTS_CONFIDENCE = 0.55;

/**
 * For each answer column, find the best matching points column.
 *
 * Scoring:
 *   headerScore    = 0.60 if header contains a points keyword
 *   numScore       = 0.40 * fraction of numeric values
 *   proximityBonus = 0.25 if candidate header contains the answer col name
 *   adjacencyBonus = 0.15 if candidate is the column immediately after the answer col
 *
 * A candidate is only suggested if total score >= MIN_POINTS_CONFIDENCE.
 * Each candidate column is only paired with one answer column (highest score wins).
 */
export const inferPointColumns = (
  headers: string[],
  rows: string[][],
  studentIdCol: string,
  answerCols: string[]
): Record<string, string> => {
  const answerSet = new Set(answerCols);
  const candidateHeaders = headers.filter(
    (h) => h !== studentIdCol && !answerSet.has(h)
  );

  if (!candidateHeaders.length) return {};

  // Precompute column values for candidates
  const colValues: Record<string, string[]> = {};
  for (const h of candidateHeaders) {
    const idx = headers.indexOf(h);
    colValues[h] = rows.map((r) => String(r[idx] ?? '').trim());
  }

  // Track which candidate cols have already been claimed
  const claimed = new Set<string>();
  const result: Record<string, string> = {};

  for (const ansCol of answerCols) {
    const ansLower = ansCol.toLowerCase().replace(/[^a-z0-9]/g, '');
    const ansIdx = headers.indexOf(ansCol);

    let bestCol: string | null = null;
    let bestScore = -1;

    for (const candidate of candidateHeaders) {
      if (claimed.has(candidate)) continue;

      const candLower = candidate.toLowerCase().replace(/[^a-z0-9]/g, '');
      const values = colValues[candidate];
      const candIdx = headers.indexOf(candidate);

      const headerScore = isPointsHeader(candidate) ? 0.6 : 0;
      const numScore = numericRate(values) * 0.4;
      const proximityBonus =
        candLower.startsWith(ansLower) || candLower.includes(ansLower) ? 0.25 : 0;
      const adjacencyBonus = candIdx === ansIdx + 1 ? 0.15 : 0;

      const score = headerScore + numScore + proximityBonus + adjacencyBonus;

      if (score > bestScore) {
        bestScore = score;
        bestCol = candidate;
      }
    }

    if (bestCol !== null && bestScore >= MIN_POINTS_CONFIDENCE) {
      result[ansCol] = bestCol;
      claimed.add(bestCol);
    }
  }

  return result;
};

/**
 * Top-level entry point: infer both answer columns and point columns
 * from raw CSV headers + rows and the known student ID column.
 */
export const inferColumnsFromSource = (
  headers: string[],
  rows: string[][],
  studentIdCol: string,
  opts?: { minConfidence?: number }
): { answerCols: string[]; pointColMap: Record<string, string> } => {
  const answerCols = computeAutoQuestions(headers, rows, studentIdCol, opts);
  const pointColMap = inferPointColumns(headers, rows, studentIdCol, answerCols);
  return { answerCols, pointColMap };
};