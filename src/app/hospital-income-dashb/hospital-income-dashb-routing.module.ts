import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HospitalIncomeDashbComponent } from './hospital-income-dashb.component';

const routes: Routes = [
  {
    path: '',
    component: HospitalIncomeDashbComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HospitalIncomeDashbRoutingModule { }