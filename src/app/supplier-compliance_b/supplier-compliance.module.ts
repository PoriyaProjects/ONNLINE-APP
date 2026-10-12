import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SupplierComplianceDashboardComponent } from './supplier-compliance-dashboard/supplier-compliance-dashboard.component';
import { SupplierComplianceModalComponent } from './supplier-compliance-modal/supplier-compliance-modal.component';
import { SupplierComplianceDocTypesModalComponent } from './supplier-compliance-doc-types-modal/supplier-compliance-doc-types-modal.component';

@NgModule({
  declarations: [
    SupplierComplianceDashboardComponent,
    SupplierComplianceModalComponent,
    SupplierComplianceDocTypesModalComponent,
  ],
  imports: [CommonModule, FormsModule],
  exports: [SupplierComplianceDashboardComponent],
})
export class SupplierComplianceModule {}
