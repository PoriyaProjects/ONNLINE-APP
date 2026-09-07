import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { forkJoin, Observable, of, Subscription } from 'rxjs';
import { finalize, map, switchMap } from 'rxjs/operators';
import {
  EpEmployee,
  EpOperationResult,
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
  loadingEmployeePermissions = false;
  userRole: EpUserRole = 'Employee';

  permissions: EpPermission[] = [];
  employees: EpEmployee[] = [];

  filteredPermissions: EpPermission[] = [];
  filteredEmployees: EpEmployee[] = [];

  selectedPermissionIds = new Set<number>();
  selectedEmployeeIds = new Set<string>();
  /** DirectManager checks already held by the single selected employee. */
  baselinePermissionIds = new Set<number>();
  /** PermissionID → comma-separated group names. */
  associatedGroupsByPermissionId = new Map<number, string>();

  permissionSearch = '';
  employeeSearch = '';

  private roleSelectionSub?: Subscription;
  private employeeGridSub?: Subscription;

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

      this.clearSelectionState();
      this.loadData();
    });
  }

  ngOnDestroy(): void {
    if (this.roleSelectionSub) {
      this.roleSelectionSub.unsubscribe();
    }
    if (this.employeeGridSub) {
      this.employeeGridSub.unsubscribe();
    }
  }

  get isSingleEmployeeMode(): boolean {
    return this.selectedEmployeeIds.size === 1;
  }

  get toGrantIds(): number[] {
    if (!this.isSingleEmployeeMode) {
      return Array.from(this.selectedPermissionIds);
    }
    return Array.from(this.selectedPermissionIds).filter((id) => !this.baselinePermissionIds.has(id));
  }

  get toRevokeIds(): number[] {
    if (!this.isSingleEmployeeMode) {
      return [];
    }
    return Array.from(this.baselinePermissionIds).filter((id) => !this.selectedPermissionIds.has(id));
  }

  get canSave(): boolean {
    if (this.saving || this.loadingEmployeePermissions || this.selectedEmployeeIds.size === 0) {
      return false;
    }

    if (this.isSingleEmployeeMode) {
      return this.toGrantIds.length > 0 || this.toRevokeIds.length > 0;
    }

    return this.selectedPermissionIds.size > 0;
  }

  get canAccess(): boolean {
    return this.userRole === 'Admin' || this.userRole === 'DirectManager';
  }

  get hintText(): string {
    if (this.isSingleEmployeeMode) {
      return 'עובד אחד נבחר: מסומנות ההרשאות הקיימות (מנהל ישיר). ניתן להוסיף או להסיר הרשאות ולשמור.';
    }
    if (this.selectedEmployeeIds.size > 1) {
      return 'מספר עובדים נבחרו: כל העובדים יקבלו את ההרשאות שיסומנו (הענקת מנהל ישיר בלבד).';
    }
    return 'בחרו עובד אחד לעריכת הרשאות קיימות, או מספר עובדים להענקה מרובה.';
  }

  get summaryText(): string {
    if (this.isSingleEmployeeMode) {
      const parts: string[] = [];
      if (this.toGrantIds.length) {
        parts.push(`+${this.toGrantIds.length} להענקה`);
      }
      if (this.toRevokeIds.length) {
        parts.push(`−${this.toRevokeIds.length} להסרה`);
      }
      return parts.length ? parts.join(' · ') : 'אין שינויים';
    }
    return `${this.selectedPermissionIds.size} הרשאות × ${this.selectedEmployeeIds.size} עובדים`;
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
        const data = (admin && admin.Data) || {};
        const allPermissions = data.Permissions || [];
        this.permissions = (allPermissions as EpPermission[]).filter((p) => p && p.IsActive !== false);
        this.buildAssociatedGroupsMap(data.Groups || [], data.GroupPermissions || []);

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

  associatedGroupsFor(permissionId: number): string {
    return this.associatedGroupsByPermissionId.get(permissionId) || '';
  }

  isExistingPermission(permissionId: number): boolean {
    return this.isSingleEmployeeMode && this.baselinePermissionIds.has(permissionId);
  }

  applyPermissionFilter(): void {
    const q = (this.permissionSearch || '').trim().toLowerCase();
    this.filteredPermissions = !q
      ? this.permissions.slice()
      : this.permissions.filter(
          (p) =>
            (p.PermissionName || '').toLowerCase().includes(q) ||
            (p.PermissionCode || '').toLowerCase().includes(q) ||
            (p.Description || '').toLowerCase().includes(q) ||
            (this.associatedGroupsFor(p.PermissionID) || '').toLowerCase().includes(q),
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
    this.onEmployeeSelectionChanged();
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
    this.onEmployeeSelectionChanged();
  }

  clearEmployees(): void {
    this.selectedEmployeeIds.clear();
    this.onEmployeeSelectionChanged();
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

    if (this.isSingleEmployeeMode) {
      this.saveSingleEmployee(employeeIds[0]);
      return;
    }

    const permissionIds = Array.from(this.selectedPermissionIds);
    this.service.bulkGrantPermissions(employeeIds, permissionIds).subscribe(
      (result) => {
        this.saving = false;
        if (result && result.Success === false) {
          this.snackBar.open(result.Message || 'שגיאה בשמירה', 'סגור', { duration: 4000 });
          return;
        }

        this.snackBar.open(result?.Message || 'ההרשאות הוענקו בהצלחה', 'סגור', { duration: 3500 });
        this.clearSelectionState();
      },
      (err) => {
        this.saving = false;
        this.snackBar.open(err?.message || 'שגיאה בשמירה', 'סגור', { duration: 4000 });
      },
    );
  }

  private saveSingleEmployee(employeeId: string): void {
    const toGrant = this.toGrantIds;
    const toRevoke = this.toRevokeIds;

    const grant$: Observable<EpOperationResult | null> =
      toGrant.length > 0
        ? this.service.bulkGrantPermissions([employeeId], toGrant)
        : of(null);

    const revokeOps = toRevoke.map((permissionId) =>
      this.service.updateCheck(employeeId, permissionId, 'Direct', false),
    );
    const revoke$: Observable<EpOperationResult[] | null> =
      revokeOps.length > 0 ? forkJoin(revokeOps) : of(null);

    grant$
      .pipe(
        switchMap((grantResult) => {
          if (grantResult && grantResult.Success === false) {
            return of({ grantResult, revokeResults: null as EpOperationResult[] | null });
          }
          return revoke$.pipe(map((revokeResults) => ({ grantResult, revokeResults })));
        }),
        finalize(() => {
          this.saving = false;
        }),
      )
      .subscribe(
        ({ grantResult, revokeResults }) => {
          if (grantResult && grantResult.Success === false) {
            this.snackBar.open(grantResult.Message || 'שגיאה בהענקה', 'סגור', { duration: 4000 });
            return;
          }

          if (revokeResults) {
            const failed = revokeResults.find((r) => r && r.Success === false);
            if (failed) {
              this.snackBar.open(failed.Message || 'שגיאה בהסרת הרשאה', 'סגור', { duration: 4000 });
              this.reloadSingleEmployeeBaseline(employeeId);
              return;
            }
          }

          const msgs: string[] = [];
          if (toGrant.length) {
            msgs.push(`${toGrant.length} הוענקו`);
          }
          if (toRevoke.length) {
            msgs.push(`${toRevoke.length} הוסרו`);
          }
          this.snackBar.open(msgs.join(' · ') || 'נשמר בהצלחה', 'סגור', { duration: 3500 });
          this.reloadSingleEmployeeBaseline(employeeId);
        },
        (err) => {
          this.snackBar.open(err?.message || 'שגיאה בשמירה', 'סגור', { duration: 4000 });
        },
      );
  }

  private onEmployeeSelectionChanged(): void {
    if (this.employeeGridSub) {
      this.employeeGridSub.unsubscribe();
      this.employeeGridSub = undefined;
    }

    this.baselinePermissionIds.clear();
    this.selectedPermissionIds.clear();
    this.loadingEmployeePermissions = false;

    if (this.selectedEmployeeIds.size !== 1) {
      return;
    }

    const employeeId = Array.from(this.selectedEmployeeIds)[0];
    this.loadingEmployeePermissions = true;

    this.employeeGridSub = this.service.getPermissionGrid(employeeId).subscribe(
      (grid) => {
        this.loadingEmployeePermissions = false;
        const baseline = new Set<number>();
        (grid?.Items || []).forEach((item) => {
          if (item && item.DirectManagerCheck && item.PermissionID) {
            baseline.add(item.PermissionID);
          }
        });
        this.baselinePermissionIds = baseline;
        this.selectedPermissionIds = new Set(baseline);
      },
      () => {
        this.loadingEmployeePermissions = false;
        this.snackBar.open('שגיאה בטעינת הרשאות העובד', 'סגור', { duration: 3000 });
      },
    );
  }

  private reloadSingleEmployeeBaseline(employeeId: string): void {
    this.loadingEmployeePermissions = true;
    this.service.getPermissionGrid(employeeId).subscribe(
      (grid) => {
        this.loadingEmployeePermissions = false;
        const baseline = new Set<number>();
        (grid?.Items || []).forEach((item) => {
          if (item && item.DirectManagerCheck && item.PermissionID) {
            baseline.add(item.PermissionID);
          }
        });
        this.baselinePermissionIds = baseline;
        this.selectedPermissionIds = new Set(baseline);
      },
      () => {
        this.loadingEmployeePermissions = false;
        this.baselinePermissionIds.clear();
        this.selectedPermissionIds.clear();
      },
    );
  }

  private clearSelectionState(): void {
    if (this.employeeGridSub) {
      this.employeeGridSub.unsubscribe();
      this.employeeGridSub = undefined;
    }
    this.selectedPermissionIds.clear();
    this.selectedEmployeeIds.clear();
    this.baselinePermissionIds.clear();
    this.loadingEmployeePermissions = false;
  }

  private buildAssociatedGroupsMap(groups: any[], groupPermissions: any[] = []): void {
    const namesByPermission = new Map<number, string[]>();
    const groupNameById = new Map<number, string>();

    (groups || []).forEach((raw) => {
      if (!raw) {
        return;
      }
      const isActive = raw.IsActive;
      if (isActive === false || isActive === 0 || isActive === '0' || isActive === 'false') {
        return;
      }

      const groupId = Number(raw.GroupID ?? raw.ID ?? 0);
      const name = String(raw.GroupName ?? raw.Name ?? '').trim();
      if (groupId && name) {
        groupNameById.set(groupId, name);
      }
      if (!name) {
        return;
      }

      this.toIntArray(raw.PermissionIds ?? raw.PermissionIDs).forEach((permissionId) => {
        this.addGroupNameForPermission(namesByPermission, permissionId, name);
      });
    });

    // Fallback when Groups arrive without nested PermissionIds (join rows only).
    (groupPermissions || []).forEach((link) => {
      if (!link) {
        return;
      }
      const groupId = Number(link.GroupID ?? 0);
      const permissionId = Number(link.PermissionID ?? 0);
      const name = groupNameById.get(groupId);
      if (!name || !permissionId) {
        return;
      }
      this.addGroupNameForPermission(namesByPermission, permissionId, name);
    });

    const groupsMap = new Map<number, string>();
    namesByPermission.forEach((names, permissionId) => {
      groupsMap.set(permissionId, names.join(', '));
    });
    this.associatedGroupsByPermissionId = groupsMap;
  }

  private addGroupNameForPermission(
    namesByPermission: Map<number, string[]>,
    permissionId: number,
    name: string,
  ): void {
    if (!permissionId || !name) {
      return;
    }
    const list = namesByPermission.get(permissionId) || [];
    if (list.indexOf(name) < 0) {
      list.push(name);
    }
    namesByPermission.set(permissionId, list);
  }

  private toIntArray(value: any): number[] {
    if (!value) {
      return [];
    }
    if (Array.isArray(value)) {
      return value.map((item) => Number(item)).filter((item) => !!item && !Number.isNaN(item));
    }
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => Number(item.trim()))
        .filter((item) => !!item && !Number.isNaN(item));
    }
    return [];
  }
}
