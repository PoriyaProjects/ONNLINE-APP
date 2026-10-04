import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { QRCodeModule } from 'angularx-qrcode';
import { TrainingAdminDashboardComponent } from './admin/training-admin-dashboard/training-admin-dashboard.component';
import { TrainingCoursesAdminPageComponent } from './admin/training-courses-admin-page/training-courses-admin-page.component';
import { TrainingCourseFormComponent } from './admin/training-course-form/training-course-form.component';
import { TrainingSessionsAdminPageComponent } from './admin/training-sessions-admin-page/training-sessions-admin-page.component';
import { TrainingSessionFormComponent } from './admin/training-session-form/training-session-form.component';
import { TrainingSessionParticipantsPageComponent } from './admin/training-session-participants-page/training-session-participants-page.component';
import { TrainingEmployeeAutocompleteComponent } from './admin/employee-autocomplete/employee-autocomplete.component';
import { CourseStatusConfirmDialogComponent } from './admin/dialogs/course-status-confirm-dialog/course-status-confirm-dialog.component';
import { SessionCancelAdminDialogComponent } from './admin/dialogs/session-cancel-admin-dialog/session-cancel-admin-dialog.component';
import { AdminRegisterEmployeeDialogComponent } from './admin/dialogs/admin-register-employee-dialog/admin-register-employee-dialog.component';
import { AdminCancelRegistrationDialogComponent } from './admin/dialogs/admin-cancel-registration-dialog/admin-cancel-registration-dialog.component';
import { ManualAttendanceDialogComponent } from './admin/dialogs/manual-attendance-dialog/manual-attendance-dialog.component';
import { CancellationConfirmDialogComponent } from './employee/cancellation-confirm-dialog/cancellation-confirm-dialog.component';
import { MyTrainingsPageComponent } from './employee/my-trainings-page/my-trainings-page.component';
import { RegistrationConfirmDialogComponent } from './employee/registration-confirm-dialog/registration-confirm-dialog.component';
import { TrainingCourseDetailsPageComponent } from './employee/training-course-details-page/training-course-details-page.component';
import { TrainingCoursesPageComponent } from './employee/training-courses-page/training-courses-page.component';
import { TrainingShellComponent } from './employee/training-shell/training-shell.component';
import { CloseAttendanceDialogComponent } from './lecturer/dialogs/close-attendance-dialog/close-attendance-dialog.component';
import { CompleteSessionDialogComponent } from './lecturer/dialogs/complete-session-dialog/complete-session-dialog.component';
import { OpenAttendanceDialogComponent } from './lecturer/dialogs/open-attendance-dialog/open-attendance-dialog.component';
import { LecturerSessionQrDisplayComponent } from './lecturer/lecturer-session-qr-display/lecturer-session-qr-display.component';
import { LecturerTrainingSessionPageComponent } from './lecturer/lecturer-training-session-page/lecturer-training-session-page.component';
import { LecturerTrainingSessionsPageComponent } from './lecturer/lecturer-training-sessions-page/lecturer-training-sessions-page.component';
import { EmployeeAttendanceConfirmationPageComponent } from './employee/employee-attendance-confirmation-page/employee-attendance-confirmation-page.component';
import { MyCertificatesPageComponent } from './employee/my-certificates-page/my-certificates-page.component';
import { TrainingOperationsErrorsPageComponent } from './admin/training-operations-errors-page/training-operations-errors-page.component';
import { TrainingEmptyStateComponent } from './shared/training-empty-state/training-empty-state.component';
import { TrainingErrorStateComponent } from './shared/training-error-state/training-error-state.component';
import { TrainingStatusBadgeComponent } from './shared/training-status-badge/training-status-badge.component';
import { TrainingPageHeaderComponent } from './shared/training-page-header/training-page-header.component';
import { TrainingSkeletonComponent } from './shared/training-skeleton/training-skeleton.component';
import { TrainingReportFiltersComponent } from './reports/shared/training-report-filters/training-report-filters.component';
import { TrainingReportsShellComponent } from './reports/training-reports-shell/training-reports-shell.component';
import { TrainingReportsDashboardComponent } from './reports/training-reports-dashboard/training-reports-dashboard.component';
import { TrainingSessionReportPageComponent } from './reports/training-session-report/training-session-report-page.component';
import { TrainingCourseReportPageComponent } from './reports/training-course-report/training-course-report-page.component';
import { TrainingAttendanceReportPageComponent } from './reports/training-attendance-report/training-attendance-report-page.component';
import { EmployeeTrainingHistoryReportComponent } from './reports/employee-training-history-report/employee-training-history-report.component';
import { TrainingComplianceReportPageComponent } from './reports/training-compliance-report/training-compliance-report-page.component';
import { TrainingCertificateExpiryReportPageComponent } from './reports/training-certificate-expiry-report/training-certificate-expiry-report-page.component';
import { TrainingManagementRoutingModule } from './training-management-routing.module';

@NgModule({
  declarations: [
    TrainingShellComponent,
    TrainingCoursesPageComponent,
    TrainingCourseDetailsPageComponent,
    MyTrainingsPageComponent,
    MyCertificatesPageComponent,
    EmployeeAttendanceConfirmationPageComponent,
    RegistrationConfirmDialogComponent,
    CancellationConfirmDialogComponent,
    TrainingStatusBadgeComponent,
    TrainingEmptyStateComponent,
    TrainingErrorStateComponent,
    TrainingPageHeaderComponent,
    TrainingSkeletonComponent,
    TrainingAdminDashboardComponent,
    TrainingCoursesAdminPageComponent,
    TrainingCourseFormComponent,
    TrainingSessionsAdminPageComponent,
    TrainingSessionFormComponent,
    TrainingSessionParticipantsPageComponent,
    TrainingOperationsErrorsPageComponent,
    TrainingEmployeeAutocompleteComponent,
    CourseStatusConfirmDialogComponent,
    SessionCancelAdminDialogComponent,
    AdminRegisterEmployeeDialogComponent,
    AdminCancelRegistrationDialogComponent,
    ManualAttendanceDialogComponent,
    LecturerTrainingSessionsPageComponent,
    LecturerTrainingSessionPageComponent,
    LecturerSessionQrDisplayComponent,
    OpenAttendanceDialogComponent,
    CloseAttendanceDialogComponent,
    CompleteSessionDialogComponent,
    TrainingReportFiltersComponent,
    TrainingReportsShellComponent,
    TrainingReportsDashboardComponent,
    TrainingSessionReportPageComponent,
    TrainingCourseReportPageComponent,
    TrainingAttendanceReportPageComponent,
    EmployeeTrainingHistoryReportComponent,
    TrainingComplianceReportPageComponent,
    TrainingCertificateExpiryReportPageComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TrainingManagementRoutingModule,
    QRCodeModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatSortModule,
    MatTableModule,
  ],
  entryComponents: [
    CourseStatusConfirmDialogComponent,
    SessionCancelAdminDialogComponent,
    AdminRegisterEmployeeDialogComponent,
    AdminCancelRegistrationDialogComponent,
    ManualAttendanceDialogComponent,
    RegistrationConfirmDialogComponent,
    CancellationConfirmDialogComponent,
    OpenAttendanceDialogComponent,
    CloseAttendanceDialogComponent,
    CompleteSessionDialogComponent,
  ],
})
export class TrainingManagementModule {}
