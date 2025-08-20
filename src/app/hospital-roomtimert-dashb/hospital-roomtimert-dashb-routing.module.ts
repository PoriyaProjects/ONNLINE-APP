import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HospitalRoomTimeRTDashbComponent } from './hospital-roomtimrt-dashb.component';

const routes: Routes = [
  {
    path: '',
    component: HospitalRoomTimeRTDashbComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HospitalRoomTimeRTDashbRoutingModule { }