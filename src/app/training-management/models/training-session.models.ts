import { TrainingSessionStatus } from './training-status.models';
import { TrainingPagedRequest, TrainingSortRequest } from './training-api.models';
import { TrainingAuditInfo } from './training-course.models';

export interface TrainingLecturerSummary {
  EmployeeID: string;
  FirstName?: string | null;
  LastName?: string | null;
  FullName?: string | null;
}

export interface SessionCapacitySummary {
  Capacity: number;
  RegisteredCount: number;
  AvailablePlaces: number;
}

export interface TrainingSessionSummary {
  Id: number;
  CourseId: number;
  CourseCode?: string | null;
  CourseName?: string | null;
  SessionDate: string;
  StartTime: string;
  EndTime: string;
  Location?: string | null;
  LecturerEmployeeID: string;
  LecturerName?: string | null;
  Capacity: number;
  RegisteredCount: number;
  AvailablePlaces: number;
  RegistrationCloseAt: string;
  Status: TrainingSessionStatus;
  /** Phase 3 enrichment (optional). */
  IsRegisteredByCurrentEmployee?: boolean | null;
  CanRegister?: boolean | null;
  CanCancelRegistrationId?: number | null;
  /** Phase 5 lecturer enrichment (optional). */
  AttendanceWindowOpen?: boolean | null;
  ConfirmedAttendanceCount?: number | null;
}

export interface TrainingSessionDetails extends TrainingSessionSummary, TrainingAuditInfo {
  AttendanceWindowOpen: boolean;
  AttendanceWindowOpenedAt?: string | null;
  AttendanceWindowClosedAt?: string | null;
  QrTokenExpiresAt?: string | null;
  CancelReason?: string | null;
  Lecturer?: TrainingLecturerSummary | null;
}

export interface TrainingSessionFilter extends TrainingPagedRequest, TrainingSortRequest {
  CourseId?: number | null;
  FromDate?: string | null;
  ToDate?: string | null;
  Status?: TrainingSessionStatus | null;
  LecturerEmployeeID?: string | null;
  SearchText?: string | null;
}

export interface SaveTrainingSessionRequest {
  Id?: number | null;
  CourseId: number;
  SessionDate: string;
  StartTime: string;
  EndTime: string;
  Location: string;
  LecturerEmployeeID: string;
  Capacity: number;
  RegistrationCloseAt: string;
  Status?: TrainingSessionStatus | null;
  ActingEmployeeID: string;
}

export interface SaveTrainingSessionResponse {
  Session: TrainingSessionDetails;
}

export interface CancelTrainingSessionRequest {
  SessionId: number;
  Reason: string;
  ActingEmployeeID: string;
}

export interface CancelTrainingSessionResponse {
  SessionId: number;
  Status: TrainingSessionStatus;
}

export interface GetCourseSessionsRequest {
  CourseId: number;
  ActingEmployeeID: string;
}

export interface GetSessionsRequest {
  Filter?: TrainingSessionFilter | null;
  ActingEmployeeID: string;
}

export interface GetSessionDetailsRequest {
  SessionId: number;
  ActingEmployeeID: string;
}

export interface GetLecturerSessionsRequest {
  ActingEmployeeID: string;
  FromDate?: string | null;
  ToDate?: string | null;
}

export interface CompleteTrainingSessionRequest {
  SessionId: number;
  ActingEmployeeID: string;
}
