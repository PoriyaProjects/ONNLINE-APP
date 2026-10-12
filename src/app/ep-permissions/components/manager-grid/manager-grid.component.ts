import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { EpCheckType, EpPermissionGridItem, EpUserRole } from '../../models/nurse-permissions.models';
import { NursePermissionsService } from '../../services/nurse-permissions.service';

@Component({
  selector: 'app-manager-grid',
  templateUrl: './manager-grid.component.html',
  styleUrls: ['./manager-grid.component.scss'],
})
export class ManagerGridComponent implements OnInit {
  loading = true;
  saving = false;
  employeeId = '';
  employeeName = '';
  departmentName = '';
  profileName = '';
  educationSubject = '';
  speciality = '';
  userRole: EpUserRole = 'Employee';

  dataSource = new MatTableDataSource<EpPermissionGridItem>([]);
  displayedColumns = ['permission', 'direct', 'indirect', 'employee'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: NursePermissionsService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.employeeId = this.route.snapshot.paramMap.get('employeeId') || '';

    const navState = history.state || {};
    if (navState.userRole) {
      this.userRole = navState.userRole;
    }
    if (navState.employee) {
      const employee = navState.employee;
      this.employeeName = employee.FullName || `${employee.FirstName || ''} ${employee.LastName || ''}`.trim();
      this.departmentName = employee.DepartmentName || '';
      this.profileName = employee.ProfileName || '';
    }

    this.loadGrid();
  }

  get canEditDirect(): boolean {
    return this.userRole === 'Admin' || this.userRole === 'DirectManager';
  }

  get canEditIndirect(): boolean {
    return this.userRole === 'Admin' || this.userRole === 'IndirectManager';
  }

  get canEditEmployee(): boolean {
    return this.userRole === 'Admin' || this.userRole === 'Employee';
  }

  get allDirectChecked(): boolean {
    const rows = this.dataSource.data || [];
    return rows.length > 0 && rows.every((row) => !!row.DirectManagerCheck);
  }

  onSelectAllDirect(checked: boolean): void {
    if (!checked || !this.showBulkGrant) {
      return;
    }
    this.bulkGrantDirect();
  }

  get showBulkGrant(): boolean {
    return this.userRole === 'Admin' || this.userRole === 'DirectManager';
  }

  get directCheckCount(): number {
    return (this.dataSource.data || []).filter((row) => !!row.DirectManagerCheck).length;
  }

  get indirectCheckCount(): number {
    return (this.dataSource.data || []).filter((row) => !!row.IndirectManagerCheck).length;
  }

  get employeeCheckCount(): number {
    return (this.dataSource.data || []).filter((row) => !!row.EmployeeCheck).length;
  }

  get totalPermissions(): number {
    return (this.dataSource.data || []).length;
  }

  loadGrid(): void {
    if (!this.employeeId) {
      this.loading = false;
      return;
    }

    this.loading = true;
    this.service.getPermissionGrid(this.employeeId).subscribe(
      (grid) => {
        this.employeeName =
          this.employeeName || `${grid.FirstName || ''} ${grid.LastName || ''}`.trim();
        this.departmentName = this.departmentName || grid.DepartmentName || '';
        this.profileName = grid.ProfileName || this.profileName || '';
        this.educationSubject = grid.EducationSubject || '';
        this.speciality = grid.Speciality || '';
        this.userRole = grid.UserRole || this.userRole;
        this.dataSource.data = this.sortItems(grid.Items || []);
        this.loading = false;
      },
      () => {
        this.loading = false;
        this.showError('שגיאה בטעינת מטריצת הרשאות');
      },
    );
  }

  onCheckChange(row: EpPermissionGridItem, checkType: EpCheckType, checked: boolean): void {
    if (this.saving) {
      return;
    }

    this.saving = true;
    this.service.updateCheck(this.employeeId, row.PermissionID, checkType, checked).subscribe(
      (result) => {
        this.saving = false;
        if (result?.Success !== false) {
          this.loadGrid();
        } else {
          this.showError(result?.Message || 'שגיאה בעדכון אישור');
          this.loadGrid();
        }
      },
      () => {
        this.saving = false;
        this.showError('שגיאה בעדכון אישור');
        this.loadGrid();
      },
    );
  }

  bulkGrantDirect(): void {
    if (!this.showBulkGrant || this.saving) {
      return;
    }

    if (!confirm('לאשר את כל ההרשאות בעמודת מנהל ישיר?')) {
      return;
    }

    this.saving = true;
    this.service.bulkGrantDirect(this.employeeId).subscribe(
      (result) => {
        this.saving = false;
        if (result?.Success !== false) {
          this.showMessage('כל האישורים הישירים עודכנו');
          this.loadGrid();
        } else {
          this.showError(result?.Message || 'שגיאה בעדכון מרוכז');
        }
      },
      () => {
        this.saving = false;
        this.showError('שגיאה בעדכון מרוכז');
      },
    );
  }

  goBack(): void {
    this.router.navigate(['/ep-permissions/dashboard']);
  }

  private sortItems(items: EpPermissionGridItem[]): EpPermissionGridItem[] {
    return (items || []).slice().sort((a, b) => {
      const groupsA = (a.AssociatedGroups || '').trim();
      const groupsB = (b.AssociatedGroups || '').trim();
      const groupsCmp = groupsA.localeCompare(groupsB, 'he');
      if (groupsCmp !== 0) {
        return groupsCmp;
      }
      return (a.PermissionName || '').localeCompare(b.PermissionName || '', 'he');
    });
  }

  private showMessage(message: string): void {
    this.snackBar.open(message, 'סגור', { duration: 3000, direction: 'rtl' });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'סגור', { duration: 5000, direction: 'rtl' });
  }
}
