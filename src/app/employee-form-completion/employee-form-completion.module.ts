import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EmployeeFormCompletionDashboardComponent } from './employee-form-completion-dashboard/employee-form-completion-dashboard.component';

@NgModule({
  declarations: [EmployeeFormCompletionDashboardComponent],
  imports: [CommonModule, FormsModule],
  exports: [EmployeeFormCompletionDashboardComponent],
})
export class EmployeeFormCompletionModule {}
