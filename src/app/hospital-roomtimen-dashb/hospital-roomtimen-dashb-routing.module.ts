import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HospitalRoomTimeNDashbComponent } from './hospital-roomtimen-dashb.component';

const routes: Routes = [
  {
    path: '',
    component: HospitalRoomTimeNDashbComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HospitalRoomTimeNDashbRoutingModule { }