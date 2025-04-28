import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HospitalCathDashbComponent } from './hospital-cath-dashb.component';

const routes: Routes = [
  {
    path: '',
    component: HospitalCathDashbComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HospitalCathDashbRoutingModule { }