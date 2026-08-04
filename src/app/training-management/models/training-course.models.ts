import { TrainingCourseStatus } from './training-status.models';
import { TrainingPagedRequest, TrainingSortRequest } from './training-api.models';

export interface TrainingAuditInfo {
  InsertedAt?: string | null;
  UpdatedAt?: string | null;
  CreatedByEmployeeID?: string | null;
  UpdatedByEmployeeID?: string | null;
}

export interface TrainingCourseSummary {
  Id: number;
  Code: string;
  Name: string;
  CourseType?: string | null;
  DurationMinutes?: number | null;
  ValidityMonths?: number | null;
  IsMandatory: boolean;
  Status: TrainingCourseStatus;
  /** Phase 3 enrichment (optional). */
  Description?: string | null;
  UpcomingSessionsCount?: number | null;
  NearestSessionDate?: string | null;
  NearestSessionLocation?: string | null;
  HasAvailablePlaces?: boolean | null;
}

export interface TrainingCourseDetails extends TrainingCourseSummary, TrainingAuditInfo {
}

export interface TrainingCourseFilter extends TrainingPagedRequest, TrainingSortRequest {
  SearchText?: string | null;
  Status?: TrainingCourseStatus | null;
  IsMandatory?: boolean | null;
  CourseType?: string | null;
}

export interface SaveTrainingCourseRequest {
  Id?: number | null;
  Code: string;
  Name: string;
  Description?: string | null;
  CourseType?: string | null;
  DurationMinutes?: number | null;
  ValidityMonths?: number | null;
  IsMandatory: boolean;
  Status: TrainingCourseStatus;
  ActingEmployeeID: string;
}

export interface SaveTrainingCourseResponse {
  Course: TrainingCourseDetails;
}

export interface DeactivateTrainingCourseRequest {
  CourseId: number;
  ActingEmployeeID: string;
}

export interface ActivateTrainingCourseRequest {
  CourseId: number;
  ActingEmployeeID: string;
}

export interface GetAvailableCoursesRequest {
  ActingEmployeeID: string;
}

export interface GetCoursesRequest {
  Filter?: TrainingCourseFilter | null;
  ActingEmployeeID: string;
}

export interface GetCourseDetailsRequest {
  CourseId: number;
  ActingEmployeeID: string;
}
