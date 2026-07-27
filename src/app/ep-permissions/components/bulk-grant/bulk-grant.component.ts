import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import {
  EpEmployee,
  EpPermission,
  EpUserRole,
} from '../../models/nurse-permissions.models';
import { NursePermissionsService } from '../../services/nurse-permissions.service';

@Component({
  selector: 'app-bulk-grant',
  templateUrl: './bulk-grant.component.html',
  styleUrls: ['./bulk-grant.component.scss'],
})
export class BulkGrantComponent implements OnInit, OnDestroy {
  loading = true;
  saving = false;
  userRole: EpUserRole = 'Employee';

  permissions: EpPermission[] = [];
  employees: EpEmployee[] = [];

  filteredPermissions: EpPermission[] = [];
  filteredEmployees: EpEmployee[] = [];

  selectedPermissionIds = new Set<number>();
  selectedEmployeeIds = new Set<string>();

  permissionSearch = '';
  employeeSearch = '';

  private roleSelectionSub?: Subscription;

  constructor(
    private service: NursePermissionsService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.roleSelectionSub = this.service.roleSelectionChanges.subscribe((role) => {
      this.userRole = role;

      if (!this.canAccess) {
        this.router.navigate(['/ep-permissions/dashboard']);
        return;
      }

      this.selectedPermissionIds.clear();
      this.selectedEmployeeIds.clear();
      this.loadData();
    });
  }

  ngOnDestroy(): void {
    if (this.roleSelectionSub) {
      this.roleSelectionSub.unsubscribe();
    }
  }

  get canSave(): boolean {
    return this.selectedPermissionIds.size > 0 && this.selectedEmployeeIds.size > 0 && !this.saving;
  }

  get canAccess(): boolean {
    return this.userRole === 'Admin' || this.userRole === 'DirectManager';
  }

  loadData(): void {
    this.loading = true;

    forkJoin({
      summary: this.service.getDashboardSummary(),
      employees: this.service.getEmployees(),
      admin: this.service.manageAdminSetup('GET_ALL'),
    }).subscribe(
      ({ summary, employees, admin }) => {
        this.userRole = summary?.UserRole || this.service.currentUserRole || 'Employee';

        if (!this.canAccess) {
          this.loading = false;
          this.snackBar.open('אין הרשאה לעמוד זה', 'סגור', { duration: 3000 });
          this.router.navigate(['/ep-permissions/dashboard']);
          return;
        }

        this.employees = employees || [];
        const allPermissions = (admin && admin.Data && admin.Data.Permissions) || [];
        this.permissions = (allPermissions as EpPermission[]).filter((p) => p && p.IsActive !== false);

        this.applyPermissionFilter();
        this.applyEmployeeFilter();
        this.loading = false;
      },
      () => {
        this.loading = false;
        this.snackBar.open('שגיאה בטעינת נתונים', 'סגור', { duration: 3000 });
      },
    );
  }

  applyPermissionFilter(): void {
    const q = (this.permissionSearch || '').trim().toLowerCase();
    this.filteredPermissions = !q
      ? this.permissions.slice()
      : this.permissions.filter(
          (p) =>
            (p.PermissionName || '').toLowerCase().includes(q) ||
            (p.PermissionCode || '').toLowerCase().includes(q) ||
            (p.Description || '').toLowerCase().includes(q),
        );
  }

  applyEmployeeFilter(): void {
    const q = (this.employeeSearch || '').trim().toLowerCase();
    this.filteredEmployees = !q
      ? this.employees.slice()
      : this.employees.filter((e) => {
          const fullName = `${e.FirstName || ''} ${e.LastName || ''} ${e.FullName || ''}`.toLowerCase();
          return (
            fullName.includes(q) ||
            (e.EmployeeId || '').toLowerCase().includes(q) ||
            (e.DepartmentName || '').toLowerCase().includes(q) ||
            (e.Email || '').toLowerCase().includes(q)
          );
        });
  }

  isPermissionSelected(id: number): boolean {
    return this.selectedPermissionIds.has(id);
  }

  isEmployeeSelected(id: string): boolean {
    return this.selectedEmployeeIds.has(id);
  }

  togglePermission(id: number, checked: boolean): void {
    if (checked) {
      this.selectedPermissionIds.add(id);
    } else {
      this.selectedPermissionIds.delete(id);
    }
  }

  toggleEmployee(id: string, checked: boolean): void {
    if (checked) {
      this.selectedEmployeeIds.add(id);
    } else {
      this.selectedEmployeeIds.delete(id);
    }
  }

  selectAllPermissions(): void {
    this.filteredPermissions.forEach((p) => this.selectedPermissionIds.add(p.PermissionID));
  }

  clearPermissions(): void {
    this.selectedPermissionIds.clear();
  }

  selectAllEmployees(): void {
    this.filteredEmployees.forEach((e) => {
      if (e.EmployeeId) {
        this.selectedEmployeeIds.add(e.EmployeeId);
      }
    });
  }

  clearEmployees(): void {
    this.selectedEmployeeIds.clear();
  }

  employeeDisplayName(row: EpEmployee): string {
    if (row.FullName) {
      return row.FullName;
    }
    return `${row.FirstName || ''} ${row.LastName || ''}`.trim() || row.EmployeeId;
  }

  goBack(): void {
    this.router.navigate(['/ep-permissions/dashboard']);
  }

  save(): void {
    if (!this.canSave) {
      return;
    }

    this.saving = true;
    const employeeIds = Array.from(this.selectedEmployeeIds);
    const permissionIds = Array.from(this.selectedPermissionIds);

    this.service.bulkGrantPermissions(employeeIds, permissionIds).subscribe(
      (result) => {
        this.saving = false;
        if (result && result.Success === false) {
          this.snackBar.open(result.Message || 'שגיאה בשמירה', 'סגור', { duration: 4000 });
          return;
        }

        this.snackBar.open(result?.Message || 'ההרשאות הוענקו בהצלחה', 'סגור', { duration: 3500 });
        this.selectedPermissionIds.clear();
        this.selectedEmployeeIds.clear();
      },
      (err) => {
        this.saving = false;
        this.snackBar.open(err?.message || 'שגיאה בשמירה', 'סגור', { duration: 4000 });
      },
    );
  }
}
