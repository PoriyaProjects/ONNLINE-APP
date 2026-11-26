import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { GoogleChartsModule } from 'angular-google-charts';
import { PhysicianEvaluationRoutingModule } from './physician-evaluation-routing.module';
import { DepartmentsListComponent } from './departments-list.component';
import { PhysiciansListComponent } from './physicians-list.component';
import { PhysicianEvaluationDashboardComponent } from './physician-evaluation-dashboard.component';
import { InquiryDetailsDialogComponent } from './inquiry-details-dialog.component';

@NgModule({
  declarations: [
    DepartmentsListComponent,
    PhysiciansListComponent,
    PhysicianEvaluationDashboardComponent,
    InquiryDetailsDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    PhysicianEvaluationRoutingModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    GoogleChartsModule
  ]
})
export class PhysicianEvaluationModule { }
