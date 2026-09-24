/**
 * Training roles and MenuPerm RoutName / action permission keys.
 * Register/cancel for sessions: direct managers (org ManagerID1) + training admins.
 * Authorization remains GetPermLinkForUser + server-side ManagerID1 / CanManageParticipants checks.
 */

export enum TrainingRole {
  Employee = 'Employee',
  Lecturer = 'Lecturer',
  TrainingManager = 'TrainingManager',
  SystemAdmin = 'SystemAdmin',
}

/** Hash routes (without #/) for MenuPerm RoutName registration in later phases. */
export const TrainingRoutNames = {
  Root: 'training-management',
  AvailableCourses: 'training-management/available-courses',
  CourseSessions: 'training-management/courses/:courseId/sessions',
  Register: 'training-management/sessions/:sessionId/register',
  MyCourses: 'training-management/my-courses',
  Attendance: 'training-management/attendance/:token',
  MyCertificates: 'training-management/my-certificates',
  LecturerRoot: 'training-management/lecturer',
  LecturerSessions: 'training-management/lecturer/sessions',
  LecturerActiveSession: 'training-management/lecturer/sessions/:sessionId',
  LecturerQr: 'training-management/lecturer/sessions/:sessionId/qr',
  LecturerAttendance: 'training-management/lecturer/sessions/:sessionId/attendance',
  AdminDashboard: 'training-management/admin',
  AdminCourses: 'training-management/admin/courses',
  AdminCourseNew: 'training-management/admin/courses/new',
  AdminCourseEdit: 'training-management/admin/courses/:courseId/edit',
  AdminSessions: 'training-management/admin/sessions',
  AdminSessionNew: 'training-management/admin/sessions/new',
  AdminSessionEdit: 'training-management/admin/sessions/:sessionId/edit',
  AdminParticipants: 'training-management/admin/sessions/:sessionId/participants',
  AdminAttendance: 'training-management/admin/attendance',
  AdminReports: 'training-management/admin/reports',
  AdminNotificationErrors: 'training-management/admin/notification-errors',
} as const;

export type TrainingRoutName = typeof TrainingRoutNames[keyof typeof TrainingRoutNames];

/** Fine-grained action permission keys (documented; enforced server-side in later phases). */
export const TrainingPermissions = {
  ViewAvailableCourses: 'training.view_available_courses',
  RegisterForSession: 'training.register_for_session',
  /** Direct manager cancels a report's registration (legacy key name retained). */
  CancelOwnRegistration: 'training.cancel_own_registration',
  ConfirmOwnAttendance: 'training.confirm_own_attendance',
  ViewOwnCertificates: 'training.view_own_certificates',
  ViewLecturerSessions: 'training.view_lecturer_sessions',
  ManageAssignedSessionAttendance: 'training.manage_assigned_session_attendance',
  OpenCloseAttendanceWindow: 'training.open_close_attendance_window',
  ManageCourses: 'training.manage_courses',
  ManageSessions: 'training.manage_sessions',
  ManageParticipants: 'training.manage_participants',
  ManuallyUpdateAttendance: 'training.manually_update_attendance',
  GenerateOrResendCertificates: 'training.generate_or_resend_certificates',
  ViewReports: 'training.view_reports',
  ViewNotificationErrors: 'training.view_notification_errors',
  ManageSystemConfiguration: 'training.manage_system_configuration',
} as const;

export type TrainingPermission = typeof TrainingPermissions[keyof typeof TrainingPermissions];

export interface TrainingPermissionMatrixRow {
  permission: TrainingPermission;
  employee: boolean;
  lecturer: boolean;
  trainingManager: boolean;
  systemAdmin: boolean;
}

export const TRAINING_PERMISSION_MATRIX: ReadonlyArray<TrainingPermissionMatrixRow> = [
  { permission: TrainingPermissions.ViewAvailableCourses, employee: true, lecturer: true, trainingManager: true, systemAdmin: true },
  { permission: TrainingPermissions.RegisterForSession, employee: true, lecturer: false, trainingManager: true, systemAdmin: true },
  { permission: TrainingPermissions.CancelOwnRegistration, employee: true, lecturer: false, trainingManager: true, systemAdmin: true },
  { permission: TrainingPermissions.ConfirmOwnAttendance, employee: true, lecturer: false, trainingManager: false, systemAdmin: false },
  { permission: TrainingPermissions.ViewOwnCertificates, employee: true, lecturer: true, trainingManager: true, systemAdmin: true },
  { permission: TrainingPermissions.ViewLecturerSessions, employee: true, lecturer: true, trainingManager: true, systemAdmin: true },
  { permission: TrainingPermissions.ManageAssignedSessionAttendance, employee: true, lecturer: true, trainingManager: true, systemAdmin: true },
  { permission: TrainingPermissions.OpenCloseAttendanceWindow, employee: true, lecturer: true, trainingManager: true, systemAdmin: true },
  { permission: TrainingPermissions.ManageCourses, employee: false, lecturer: false, trainingManager: true, systemAdmin: true },
  { permission: TrainingPermissions.ManageSessions, employee: false, lecturer: false, trainingManager: true, systemAdmin: true },
  { permission: TrainingPermissions.ManageParticipants, employee: false, lecturer: false, trainingManager: true, systemAdmin: true },
  { permission: TrainingPermissions.ManuallyUpdateAttendance, employee: true, lecturer: true, trainingManager: true, systemAdmin: true },
  { permission: TrainingPermissions.GenerateOrResendCertificates, employee: false, lecturer: false, trainingManager: true, systemAdmin: true },
  { permission: TrainingPermissions.ViewReports, employee: false, lecturer: false, trainingManager: true, systemAdmin: true },
  { permission: TrainingPermissions.ViewNotificationErrors, employee: false, lecturer: false, trainingManager: true, systemAdmin: true },
  { permission: TrainingPermissions.ManageSystemConfiguration, employee: false, lecturer: false, trainingManager: false, systemAdmin: true },
];
