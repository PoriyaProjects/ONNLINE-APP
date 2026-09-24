/**
 * Centralized date/time normalization for training contracts.
 * Preferred wire format: yyyy-MM-dd, HH:mm:ss, yyyy-MM-ddTHH:mm:ss
 * Also accepts Microsoft ASMX /Date(ms)/ for resilience.
 */

const MS_DATE_RE = /\/Date\((-?\d+)(?:[+-]\d+)?\)\//;

export function parseTrainingDate(value: string | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const s = String(value).trim();
  const msMatch = MS_DATE_RE.exec(s);
  if (msMatch) {
    const d = new Date(Number(msMatch[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // yyyy-MM-dd (date only) — parse as local midnight
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const parts = s.split('-').map((p) => Number(p));
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * @deprecated Prefer parseTrainingDate — training datetimes are server local (GETDATE), not UTC.
 */
export function parseTrainingUtcDateTime(value: string | Date | null | undefined): Date | null {
  return parseTrainingDate(value);
}

export function formatTrainingDate(value: Date | null | undefined): string | null {
  if (!value || Number.isNaN(value.getTime())) {
    return null;
  }
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatTrainingTime(value: Date | null | undefined): string | null {
  if (!value || Number.isNaN(value.getTime())) {
    return null;
  }
  const hh = String(value.getHours()).padStart(2, '0');
  const mm = String(value.getMinutes()).padStart(2, '0');
  const ss = String(value.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

/**
 * Display label for session StartTime/EndTime — always 24h `HH:mm`.
 * Accepts `HH:mm`, `HH:mm:ss`, Date, or datetime strings.
 */
export function formatTrainingTimeLabel(value: string | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return '';
    }
    const hh = String(value.getHours()).padStart(2, '0');
    const mm = String(value.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  const s = String(value).trim();
  const timeOnly = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (timeOnly) {
    const hh = String(Number(timeOnly[1])).padStart(2, '0');
    const mm = timeOnly[2];
    return `${hh}:${mm}`;
  }

  const d = parseTrainingDate(s);
  if (d) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  return s;
}

/** Regex for 24h clock time `HH:mm` (00:00–23:59). */
export const TRAINING_TIME_24H_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Regex for local datetime without seconds: `yyyy-MM-ddTHH:mm`. */
export const TRAINING_DATETIME_LOCAL_24H_PATTERN = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/;

/** Normalize form/API time values to `HH:mm` for wire + display. */
export function normalizeTrainingTimeOfDay(value: string | null | undefined): string {
  return formatTrainingTimeLabel(value);
}

/**
 * Normalize datetime-local style values to `yyyy-MM-ddTHH:mm` (24h).
 * Accepts space or `T` separator; drops seconds if present.
 */
export function normalizeTrainingDateTimeLocal(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  let s = String(value).trim().replace(' ', 'T');
  // yyyy-MM-ddTHH:mm:ss(.fff)? → yyyy-MM-ddTHH:mm
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?/.exec(s);
  if (m) {
    const hh = String(Number(m[2])).padStart(2, '0');
    return `${m[1]}T${hh}:${m[3]}`;
  }
  return s.length >= 16 ? s.slice(0, 16) : s;
}

export function formatTrainingDateTime(value: Date | null | undefined): string | null {
  if (!value || Number.isNaN(value.getTime())) {
    return null;
  }
  return `${formatTrainingDate(value)}T${formatTrainingTime(value)}`;
}

/**
 * Normalize a backend date string to ISO-like local date-time string, or null.
 */
export function normalizeTrainingDateString(value: string | null | undefined): string | null {
  const d = parseTrainingDate(value);
  return formatTrainingDateTime(d);
}
