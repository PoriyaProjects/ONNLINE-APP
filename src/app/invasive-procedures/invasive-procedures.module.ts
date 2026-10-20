import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { InvasiveProceduresCasesComponent } from './invasive-procedures-cases/invasive-procedures-cases.component';
import { InvasiveProceduresDashboardComponent } from './invasive-procedures-dashboard/invasive-procedures-dashboard.component';
import { InvasiveProceduresDepartmentsComponent } from './invasive-procedures-departments/invasive-procedures-departments.component';
import { InvasiveProceduresRoutingModule } from './invasive-procedures-routing.module';

@NgModule({
  declarations: [
    InvasiveProceduresDashboardComponent,
    InvasiveProceduresDepartmentsComponent,
    InvasiveProceduresCasesComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    InvasiveProceduresRoutingModule,
    MatTableModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule
  ]
})
export class InvasiveProceduresModule {}
