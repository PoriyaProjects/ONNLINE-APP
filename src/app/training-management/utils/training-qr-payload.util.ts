/**
 * Builds the future Phase 6 employee attendance deep-link encoded in lecturer QR.
 * Route is not registered in Phase 5.
 */
export function buildTrainingAttendanceQrPayload(token: string): string {
  const t = (token || '').trim();
  if (!t) {
    return '';
  }
  const origin = typeof window !== 'undefined' && window.location ? window.location.origin : '';
  const path = typeof window !== 'undefined' && window.location ? window.location.pathname : '';
  return `${origin}${path}#/training-management/attendance/${encodeURIComponent(t)}`;
}
