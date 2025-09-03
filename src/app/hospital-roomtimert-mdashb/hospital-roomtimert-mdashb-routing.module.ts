import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HospitalRoomTimeRTmDashbComponent } from './hospital-roomtimert-mdashb.component';

const routes: Routes = [
  {
    path: '',
    component: HospitalRoomTimeRTmDashbComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HospitalRoomTimeRTmDashbRoutingModule { }