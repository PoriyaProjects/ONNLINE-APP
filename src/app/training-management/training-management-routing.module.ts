import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TrainingAdminDashboardComponent } from './admin/training-admin-dashboard/training-admin-dashboard.component';
import { TrainingCourseFormComponent } from './admin/training-course-form/training-course-form.component';
import { TrainingCoursesAdminPageComponent } from './admin/training-courses-admin-page/training-courses-admin-page.component';
import { TrainingSessionFormComponent } from './admin/training-session-form/training-session-form.component';
import { TrainingSessionParticipantsPageComponent } from './admin/training-session-participants-page/training-session-participants-page.component';
import { TrainingSessionsAdminPageComponent } from './admin/training-sessions-admin-page/training-sessions-admin-page.component';
import { MyTrainingsPageComponent } from './employee/my-trainings-page/my-trainings-page.component';
import { TrainingCourseDetailsPageComponent } from './employee/training-course-details-page/training-course-details-page.component';
import { TrainingCoursesPageComponent } from './employee/training-courses-page/training-courses-page.component';
import { TrainingShellComponent } from './employee/training-shell/training-shell.component';
import { LecturerSessionQrDisplayComponent } from './lecturer/lecturer-session-qr-display/lecturer-session-qr-display.component';
import { LecturerTrainingSessionPageComponent } from './lecturer/lecturer-training-session-page/lecturer-training-session-page.component';
import { LecturerTrainingSessionsPageComponent } from './lecturer/lecturer-training-sessions-page/lecturer-training-sessions-page.component';
import { EmployeeAttendanceConfirmationPageComponent } from './employee/employee-attendance-confirmation-page/employee-attendance-confirmation-page.component';
import { MyCertificatesPageComponent } from './employee/my-certificates-page/my-certificates-page.component';
import { TrainingOperationsErrorsPageComponent } from './admin/training-operations-errors-page/training-operations-errors-page.component';
import { TrainingReportsShellComponent } from './reports/training-reports-shell/training-reports-shell.component';
import { TrainingReportsDashboardComponent } from './reports/training-reports-dashboard/training-reports-dashboard.component';
import { TrainingSessionReportPageComponent } from './reports/training-session-report/training-session-report-page.component';
import { TrainingCourseReportPageComponent } from './reports/training-course-report/training-course-report-page.component';
import { TrainingAttendanceReportPageComponent } from './reports/training-attendance-report/training-attendance-report-page.component';
import { EmployeeTrainingHistoryReportComponent } from './reports/employee-training-history-report/employee-training-history-report.component';
import { TrainingComplianceReportPageComponent } from './reports/training-compliance-report/training-compliance-report-page.component';
import { TrainingCertificateExpiryReportPageComponent } from './reports/training-certificate-expiry-report/training-certificate-expiry-report-page.component';

const routes: Routes = [
  {
    path: '',
    component: TrainingShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'courses' },
      { path: 'courses', component: TrainingCoursesPageComponent },
      { path: 'courses/:courseId', component: TrainingCourseDetailsPageComponent },
      { path: 'my-trainings', component: MyTrainingsPageComponent },
      { path: 'my-certificates', component: MyCertificatesPageComponent },
      { path: 'attendance/:token', component: EmployeeAttendanceConfirmationPageComponent },
      { path: 'admin', component: TrainingAdminDashboardComponent },
      { path: 'admin/courses', component: TrainingCoursesAdminPageComponent },
      { path: 'admin/courses/new', component: TrainingCourseFormComponent },
      { path: 'admin/courses/:courseId/edit', component: TrainingCourseFormComponent },
      { path: 'admin/sessions', component: TrainingSessionsAdminPageComponent },
      { path: 'admin/sessions/new', component: TrainingSessionFormComponent },
      { path: 'admin/sessions/:sessionId/edit', component: TrainingSessionFormComponent },
      { path: 'admin/sessions/:sessionId/participants', component: TrainingSessionParticipantsPageComponent },
      { path: 'admin/notification-errors', component: TrainingOperationsErrorsPageComponent },
      {
        path: 'admin/reports',
        component: TrainingReportsShellComponent,
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
          { path: 'dashboard', component: TrainingReportsDashboardComponent },
          { path: 'sessions', component: TrainingSessionReportPageComponent },
          { path: 'courses', component: TrainingCourseReportPageComponent },
          { path: 'attendance', component: TrainingAttendanceReportPageComponent },
          { path: 'employees', component: EmployeeTrainingHistoryReportComponent },
          { path: 'compliance', component: TrainingComplianceReportPageComponent },
          { path: 'certificates', component: TrainingCertificateExpiryReportPageComponent },
        ],
      },
      { path: 'lecturer', pathMatch: 'full', redirectTo: 'lecturer/sessions' },
      { path: 'lecturer/sessions', component: LecturerTrainingSessionsPageComponent },
      { path: 'lecturer/sessions/:sessionId', component: LecturerTrainingSessionPageComponent },
      { path: 'lecturer/sessions/:sessionId/qr', component: LecturerSessionQrDisplayComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TrainingManagementRoutingModule {}
