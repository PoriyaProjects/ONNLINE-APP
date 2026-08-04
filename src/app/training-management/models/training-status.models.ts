/**
 * Training module status INT codes (Forms convention).
 * Phase 1 base values preserved; extended codes documented for Draft/Pending/etc.
 */

/** Course: 0 Inactive, 1 Active, 2 Draft */
export enum TrainingCourseStatus {
  Inactive = 0,
  Active = 1,
  Draft = 2,
}

/** Session: 0 Cancelled, 1 Open, 2 Full, 3 Completed, 4 Draft, 5 Closed */
export enum TrainingSessionStatus {
  Cancelled = 0,
  Open = 1,
  Full = 2,
  Completed = 3,
  Draft = 4,
  Closed = 5,
}

/** Registration: 0 Cancelled, 1 Registered, 2 Attended, 3 Absent, 4 Completed */
export enum TrainingRegistrationStatus {
  Cancelled = 0,
  Registered = 1,
  Attended = 2,
  Absent = 3,
  Completed = 4,
}

/** Attendance: 0 Revoked, 1 Confirmed, 2 Pending, 3 ManuallyConfirmed */
export enum TrainingAttendanceStatus {
  Revoked = 0,
  Confirmed = 1,
  Pending = 2,
  ManuallyConfirmed = 3,
}

/** Certificate: 0 Void, 1 Issued, 2 Expired, 3 Pending, 4 Sent, 5 Failed */
export enum TrainingCertificateStatus {
  Void = 0,
  Issued = 1,
  Expired = 2,
  Pending = 3,
  Sent = 4,
  Failed = 5,
}

/** Notification: 0 Pending, 1 Sent, 2 Failed, 3 Skipped */
export enum TrainingNotificationStatus {
  Pending = 0,
  Sent = 1,
  Failed = 2,
  Skipped = 3,
}

export enum TrainingNotificationType {
  SessionReminder = 1,
  CertificateEmail = 2,
  SessionCancelled = 3,
}

export enum TrainingNotificationChannel {
  Email = 1,
  InternalApp = 2,
}

export enum TrainingAttendanceSource {
  Qr = 1,
  Manual = 2,
}

/** Phase 8 compliance cell / row status (server-authoritative). */
export enum TrainingComplianceStatus {
  Compliant = 1,
  ExpiringSoon = 2,
  Expired = 3,
  Missing = 4,
  NotApplicable = 5,
  Pending = 6,
}

export const TRAINING_COMPLIANCE_STATUS_HE: Readonly<Record<TrainingComplianceStatus, string>> = {
  [TrainingComplianceStatus.Compliant]: 'עומד בדרישות',
  [TrainingComplianceStatus.ExpiringSoon]: 'פג תוקף בקרוב',
  [TrainingComplianceStatus.Expired]: 'פג תוקף',
  [TrainingComplianceStatus.Missing]: 'חסר',
  [TrainingComplianceStatus.NotApplicable]: 'לא רלוונטי',
  [TrainingComplianceStatus.Pending]: 'ממתין להשלמה',
};

export const TRAINING_COURSE_STATUS_HE: Readonly<Record<TrainingCourseStatus, string>> = {
  [TrainingCourseStatus.Inactive]: 'לא פעיל',
  [TrainingCourseStatus.Active]: 'פעיל',
  [TrainingCourseStatus.Draft]: 'טיוטה',
};

export const TRAINING_SESSION_STATUS_HE: Readonly<Record<TrainingSessionStatus, string>> = {
  [TrainingSessionStatus.Cancelled]: 'בוטל',
  [TrainingSessionStatus.Open]: 'פתוח',
  [TrainingSessionStatus.Full]: 'מלא',
  [TrainingSessionStatus.Completed]: 'הושלם',
  [TrainingSessionStatus.Draft]: 'טיוטה',
  [TrainingSessionStatus.Closed]: 'סגור',
};

export const TRAINING_REGISTRATION_STATUS_HE: Readonly<Record<TrainingRegistrationStatus, string>> = {
  [TrainingRegistrationStatus.Cancelled]: 'בוטל',
  [TrainingRegistrationStatus.Registered]: 'רשום',
  [TrainingRegistrationStatus.Attended]: 'נכח',
  [TrainingRegistrationStatus.Absent]: 'לא נכח',
  [TrainingRegistrationStatus.Completed]: 'הושלם',
};

export const TRAINING_ATTENDANCE_STATUS_HE: Readonly<Record<TrainingAttendanceStatus, string>> = {
  [TrainingAttendanceStatus.Revoked]: 'בוטל',
  [TrainingAttendanceStatus.Confirmed]: 'אושר',
  [TrainingAttendanceStatus.Pending]: 'ממתין',
  [TrainingAttendanceStatus.ManuallyConfirmed]: 'אושר ידנית',
};

export const TRAINING_CERTIFICATE_STATUS_HE: Readonly<Record<TrainingCertificateStatus, string>> = {
  [TrainingCertificateStatus.Void]: 'מבוטל',
  [TrainingCertificateStatus.Issued]: 'הונפק',
  [TrainingCertificateStatus.Expired]: 'פג תוקף',
  [TrainingCertificateStatus.Pending]: 'ממתין',
  [TrainingCertificateStatus.Sent]: 'נשלח',
  [TrainingCertificateStatus.Failed]: 'נכשל',
};

export const TRAINING_NOTIFICATION_STATUS_HE: Readonly<Record<TrainingNotificationStatus, string>> = {
  [TrainingNotificationStatus.Pending]: 'ממתין',
  [TrainingNotificationStatus.Sent]: 'נשלח',
  [TrainingNotificationStatus.Failed]: 'נכשל',
  [TrainingNotificationStatus.Skipped]: 'דולג',
};

export function trainingStatusLabel(
  map: Readonly<Record<number, string>>,
  status: number | null | undefined,
  fallback: string = ''
): string {
  if (status === null || status === undefined) {
    return fallback;
  }
  return map[status] != null ? map[status] : fallback;
}
