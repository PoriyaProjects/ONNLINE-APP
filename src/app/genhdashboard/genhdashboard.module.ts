import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenhdashboardComponent } from './genhdashboard.component';

import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { GoogleChartsModule } from 'angular-google-charts';

import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';

// Chart Components
import { GaugeChartComponent } from './charts/gauge-chart/gauge-chart.component';
import { MonthlyBarChartComponent } from './charts/monthly-bar-chart/monthly-bar-chart.component';
import { MonthlyLineChartComponent } from './charts/monthly-line-chart/monthly-line-chart.component';
import { FinancialLineChartComponent } from './charts/financial-line-chart/financial-line-chart.component';
import { IncomeTrendChartComponent } from './charts/income-trend-chart/income-trend-chart.component';
import { IncomeBarChartComponent } from './charts/income-bar-chart/income-bar-chart.component';

// Shared Container
import { ChartContainerComponent } from './shared/chart-container/chart-container.component';

import { GenhdashboardRoutingModule } from './genhdashboard-routing.module';

@NgModule({
  declarations: [
    GenhdashboardComponent,
    GaugeChartComponent,
    MonthlyBarChartComponent,
    MonthlyLineChartComponent,
    FinancialLineChartComponent,
    IncomeTrendChartComponent,
    IncomeBarChartComponent,
    ChartContainerComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    GoogleChartsModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    GenhdashboardRoutingModule
  ],
  exports: [GenhdashboardComponent]
})
export class GenhdashboardModule {}
