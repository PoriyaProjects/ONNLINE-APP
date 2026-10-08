import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
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
import { DoctorsPermissionsRoutingModule } from './doctors-permissions-routing.module';
import { DoctorsPermissionsShellComponent } from './doctors-permissions-shell.component';

@NgModule({
  declarations: [
    DoctorsPermissionsShellComponent,
    DpDashboardComponent,
    DpSearchComponent,
    DpEmployeeComponent,
    DpMyComponent,
    DpOrgChangesComponent,
    DpApprovalsComponent,
    DpTemplatesComponent,
    DpCatalogComponent,
    DpNotificationsComponent,
    DpSettingsComponent,
  ],
  imports: [CommonModule, FormsModule, DoctorsPermissionsRoutingModule, MatSnackBarModule],
})
export class DoctorsPermissionsModule {}
