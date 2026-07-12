import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { NpsBaseApiService } from '../services/nps-base-api.service';

export interface NpsPermissionGrantPermission {
  permissionId: number;
  permissionCode: string;
  permissionName: string;
  moduleName?: string | null;
}

export interface NpsManagedEmployeeForGrant {
  employeeId: number;
  displayName: string;
  employeeNumber?: string | null;
  departmentCodes?: number[];
  departmentLabels?: string[];
}

export interface NpsGrantPermissionResult {
  ok: boolean;
  grantedCount?: number;
  skippedCount?: number;
  message?: string;
}

@Component({
  selector: 'app-nps-manager-permission-grants-page',
  templateUrl: './nps-manager-permission-grants-page.component.html',
  styleUrls: ['./nps-manager-permission-grants-page.component.scss'],
})
export class NpsManagerPermissionGrantsPageComponent implements OnInit {
  readonly permissionColumns = ['select', 'permissionName', 'permissionCode', 'moduleName'];
  readonly employeeColumns = ['select', 'displayName', 'employeeId', 'departments'];

  permissions: NpsPermissionGrantPermission[] = [];
  employees: NpsManagedEmployeeForGrant[] = [];

  // Use actual arrays for the data source instead of getters
  filteredPermissions: NpsPermissionGrantPermission[] = [];
  filteredEmployees: NpsManagedEmployeeForGrant[] = [];

  _permissionFilter = '';
  get permissionFilter(): string { return this._permissionFilter; }
  set permissionFilter(val: string) {
    this._permissionFilter = val;
    this.applyFilters();
  }

  _employeeFilter = '';
  get employeeFilter(): string { return this._employeeFilter; }
  set employeeFilter(val: string) {
    this._employeeFilter = val;
    this.applyFilters();
  }

  selectedPermissionIds = new Set<number>();
  selectedEmployeeIds = new Set<number>();

  loading = false;
  saving = false;
  error = '';

  private readonly managerEmployeeId = localStorage.getItem('ID') || '';

  constructor(private api: NpsBaseApiService, private snackBar: MatSnackBar) { }

  ngOnInit(): void {
    this.loadPage();
  }

  loadPage(): void {
    this.loading = true;
    this.error = '';

    forkJoin({
      permissions: this.api.getNpsPermissionsCatalogForGrant(this.managerEmployeeId),
      employees: this.api.getManagedEmployeesForPermissionGrant(this.managerEmployeeId, ""),
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe(
        ({ permissions, employees }) => {
          this.permissions = permissions || [];
          this.employees = employees || [];
          this.selectedPermissionIds.clear();
          this.selectedEmployeeIds.clear();

          // Manually trigger filter application after data loads
          this.applyFilters();
        },
        () => {
          this.permissions = [];
          this.employees = [];
          this.filteredPermissions = [];
          this.filteredEmployees = [];
          this.error = 'טעינת הנתונים נכשלה';
        },
      );
  }

  applyFilters(): void {
    // Filter Permissions
    const permTerm = this.normalize(this.permissionFilter);
    if (!permTerm) {
      this.filteredPermissions = [...this.permissions];
    } else {
      this.filteredPermissions = this.permissions.filter((p) =>
        [p.permissionName, p.permissionCode, p.moduleName].some((value) => this.normalize(value).includes(permTerm)),
      );
    }

    // Filter Employees
    const empTerm = this.normalize(this.employeeFilter);
    if (!empTerm) {
      this.filteredEmployees = [...this.employees];
    } else {
      this.filteredEmployees = this.employees.filter((e) =>
        [e.displayName, e.employeeId, e.employeeNumber, ...(e.departmentLabels || []), ...(e.departmentCodes || [])].some((value) =>
          this.normalize(value).includes(empTerm),
        ),
      );
    }
  }

  get selectedPermission(): NpsPermissionGrantPermission | undefined {
    return this.permissions.find((p) => this.selectedPermissionIds.has(p.permissionId));
  }

  // we need to select multiple permissions
  selectPermission(permission: NpsPermissionGrantPermission): void {
    this.selectedPermissionIds.add(permission.permissionId);
  }

  togglePermission(permission: NpsPermissionGrantPermission, checked: boolean): void {
    if (checked) {
      this.selectedPermissionIds.add(permission.permissionId);
      if (this.selectedPermissionIds.size === 1) {
        forkJoin({
          employees: this.api.getManagedEmployeesForPermissionGrant(this.managerEmployeeId, this.selectedPermission?.permissionId.toString() || ''),
        })
          .pipe(finalize(() => (this.loading = false)))
          .subscribe(
            ({ employees }) => {
              this.employees = employees || [];
              this.selectedEmployeeIds.clear();

              // Manually trigger filter application after data loads
              this.applyFilters();
            },
            () => {
              this.error = 'טעינת הנתונים נכשלה';
            },
          );
      }
    } else {
      this.selectedPermissionIds.delete(permission.permissionId);
    }
  }

  toggleEmployee(employee: NpsManagedEmployeeForGrant, checked: boolean): void {
    if (checked) {
      this.selectedEmployeeIds.add(employee.employeeId);
      return;
    }
    this.selectedEmployeeIds.delete(employee.employeeId);
  }

  isEmployeeSelected(employee: NpsManagedEmployeeForGrant): boolean {
    return this.selectedEmployeeIds.has(employee.employeeId);
  }

  toggleAllFilteredEmployees(checked: boolean): void {
    this.filteredEmployees.forEach((employee) => {
      if (checked) {
        this.selectedEmployeeIds.add(employee.employeeId);
      } else {
        this.selectedEmployeeIds.delete(employee.employeeId);
      }
    });
  }

  allFilteredEmployeesSelected(): boolean {
    const rows = this.filteredEmployees;
    return rows.length > 0 && rows.every((employee) => this.selectedEmployeeIds.has(employee.employeeId));
  }

  someFilteredEmployeesSelected(): boolean {
    const rows = this.filteredEmployees;
    return rows.some((employee) => this.selectedEmployeeIds.has(employee.employeeId)) && !this.allFilteredEmployeesSelected();
  }

  grantSelectedPermission(): void {
    if (this.selectedPermissionIds.size === 0 || this.selectedEmployeeIds.size === 0 || this.saving) return;

    const employeeIds = Array.from(this.selectedEmployeeIds);
    this.saving = true;
    this.error = '';

    this.api
      .grantNpsPermissionToEmployees({
        permissionIds: Array.from(this.selectedPermissionIds),
        employeeIds,
        actorEmployeeId: Number(this.managerEmployeeId),
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe(
        (result: NpsGrantPermissionResult) => {
          if (!result?.ok) {
            this.error = result?.message || 'שמירת ההרשאה נכשלה';
            return;
          }

          this.snackBar.open(result.message || `ההרשאה ניתנה ל-${result.grantedCount || employeeIds.length} עובדים`, 'סגור', {
            duration: 3500,
          });
          this.selectedEmployeeIds.clear();
        },
        () => {
          this.error = 'שמירת ההרשאה נכשלה';
        },
      );
  }

  formatDepartments(employee: NpsManagedEmployeeForGrant): string {
    if (employee.departmentLabels?.length) return employee.departmentLabels.join(', ');
    if (employee.departmentCodes?.length) return employee.departmentCodes.join(', ');
    return '-';
  }

  trackPermission(_: number, permission: NpsPermissionGrantPermission): number {
    return permission.permissionId;
  }

  trackEmployee(_: number, employee: NpsManagedEmployeeForGrant): number {
    return employee.employeeId;
  }

  private normalize(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
  }
}