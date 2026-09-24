/**
 * Standard training API result shapes.
 * ASMX still wraps the payload as `{ d: TrainingApiResult<T> }`.
 */

export interface TrainingApiValidationError {
  Field: string;
  Code: string;
  Message: string;
}

export interface TrainingApiError {
  ErrorCode: string;
  Message: string;
  ValidationErrors?: TrainingApiValidationError[] | null;
}

export interface TrainingApiResult<T> {
  Success: boolean;
  Data?: T | null;
  Message?: string | null;
  ErrorCode?: string | null;
  ValidationErrors?: TrainingApiValidationError[] | null;
  TotalCount?: number | null;
  CorrelationId?: string | null;
}

export interface TrainingApiListData<T> {
  Items: T[];
  TotalCount: number;
}

export interface TrainingPagedRequest {
  Skip?: number;
  Take?: number;
}

export interface TrainingSortRequest {
  SortBy?: string | null;
  SortDescending?: boolean;
}

export interface TrainingPagedResponse<T> {
  Items: T[];
  TotalCount: number;
  Skip: number;
  Take: number;
}

/** Business error codes (must match C# TrainingErrorCodes). */
export const TrainingErrorCodes = {
  CourseNotFound: 'TRAINING_COURSE_NOT_FOUND',
  SessionNotFound: 'TRAINING_SESSION_NOT_FOUND',
  SessionNotOpen: 'TRAINING_SESSION_NOT_OPEN',
  SessionFull: 'TRAINING_SESSION_FULL',
  RegistrationClosed: 'TRAINING_REGISTRATION_CLOSED',
  AlreadyRegistered: 'TRAINING_ALREADY_REGISTERED',
  RegistrationNotFound: 'TRAINING_REGISTRATION_NOT_FOUND',
  CancellationNotAllowed: 'TRAINING_CANCELLATION_NOT_ALLOWED',
  QrInvalid: 'TRAINING_QR_INVALID',
  QrExpired: 'TRAINING_QR_EXPIRED',
  AttendanceWindowClosed: 'TRAINING_ATTENDANCE_WINDOW_CLOSED',
  EmployeeNotRegistered: 'TRAINING_EMPLOYEE_NOT_REGISTERED',
  AttendanceAlreadyConfirmed: 'TRAINING_ATTENDANCE_ALREADY_CONFIRMED',
  CertificateNotEligible: 'TRAINING_CERTIFICATE_NOT_ELIGIBLE',
  CertificateGenerationFailed: 'TRAINING_CERTIFICATE_GENERATION_FAILED',
  EmailDeliveryFailed: 'TRAINING_EMAIL_DELIVERY_FAILED',
  Unauthorized: 'TRAINING_UNAUTHORIZED',
  ValidationFailed: 'TRAINING_VALIDATION_FAILED',
  Conflict: 'TRAINING_CONFLICT',
  /** Phase 3: Training* tables / SPs not yet deployed. */
  DataStoreUnavailable: 'TRAINING_DATA_STORE_UNAVAILABLE',
  /** Phase 4 admin errors */
  CourseCodeExists: 'TRAINING_COURSE_CODE_EXISTS',
  CourseInactive: 'TRAINING_COURSE_INACTIVE',
  InvalidStatusTransition: 'TRAINING_INVALID_STATUS_TRANSITION',
  SessionNotEditable: 'TRAINING_SESSION_NOT_EDITABLE',
  SessionAlreadyCancelled: 'TRAINING_SESSION_ALREADY_CANCELLED',
  SessionAlreadyCompleted: 'TRAINING_SESSION_ALREADY_COMPLETED',
  SessionInvalidTimeRange: 'TRAINING_SESSION_INVALID_TIME_RANGE',
  SessionInvalidRegistrationDeadline: 'TRAINING_SESSION_INVALID_REGISTRATION_DEADLINE',
  SessionInvalidAttendanceWindow: 'TRAINING_SESSION_INVALID_ATTENDANCE_WINDOW',
  CapacityBelowRegistrations: 'TRAINING_CAPACITY_BELOW_REGISTRATIONS',
  LecturerNotFound: 'TRAINING_LECTURER_NOT_FOUND',
  LocationInvalid: 'TRAINING_LOCATION_INVALID',
  InvalidAttendanceTransition: 'TRAINING_INVALID_ATTENDANCE_TRANSITION',
  DatabaseDependencyMissing: 'TRAINING_DATABASE_DEPENDENCY_MISSING',
  /** Phase 5 lecturer / attendance-window errors */
  AttendanceAlreadyOpen: 'TRAINING_ATTENDANCE_ALREADY_OPEN',
  AttendanceOpenNotAllowed: 'TRAINING_ATTENDANCE_OPEN_NOT_ALLOWED',
  AttendanceNotOpen: 'TRAINING_ATTENDANCE_NOT_OPEN',
  AttendanceWindowStillOpen: 'TRAINING_ATTENDANCE_WINDOW_STILL_OPEN',
  SessionNotReadyForCompletion: 'TRAINING_SESSION_NOT_READY_FOR_COMPLETION',
  LecturerNotAssigned: 'TRAINING_LECTURER_NOT_ASSIGNED',
  /** Phase 6 employee QR confirmation */
  QrRevoked: 'TRAINING_QR_REVOKED',
  AttendanceWindowNotOpen: 'TRAINING_ATTENDANCE_WINDOW_NOT_OPEN',
  AttendanceWindowExpired: 'TRAINING_ATTENDANCE_WINDOW_EXPIRED',
  IdentityMismatch: 'TRAINING_IDENTITY_MISMATCH',
  EmployeeNotFound: 'TRAINING_EMPLOYEE_NOT_FOUND',
  RegistrationCancelled: 'TRAINING_REGISTRATION_CANCELLED',
  SessionCancelled: 'TRAINING_SESSION_CANCELLED',
  /** Phase 7 certificates / email / reminders */
  CertificateNotFound: 'TRAINING_CERTIFICATE_NOT_FOUND',
  CertificateAlreadyExists: 'TRAINING_CERTIFICATE_ALREADY_EXISTS',
  CertificateTemplateMissing: 'TRAINING_CERTIFICATE_TEMPLATE_MISSING',
  CertificateSignatureMissing: 'TRAINING_CERTIFICATE_SIGNATURE_MISSING',
  CertificateNumberFailed: 'TRAINING_CERTIFICATE_NUMBER_FAILED',
  CertificateFileNotFound: 'TRAINING_CERTIFICATE_FILE_NOT_FOUND',
  CertificateAccessDenied: 'TRAINING_CERTIFICATE_ACCESS_DENIED',
  CertificateCancelled: 'TRAINING_CERTIFICATE_CANCELLED',
  CertificateEmployeeEmailMissing: 'TRAINING_CERTIFICATE_EMPLOYEE_EMAIL_MISSING',
  CertificateDownloadFailed: 'TRAINING_CERTIFICATE_DOWNLOAD_FAILED',
  EmailConfigurationMissing: 'TRAINING_EMAIL_CONFIGURATION_MISSING',
  EmailRecipientMissing: 'TRAINING_EMAIL_RECIPIENT_MISSING',
  EmailAttachmentTooLarge: 'TRAINING_EMAIL_ATTACHMENT_TOO_LARGE',
  EmailAlreadySent: 'TRAINING_EMAIL_ALREADY_SENT',
  EmailSendInProgress: 'TRAINING_EMAIL_SEND_IN_PROGRESS',
  EmailRetryLimitReached: 'TRAINING_EMAIL_RETRY_LIMIT_REACHED',
  NotificationConfigurationMissing: 'TRAINING_NOTIFICATION_CONFIGURATION_MISSING',
  NotificationRecipientMissing: 'TRAINING_NOTIFICATION_RECIPIENT_MISSING',
  NotificationDeliveryFailed: 'TRAINING_NOTIFICATION_DELIVERY_FAILED',
  NotificationAlreadySent: 'TRAINING_NOTIFICATION_ALREADY_SENT',
  NotificationSendInProgress: 'TRAINING_NOTIFICATION_SEND_IN_PROGRESS',
  NotificationRetryLimitReached: 'TRAINING_NOTIFICATION_RETRY_LIMIT_REACHED',
  SessionNotCompleted: 'TRAINING_SESSION_NOT_COMPLETED',
  AttendanceNotConfirmed: 'TRAINING_ATTENDANCE_NOT_CONFIRMED',
  /** Phase 8 reporting */
  ReportUnauthorized: 'TRAINING_REPORT_UNAUTHORIZED',
  ReportInvalidFilter: 'TRAINING_REPORT_INVALID_FILTER',
  ReportInvalidDateRange: 'TRAINING_REPORT_INVALID_DATE_RANGE',
  ReportDateRangeTooLarge: 'TRAINING_REPORT_DATE_RANGE_TOO_LARGE',
  ReportInvalidSort: 'TRAINING_REPORT_INVALID_SORT',
  ReportEmployeeNotFound: 'TRAINING_REPORT_EMPLOYEE_NOT_FOUND',
  ReportDepartmentNotAllowed: 'TRAINING_REPORT_DEPARTMENT_NOT_ALLOWED',
  ReportDataUnavailable: 'TRAINING_REPORT_DATA_UNAVAILABLE',
  ReportExportFailed: 'TRAINING_REPORT_EXPORT_FAILED',
  ReportExportTooLarge: 'TRAINING_REPORT_EXPORT_TOO_LARGE',
  ReportComplianceRulesMissing: 'TRAINING_REPORT_COMPLIANCE_RULES_MISSING',
  ReportDependencyMissing: 'TRAINING_REPORT_DEPENDENCY_MISSING',
} as const;

export type TrainingErrorCode = typeof TrainingErrorCodes[keyof typeof TrainingErrorCodes];

export const TRAINING_ERROR_MESSAGE_HE: Readonly<Record<string, string>> = {
  [TrainingErrorCodes.CourseNotFound]: 'הקורס לא נמצא',
  [TrainingErrorCodes.SessionNotFound]: 'המפגש לא נמצא',
  [TrainingErrorCodes.SessionNotOpen]: 'המפגש אינו פתוח לרישום',
  [TrainingErrorCodes.SessionFull]: 'המפגש מלא',
  [TrainingErrorCodes.RegistrationClosed]: 'הרישום למפגש נסגר',
  [TrainingErrorCodes.AlreadyRegistered]: 'לעובד כבר קיימת הרשמה למפגש זה',
  [TrainingErrorCodes.RegistrationNotFound]: 'ההרשמה לא נמצאה',
  [TrainingErrorCodes.CancellationNotAllowed]: 'לא ניתן לבטל את ההרשמה',
  [TrainingErrorCodes.QrInvalid]: 'קוד QR אינו תקין',
  [TrainingErrorCodes.QrExpired]: 'קוד QR פג תוקף',
  [TrainingErrorCodes.AttendanceWindowClosed]: 'חלון הנוכחות סגור',
  [TrainingErrorCodes.EmployeeNotRegistered]: 'העובד אינו רשום למפגש',
  [TrainingErrorCodes.AttendanceAlreadyConfirmed]: 'הנוכחות כבר אושרה',
  [TrainingErrorCodes.CertificateNotEligible]: 'אין זכאות לתעודה',
  [TrainingErrorCodes.CertificateGenerationFailed]: 'יצירת התעודה נכשלה',
  [TrainingErrorCodes.EmailDeliveryFailed]: 'שליחת האימייל נכשלה',
  [TrainingErrorCodes.Unauthorized]: 'אין הרשאה — רק מנהל ישיר או מנהל הדרכות יכול לבצע פעולה זו',
  [TrainingErrorCodes.ValidationFailed]: 'שגיאת אימות נתונים',
  [TrainingErrorCodes.Conflict]: 'התנגשות בעדכון הנתונים',
  [TrainingErrorCodes.DataStoreUnavailable]:
    'מערכת ההדרכות עדיין לא מוכנה (מאגר הנתונים לא הוגדר). פנה למנהל המערכת.',
  [TrainingErrorCodes.CourseCodeExists]: 'קוד הקורס כבר קיים במערכת',
  [TrainingErrorCodes.CourseInactive]: 'הקורס אינו פעיל',
  [TrainingErrorCodes.InvalidStatusTransition]: 'מעבר הסטטוס אינו מותר',
  [TrainingErrorCodes.SessionNotEditable]: 'לא ניתן לערוך את המועד במצב הנוכחי',
  [TrainingErrorCodes.SessionAlreadyCancelled]: 'המועד כבר בוטל',
  [TrainingErrorCodes.SessionAlreadyCompleted]: 'המועד כבר הושלם',
  [TrainingErrorCodes.SessionInvalidTimeRange]: 'שעת הסיום חייבת להיות מאוחרת משעת ההתחלה',
  [TrainingErrorCodes.SessionInvalidRegistrationDeadline]: 'מועד סגירת הרישום אינו תקין ביחס לתחילת המפגש',
  [TrainingErrorCodes.SessionInvalidAttendanceWindow]: 'חלון הנוכחות אינו תקין',
  [TrainingErrorCodes.CapacityBelowRegistrations]:
    'לא ניתן להקטין את המכסה מתחת למספר הנרשמים הפעילים',
  [TrainingErrorCodes.LecturerNotFound]: 'המרצה לא נמצא',
  [TrainingErrorCodes.LocationInvalid]: 'המיקום אינו תקין',
  [TrainingErrorCodes.InvalidAttendanceTransition]: 'מעבר סטטוס הנוכחות אינו מותר',
  [TrainingErrorCodes.DatabaseDependencyMissing]:
    'מערכת ההדרכות עדיין לא מוכנה (מאגר הנתונים לא הוגדר). פנה למנהל המערכת.',
  [TrainingErrorCodes.AttendanceAlreadyOpen]: 'חלון הנוכחות כבר פתוח.',
  [TrainingErrorCodes.AttendanceOpenNotAllowed]: 'לא ניתן לפתוח את חלון הנוכחות כעת.',
  [TrainingErrorCodes.AttendanceNotOpen]: 'חלון אישור הנוכחות עדיין לא נפתח.',
  [TrainingErrorCodes.AttendanceWindowStillOpen]: 'יש לסגור את חלון הנוכחות לפני השלמת המועד.',
  [TrainingErrorCodes.SessionNotReadyForCompletion]: 'המועד אינו מוכן להשלמה.',
  [TrainingErrorCodes.LecturerNotAssigned]: 'אין לך הרשאה לנהל את המועד שנבחר.',
  [TrainingErrorCodes.QrRevoked]: 'קוד ה-QR אינו פעיל עוד. יש לסרוק את הקוד העדכני שמוצג על ידי המרצה.',
  [TrainingErrorCodes.AttendanceWindowNotOpen]: 'חלון אישור הנוכחות עדיין לא נפתח.',
  [TrainingErrorCodes.AttendanceWindowExpired]: 'חלון אישור הנוכחות הסתיים.',
  [TrainingErrorCodes.IdentityMismatch]: 'פרטי הזיהוי שהוזנו אינם תואמים למשתמש המחובר.',
  [TrainingErrorCodes.EmployeeNotFound]: 'העובד לא נמצא במערכת.',
  [TrainingErrorCodes.RegistrationCancelled]: 'ההרשמה למועד זה בוטלה.',
  [TrainingErrorCodes.SessionCancelled]: 'מועד ההדרכה בוטל ולא ניתן לאשר נוכחות.',
  [TrainingErrorCodes.CertificateNotFound]: 'התעודה לא נמצאה.',
  [TrainingErrorCodes.CertificateAlreadyExists]: 'כבר קיימת תעודה פעילה עבור נוכחות זו.',
  [TrainingErrorCodes.CertificateTemplateMissing]: 'תבנית התעודה אינה זמינה.',
  [TrainingErrorCodes.CertificateSignatureMissing]: 'חתימה ארגונית לתעודה אינה זמינה.',
  [TrainingErrorCodes.CertificateNumberFailed]: 'הקצאת מספר תעודה נכשלה.',
  [TrainingErrorCodes.CertificateFileNotFound]: 'קובץ התעודה לא נמצא.',
  [TrainingErrorCodes.CertificateAccessDenied]: 'אין הרשאה לצפות בתעודה זו.',
  [TrainingErrorCodes.CertificateCancelled]: 'התעודה בוטלה.',
  [TrainingErrorCodes.CertificateEmployeeEmailMissing]: 'לא נמצאה כתובת דוא״ל לעובד.',
  [TrainingErrorCodes.CertificateDownloadFailed]: 'לא ניתן להוריד את התעודה כרגע.',
  [TrainingErrorCodes.EmailConfigurationMissing]: 'הגדרות שליחת הדוא״ל אינן זמינות.',
  [TrainingErrorCodes.EmailRecipientMissing]: 'נמען הדוא״ל חסר.',
  [TrainingErrorCodes.EmailAttachmentTooLarge]: 'קובץ התעודה גדול מדי לשליחה בדוא״ל.',
  [TrainingErrorCodes.EmailAlreadySent]: 'התעודה כבר נשלחה בדוא״ל.',
  [TrainingErrorCodes.EmailSendInProgress]: 'שליחת הדוא״ל כבר בתהליך.',
  [TrainingErrorCodes.EmailRetryLimitReached]: 'הגיעו למספר ניסיונות השליחה המרבי.',
  [TrainingErrorCodes.NotificationConfigurationMissing]: 'מנגנון ההתראות הפנימיות אינו מוגדר.',
  [TrainingErrorCodes.NotificationRecipientMissing]: 'נמען ההתראה חסר.',
  [TrainingErrorCodes.NotificationDeliveryFailed]: 'שליחת ההתראה נכשלה.',
  [TrainingErrorCodes.NotificationAlreadySent]: 'ההתראה כבר נשלחה.',
  [TrainingErrorCodes.NotificationSendInProgress]: 'שליחת ההתראה כבר בתהליך.',
  [TrainingErrorCodes.NotificationRetryLimitReached]: 'הגיעו למספר ניסיונות ההתראה המרבי.',
  [TrainingErrorCodes.SessionNotCompleted]: 'המועד טרם הושלם.',
  [TrainingErrorCodes.AttendanceNotConfirmed]: 'הנוכחות לא אושרה.',
  [TrainingErrorCodes.ReportUnauthorized]: 'אין הרשאה לצפייה בדוחות הניהול.',
  [TrainingErrorCodes.ReportInvalidFilter]: 'מסנני הדוח אינם תקינים.',
  [TrainingErrorCodes.ReportInvalidDateRange]: 'טווח התאריכים אינו תקין.',
  [TrainingErrorCodes.ReportDateRangeTooLarge]: 'טווח התאריכים גדול מדי. יש לצמצם את הטווח או להוסיף מסננים.',
  [TrainingErrorCodes.ReportInvalidSort]: 'שדה המיון אינו מורשה.',
  [TrainingErrorCodes.ReportEmployeeNotFound]: 'העובד לא נמצא בדוח.',
  [TrainingErrorCodes.ReportDepartmentNotAllowed]: 'אין הרשאה למחלקה שנבחרה.',
  [TrainingErrorCodes.ReportDataUnavailable]: 'נתוני הדוח אינם זמינים כרגע.',
  [TrainingErrorCodes.ReportExportFailed]: 'לא ניתן היה להפיק את הדוח.',
  [TrainingErrorCodes.ReportExportTooLarge]: 'הדוח המבוקש גדול מדי. יש לצמצם את טווח התאריכים או להוסיף מסננים.',
  [TrainingErrorCodes.ReportComplianceRulesMissing]: 'לא הוגדרו כללי התאמה מלאים להכשרות החובה.',
  [TrainingErrorCodes.ReportDependencyMissing]: 'תלויות הדוח אינן זמינות. פנה למנהל המערכת.',
};
