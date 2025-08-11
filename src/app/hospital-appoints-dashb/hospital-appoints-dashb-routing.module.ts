import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AppointsDashbComponent } from './hospital-appoints-dashb.component';

const routes: Routes = [
  {
    path: '',
    component: AppointsDashbComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppointsDashbRoutingModule { }