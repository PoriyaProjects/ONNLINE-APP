import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { GoogleChartsComponent } from './google-charts/google-charts.component';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { FormsModule } from '@angular/forms';
const routes: Routes = [
  { path: '', component: GoogleChartsComponent }
];

@NgModule({
  imports: [
    RouterModule.forChild([
      { path: '', component: GoogleChartsComponent }
    ])
  ],
  declarations: [GoogleChartsComponent]
})
export class HospitalCathDashbModule { }