import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

// Components
import { GoogleChartsIncomeComponent } from './google-charts/google-charts.component';
import { ChargingGroupsComponent } from './google-charts/charging-groups.component';
import { HospitalIncomeDashbComponent } from './hospital-income-dashb.component';
import { TableComponent } from '../shared/dataTable';

// Angular Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSortModule } from '@angular/material/sort';
import { MatExpansionModule } from '@angular/material/expansion';
import { GroupDashboardComponent } from './group-dashboard.component';
import { DepartmentDashboardComponent } from './department-dashboard.component';
import { HospitalIncomeDashbRoutingModule } from './hospital-income-dashb-routing.module';
import { MatTabsModule } from '@angular/material/tabs';



const routes: Routes = [
  { path: '', component: GoogleChartsIncomeComponent },
  { path: 'data-table', component: TableComponent },
  { path: 'groups', component: ChargingGroupsComponent },
  { path: 'dashboard', component: HospitalIncomeDashbComponent } // ✅ Your dashboard
];

@NgModule({
  declarations: [
    GoogleChartsIncomeComponent,
    TableComponent,
    ChargingGroupsComponent,
    HospitalIncomeDashbComponent,
    DepartmentDashboardComponent,
    GroupDashboardComponent
    
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    HttpClientModule,
    FormsModule,
    //HospitalIncomeDashbRoutingModule,

    // Material UI
    MatCardModule,
    MatGridListModule,
    MatToolbarModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSortModule,
    MatExpansionModule,
    MatTabsModule
  ],
  entryComponents: [GroupDashboardComponent],
  exports: [DepartmentDashboardComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HospitalIncomeDashbModule {}
