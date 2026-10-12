import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DpAdminGuard, DpTemplateGuard } from './dp-guards';
import { DoctorsPermissionsShellComponent } from './doctors-permissions-shell.component';
import { DpApprovalsComponent } from './pages/approvals/dp-approvals.component';
import { DpCatalogComponent } from './pages/catalog/dp-catalog.component';
import { DpDashboardComponent } from './pages/dashboard/dp-dashboard.component';
import { DpEmployeeComponent } from './pages/employee/dp-employee.component';
import { DpMyComponent } from './pages/my/dp-my.component';
import { DpOrgChangesComponent } from './pages/org-changes/dp-org-changes.component';
import { DpSearchComponent } from './pages/search/dp-search.component';
import { DpNotificationsComponent } from './pages/notifications/dp-notifications.component';
import { DpSettingsComponent } from './pages/settings/dp-settings.component';
import { DpTemplatesComponent } from './pages/templates/dp-templates.component';

const routes: Routes = [
  {
    path: '',
    component: DoctorsPermissionsShellComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DpDashboardComponent },
      { path: 'search', component: DpSearchComponent },
      { path: 'employee/:employeeId', component: DpEmployeeComponent },
      { path: 'my', component: DpMyComponent },
      { path: 'approvals', component: DpApprovalsComponent },
      { path: 'templates', component: DpTemplatesComponent, canActivate: [DpTemplateGuard] },
      { path: 'catalog', component: DpCatalogComponent, canActivate: [DpAdminGuard] },
      { path: 'hr', component: DpDashboardComponent, canActivate: [DpAdminGuard], data: { hr: true } },
      { path: 'organizational-changes', component: DpOrgChangesComponent, canActivate: [DpAdminGuard] },
      { path: 'notifications', component: DpNotificationsComponent, canActivate: [DpAdminGuard] },
      { path: 'settings', component: DpSettingsComponent, canActivate: [DpAdminGuard] },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DoctorsPermissionsRoutingModule {}
