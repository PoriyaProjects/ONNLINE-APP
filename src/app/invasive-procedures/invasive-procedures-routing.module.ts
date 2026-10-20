import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InvasiveProceduresCasesComponent } from './invasive-procedures-cases/invasive-procedures-cases.component';
import { InvasiveProceduresDashboardComponent } from './invasive-procedures-dashboard/invasive-procedures-dashboard.component';
import { InvasiveProceduresDepartmentsComponent } from './invasive-procedures-departments/invasive-procedures-departments.component';

const routes: Routes = [
  {
    path: '',
    component: InvasiveProceduresDashboardComponent,
    children: [
      { path: '', pathMatch: 'full', component: InvasiveProceduresDepartmentsComponent },
      { path: 'departments', component: InvasiveProceduresDepartmentsComponent },
      { path: 'cases', component: InvasiveProceduresCasesComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InvasiveProceduresRoutingModule {}
