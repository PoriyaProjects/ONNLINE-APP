/** Course duration: DB/API stores minutes; UI uses hours. */

export function minutesToHours(minutes: number | null | undefined): number | null {
  if (minutes == null || Number.isNaN(Number(minutes))) {
    return null;
  }
  const h = Number(minutes) / 60;
  if (!Number.isFinite(h)) {
    return null;
  }
  // Prefer whole hours when exact; otherwise one decimal.
  if (Math.abs(h - Math.round(h)) < 1e-9) {
    return Math.round(h);
  }
  return Math.round(h * 10) / 10;
}

export function hoursToMinutes(hours: number | null | undefined): number | null {
  if (hours == null || Number.isNaN(Number(hours))) {
    return null;
  }
  const m = Math.round(Number(hours) * 60);
  return Number.isFinite(m) ? m : null;
}

export function formatDurationHoursLabel(minutes: number | null | undefined): string {
  const h = minutesToHours(minutes);
  if (h == null) {
    return '';
  }
  return `${h} שע׳`;
}
