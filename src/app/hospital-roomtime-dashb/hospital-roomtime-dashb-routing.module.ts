import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HospitalRoomTimeDashbComponent } from './hospital-roomtime-dashb.component';

const routes: Routes = [
  {
    path: '',
    component: HospitalRoomTimeDashbComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HospitalRoomTimeDashbRoutingModule { }