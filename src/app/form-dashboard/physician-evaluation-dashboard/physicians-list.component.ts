import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EvalPhysician, PhysicianEvaluationService } from './physician-evaluation.service';

@Component({
  selector: 'app-physicians-list',
  templateUrl: './physicians-list.component.html',
  styleUrls: ['./physicians-list.component.scss']
})
export class PhysiciansListComponent implements OnInit {
  loading = true;
  error = '';
  physicians: EvalPhysician[] = [];
  physicianQuery = '';
  departmentId = '';
  departmentName = '';
  skeletonSlots = [1, 2, 3, 4];

  constructor(
    private api: PhysicianEvaluationService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.departmentId = this.route.snapshot.paramMap.get('departmentId') || '';
    this.departmentName = this.route.snapshot.queryParamMap.get('name') || '';
    this.api.getPhysicians(this.departmentId).subscribe(rows => {
      this.physicians = rows || [];
      if (!this.departmentName && this.physicians.length) {
        this.departmentName = this.physicians[0].DepartmentName || '';
      }
      this.loading = false;
    }, () => {
      this.loading = false;
      this.error = 'לא ניתן לטעון את רשימת הרופאים';
    });
  }

  get showBack(): boolean {
    return !!this.departmentId;
  }

  get filteredPhysicians(): EvalPhysician[] {
    const q = (this.physicianQuery || '').trim();
    if (!q) {
      return this.physicians;
    }
    return this.physicians.filter(p =>
      (p.FullName || '').indexOf(q) >= 0 ||
      (p.EmployeeID || '').indexOf(q) >= 0 ||
      (p.DepartmentName || '').indexOf(q) >= 0
    );
  }

  overtimeText(value: number): string {
    const hours = Number(value || 0);
    const text = Math.abs(hours - Math.round(hours)) < 0.05 ? String(Math.round(hours)) : hours.toFixed(1);
    return text + 'h';
  }

  initials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(function (part) { return !!part; });
    if (!parts.length) {
      return 'ר';
    }
    if (parts.length === 1) {
      return parts[0].charAt(0);
    }
    return parts[0].charAt(0) + parts[1].charAt(0);
  }

  openPhysician(physician: EvalPhysician): void {
    const queryParams = this.departmentId ? { departmentId: this.departmentId } : {};
    this.router.navigate(['/physician-evaluation-dashboard/physician', physician.EmployeeID], { queryParams: queryParams });
  }
}
