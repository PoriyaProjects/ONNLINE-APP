import { TrainingCertificateStatus } from './training-status.models';

export interface CertificateDeliveryStatus {
  EmailStatus: TrainingCertificateStatus;
  LastAttemptAt?: string | null;
  LastError?: string | null;
  AttemptCount: number;
}

export interface TrainingCertificateSummary {
  Id: number;
  CertificateNumber: string;
  EmployeeID: string;
  EmployeeFullName?: string | null;
  CourseId: number;
  CourseName: string;
  SessionId: number;
  SessionDate: string;
  IssuedAt: string;
  ExpiresAt?: string | null;
  Status: TrainingCertificateStatus;
  DownloadAvailable: boolean;
}

export interface TrainingCertificateDetails extends TrainingCertificateSummary {
  AttendanceId: number;
  RegistrationId: number;
  /** Server-only; must never be returned to Angular for download UX. */
  FilePath?: string | null;
  FileHash?: string | null;
  Delivery?: CertificateDeliveryStatus | null;
  ErrorInformation?: string | null;
}

export interface GenerateCertificateRequest {
  AttendanceId?: number | null;
  RegistrationId?: number | null;
  ActingEmployeeID: string;
}

export interface GenerateCertificateResponse {
  Certificate: TrainingCertificateDetails;
}

export interface ResendCertificateEmailRequest {
  CertificateId: number;
  ActingEmployeeID: string;
}

export interface ResendCertificateEmailResponse {
  CertificateId: number;
  Delivery: CertificateDeliveryStatus;
}

export interface GetEmployeeCertificatesRequest {
  ActingEmployeeID: string;
  EmployeeID?: string | null;
}

/** Phase 7 — secure download (no physical path). */
export interface DownloadEmployeeCertificateRequest {
  CertificateId: number;
  ActingEmployeeID: string;
}

export interface DownloadEmployeeCertificateResponse {
  CertificateId: number;
  FileName: string;
  ContentType: string;
  ContentBase64: string;
}

export interface ProcessSessionCertificatesRequest {
  SessionId: number;
  ActingEmployeeID: string;
}

export interface ProcessSessionCertificatesResponse {
  SessionId: number;
  TotalCandidates: number;
  Successful: number;
  Failed: number;
  Skipped: number;
  AlreadyProcessed: number;
  CorrelationId?: string | null;
}

export interface GetCertificateErrorsRequest {
  ActingEmployeeID: string;
  Status?: TrainingCertificateStatus | null;
  CourseId?: number | null;
  SessionId?: number | null;
  EmployeeSearch?: string | null;
  RetryableOnly?: boolean | null;
  FromDate?: string | null;
  ToDate?: string | null;
  Skip?: number;
  Take?: number;
}

export interface CertificateErrorDto {
  CertificateId: number;
  CourseId: number;
  CourseName: string;
  SessionId: number;
  SessionDate: string;
  EmployeeID: string;
  EmployeeFullName?: string | null;
  CertificateNumber?: string | null;
  Status: TrainingCertificateStatus;
  EmailStatus?: TrainingCertificateStatus | null;
  AttemptCount: number;
  LastAttemptAt?: string | null;
  SafeErrorMessage?: string | null;
  Retryable: boolean;
}

export interface GetCertificateErrorsResponse {
  Items: CertificateErrorDto[];
  TotalCount: number;
}

export interface RetryCertificateGenerationRequest {
  CertificateId: number;
  ActingEmployeeID: string;
  Reason?: string | null;
}

export interface RetryCertificateGenerationResponse {
  CertificateId: number;
  Status: TrainingCertificateStatus;
  AttemptCount: number;
  SafeErrorMessage?: string | null;
}
