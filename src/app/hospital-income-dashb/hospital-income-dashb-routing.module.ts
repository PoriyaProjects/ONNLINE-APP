import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HospitalIncomeDashbComponent } from './hospital-income-dashb.component';
//import { ChargingGroupsComponent } from './google-charts/charging-groups.component';
import { GoogleChartsIncomeComponent } from './google-charts/google-charts.component';
import { TableComponent } from '../shared/dataTable';

// const routes: Routes = [
//   {
//     path: '',
//     component: HospitalIncomeDashbComponent
//   }
// ];


const routes: Routes = [
  { path: '', component: HospitalIncomeDashbComponent },
  { path: 'data-table', component: TableComponent },
  //{ path: 'groups', component: ChargingGroupsComponent },
  { path: 'charts', component: GoogleChartsIncomeComponent }
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HospitalIncomeDashbRoutingModule { }


