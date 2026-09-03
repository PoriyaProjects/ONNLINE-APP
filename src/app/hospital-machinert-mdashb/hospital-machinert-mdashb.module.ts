import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';

import { MachineRtDashboardComponent } from './machine-rt-dashboard/machine-rt-dashboard.component';

const routes: Routes = [
  { path: '', component: MachineRtDashboardComponent },
];

@NgModule({
  declarations: [MachineRtDashboardComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    HttpClientModule,
    MatIconModule,
  ],
})
export class HospitalMachineRTmDashbModule {}
