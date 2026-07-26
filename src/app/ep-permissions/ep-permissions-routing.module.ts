import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminSettingsComponent } from './components/admin-settings/admin-settings.component';
import { BulkGrantComponent } from './components/bulk-grant/bulk-grant.component';
import { DashboardEmployeesComponent } from './components/dashboard-employees/dashboard-employees.component';
import { ManagerGridComponent } from './components/manager-grid/manager-grid.component';
import { EpPermissionsAdminGuard } from './ep-permissions-admin.guard';
import { EpPermissionsShellComponent } from './ep-permissions-shell.component';

const routes: Routes = [
  {
    path: '',
    component: EpPermissionsShellComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardEmployeesComponent },
      { path: 'bulk-grant', component: BulkGrantComponent },
      { path: 'admin', component: AdminSettingsComponent, canActivate: [EpPermissionsAdminGuard] },
      { path: 'matrix/:employeeId', component: ManagerGridComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EpPermissionsRoutingModule {}
