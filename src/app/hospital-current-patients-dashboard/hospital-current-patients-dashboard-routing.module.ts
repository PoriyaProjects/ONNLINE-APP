import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HospitalCurrentPatientsDashboardComponent } from './hospital-current-patients-dashboard.component';

const routes: Routes = [
  {
    path: '',
    component: HospitalCurrentPatientsDashboardComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HospitalCurrentPatientsDashboardRoutingModule { }
