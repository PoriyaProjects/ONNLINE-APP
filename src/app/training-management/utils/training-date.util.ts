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
