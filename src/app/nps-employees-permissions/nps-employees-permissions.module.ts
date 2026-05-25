import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NpsApprovalTimelineComponent } from './components/approval-timeline.component';
import { NpsPermissionMatrixComponent } from './components/permission-matrix.component';
import { NpsRequestStatusBadgeComponent } from './components/request-status-badge.component';
import { NpsEmployeesPermissionsRoutingModule } from './nps-employees-permissions-routing.module';
import { NpsEmployeesPermissionsShellComponent } from './nps-employees-permissions-shell.component';
import { NpsAuditPageComponent } from './pages/nps-audit-page.component';
import { NpsActionsPageComponent } from './pages/nps-actions-page.component';
import { NpsDashboardPageComponent } from './pages/nps-dashboard-page.component';
import { NpsEmployeeAssignmentsPageComponent } from './pages/nps-employee-assignments-page.component';
import { NpsMyApprovalsPageComponent } from './pages/nps-my-approvals-page.component';
import { NpsMyRequestsPageComponent } from './pages/nps-my-requests-page.component';
import { NpsPermissionsAdminPageComponent } from './pages/nps-permissions-admin-page.component';
import { NpsProfileEditPageComponent } from './pages/nps-profile-edit-page.component';
import { NpsProfilesPageComponent } from './pages/nps-profiles-page.component';
import { NpsRequestDetailPageComponent } from './pages/nps-request-detail-page.component';
import { NpsRequestsPageComponent } from './pages/nps-requests-page.component';
import { NpsRulesPageComponent } from './pages/nps-rules-page.component';

@NgModule({
  declarations: [
    NpsEmployeesPermissionsShellComponent,
    NpsDashboardPageComponent,
    NpsProfilesPageComponent,
    NpsProfileEditPageComponent,
    NpsRulesPageComponent,
    NpsEmployeeAssignmentsPageComponent,
    NpsActionsPageComponent,
    NpsPermissionsAdminPageComponent,
    NpsRequestsPageComponent,
    NpsRequestDetailPageComponent,
    NpsMyApprovalsPageComponent,
    NpsMyRequestsPageComponent,
    NpsAuditPageComponent,
    NpsRequestStatusBadgeComponent,
    NpsApprovalTimelineComponent,
    NpsPermissionMatrixComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    NpsEmployeesPermissionsRoutingModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatButtonModule,
    MatCardModule,
    MatTableModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatSelectModule,
    MatCheckboxModule,
    MatChipsModule,
    MatStepperModule,
    MatSnackBarModule,
    MatIconModule,
    MatExpansionModule,
  ],
})
export class NpsEmployeesPermissionsModule {}
