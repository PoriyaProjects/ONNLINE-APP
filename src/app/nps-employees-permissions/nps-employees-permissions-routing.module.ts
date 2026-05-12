import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NpsEmployeesPermissionsConfigurationAccessGuard } from './nps-employees-permissions-configuration.guard';
import { NpsEmployeesPermissionsShellComponent } from './nps-employees-permissions-shell.component';
import { NpsAuditPageComponent } from './pages/nps-audit-page.component';
import { NpsActionsPageComponent } from './pages/nps-actions-page.component';
import { NpsDashboardPageComponent } from './pages/nps-dashboard-page.component';
import { NpsEmployeeAssignmentsPageComponent } from './pages/nps-employee-assignments-page.component';
import { NpsMyRequestsPageComponent } from './pages/nps-my-requests-page.component';
import { NpsRequestDetailPageComponent } from './pages/nps-request-detail-page.component';
import { NpsRequestsPageComponent } from './pages/nps-requests-page.component';
import { NpsPermissionsAdminPageComponent } from './pages/nps-permissions-admin-page.component';
import { NpsProfileEditPageComponent } from './pages/nps-profile-edit-page.component';
import { NpsProfilesPageComponent } from './pages/nps-profiles-page.component';
import { NpsRulesPageComponent } from './pages/nps-rules-page.component';

const routes: Routes = [
  {
    path: '',
    component: NpsEmployeesPermissionsShellComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: NpsDashboardPageComponent },
      {
        path: 'profiles',
        component: NpsProfilesPageComponent,
        canActivate: [NpsEmployeesPermissionsConfigurationAccessGuard],
      },
      {
        path: 'profiles/new',
        component: NpsProfileEditPageComponent,
        data: { profileMode: 'create' },
        canActivate: [NpsEmployeesPermissionsConfigurationAccessGuard],
      },
      {
        path: 'profiles/:id/edit',
        component: NpsProfileEditPageComponent,
        data: { profileMode: 'edit' },
        canActivate: [NpsEmployeesPermissionsConfigurationAccessGuard],
      },
      {
        path: 'profile-rules',
        component: NpsRulesPageComponent,
        canActivate: [NpsEmployeesPermissionsConfigurationAccessGuard],
      },
      {
        path: 'employee-assignments',
        component: NpsEmployeeAssignmentsPageComponent,
        canActivate: [NpsEmployeesPermissionsConfigurationAccessGuard],
      },
      {
        path: 'actions',
        component: NpsActionsPageComponent,
        canActivate: [NpsEmployeesPermissionsConfigurationAccessGuard],
      },
      {
        path: 'permissions',
        component: NpsPermissionsAdminPageComponent,
        canActivate: [NpsEmployeesPermissionsConfigurationAccessGuard],
      },
      { path: 'my-requests', component: NpsMyRequestsPageComponent },
      { path: 'requests', component: NpsRequestsPageComponent },
      { path: 'requests/:id', component: NpsRequestDetailPageComponent },
      {
        path: 'audit',
        component: NpsAuditPageComponent,
        canActivate: [NpsEmployeesPermissionsConfigurationAccessGuard],
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class NpsEmployeesPermissionsRoutingModule {}
