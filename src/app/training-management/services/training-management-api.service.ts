import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  AttendanceWindowRequest,
  AttendanceWindowResponse,
  CancelTrainingRegistrationRequest,
  CancelTrainingRegistrationResponse,
  ActivateTrainingCourseRequest,
  CancelTrainingSessionRequest,
  CancelTrainingSessionResponse,
  CompleteTrainingSessionRequest,
  ConfirmTrainingAttendanceRequest,
  ConfirmTrainingAttendanceResponse,
  DeactivateTrainingCourseRequest,
  DownloadEmployeeCertificateRequest,
  DownloadEmployeeCertificateResponse,
  GenerateCertificateRequest,
  GenerateCertificateResponse,
  GenerateSessionQrTokenRequest,
  GenerateSessionQrTokenResponse,
  GetActiveSessionQrTokenRequest,
  GetActiveSessionQrTokenResponse,
  GetAttendanceSessionByTokenRequest,
  GetAvailableCoursesRequest,
  GetCertificateErrorsRequest,
  GetCertificateErrorsResponse,
  GetCourseDetailsRequest,
  GetCourseSessionsRequest,
  GetCoursesRequest,
  GetEmployeeCertificatesRequest,
  GetEmployeeRegistrationsRequest,
  GetLecturerSessionsRequest,
  GetNotificationErrorsRequest,
  GetSessionAttendanceRequest,
  GetSessionDetailsRequest,
  GetSessionRegistrationsRequest,
  GetSessionsRequest,
  GetTrainingDashboardChartsRequest,
  GetTrainingDashboardChartsResponse,
  GetTrainingDashboardStatisticsRequest,
  GetTrainingReportsRequest,
  GetTrainingReportsResponse,
  ExportTrainingReportRequest,
  ExportTrainingReportResponse,
  ProcessSessionCertificatesRequest,
  ProcessSessionCertificatesResponse,
  ProcessTrainingRemindersRequest,
  ProcessTrainingRemindersResponse,
  QrAttendanceSessionDetails,
  RegisterEmployeeToSessionRequest,
  RegisterEmployeeToSessionResponse,
  ResendCertificateEmailRequest,
  ResendCertificateEmailResponse,
  RetryCertificateGenerationRequest,
  RetryCertificateGenerationResponse,
  RetryTrainingNotificationRequest,
  RetryTrainingNotificationResponse,
  SaveTrainingCourseRequest,
  SaveTrainingCourseResponse,
  SaveTrainingSessionRequest,
  SaveTrainingSessionResponse,
  TrainingApiResult,
  TrainingAttendanceRow,
  TrainingCertificateSummary,
  TrainingCourseDetails,
  TrainingCourseSummary,
  TrainingDashboardStatistics,
  TrainingNotificationSummary,
  TrainingRegistrationSummary,
  TrainingSessionDetails,
  TrainingSessionSummary,
  UpdateAttendanceManuallyRequest,
  UpdateAttendanceManuallyResponse,
} from '../models';
import { unwrapAsmxResponse } from '../utils/training-asmx.util';

/**
 * Typed ASMX client for Staff Course & Training Management.
 * Responses: ASP.NET `{ d: TrainingApiResult<T> }` unwrapped centrally.
 */
@Injectable({ providedIn: 'root' })
export class TrainingManagementApiService {
  constructor(private http: HttpClient) {}

  private jsonHeaders(): { headers: HttpHeaders } {
    return {
      headers: new HttpHeaders({ 'Content-Type': 'application/json; charset=utf-8' }),
    };
  }

  private wsBase(): string {
    const u = environment.url || '';
    return u.endsWith('/') ? u : `${u}/`;
  }

  /** PDF create/download runs on ipracticom (wkhtmltopdf), same as other hospital PDFs. */
  private pdfWsBase(): string {
    const u = environment.urlipracticom || environment.url || '';
    return u.endsWith('/') ? u : `${u}/`;
  }

  private methodUrl(name: string): string {
    return `${this.wsBase()}${name}`;
  }

  private pdfMethodUrl(name: string): string {
    return `${this.pdfWsBase()}${name}`;
  }

  private actingEmployeeId(): string {
    const id = localStorage.getItem('ID');
    return id != null ? String(id) : '';
  }

  private postResult<T>(method: string, body: Record<string, unknown>): Observable<TrainingApiResult<T>> {
    return this.http
      .post<unknown>(this.methodUrl(method), body, this.jsonHeaders())
      .pipe(map((raw) => unwrapAsmxResponse<TrainingApiResult<T>>(raw)));
  }

  private postPdfResult<T>(method: string, body: Record<string, unknown>): Observable<TrainingApiResult<T>> {
    return this.http
      .post<unknown>(this.pdfMethodUrl(method), body, this.jsonHeaders())
      .pipe(map((raw) => unwrapAsmxResponse<TrainingApiResult<T>>(raw)));
  }

  // --- Employee ---

  getAvailableCourses(
    request?: Partial<GetAvailableCoursesRequest>
  ): Observable<TrainingApiResult<TrainingCourseSummary[]>> {
    return this.postResult<TrainingCourseSummary[]>('GetAvailableCourses', {
      ActingEmployeeID: request && request.ActingEmployeeID ? request.ActingEmployeeID : this.actingEmployeeId(),
    });
  }

  getCourseSessions(
    request: GetCourseSessionsRequest
  ): Observable<TrainingApiResult<TrainingSessionSummary[]>> {
    return this.postResult<TrainingSessionSummary[]>('GetCourseSessions', {
      CourseId: request.CourseId,
      ActingEmployeeID: request.ActingEmployeeID || this.actingEmployeeId(),
    });
  }

  registerEmployeeToSession(
    request: RegisterEmployeeToSessionRequest
  ): Observable<TrainingApiResult<RegisterEmployeeToSessionResponse>> {
    return this.postResult<RegisterEmployeeToSessionResponse>('RegisterEmployeeToSession', {
      SessionId: request.SessionId,
      ActingEmployeeID: request.ActingEmployeeID || this.actingEmployeeId(),
    });
  }

  cancelEmployeeRegistration(
    request: CancelTrainingRegistrationRequest
  ): Observable<TrainingApiResult<CancelTrainingRegistrationResponse>> {
    return this.postResult<CancelTrainingRegistrationResponse>('CancelEmployeeRegistration', {
      RegistrationId: request.RegistrationId,
      Reason: request.Reason != null ? request.Reason : null,
      ActingEmployeeID: request.ActingEmployeeID || this.actingEmployeeId(),
    });
  }

  getEmployeeRegistrations(
    request?: Partial<GetEmployeeRegistrationsRequest>
  ): Observable<TrainingApiResult<TrainingRegistrationSummary[]>> {
    return this.postResult<TrainingRegistrationSummary[]>('GetEmployeeRegistrations', {
      ActingEmployeeID: request && request.ActingEmployeeID ? request.ActingEmployeeID : this.actingEmployeeId(),
      EmployeeID: request && request.EmployeeID != null ? request.EmployeeID : null,
    });
  }

  getEmployeeCertificates(
    request?: Partial<GetEmployeeCertificatesRequest>
  ): Observable<TrainingApiResult<TrainingCertificateSummary[]>> {
    return this.postResult<TrainingCertificateSummary[]>('GetEmployeeCertificates', {
      ActingEmployeeID: request && request.ActingEmployeeID ? request.ActingEmployeeID : this.actingEmployeeId(),
      EmployeeID: request && request.EmployeeID != null ? request.EmployeeID : null,
    });
  }

  getAttendanceSessionByToken(
    request: GetAttendanceSessionByTokenRequest
  ): Observable<TrainingApiResult<QrAttendanceSessionDetails>> {
    return this.postResult<QrAttendanceSessionDetails>('GetAttendanceSessionByToken', {
      QrToken: request.QrToken,
      ActingEmployeeID: request.ActingEmployeeID || this.actingEmployeeId(),
    });
  }

  confirmCourseAttendance(
    request: ConfirmTrainingAttendanceRequest
  ): Observable<TrainingApiResult<ConfirmTrainingAttendanceResponse>> {
    return this.postPdfResult<ConfirmTrainingAttendanceResponse>('ConfirmCourseAttendance', {
      QrToken: request.QrToken,
      IdentityNumber: request.IdentityNumber,
      ActingEmployeeID: request.ActingEmployeeID || this.actingEmployeeId(),
    });
  }

  // --- Lecturer ---

  getLecturerSessions(
    request?: Partial<GetLecturerSessionsRequest>
  ): Observable<TrainingApiResult<TrainingSessionSummary[]>> {
    return this.postResult<TrainingSessionSummary[]>('GetLecturerSessions', {
      ActingEmployeeID: request && request.ActingEmployeeID ? request.ActingEmployeeID : this.actingEmployeeId(),
      FromDate: request && request.FromDate != null ? request.FromDate : null,
      ToDate: request && request.ToDate != null ? request.ToDate : null,
    });
  }

  getSessionAttendance(
    request: GetSessionAttendanceRequest
  ): Observable<TrainingApiResult<TrainingAttendanceRow[]>> {
    return this.postResult<TrainingAttendanceRow[]>('GetSessionAttendance', {
      SessionId: request.SessionId,
      ActingEmployeeID: request.ActingEmployeeID || this.actingEmployeeId(),
    });
  }

  openAttendanceWindow(
    request: AttendanceWindowRequest
  ): Observable<TrainingApiResult<AttendanceWindowResponse>> {
    return this.postResult<AttendanceWindowResponse>('OpenAttendanceWindow', {
      SessionId: request.SessionId,
      ActingEmployeeID: request.ActingEmployeeID || this.actingEmployeeId(),
    });
  }

  closeAttendanceWindow(
    request: AttendanceWindowRequest
  ): Observable<TrainingApiResult<AttendanceWindowResponse>> {
    return this.postResult<AttendanceWindowResponse>('CloseAttendanceWindow', {
      SessionId: request.SessionId,
      ActingEmployeeID: request.ActingEmployeeID || this.actingEmployeeId(),
    });
  }

  generateSessionQrToken(
    request: GenerateSessionQrTokenRequest
  ): Observable<TrainingApiResult<GenerateSessionQrTokenResponse>> {
    return this.postResult<GenerateSessionQrTokenResponse>('GenerateSessionQrToken', {
      SessionId: request.SessionId,
      ActingEmployeeID: request.ActingEmployeeID || this.actingEmployeeId(),
    });
  }

  getActiveSessionQrToken(
    request: GetActiveSessionQrTokenRequest
  ): Observable<TrainingApiResult<GetActiveSessionQrTokenResponse>> {
    return this.postResult<GetActiveSessionQrTokenResponse>('GetActiveSessionQrToken', {
      SessionId: request.SessionId,
      ActingEmployeeID: request.ActingEmployeeID || this.actingEmployeeId(),
    });
  }

  completeTrainingSession(
    request: CompleteTrainingSessionRequest
  ): Observable<TrainingApiResult<TrainingSessionDetails>> {
    return this.postResult<TrainingSessionDetails>('CompleteTrainingSession', {
      SessionId: request.SessionId,
      ActingEmployeeID: request.ActingEmployeeID || this.actingEmployeeId(),
    });
  }

  // --- Administrator ---

  getCourses(request: GetCoursesRequest): Observable<TrainingApiResult<TrainingCourseSummary[]>> {
    return this.postResult<TrainingCourseSummary[]>('GetCourses', {
      Filter: request.Filter != null ? request.Filter : null,
      ActingEmployeeID: request.ActingEmployeeID || this.actingEmployeeId(),
    });
  }

  getCourseDetails(
    request: GetCourseDetailsRequest
  ): Observable<TrainingApiResult<TrainingCourseDetails>> {
    return this.postResult<TrainingCourseDetails>('GetCourseDetails', {
      CourseId: request.CourseId,
      ActingEmployeeID: request.ActingEmployeeID || this.actingEmployeeId(),
    });
  }

  saveCourse(
    request: SaveTrainingCourseRequest
  ): Observable<TrainingApiResult<SaveTrainingCourseResponse>> {
    return this.postResult<SaveTrainingCourseResponse>('SaveCourse', {
      ...request,
      ActingEmployeeID: request.ActingEmployeeID || this.actingEmployeeId(),
    });
  }

  deactivateCourse(
    request: DeactivateTrainingCourseRequest
  ): Observable<TrainingApiResult<TrainingCourseDetails>> {
    return this.postResult<TrainingCourseDetails>('DeactivateCourse', {
      CourseId: request.CourseId,
      ActingEmployeeID: request.ActingEmployeeID || this.actingEmployeeId(),
    });
  }

  activateCourse(
    request: ActivateTrainingCourseRequest
  ): Observable<TrainingApiResult<TrainingCourseDetails>> {
    return this.postResult<TrainingCourseDetails>('ActivateCourse', {
      CourseId: request.CourseId,
      ActingEmployeeID: request.ActingEmployeeID || this.actingEmployeeId(),
    });
  }

  getSessions(request: GetSessionsRequest): Observable<TrainingApiResult<TrainingSessionSummary[]>> {
    return this.postResult<TrainingSessionSummary[]>('GetSessions', {
      Filter: request.Filter != null ? request.Filter : null,
      ActingEmployeeID: request.ActingEmployeeID || this.actingEmployeeId(),
    });
  }

  getSessionDetails(
    request: GetSessionDetailsRequest
  ): Observable<TrainingApiResult<TrainingSessionDetails>> {
    return this.postResult<TrainingSessionDetails>('GetSessionDetails', {
      SessionId: request.SessionId,
      ActingEmployeeID: request.ActingEmployeeID || this.actingEmployeeId(),
    });
  }

  saveSession(
    request: SaveTrainingSessionRequest
  ): Observable<TrainingApiResult<SaveTrainingSessionResponse>> {
    return this.postResult<SaveTrainingSessionResponse>('SaveSession', {
      ...request,
      ActingEmployeeID: request.ActingEmployeeID || this.actingEmployeeId(),
    });
  }

  cancelSession(
    request: CancelTrainingSessionRequest
  ): Observable<TrainingApiResult<CancelTrainingSessionResponse>> {
    return this.postResult<CancelTrainingSessionResponse>('CancelSession', {
      SessionId: request.SessionId,
      Reason: request.Reason,
      ActingEmployeeID: request.ActingEmployeeID || this.actingEmployeeId(),
    });
  }

  getSessionRegistrations(
    request: GetSessionRegistrationsRequest
  ): Observable<TrainingApiResult<TrainingRegistrationSummary[]>> {
    return this.postResult<TrainingRegistrationSummary[]>('GetSessionRegistrations', {
      SessionId: request.SessionId,
      ActingEmployeeID: request.ActingEmployeeID || this.actingEmployeeId(),
    });
  }

  updateAttendanceManually(
    request: UpdateAttendanceManuallyRequest
  ): Observable<TrainingApiResult<UpdateAttendanceManuallyResponse>> {
    return this.postPdfResult<UpdateAttendanceManuallyResponse>('UpdateAttendanceManually', {
      SessionId: request.SessionId,
      EmployeeID: request.EmployeeID,
      Attended: request.Attended,
      Reason: request.Reason,
      ActingEmployeeID: request.ActingEmployeeID || this.actingEmployeeId(),
    });
  }

  generateCertificate(
    request: GenerateCertificateRequest
  ): Observable<TrainingApiResult<GenerateCertificateResponse>> {
    return this.postPdfResult<GenerateCertificateResponse>('GenerateCertificate', {
      AttendanceId: request.AttendanceId != null ? request.AttendanceId : null,
      RegistrationId: request.RegistrationId != null ? request.RegistrationId : null,
      ActingEmployeeID: request.ActingEmployeeID || this.actingEmployeeId(),
    });
  }

  resendCertificateEmail(
    request: ResendCertificateEmailRequest
  ): Observable<TrainingApiResult<ResendCertificateEmailResponse>> {
    return this.postResult<ResendCertificateEmailResponse>('ResendCertificateEmail', {
      CertificateId: request.CertificateId,
      ActingEmployeeID: request.ActingEmployeeID || this.actingEmployeeId(),
    });
  }

  getTrainingReports(
    request: GetTrainingReportsRequest
  ): Observable<TrainingApiResult<GetTrainingReportsResponse>> {
    return this.postResult<GetTrainingReportsResponse>('GetTrainingReports', {
      Filter: request.Filter,
      ReportType: request.ReportType,
      ActingEmployeeID: request.ActingEmployeeID || this.actingEmployeeId(),
    });
  }

  getTrainingDashboardStatistics(
    request?: Partial<GetTrainingDashboardStatisticsRequest>
  ): Observable<TrainingApiResult<TrainingDashboardStatistics>> {
    return this.postResult<TrainingDashboardStatistics>('GetTrainingDashboardStatistics', {
      ActingEmployeeID: request && request.ActingEmployeeID ? request.ActingEmployeeID : this.actingEmployeeId(),
      FromDate: request && request.FromDate != null ? request.FromDate : null,
      ToDate: request && request.ToDate != null ? request.ToDate : null,
      CourseId: request && request.CourseId != null ? request.CourseId : null,
      CourseType: request && request.CourseType != null ? request.CourseType : null,
      DepartmentCode: request && request.DepartmentCode != null ? request.DepartmentCode : null,
      SessionStatus: request && request.SessionStatus != null ? request.SessionStatus : null,
      MandatoryOnly: request && request.MandatoryOnly != null ? request.MandatoryOnly : null,
    });
  }

  getTrainingDashboardCharts(
    request?: Partial<GetTrainingDashboardChartsRequest>
  ): Observable<TrainingApiResult<GetTrainingDashboardChartsResponse>> {
    return this.postResult<GetTrainingDashboardChartsResponse>('GetTrainingDashboardCharts', {
      ActingEmployeeID: request && request.ActingEmployeeID ? request.ActingEmployeeID : this.actingEmployeeId(),
      FromDate: request && request.FromDate != null ? request.FromDate : null,
      ToDate: request && request.ToDate != null ? request.ToDate : null,
      CourseId: request && request.CourseId != null ? request.CourseId : null,
      CourseType: request && request.CourseType != null ? request.CourseType : null,
      DepartmentCode: request && request.DepartmentCode != null ? request.DepartmentCode : null,
      SessionStatus: request && request.SessionStatus != null ? request.SessionStatus : null,
      MandatoryOnly: request && request.MandatoryOnly != null ? request.MandatoryOnly : null,
    });
  }

  exportTrainingReportToExcel(
    request: ExportTrainingReportRequest
  ): Observable<TrainingApiResult<ExportTrainingReportResponse>> {
    return this.postResult<ExportTrainingReportResponse>('ExportTrainingReportToExcel', {
      Filter: request.Filter,
      ReportType: request.ReportType,
      ActingEmployeeID: request.ActingEmployeeID || this.actingEmployeeId(),
      Format: request.Format || 'Excel',
    });
  }

  getNotificationErrors(
    request?: Partial<GetNotificationErrorsRequest>
  ): Observable<TrainingApiResult<TrainingNotificationSummary[]>> {
    return this.postResult<TrainingNotificationSummary[]>('GetNotificationErrors', {
      ActingEmployeeID: request && request.ActingEmployeeID ? request.ActingEmployeeID : this.actingEmployeeId(),
      Status: request && request.Status != null ? request.Status : null,
      NotificationType: request && request.NotificationType != null ? request.NotificationType : null,
      CourseId: request && request.CourseId != null ? request.CourseId : null,
      SessionId: request && request.SessionId != null ? request.SessionId : null,
      EmployeeSearch: request && request.EmployeeSearch != null ? request.EmployeeSearch : null,
      RetryableOnly: request && request.RetryableOnly != null ? request.RetryableOnly : null,
      FromDate: request && request.FromDate != null ? request.FromDate : null,
      ToDate: request && request.ToDate != null ? request.ToDate : null,
      Skip: request && request.Skip != null ? request.Skip : 0,
      Take: request && request.Take != null ? request.Take : 50,
    });
  }

  retryNotification(
    request: RetryTrainingNotificationRequest
  ): Observable<TrainingApiResult<RetryTrainingNotificationResponse>> {
    return this.postResult<RetryTrainingNotificationResponse>('RetryNotification', {
      NotificationId: request.NotificationId,
      ActingEmployeeID: request.ActingEmployeeID || this.actingEmployeeId(),
    });
  }

  downloadEmployeeCertificate(
    request: DownloadEmployeeCertificateRequest
  ): Observable<TrainingApiResult<DownloadEmployeeCertificateResponse>> {
    return this.postPdfResult<DownloadEmployeeCertificateResponse>('DownloadEmployeeCertificate', {
      CertificateId: request.CertificateId,
      ActingEmployeeID: request.ActingEmployeeID || this.actingEmployeeId(),
    });
  }

  processSessionCertificates(
    request: ProcessSessionCertificatesRequest
  ): Observable<TrainingApiResult<ProcessSessionCertificatesResponse>> {
    return this.postPdfResult<ProcessSessionCertificatesResponse>('ProcessSessionCertificates', {
      SessionId: request.SessionId,
      ActingEmployeeID: request.ActingEmployeeID || this.actingEmployeeId(),
    });
  }

  processTrainingReminders(
    request?: Partial<ProcessTrainingRemindersRequest>
  ): Observable<TrainingApiResult<ProcessTrainingRemindersResponse>> {
    return this.postResult<ProcessTrainingRemindersResponse>('ProcessTrainingReminders', {
      ActingEmployeeID: request && request.ActingEmployeeID ? request.ActingEmployeeID : this.actingEmployeeId(),
      TargetDate: request && request.TargetDate != null ? request.TargetDate : null,
    });
  }

  getCertificateErrors(
    request?: Partial<GetCertificateErrorsRequest>
  ): Observable<TrainingApiResult<GetCertificateErrorsResponse>> {
    return this.postResult<GetCertificateErrorsResponse>('GetCertificateErrors', {
      ActingEmployeeID: request && request.ActingEmployeeID ? request.ActingEmployeeID : this.actingEmployeeId(),
      Status: request && request.Status != null ? request.Status : null,
      CourseId: request && request.CourseId != null ? request.CourseId : null,
      SessionId: request && request.SessionId != null ? request.SessionId : null,
      EmployeeSearch: request && request.EmployeeSearch != null ? request.EmployeeSearch : null,
      RetryableOnly: request && request.RetryableOnly != null ? request.RetryableOnly : null,
      FromDate: request && request.FromDate != null ? request.FromDate : null,
      ToDate: request && request.ToDate != null ? request.ToDate : null,
      Skip: request && request.Skip != null ? request.Skip : 0,
      Take: request && request.Take != null ? request.Take : 50,
    });
  }

  retryCertificateGeneration(
    request: RetryCertificateGenerationRequest
  ): Observable<TrainingApiResult<RetryCertificateGenerationResponse>> {
    return this.postPdfResult<RetryCertificateGenerationResponse>('RetryCertificateGeneration', {
      CertificateId: request.CertificateId,
      ActingEmployeeID: request.ActingEmployeeID || this.actingEmployeeId(),
      Reason: request.Reason != null ? request.Reason : null,
    });
  }
}
