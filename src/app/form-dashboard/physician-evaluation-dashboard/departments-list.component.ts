import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EvalDepartment, PhysicianEvaluationService } from './physician-evaluation.service';

@Component({
  selector: 'app-departments-list',
  templateUrl: './departments-list.component.html',
  styleUrls: ['./departments-list.component.scss']
})
export class DepartmentsListComponent implements OnInit {
  fullName = ((localStorage.getItem('FirstName') || '') + ' ' + (localStorage.getItem('LastName') || '')).trim();
  loading = true;
  error = '';
  canUpload = false;
  departmentQuery = '';
  departments: EvalDepartment[] = [];
  skeletonSlots = [1, 2, 3, 4, 5, 6, 7, 8];

  constructor(private api: PhysicianEvaluationService, private router: Router) {}

  ngOnInit(): void {
    this.api.getDepartments().subscribe(data => {
      const home = data || ({} as any);
      if (!home.CanViewAllDepartments) {
        this.router.navigate(['/physician-evaluation-dashboard/physicians'], { replaceUrl: true });
        return;
      }
      this.canUpload = !!(home.CanUploadManualReports || home.CanUploadOvertime);
      this.departments = home.Departments || [];
      this.loading = false;
    }, () => {
      this.loading = false;
      this.error = 'לא ניתן לטעון את רשימת המחלקות';
    });
  }

  get filteredDepartments(): EvalDepartment[] {
    const q = (this.departmentQuery || '').trim();
    if (!q) {
      return this.departments;
    }
    return this.departments.filter(d =>
      (d.DepartmentName || '').indexOf(q) >= 0 || (d.DepartmentId || '').indexOf(q) >= 0
    );
  }

  openDepartment(department: EvalDepartment): void {
    this.router.navigate(['/physician-evaluation-dashboard/department', department.DepartmentId], {
      queryParams: { name: department.DepartmentName }
    });
  }
}
