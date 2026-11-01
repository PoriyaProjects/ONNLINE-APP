import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AdminSettingsComponent } from './components/admin-settings/admin-settings.component';
import { BulkGrantComponent } from './components/bulk-grant/bulk-grant.component';
import { DashboardEmployeesComponent } from './components/dashboard-employees/dashboard-employees.component';
import { ManagerGridComponent } from './components/manager-grid/manager-grid.component';
import { EpPermissionsRoutingModule } from './ep-permissions-routing.module';
import { EpPermissionsShellComponent } from './ep-permissions-shell.component';

@NgModule({
  declarations: [
    EpPermissionsShellComponent,
    DashboardEmployeesComponent,
    AdminSettingsComponent,
    ManagerGridComponent,
    BulkGrantComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    EpPermissionsRoutingModule,
    MatToolbarModule,
    MatButtonModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
})
export class EpPermissionsModule {}
