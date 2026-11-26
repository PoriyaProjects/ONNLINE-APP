import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DepartmentsListComponent } from './departments-list.component';
import { PhysiciansListComponent } from './physicians-list.component';
import { PhysicianEvaluationDashboardComponent } from './physician-evaluation-dashboard.component';

const routes: Routes = [
  { path: '', component: DepartmentsListComponent },
  { path: 'department/:departmentId', component: PhysiciansListComponent },
  { path: 'physicians', component: PhysiciansListComponent },
  { path: 'physician/:physicianId', component: PhysicianEvaluationDashboardComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PhysicianEvaluationRoutingModule { }
