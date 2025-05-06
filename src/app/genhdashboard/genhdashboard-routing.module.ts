import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GenhdashboardComponent } from './genhdashboard.component';

const routes: Routes = [
  { path: '/genhdashboard', component: GenhdashboardComponent } // routed as child of /dashboard
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GenhdashboardRoutingModule {}
