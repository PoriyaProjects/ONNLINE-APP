import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { environment } from 'src/environments/environment';

interface PermissionSystem {
  id: string;
  name: string;
  description: string;
}

interface EmployeeP {
  id: number;
  employeeId: string;
  fullName: string;
  department: string;
}

interface PermissionPayloadItem {
  employeeId: number;
  employeeNumber: string;
  employeeName: string;
  department: string;
  systems: {
    systemId: string;
    systemName: string;
    granted: boolean;
  }[];
}

type PermissionMap = {
  [employeeId: number]: {
    [systemId: string]: boolean;
  };
};

@Component({
  selector: 'app-permissions-report',
  templateUrl: './permissions-report.component.html',
  styleUrls: ['./permissions-report.component.css']
})
export class PermissionsReportComponent implements OnInit {

  searchTerm = '';
  hasChanges = false;
  user_name = localStorage.getItem("loginUserName")?.toLowerCase();
  user_id = localStorage.getItem("ID")?.toString();

  systems: PermissionSystem[] = [];

  employees: EmployeeP[] = [];

  permissionMap: PermissionMap = {};
  private originalPermissionMap: PermissionMap = {};

  constructor(
    public dialog: MatDialog,
    private http: HttpClient,
  ) { }

  url = environment.url;
  ngOnInit(): void {
    this.initPermissions();
    this.getPoriyaSytems();
    console.log(this.user_name);
  }

  get filteredEmployees(): EmployeeP[] {
    const term = this.searchTerm.trim().toLowerCase();

    if (!term) {
      return this.employees;
    }

    return this.employees.filter(employee =>
      employee.fullName.toLowerCase().includes(term) ||
      employee.employeeId.toLowerCase().includes(term) ||
      employee.department.toLowerCase().includes(term)
    );
  }

  get totalGranted(): number {
    let count = 0;

    this.employees.forEach(employee => {
      this.systems.forEach(system => {
        if (this.permissionMap[employee.id]?.[system.id]) {
          count++;
        }
      });
    });

    return count;
  }

  getPoriyaSytems(): void {
    this.http
      .post(this.url + "GetPoriyaSytems", {
      })
      .subscribe((Response) => {
        this.systems = Response["d"];
      });
  }

  initPermissions(): void {
    this.http
      .post(this.url + "GetPermissionsReportByManager", {
        userName: this.user_name,
        userId: this.user_id
      })
      .subscribe((Response) => {
        this.employees = Response["d"];
        this.employees.forEach(employee => {
          this.permissionMap[employee.id] = {};

          this.systems.forEach(system => {
            this.permissionMap[employee.id][system.id] = false;
          });
        });
        /*
          Example existing permissions from backend.
          Replace this block with API result later.
        */
        this.permissionMap[1]['namer'] = true;
        this.permissionMap[1]['chameleon'] = true;
        this.permissionMap[2]['bi'] = true;
        this.permissionMap[3]['sap'] = true;
        this.permissionMap[4]['intranet'] = true;
        this.permissionMap[5]['nurse_permissions'] = true;

        this.originalPermissionMap = this.clonePermissions(this.permissionMap);
        this.hasChanges = false;
      });

  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value || '';
  }

  clearSearch(): void {
    this.searchTerm = '';
  }

  hasPermission(employeeId: number, systemId: string): boolean {
    return !!this.permissionMap[employeeId]?.[systemId];
  }

  togglePermission(employeeId: number, systemId: string, event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!this.permissionMap[employeeId]) {
      this.permissionMap[employeeId] = {};
    }

    this.permissionMap[employeeId][systemId] = input.checked;
    this.markChanged();
  }

  grantEmployeeAll(employeeId: number): void {
    this.systems.forEach(system => {
      this.permissionMap[employeeId][system.id] = true;
    });

    this.markChanged();
  }

  clearEmployeeAll(employeeId: number): void {
    this.systems.forEach(system => {
      this.permissionMap[employeeId][system.id] = false;
    });

    this.markChanged();
  }

  toggleSystem(systemId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const checked = input.checked;

    this.filteredEmployees.forEach(employee => {
      this.permissionMap[employee.id][systemId] = checked;
    });

    this.markChanged();
  }

  isSystemFullyGranted(systemId: string): boolean {
    if (this.filteredEmployees.length === 0) {
      return false;
    }

    return this.filteredEmployees.every(employee =>
      this.permissionMap[employee.id]?.[systemId] === true
    );
  }

  isSystemPartiallyGranted(systemId: string): boolean {
    const grantedCount = this.filteredEmployees.filter(employee =>
      this.permissionMap[employee.id]?.[systemId] === true
    ).length;

    return grantedCount > 0 && grantedCount < this.filteredEmployees.length;
  }

  grantAllVisible(): void {
    this.filteredEmployees.forEach(employee => {
      this.systems.forEach(system => {
        this.permissionMap[employee.id][system.id] = true;
      });
    });

    this.markChanged();
  }

  clearAllVisible(): void {
    this.filteredEmployees.forEach(employee => {
      this.systems.forEach(system => {
        this.permissionMap[employee.id][system.id] = false;
      });
    });

    this.markChanged();
  }

  resetChanges(): void {
    this.permissionMap = this.clonePermissions(this.originalPermissionMap);
    this.hasChanges = false;
  }

  savePermissions(): void {
    const payload = this.buildPayload();

    console.log('Permissions payload to send:', payload);

    /*
      Replace with real API later:

      this.http.post('/api/permissions-report/save', payload).subscribe({
        next: () => {
          this.originalPermissionMap = this.clonePermissions(this.permissionMap);
          this.hasChanges = false;
        },
        error: err => console.error(err)
      });
    */

    this.originalPermissionMap = this.clonePermissions(this.permissionMap);
    this.hasChanges = false;

    alert('ההרשאות נשמרו בהצלחה');
  }

  buildPayload(): PermissionPayloadItem[] {
    return this.employees.map(employee => ({
      employeeId: employee.id,
      employeeNumber: employee.employeeId,
      employeeName: employee.fullName,
      department: employee.department,
      systems: this.systems.map(system => ({
        systemId: system.id,
        systemName: system.name,
        granted: this.permissionMap[employee.id][system.id]
      }))
    }));
  }

  getInitials(fullName: string): string {
    if (!fullName) {
      return '?';
    }

    const parts = fullName.trim().split(' ').filter(x => x);

    if (parts.length === 1) {
      return parts[0].charAt(0);
    }

    return parts[0].charAt(0) + parts[1].charAt(0);
  }

  trackByEmployeeId(index: number, employee: EmployeeP): number {
    return employee.id;
  }

  private markChanged(): void {
    this.hasChanges = JSON.stringify(this.permissionMap) !== JSON.stringify(this.originalPermissionMap);
  }

  private clonePermissions(source: PermissionMap): PermissionMap {
    return JSON.parse(JSON.stringify(source));
  }
}