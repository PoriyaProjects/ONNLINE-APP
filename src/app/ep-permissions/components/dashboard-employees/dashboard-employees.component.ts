import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import {
  EpDashboardSummary,
  EpEmployee,
  EpProfile,
  EpUserRole,
} from '../../models/nurse-permissions.models';
import { NursePermissionsService } from '../../services/nurse-permissions.service';

@Component({
  selector: 'app-dashboard-employees',
  templateUrl: './dashboard-employees.component.html',
  styleUrls: ['./dashboard-employees.component.scss'],
})
export class DashboardEmployeesComponent implements OnInit, OnDestroy {
  loading = true;
  summary: EpDashboardSummary | null = null;
  userRole: EpUserRole = 'Employee';
  profiles: EpProfile[] = [];
  dataSource = new MatTableDataSource<EpEmployee>([]);
  displayedColumns = ['name', 'department', 'email', 'pending', 'actions'];

  nameFilter = '';
  departmentFilter = '';
  onlyPending = false;
  departments: string[] = [];

  private allEmployees: EpEmployee[] = [];
  private roleSelectionSub?: Subscription;

  constructor(
    private service: NursePermissionsService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.roleSelectionSub = this.service.roleSelectionChanges.subscribe(() => this.loadData());
  }

  ngOnDestroy(): void {
    if (this.roleSelectionSub) {
      this.roleSelectionSub.unsubscribe();
    }
  }

  loadData(): void {
    this.loading = true;

    forkJoin({
      summary: this.service.getDashboardSummary(),
      employees: this.service.getEmployees(),
      profiles: this.service.getProfiles(),
    }).subscribe(
      ({ summary, employees, profiles }) => {
        this.summary = summary;
        this.userRole = summary?.UserRole || 'Employee';
        this.allEmployees = employees || [];
        this.departments = this.buildDepartments(this.allEmployees);
        this.profiles = profiles || [];
        this.applyFilters();
        this.loading = false;
      },
      () => {
        this.loading = false;
        this.showError('שגיאה בטעינת נתוני לוח הבקרה');
      },
    );
  }

  applyFilters(): void {
    const nameQuery = (this.nameFilter || '').trim().toLowerCase();
    const department = (this.departmentFilter || '').trim();

    this.dataSource.data = this.allEmployees.filter((employee) => {
      if (this.onlyPending && !(employee.PendingChecks > 0)) {
        return false;
      }

      if (department && (employee.DepartmentName || '') !== department) {
        return false;
      }

      if (nameQuery) {
        const fullName = this.employeeName(employee).toLowerCase();
        const id = (employee.EmployeeId || '').toLowerCase();
        if (!fullName.includes(nameQuery) && !id.includes(nameQuery)) {
          return false;
        }
      }

      return true;
    });
  }

  clearFilters(): void {
    this.nameFilter = '';
    this.departmentFilter = '';
    this.onlyPending = false;
    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return !!(this.nameFilter || this.departmentFilter || this.onlyPending);
  }

  employeeName(employee: EpEmployee): string {
    return employee.FullName || `${employee.FirstName || ''} ${employee.LastName || ''}`.trim();
  }

  private buildDepartments(employees: EpEmployee[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    employees.forEach((employee) => {
      const name = (employee.DepartmentName || '').trim();
      if (name && !seen.has(name)) {
        seen.add(name);
        result.push(name);
      }
    });

    return result.sort((a, b) => a.localeCompare(b, 'he'));
  }

  openMatrix(employee: EpEmployee): void {
    this.router.navigate(['/ep-permissions/matrix', employee.EmployeeId], {
      state: {
        employee,
        userRole: this.userRole,
      },
    });
  }

  assignProfile(employee: EpEmployee, profileId: number): void {
    if (!profileId) {
      return;
    }

    this.service.assignProfile(employee.EmployeeId, profileId).subscribe(
      (result) => {
        if (result?.Success !== false) {
          this.showMessage('הפרופיל שויך בהצלחה');
          this.loadData();
        } else {
          this.showError(result?.Message || 'שגיאה בשיוך פרופיל');
        }
      },
      () => this.showError('שגיאה בשיוך פרופיל'),
    );
  }

  get isAdmin(): boolean {
    return this.userRole === 'Admin';
  }
  
  get isManager(): boolean {
    return this.userRole === 'DirectManager';
  }

  private showMessage(message: string): void {
    this.snackBar.open(message, 'סגור', { duration: 3000, direction: 'rtl' });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'סגור', { duration: 5000, direction: 'rtl', panelClass: ['snack-error'] });
  }
}
