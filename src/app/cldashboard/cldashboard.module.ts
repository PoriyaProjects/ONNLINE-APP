import { AppealSuccessRateLineChart } from './charts/billing-metrics/appeal-success-rate-line-chart.component';
import { BillingErrorsBarChart } from './charts/billing-metrics/billing-errors-bar-chart.component';
import { ClaimProcessingTimeBarChart } from './charts/billing-metrics/claim-processing-time-bar-chart.component';
import { ClaimsDenialRateLineChart } from './charts/billing-metrics/claims-denial-rate-line-chart.component';
import { ArAgingBarChart } from './charts/cashflow-metrics/ar-aging-bar-chart.component';
import { BadDebtRateAreaChart } from './charts/cashflow-metrics/bad-debt-rate-area-chart.component';
import { CashCollectionsRateLineChart } from './charts/cashflow-metrics/cash-collections-rate-line-chart.component';
import { CashOnHandLineChart } from './charts/cashflow-metrics/cash-on-hand-line-chart.component';
import { DsoLineChart } from './charts/cashflow-metrics/dso-line-chart.component';
import { EquipmentCostsLineChart } from './charts/expense-metrics/equipment-costs-line-chart.component';
import { ExpensesByDepartmentBarChart } from './charts/expense-metrics/expenses-by-department-bar-chart.component';
import { FixedVariableCostsPieChart } from './charts/expense-metrics/fixed-variable-costs-pie-chart.component';
import { StaffingCostsBarChart } from './charts/expense-metrics/staffing-costs-bar-chart.component';
import { DepartmentProfitabilityBarChart } from './charts/profitability-metrics/department-profitability-bar-chart.component';
import { EbitdaMarginLineChart } from './charts/profitability-metrics/ebitda-margin-line-chart.component';
import { NetIncomeTrendLineChart } from './charts/profitability-metrics/net-income-trend-line-chart.component';
import { OperatingMarginLineChart } from './charts/profitability-metrics/operating-margin-line-chart.component';
import { RevenueByPayerBarChart } from './charts/revenue-metrics/revenue-by-payer-bar-chart.component';
import { RevenuePerPatientLineChart } from './charts/revenue-metrics/revenue-per-patient-line-chart.component';
import { RevenueVsBudgetComboChart } from './charts/revenue-metrics/revenue-vs-budget-combo-chart.component';
import { ChartWrapperComponent } from './components/chart-wrapper/chart-wrapper.component';
import { GoogleChartsService } from './services/google-charts.service';
import { NgSelectModule } from '@ng-select/ng-select';

import { MatOptionModule } from '@angular/material/core';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

//import { MatCardModule } from '@angular/material/card';

import { CustomMaterialModule } from './../core/material.module';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';

import { KpiCardComponent } from './components/kpi-card/kpi-card.component';
import { ClDashboardOverviewComponent } from './components/cl-dashboard-overview/cl-dashboard-overview.component';
import { ControlsBarComponent } from './components/controls-bar/controls-bar.component';
//import { ExportControlsComponent } from './components/export-controls/export-controls.component';
import { AlertThresholdComponent } from './components/alert-threshold/alert-threshold.component';
import { RoleConfigComponent } from './components/role-config/role-config.component';
import { FullPageDashboardComponent } from './pages/full-page-dashboard.component';

import { TotalRevenueLineChart } from './charts/revenue-metrics/total-revenue-line-chart.component';
import { TotalRevenueBarChart } from './charts/revenue-metrics/total-revenue-bar-chart.component';
import { TotalRevenueColumnChart } from './charts/revenue-metrics/total-revenue-column-chart.component';
import { TotalRevenuePieChart } from './charts/revenue-metrics/total-revenue-pie-chart.component';
import { TotalRevenuePieChartEx } from './charts/revenue-metrics/total-revenue-pie-chartex.component';
import { RevenueByDepartmentBarChart } from './charts/revenue-metrics/revenue-by-department-bar-chart.component';
import { OperatingExpensesLineChart } from './charts/expense-metrics/operating-expenses-line-chart.component';

import { RevenueCompareMonthsChartComponent } from './components/kpi-card/kpi-revenue-compare-months-chart.component';
import { RevenueCompareMonthChartDeptsComponent } from './components/kpi-card/kpi-revenue-compare-month-chart-depts.component';
import { RevenueCompare3MonthsChartComponent } from './components/kpi-card/kpi-revenue-compare-3months-chart.component';
import { RevenueCompareYearsChartComponent } from './components/kpi-card/kpi-revenue-compare-years-chart.component';



import { OperationsMonthlyBarChart } from './charts/operational-metrics/operations-monthly-bar-chart.component';
import { OperationsGaugeChart } from './charts/operational-metrics/operations-gauge-chart.component';
import { OperationsLineTrend } from './charts/operational-metrics/operations-line-trend.component';
//import { ChartWrapperComponent } from 'angular-google-charts';
import { MaterialWrapper } from '../shared/components/material-wrapper.module';

@NgModule({
  declarations: [
    AppealSuccessRateLineChart,
    BillingErrorsBarChart,
    ClaimProcessingTimeBarChart,
    ClaimsDenialRateLineChart,
    ArAgingBarChart,
    BadDebtRateAreaChart,
    CashCollectionsRateLineChart,
    CashOnHandLineChart,
    DsoLineChart,
    EquipmentCostsLineChart,
    RevenueByDepartmentBarChart,
    FixedVariableCostsPieChart,
    StaffingCostsBarChart,
    DepartmentProfitabilityBarChart,
    EbitdaMarginLineChart,
    NetIncomeTrendLineChart,
    OperatingMarginLineChart,
    RevenueByPayerBarChart,
    RevenuePerPatientLineChart,
    RevenueVsBudgetComboChart,
    ChartWrapperComponent,
    //GoogleChartsService,
    KpiCardComponent,
    ClDashboardOverviewComponent,
    ControlsBarComponent,
    AlertThresholdComponent,
    RoleConfigComponent,
    FullPageDashboardComponent,
    OperationsMonthlyBarChart,
    OperationsGaugeChart,
    OperationsLineTrend,
    TotalRevenueLineChart,
    TotalRevenueBarChart,
    TotalRevenueColumnChart,
    TotalRevenuePieChart,
    TotalRevenuePieChartEx,
    RevenueByDepartmentBarChart,
    OperatingExpensesLineChart, 
    ExpensesByDepartmentBarChart,
    RevenueCompareMonthsChartComponent,
    RevenueCompareMonthChartDeptsComponent,
    RevenueCompare3MonthsChartComponent,
    RevenueCompareYearsChartComponent,
  ],
  imports: [
    CustomMaterialModule,
    MatOptionModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    //MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatRadioModule,
    MaterialWrapper,
    NgSelectModule
  ],
  exports: [
    FullPageDashboardComponent,
    RoleConfigComponent,
    KpiCardComponent,    
    ControlsBarComponent,
    ClDashboardOverviewComponent,
    ChartWrapperComponent,
    AlertThresholdComponent,
    RevenueByPayerBarChart,
    RevenueVsBudgetComboChart,
    RevenuePerPatientLineChart,
    RevenueByDepartmentBarChart,
    TotalRevenueLineChart,
    TotalRevenueBarChart,
    TotalRevenueColumnChart,
    TotalRevenuePieChart,
    TotalRevenuePieChartEx,
    DepartmentProfitabilityBarChart,
    NetIncomeTrendLineChart,
    EbitdaMarginLineChart,
    OperatingMarginLineChart,
    OperationsLineTrend,
    OperationsGaugeChart,
    OperationsMonthlyBarChart,
    FixedVariableCostsPieChart,
    EquipmentCostsLineChart,
    StaffingCostsBarChart,
    ExpensesByDepartmentBarChart,
    OperatingExpensesLineChart,
    BadDebtRateAreaChart,
    CashOnHandLineChart,
    DsoLineChart,
    CashCollectionsRateLineChart,    
    BillingErrorsBarChart,
    ClaimProcessingTimeBarChart,
    AppealSuccessRateLineChart,
    ClaimsDenialRateLineChart,
    // ArAgingBarChartComponent,
    ClaimsDenialRateLineChart,
    FullPageDashboardComponent,
  ]
})
export class CldashboardModule {}