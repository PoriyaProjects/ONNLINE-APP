import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NpsConfigurationAccessGuard } from './nps-configuration-access.guard';
import { NpsAuditPageComponent } from './pages/nps-audit-page.component';
import { NpsActionsPageComponent } from './pages/nps-actions-page.component';
import { NpsDashboardPageComponent } from './pages/nps-dashboard-page.component';
import { NpsEmployeeAssignmentsPageComponent } from './pages/nps-employee-assignments-page.component';
import { NpsMyRequestsPageComponent } from './pages/nps-my-requests-page.component';
import { NpsPermissionsAdminPageComponent } from './pages/nps-permissions-admin-page.component';
import { NpsProfileEditPageComponent } from './pages/nps-profile-edit-page.component';
import { NpsProfilesPageComponent } from './pages/nps-profiles-page.component';
import { NpsRulesPageComponent } from './pages/nps-rules-page.component';
import { NpsShellComponent } from './nps-shell.component';
import { NpsManagerPermissionGrantsPageComponent } from './pages/nps-manager-permission-grants-page.component';

const routes: Routes = [
  {
    path: '',
    component: NpsShellComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: NpsDashboardPageComponent },
      { path: 'profiles', component: NpsProfilesPageComponent, canActivate: [NpsConfigurationAccessGuard] },
      {
        path: 'profiles/new',
        component: NpsProfileEditPageComponent,
        data: { profileMode: 'create' },
        canActivate: [NpsConfigurationAccessGuard],
      },
      {
        path: 'profiles/:id/edit',
        component: NpsProfileEditPageComponent,
        data: { profileMode: 'edit' },
        canActivate: [NpsConfigurationAccessGuard],
      },
      { path: 'profile-rules', component: NpsRulesPageComponent, canActivate: [NpsConfigurationAccessGuard] },
      {
        path: 'employee-assignments',
        component: NpsEmployeeAssignmentsPageComponent,
        canActivate: [NpsConfigurationAccessGuard],
      },
      { path: 'actions', component: NpsActionsPageComponent, canActivate: [NpsConfigurationAccessGuard] },
      { path: 'permissions', component: NpsPermissionsAdminPageComponent, canActivate: [NpsConfigurationAccessGuard] },
      { path: 'my-requests', component: NpsMyRequestsPageComponent },
      { path: 'manager-permission-grants', component: NpsManagerPermissionGrantsPageComponent },
      { path: 'audit', component: NpsAuditPageComponent, canActivate: [NpsConfigurationAccessGuard] },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class NpsPermissionsRoutingModule {}
