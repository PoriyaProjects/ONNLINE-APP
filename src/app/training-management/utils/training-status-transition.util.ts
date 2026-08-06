import { TrainingAttendanceStatus, TrainingCourseStatus, TrainingSessionStatus } from '../models';

export function canActivateCourse(status: TrainingCourseStatus): boolean {
  return status === TrainingCourseStatus.Inactive || status === TrainingCourseStatus.Draft;
}

export function canDeactivateCourse(status: TrainingCourseStatus): boolean {
  return status === TrainingCourseStatus.Active;
}

export function canEditSession(status: TrainingSessionStatus): boolean {
  return (
    status === TrainingSessionStatus.Draft ||
    status === TrainingSessionStatus.Open ||
    status === TrainingSessionStatus.Full
  );
}

export function canCancelSession(status: TrainingSessionStatus): boolean {
  return (
    status !== TrainingSessionStatus.Cancelled &&
    status !== TrainingSessionStatus.Completed
  );
}

export function canManualConfirmAttendance(status: number | null | undefined): boolean {
  return status == null || status === TrainingAttendanceStatus.Pending || status === TrainingAttendanceStatus.Revoked;
}

export function canManualMarkAbsent(status: number | null | undefined): boolean {
  return status == null || status === TrainingAttendanceStatus.Pending || status === TrainingAttendanceStatus.Confirmed;
}

/** UI enablement only — backend remains authoritative. */
export function canOpenAttendanceWindow(
  sessionStatus: TrainingSessionStatus,
  attendanceWindowOpen: boolean
): boolean {
  if (attendanceWindowOpen) {
    return false;
  }
  return (
    sessionStatus !== TrainingSessionStatus.Cancelled &&
    sessionStatus !== TrainingSessionStatus.Completed
  );
}

export function canCloseAttendanceWindow(
  sessionStatus: TrainingSessionStatus,
  attendanceWindowOpen: boolean
): boolean {
  if (!attendanceWindowOpen) {
    return false;
  }
  return (
    sessionStatus !== TrainingSessionStatus.Cancelled &&
    sessionStatus !== TrainingSessionStatus.Completed
  );
}

export function canShowQr(
  sessionStatus: TrainingSessionStatus,
  attendanceWindowOpen: boolean
): boolean {
  return (
    attendanceWindowOpen &&
    sessionStatus !== TrainingSessionStatus.Cancelled &&
    sessionStatus !== TrainingSessionStatus.Completed
  );
}

export function canCompleteSession(
  sessionStatus: TrainingSessionStatus,
  attendanceWindowOpen: boolean
): boolean {
  if (attendanceWindowOpen) {
    return false;
  }
  return (
    sessionStatus !== TrainingSessionStatus.Cancelled &&
    sessionStatus !== TrainingSessionStatus.Completed &&
    (sessionStatus === TrainingSessionStatus.Open ||
      sessionStatus === TrainingSessionStatus.Full ||
      sessionStatus === TrainingSessionStatus.Closed)
  );
}
