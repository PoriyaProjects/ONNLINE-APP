import { Component, OnInit } from '@angular/core';
import { DepartmentService } from './services/department.service';
import { PermissionService } from './services/permission.service';

@Component({
  selector: 'app-genhdashboard',
  templateUrl: './genhdashboard.component.html'
})
export class GenhdashboardComponent implements OnInit {
  departments: { [key: string]: string } = {};
  selectedDepartment: string;
  hasFinancialAccess: boolean;

  constructor(
    private departmentService: DepartmentService,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    this.departmentService.getDepartments().subscribe(departments => {
      this.departments = departments;
      this.selectedDepartment = this.departmentService.getInitialDepartment(departments);
    });

    this.hasFinancialAccess = this.permissionService.hasFinancialAccess();
  }

  onDepartmentChange(departmentId: string): void {
    this.selectedDepartment = departmentId;
    this.departmentService.setCurrentDepartment(departmentId);
  }
}
