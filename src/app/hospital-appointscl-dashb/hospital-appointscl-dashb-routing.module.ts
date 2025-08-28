import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AppointsCLDashbComponent } from './hospital-appointscl-dashb.component';

const routes: Routes = [
  {
    path: '',
    component: AppointsCLDashbComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppointsCLDashbRoutingModule { }