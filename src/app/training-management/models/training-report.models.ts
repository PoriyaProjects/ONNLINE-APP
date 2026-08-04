import {
  TrainingAttendanceStatus,
  TrainingAttendanceSource,
  TrainingCertificateStatus,
  TrainingComplianceStatus,
  TrainingRegistrationStatus,
  TrainingSessionStatus,
} from './training-status.models';
import { TrainingPagedRequest, TrainingSortRequest } from './training-api.models';

/** Max rows for client-side Excel export in one request. */
export const TRAINING_REPORT_EXPORT_MAX_ROWS = 5000;

export type TrainingReportType =
  | 'SessionCompletion'
  | 'CourseSummary'
  | 'EmployeeTraining'
  | 'Attendance'
  | 'Compliance'
  | 'ExpiringCertificates';

export interface TrainingReportFilter extends TrainingPagedRequest, TrainingSortRequest {
  FromDate?: string | null;
  ToDate?: string | null;
  CourseId?: number | null;
  SessionId?: number | null;
  DepartmentCode?: string | null;
  EmployeeID?: string | null;
  SessionStatus?: TrainingSessionStatus | null;
  RegistrationStatus?: TrainingRegistrationStatus | null;
  CourseType?: string | null;
  MandatoryOnly?: boolean | null;
  LecturerEmployeeID?: string | null;
  Location?: string | null;
  AttendanceStatus?: TrainingAttendanceStatus | null;
  CertificateStatus?: TrainingCertificateStatus | null;
  ExpiringWithinDays?: number | null;
  ComplianceStatus?: TrainingComplianceStatus | null;
  ActiveEmployeesOnly?: boolean | null;
  EmployeeSearch?: string | null;
}

export interface SessionCompletionReport {
  SessionId: number;
  CourseName: string;
  CourseType?: string | null;
  SessionDate: string;
  StartTime?: string | null;
  EndTime?: string | null;
  Location?: string | null;
  LecturerName?: string | null;
  Capacity: number;
  RegisteredCount: number;
  AttendedCount: number;
  AbsentCount: number;
  CancelledRegistrationCount?: number | null;
  CompletionRatePercent: number;
  CapacityUtilizationPercent?: number | null;
  CertificateCount?: number | null;
  Status: TrainingSessionStatus;
}

export interface CourseSummaryReport {
  CourseId: number;
  CourseCode: string;
  CourseName: string;
  CourseType?: string | null;
  IsMandatory?: boolean | null;
  SessionCount: number;
  RegisteredCount: number;
  AttendedCount: number;
  AbsentCount?: number | null;
  AttendanceRatePercent?: number | null;
  AverageCapacityUtilizationPercent?: number | null;
  CertificateCount: number;
  ExpiringOrExpiredCertificateCount?: number | null;
  LastSessionDate?: string | null;
}

export interface EmployeeTrainingReport {
  EmployeeID: string;
  EmployeeFullName: string;
  DepartmentCode?: string | null;
  DepartmentName?: string | null;
  CourseName: string;
  CourseId?: number | null;
  SessionId?: number | null;
  SessionDate: string;
  RegistrationStatus: TrainingRegistrationStatus;
  Attended: boolean;
  AttendanceStatus?: TrainingAttendanceStatus | null;
  CertificateNumber?: string | null;
  CertificateExpiresAt?: string | null;
  CertificateStatus?: TrainingCertificateStatus | null;
  IssuedAt?: string | null;
}

export interface AttendanceReportRow {
  EmployeeID: string;
  EmployeeFullName: string;
  DepartmentCode?: string | null;
  DepartmentName?: string | null;
  CourseName: string;
  SessionId?: number | null;
  SessionDate: string;
  RegistrationStatus: TrainingRegistrationStatus;
  AttendanceStatus: TrainingAttendanceStatus;
  ConfirmedAt?: string | null;
  VerificationMethod?: TrainingAttendanceSource | null;
  IsManualUpdate?: boolean | null;
  CertificateStatus?: TrainingCertificateStatus | null;
}

export interface TrainingComplianceReport {
  EmployeeID: string;
  EmployeeFullName: string;
  DepartmentCode?: string | null;
  DepartmentName?: string | null;
  CourseId: number;
  CourseName: string;
  IsCompliant: boolean;
  ComplianceStatus: TrainingComplianceStatus;
  LastCompletedAt?: string | null;
  CertificateExpiresAt?: string | null;
}

export interface ExpiringCertificateReport {
  CertificateId: number;
  CertificateNumber: string;
  EmployeeID: string;
  EmployeeFullName: string;
  DepartmentCode?: string | null;
  DepartmentName?: string | null;
  CourseName: string;
  IssuedAt?: string | null;
  ExpiresAt: string;
  Status: TrainingCertificateStatus;
  EmailStatus?: TrainingCertificateStatus | null;
  DaysUntilExpiry: number;
  DownloadAvailable?: boolean | null;
}

export interface TrainingDashboardStatistics {
  ActiveCoursesCount: number;
  OpenSessionsCount: number;
  FullSessionsCount: number;
  RegistrationsTodayCount: number;
  AttendancePendingCount: number;
  CertificatesIssuedCount: number;
  NotificationErrorsCount: number;
  ExpiringCertificatesCount: number;
  /** Phase 8 optional KPIs when backend provides them */
  SessionsInPeriodCount?: number | null;
  TotalRegistrationsCount?: number | null;
  ConfirmedAttendanceCount?: number | null;
  AbsencesCount?: number | null;
  AttendanceRatePercent?: number | null;
  AverageCapacityUtilizationPercent?: number | null;
  MissingMandatoryCount?: number | null;
}

export interface TrainingDashboardChartSeries {
  ChartKey: string;
  Title: string;
  Labels: string[];
  Values: number[];
  TextSummary?: string | null;
}

export interface GetTrainingDashboardChartsRequest {
  ActingEmployeeID: string;
  FromDate?: string | null;
  ToDate?: string | null;
  CourseId?: number | null;
  CourseType?: string | null;
  DepartmentCode?: string | null;
  SessionStatus?: TrainingSessionStatus | null;
  MandatoryOnly?: boolean | null;
}

export interface GetTrainingDashboardChartsResponse {
  Series: TrainingDashboardChartSeries[];
  GeneratedAt?: string | null;
}

export interface GetTrainingReportsRequest {
  Filter: TrainingReportFilter;
  ReportType: TrainingReportType;
  ActingEmployeeID: string;
}

export interface TrainingReportSummary {
  TotalCount: number;
  AttendanceRatePercent?: number | null;
  CapacityUtilizationPercent?: number | null;
  ComplianceRatePercent?: number | null;
  GeneratedAt?: string | null;
}

export interface GetTrainingReportsResponse {
  SessionCompletion?: SessionCompletionReport[] | null;
  CourseSummary?: CourseSummaryReport[] | null;
  EmployeeTraining?: EmployeeTrainingReport[] | null;
  Attendance?: AttendanceReportRow[] | null;
  Compliance?: TrainingComplianceReport[] | null;
  ExpiringCertificates?: ExpiringCertificateReport[] | null;
  TotalCount: number;
  Summary?: TrainingReportSummary | null;
}

export interface GetTrainingDashboardStatisticsRequest {
  ActingEmployeeID: string;
  FromDate?: string | null;
  ToDate?: string | null;
  CourseId?: number | null;
  CourseType?: string | null;
  DepartmentCode?: string | null;
  SessionStatus?: TrainingSessionStatus | null;
  MandatoryOnly?: boolean | null;
}

export interface ExportTrainingReportRequest {
  Filter: TrainingReportFilter;
  ReportType: TrainingReportType;
  ActingEmployeeID: string;
  Format?: 'Excel' | 'Pdf' | null;
}

export interface ExportTrainingReportResponse {
  FileName: string;
  ContentType: string;
  ContentBase64: string;
}
