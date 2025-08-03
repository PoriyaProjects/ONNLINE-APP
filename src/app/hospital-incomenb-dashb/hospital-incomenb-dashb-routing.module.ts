import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HospitalIncomeNBDashbComponent } from './hospital-incomenb-dashb.component';
//import { ChargingGroupsComponent } from './google-charts/charging-groups.component';
import { GoogleChartsIncomeNBComponent } from './google-charts/google-charts.component';
import { TableComponent } from '../shared/dataTable';


const routes: Routes = [
  { path: '', component: HospitalIncomeNBDashbComponent },
  { path: 'data-table', component: TableComponent },
  //{ path: 'groups', component: ChargingGroupsComponent },
  { path: 'charts', component: GoogleChartsIncomeNBComponent }
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HospitalIncomeDashbRoutingModule { }


