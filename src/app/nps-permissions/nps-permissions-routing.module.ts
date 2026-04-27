import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NpsAuditPageComponent } from './pages/nps-audit-page.component';
import { NpsDashboardPageComponent } from './pages/nps-dashboard-page.component';
<<<<<<< HEAD
import { NpsEmployeeAssignmentsPageComponent } from './pages/nps-employee-assignments-page.component';
=======
import { NpsMyApprovalsPageComponent } from './pages/nps-my-approvals-page.component';
>>>>>>> origin/main
import { NpsMyRequestsPageComponent } from './pages/nps-my-requests-page.component';
import { NpsProfileEditPageComponent } from './pages/nps-profile-edit-page.component';
import { NpsProfilesPageComponent } from './pages/nps-profiles-page.component';
import { NpsRulesPageComponent } from './pages/nps-rules-page.component';
import { NpsShellComponent } from './nps-shell.component';

const routes: Routes = [
  {
    path: '',
    component: NpsShellComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: NpsDashboardPageComponent },
      { path: 'profiles', component: NpsProfilesPageComponent },
      { path: 'profiles/new', component: NpsProfileEditPageComponent, data: { profileMode: 'create' } },
      { path: 'profiles/:id/edit', component: NpsProfileEditPageComponent, data: { profileMode: 'edit' } },
      { path: 'profile-rules', component: NpsRulesPageComponent },
<<<<<<< HEAD
      { path: 'employee-assignments', component: NpsEmployeeAssignmentsPageComponent },
      { path: 'actions', component: NpsActionsPageComponent },
      { path: 'permissions', component: NpsPermissionsAdminPageComponent },
=======
      { path: 'requests', component: NpsRequestsPageComponent },
      { path: 'requests/:id', component: NpsRequestDetailPageComponent },
      { path: 'my-approvals', component: NpsMyApprovalsPageComponent },
>>>>>>> origin/main
      { path: 'my-requests', component: NpsMyRequestsPageComponent },
      { path: 'audit', component: NpsAuditPageComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class NpsPermissionsRoutingModule {}
