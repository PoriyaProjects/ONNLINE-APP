import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
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
export class DashboardEmployeesComponent implements OnInit {
  loading = true;
  summary: EpDashboardSummary | null = null;
  userRole: EpUserRole = 'Employee';
  profiles: EpProfile[] = [];
  dataSource = new MatTableDataSource<EpEmployee>([]);
  displayedColumns = ['name', 'department', 'email', 'pending', 'actions'];

  constructor(
    private service: NursePermissionsService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadData();
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
        this.dataSource.data = employees || [];
        this.profiles = profiles || [];
        this.loading = false;
      },
      () => {
        this.loading = false;
        this.showError('שגיאה בטעינת נתוני לוח הבקרה');
      },
    );
  }

  employeeName(employee: EpEmployee): string {
    return employee.FullName || `${employee.FirstName || ''} ${employee.LastName || ''}`.trim();
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
