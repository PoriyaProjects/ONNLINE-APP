import { TrainingAttendanceStatus, TrainingCertificateStatus, TrainingRegistrationStatus } from './training-status.models';

export interface TrainingRegistrationSummary {
  Id: number;
  SessionId: number;
  CourseId?: number | null;
  CourseName?: string | null;
  SessionDate?: string | null;
  StartTime?: string | null;
  EndTime?: string | null;
  Location?: string | null;
  EmployeeID: string;
  EmployeeFullName?: string | null;
  RegisteredAt: string;
  Status: TrainingRegistrationStatus;
  CancelledAt?: string | null;
  CancellationReason?: string | null;
  AttendanceStatus?: TrainingAttendanceStatus | null;
  CertificateStatus?: TrainingCertificateStatus | null;
}

export interface RegisterEmployeeToSessionRequest {
  SessionId: number;
  ActingEmployeeID: string;
}

export interface RegisterEmployeeToSessionResponse {
  RegistrationId: number;
  SessionId: number;
  Status: TrainingRegistrationStatus;
}

export interface CancelTrainingRegistrationRequest {
  RegistrationId: number;
  Reason?: string | null;
  ActingEmployeeID: string;
}

export interface CancelTrainingRegistrationResponse {
  RegistrationId: number;
  Status: TrainingRegistrationStatus;
}

export interface GetEmployeeRegistrationsRequest {
  ActingEmployeeID: string;
  EmployeeID?: string | null;
}

export interface GetSessionRegistrationsRequest {
  SessionId: number;
  ActingEmployeeID: string;
}

export interface EmployeeTrainingHistoryItem {
  RegistrationId: number;
  CourseId: number;
  CourseName: string;
  SessionId: number;
  SessionDate: string;
  RegistrationStatus: TrainingRegistrationStatus;
  AttendanceStatus?: TrainingAttendanceStatus | null;
  CertificateStatus?: TrainingCertificateStatus | null;
  CertificateNumber?: string | null;
  CertificateExpiresAt?: string | null;
}
