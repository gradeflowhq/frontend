import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

// Enable the plugins once
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

export type DateInput = string | number | Date | dayjs.Dayjs;

export type SmartFormatOptions = {
  // When to consider a date "recent" and use relative time.
  // Default: 7 days (in ms).
  recentThresholdMs?: number;

  // Timezone handling: leave undefined to use system/browser zone.
  // Example: 'Asia/Singapore'
  zone?: string;

  // Formatting patterns when not using relative time
  // Defaults: show time for same-year entries; include year for other years.
  sameYearPattern?: string;     // e.g., 'MMM D, HH:mm'
  otherYearPattern?: string;    // e.g., 'MMM D, YYYY, HH:mm'

  // If true, always show the time component in the formatted date.
  // If false, sameYearPattern/otherYearPattern can omit time if desired.
  includeTime?: boolean;

  // If true, return both primary (chosen) and secondary (the other) strings.
  // Useful when you want to render the “other” in a tooltip or subtitle.
  returnBoth?: boolean;

  // If false, relative strings omit suffix (“ago”/“in …”).
  withRelativeSuffix?: boolean;
};

const DEFAULT_RECENT_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Normalize to a Day.js instance with optional timezone applied
const asDayjs = (v: DateInput, zone?: string) => {
  const d = dayjs(v);
  if (!d.isValid()) return null;
  return zone ? d.tz(zone) : d;
};

export const formatRelative = (v: DateInput, opts?: { zone?: string; withSuffix?: boolean }) => {
  const d = asDayjs(v, opts?.zone);
  if (!d) return '—';
  return opts?.withSuffix === false ? d.fromNow(true) : d.fromNow();
};

// Pick a date pattern based on whether date is in the same year as “now”
const pickPattern = (d: dayjs.Dayjs, includeTime?: boolean, sameYearPattern?: string, otherYearPattern?: string) => {
  const sameYearDefault = includeTime ? 'MMM D, HH:mm' : 'MMM D';
  const otherYearDefault = includeTime ? 'MMM D, YYYY, HH:mm' : 'MMM D, YYYY';
  const same = sameYearPattern ?? sameYearDefault;
  const other = otherYearPattern ?? otherYearDefault;
  return d.isSame(dayjs(), 'year') ? same : other;
};

export const formatAbsolute = (
  v: DateInput,
  opts?: { zone?: string; pattern?: string; includeTime?: boolean; sameYearPattern?: string; otherYearPattern?: string }
) => {
  const d = asDayjs(v, opts?.zone);
  if (!d) return '—';
  const pattern =
    opts?.pattern ??
    pickPattern(d, opts?.includeTime, opts?.sameYearPattern, opts?.otherYearPattern);
  return d.format(pattern);
};

/**
 * Smartly format a date:
 * - If within recentThresholdMs of now (past or future), show relative (e.g., "3 hours ago", "in 2 days")
 * - Otherwise, show a formatted absolute date/time.
 *
 * If returnBoth is true, returns { primary, secondary }; otherwise just the primary string.
 */
export const formatSmart = (
  v: DateInput,
  options: SmartFormatOptions = {}
): string | { primary: string; secondary: string } => {
  const {
    recentThresholdMs = DEFAULT_RECENT_THRESHOLD_MS,
    zone,
    sameYearPattern,
    otherYearPattern,
    includeTime = true,
    returnBoth = false,
    withRelativeSuffix = true,
  } = options;

  const d = asDayjs(v, zone);
  if (!d) return returnBoth ? { primary: '—', secondary: '' } : '—';

  const diffAbsMs = Math.abs(d.valueOf() - dayjs().valueOf());
  const useRelative = diffAbsMs <= recentThresholdMs;

  const relative = withRelativeSuffix ? d.fromNow() : d.fromNow(true);
  const absolute = d.format(
    pickPattern(d, includeTime, sameYearPattern, otherYearPattern)
  );

  const primary = useRelative ? relative : absolute;
  const secondary = useRelative ? absolute : relative;

  return returnBoth ? { primary, secondary } : primary;
};