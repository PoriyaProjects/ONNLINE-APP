/**
 * Shared validation rule constants for future Angular forms and C# validation.
 * Values are contract constraints, not UI validators.
 */

export const TrainingValidationLimits = {
  CourseCodeMaxLength: 50,
  CourseNameMaxLength: 200,
  CourseDescriptionMaxLength: 4000,
  LocationMaxLength: 200,
  CancelReasonMaxLength: 500,
  ManualReasonMaxLength: 500,
  IdentityNumberMaxLength: 50,
  CertificateNumberMaxLength: 50,
  MinCapacity: 1,
  MaxCapacity: 10000,
  MinDurationMinutes: 1,
  MaxDurationMinutes: 24 * 60,
  /** UI duration entry (hours); wire still DurationMinutes. */
  MinDurationHours: 1,
  MaxDurationHours: 24,
  MinValidityMonths: 1,
  MaxValidityMonths: 120,
} as const;

export const TrainingValidationCodes = {
  RequiredName: 'REQUIRED_NAME',
  RequiredCourseCode: 'REQUIRED_COURSE_CODE',
  PositiveDuration: 'POSITIVE_DURATION',
  ValidCertificatePeriod: 'VALID_CERTIFICATE_PERIOD',
  ActiveStatusRule: 'ACTIVE_STATUS_RULE',
  RequiredCourse: 'REQUIRED_COURSE',
  RequiredDate: 'REQUIRED_DATE',
  ValidStartEndTime: 'VALID_START_END_TIME',
  EndAfterStart: 'END_AFTER_START',
  PositiveCapacity: 'POSITIVE_CAPACITY',
  RegistrationDeadlineBeforeStart: 'REGISTRATION_DEADLINE_BEFORE_START',
  AttendanceWindowValidity: 'ATTENDANCE_WINDOW_VALIDITY',
  RequiredLecturer: 'REQUIRED_LECTURER',
  RequiredLocation: 'REQUIRED_LOCATION',
  RequiredEmployee: 'REQUIRED_EMPLOYEE',
  RequiredSession: 'REQUIRED_SESSION',
  DuplicateRegistration: 'DUPLICATE_REGISTRATION',
  CapacityConflict: 'CAPACITY_CONFLICT',
  RequiredQrToken: 'REQUIRED_QR_TOKEN',
  RequiredIdentity: 'REQUIRED_IDENTITY',
  ValidAttendanceWindow: 'VALID_ATTENDANCE_WINDOW',
  MatchingRegistration: 'MATCHING_REGISTRATION',
  DuplicateAttendance: 'DUPLICATE_ATTENDANCE',
  RequiredManagerAuthorization: 'REQUIRED_MANAGER_AUTHORIZATION',
  RequiredManualReason: 'REQUIRED_MANUAL_REASON',
  AuditRequired: 'AUDIT_REQUIRED',
} as const;

export interface TrainingValidationRuleDefinition {
  Code: string;
  Field: string;
  MessageHe: string;
}

export const TRAINING_VALIDATION_RULES: ReadonlyArray<TrainingValidationRuleDefinition> = [
  { Code: TrainingValidationCodes.RequiredName, Field: 'Name', MessageHe: 'שם הקורס הוא שדה חובה' },
  { Code: TrainingValidationCodes.RequiredCourseCode, Field: 'Code', MessageHe: 'קוד הקורס הוא שדה חובה' },
  { Code: TrainingValidationCodes.PositiveDuration, Field: 'DurationHours', MessageHe: 'משך הקורס בשעות חייב להיות חיובי' },
  { Code: TrainingValidationCodes.ValidCertificatePeriod, Field: 'ValidityMonths', MessageHe: 'תקופת תוקף התעודה אינה תקינה' },
  { Code: TrainingValidationCodes.RequiredCourse, Field: 'CourseId', MessageHe: 'יש לבחור קורס' },
  { Code: TrainingValidationCodes.RequiredDate, Field: 'SessionDate', MessageHe: 'תאריך המפגש הוא שדה חובה' },
  { Code: TrainingValidationCodes.EndAfterStart, Field: 'EndTime', MessageHe: 'שעת סיום חייבת להיות אחרי שעת התחלה' },
  { Code: TrainingValidationCodes.PositiveCapacity, Field: 'Capacity', MessageHe: 'קיבולת חייבת להיות חיובית' },
  { Code: TrainingValidationCodes.RegistrationDeadlineBeforeStart, Field: 'RegistrationCloseAt', MessageHe: 'מועד סגירת הרישום חייב להיות לפני תחילת המפגש' },
  { Code: TrainingValidationCodes.RequiredLecturer, Field: 'LecturerEmployeeID', MessageHe: 'יש לבחור מרצה' },
  { Code: TrainingValidationCodes.RequiredLocation, Field: 'Location', MessageHe: 'מיקום הוא שדה חובה' },
  { Code: TrainingValidationCodes.RequiredEmployee, Field: 'EmployeeID', MessageHe: 'מזהה עובד הוא שדה חובה' },
  { Code: TrainingValidationCodes.RequiredSession, Field: 'SessionId', MessageHe: 'מזהה מפגש הוא שדה חובה' },
  { Code: TrainingValidationCodes.RequiredQrToken, Field: 'QrToken', MessageHe: 'קוד QR הוא שדה חובה' },
  { Code: TrainingValidationCodes.RequiredIdentity, Field: 'IdentityNumber', MessageHe: 'מספר זהות הוא שדה חובה' },
  { Code: TrainingValidationCodes.RequiredManagerAuthorization, Field: 'TargetEmployeeID', MessageHe: 'רק מנהל ישיר יכול לרשום או לבטל הרשמה לעובד זה' },
  { Code: TrainingValidationCodes.RequiredManualReason, Field: 'ManualReason', MessageHe: 'יש לציין סיבה לעדכון ידני' },
];
