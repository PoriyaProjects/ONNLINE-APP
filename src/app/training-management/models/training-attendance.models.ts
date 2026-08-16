import { TrainingAttendanceSource, TrainingAttendanceStatus } from './training-status.models';

export interface ConfirmTrainingAttendanceRequest {
  QrToken: string;
  IdentityNumber: string;
  ActingEmployeeID: string;
}

export interface ConfirmTrainingAttendanceResponse {
  AttendanceId: number;
  RegistrationId: number;
  SessionId: number;
  ConfirmedAt: string;
  CertificateQueued: boolean;
  /** Phase 6 enrichment */
  AlreadyConfirmed?: boolean | null;
  SafeMessage?: string | null;
  CourseName?: string | null;
  SessionDate?: string | null;
}

export interface TrainingAttendanceRow {
  AttendanceId?: number | null;
  RegistrationId: number;
  SessionId: number;
  EmployeeID: string;
  EmployeeFullName?: string | null;
  DepartmentName?: string | null;
  RegisteredAt?: string | null;
  AttendanceStatus: TrainingAttendanceStatus;
  ConfirmedAt?: string | null;
  Source?: TrainingAttendanceSource | null;
  IsManualUpdate: boolean;
  UpdatedByEmployeeID?: string | null;
  ManualReason?: string | null;
}

export interface UpdateAttendanceManuallyRequest {
  SessionId: number;
  EmployeeID: string;
  Attended: boolean;
  Reason: string;
  ActingEmployeeID: string;
}

export interface UpdateAttendanceManuallyResponse {
  AttendanceId: number;
  Status: TrainingAttendanceStatus;
}

export interface AttendanceWindowRequest {
  SessionId: number;
  ActingEmployeeID: string;
}

export interface AttendanceWindowResponse {
  SessionId: number;
  AttendanceWindowOpen: boolean;
  OpenedAt?: string | null;
  ClosedAt?: string | null;
  QrToken?: string | null;
  QrTokenExpiresAt?: string | null;
}

export interface GenerateSessionQrTokenRequest {
  SessionId: number;
  ActingEmployeeID: string;
}

export interface GenerateSessionQrTokenResponse {
  SessionId: number;
  QrToken: string;
  ExpiresAt: string;
}

/**
 * Metadata for the active QR window.
 * QrToken is usually null — only a hash is stored server-side; the UI must mint via GenerateSessionQrToken.
 */
export interface GetActiveSessionQrTokenRequest {
  SessionId: number;
  ActingEmployeeID: string;
}

export interface GetActiveSessionQrTokenResponse {
  SessionId: number;
  /** Rarely populated; hash storage means raw token is not recoverable. */
  QrToken: string | null;
  ExpiresAt: string;
  AttendanceWindowOpen: boolean;
}

export interface GetAttendanceSessionByTokenRequest {
  QrToken: string;
  ActingEmployeeID: string;
}

export interface QrAttendanceSessionDetails {
  SessionId: number;
  CourseId: number;
  CourseName: string;
  SessionDate: string;
  StartTime: string;
  EndTime: string;
  Location?: string | null;
  AttendanceWindowOpen: boolean;
  QrTokenExpiresAt?: string | null;
  RequiresIdentityConfirmation: boolean;
  /** Phase 6 safe enrichments */
  LecturerName?: string | null;
  CanConfirmAttendance?: boolean | null;
  ExistingAttendanceStatus?: number | null;
  ExistingConfirmedAt?: string | null;
  SafeMessage?: string | null;
}

export interface GetSessionAttendanceRequest {
  SessionId: number;
  ActingEmployeeID: string;
}
