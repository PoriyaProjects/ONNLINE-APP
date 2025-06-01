
import { Component, OnInit } from '@angular/core';
import { DepartmentService } from '../../services/department.service';

@Component({
  selector: 'app-cl-dashboard-overview',
  templateUrl: './cl-dashboard-overview.component.html',
  styleUrls: ['./cl-dashboard-overview.component.scss']
})
export class ClDashboardOverviewComponent implements OnInit {
  departments: { id: number, name: string }[] = [];
  periods: { id: number, name: string }[] = [];
  filters = { deptCode: '', param: '1' };

  constructor(private deptService: DepartmentService) {}

  ngOnInit() {
    this.deptService.getDepartments().subscribe(list => {
      console.warn('[DEPARTMENTS FETCHED FROM API]', list);
      this.departments = list;
      this.filters.deptCode = localStorage.getItem('storage.Depart') || (list[0]?.id?.toString() || '1');
    });

    this.deptService.getTimeTypes().subscribe(periodList => {
      console.warn('[PERIODS FETCHED FROM API]', periodList);
      this.periods = periodList;
      if (!this.filters.param && periodList.length > 0) {
        this.filters.param = periodList[0].id.toString();
      }
    });
  }

  onDepartmentChange(id: string) {
    this.filters.deptCode = id;
    localStorage.setItem('storage.Depart', id);
  }

  onPeriodChange(id: string) {
    this.filters.param = id;
  }

  updateFilters(updated: any) {
    this.filters = { ...this.filters, ...updated };
  }
}