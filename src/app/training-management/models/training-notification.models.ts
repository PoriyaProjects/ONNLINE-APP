import { TrainingNotificationChannel, TrainingNotificationStatus, TrainingNotificationType } from './training-status.models';

export interface TrainingNotificationSummary {
  Id: number;
  NotificationType: TrainingNotificationType;
  Channel: TrainingNotificationChannel;
  SessionId?: number | null;
  RegistrationId?: number | null;
  CertificateId?: number | null;
  EmployeeID: string;
  EmployeeFullName?: string | null;
  Status: TrainingNotificationStatus;
  AttemptCount: number;
  LastAttemptAt?: string | null;
  LastError?: string | null;
  InsertedAt: string;
  CourseName?: string | null;
  SessionDate?: string | null;
  Retryable?: boolean | null;
}

export interface GetNotificationErrorsRequest {
  ActingEmployeeID: string;
  Status?: TrainingNotificationStatus | null;
  NotificationType?: TrainingNotificationType | null;
  CourseId?: number | null;
  SessionId?: number | null;
  EmployeeSearch?: string | null;
  RetryableOnly?: boolean | null;
  FromDate?: string | null;
  ToDate?: string | null;
  Skip?: number;
  Take?: number;
}

export interface RetryTrainingNotificationRequest {
  NotificationId: number;
  ActingEmployeeID: string;
}

export interface RetryTrainingNotificationResponse {
  NotificationId: number;
  Status: TrainingNotificationStatus;
  AttemptCount: number;
  LastError?: string | null;
}

/** Phase 7 — day-before reminder batch (scheduler). */
export interface ProcessTrainingRemindersRequest {
  ActingEmployeeID: string;
  TargetDate?: string | null;
}

export interface ProcessTrainingRemindersResponse {
  TargetDate: string;
  TotalCandidates: number;
  Successful: number;
  Failed: number;
  Skipped: number;
  AlreadyProcessed: number;
  CorrelationId?: string | null;
}
