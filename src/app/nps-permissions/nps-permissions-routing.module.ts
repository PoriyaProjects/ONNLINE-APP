import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NpsAuditPageComponent } from './pages/nps-audit-page.component';
import { NpsDashboardPageComponent } from './pages/nps-dashboard-page.component';
import { NpsEmployeeDetailPageComponent } from './pages/nps-employee-detail-page.component';
import { NpsEmployeesPageComponent } from './pages/nps-employees-page.component';
import { NpsMyApprovalsPageComponent } from './pages/nps-my-approvals-page.component';
import { NpsMyRequestsPageComponent } from './pages/nps-my-requests-page.component';
import { NpsProfileEditPageComponent } from './pages/nps-profile-edit-page.component';
import { NpsProfilesPageComponent } from './pages/nps-profiles-page.component';
import { NpsRequestDetailPageComponent } from './pages/nps-request-detail-page.component';
import { NpsRequestsPageComponent } from './pages/nps-requests-page.component';
import { NpsRulesPageComponent } from './pages/nps-rules-page.component';
import { NpsShellComponent } from './nps-shell.component';

const routes: Routes = [
  {
    path: '',
    component: NpsShellComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: NpsDashboardPageComponent },
      { path: 'employees', component: NpsEmployeesPageComponent },
      { path: 'employees/:id', component: NpsEmployeeDetailPageComponent },
      { path: 'profiles', component: NpsProfilesPageComponent },
      { path: 'profiles/new', component: NpsProfileEditPageComponent, data: { profileMode: 'create' } },
      { path: 'profiles/:id/edit', component: NpsProfileEditPageComponent, data: { profileMode: 'edit' } },
      { path: 'profile-rules', component: NpsRulesPageComponent },
      { path: 'requests', component: NpsRequestsPageComponent },
      { path: 'requests/:id', component: NpsRequestDetailPageComponent },
      { path: 'my-approvals', component: NpsMyApprovalsPageComponent },
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
