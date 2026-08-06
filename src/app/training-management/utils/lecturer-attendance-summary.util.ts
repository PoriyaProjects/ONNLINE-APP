import { TrainingAttendanceRow, TrainingAttendanceStatus } from '../models';

export interface LecturerAttendanceSummary {
  registered: number;
  confirmed: number;
  awaiting: number;
  missing: number;
  cancelled: number;
  remaining: number;
}

export function summarizeLecturerAttendance(rows: TrainingAttendanceRow[]): LecturerAttendanceSummary {
  const list = rows || [];
  let registered = 0;
  let confirmed = 0;
  let awaiting = 0;
  let cancelled = 0;
  list.forEach((r) => {
    if (r.AttendanceStatus === TrainingAttendanceStatus.Revoked) {
      cancelled += 1;
      return;
    }
    registered += 1;
    if (
      r.AttendanceStatus === TrainingAttendanceStatus.Confirmed ||
      r.AttendanceStatus === TrainingAttendanceStatus.ManuallyConfirmed
    ) {
      confirmed += 1;
    } else if (r.AttendanceStatus === TrainingAttendanceStatus.Pending || r.AttendanceStatus == null) {
      awaiting += 1;
    }
  });
  const missing = Math.max(0, registered - confirmed);
  return {
    registered,
    confirmed,
    awaiting,
    missing,
    cancelled,
    remaining: missing,
  };
}

export function isAttendanceConfirmedStatus(status: number | null | undefined): boolean {
  return (
    status === TrainingAttendanceStatus.Confirmed || status === TrainingAttendanceStatus.ManuallyConfirmed
  );
}
