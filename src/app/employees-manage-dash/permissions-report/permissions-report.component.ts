import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import { environment } from 'src/environments/environment';

interface PermissionSystem {
  Row_ID: string;
  id: string;
  name: string;
  description: string;
  PermissionValue: string;
}

interface EmployeeP {
  id: string;
  exists?: boolean;
  employeeId: string;
  fullName: string;
  department: string;
  note?: string;
  approved?: boolean;
  systems: {
    system_Row_ID: string;
    system_id: string;
    system_name: string;
    granted: boolean;
    PermissionValue: string;
  }[];
}

interface PermissionPayloadItem {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  department: string;
  exists: boolean;
  note: string;
  approved: boolean;
  systems: {
    system_Row_ID: string;
    system_id: string;
    system_name: string;
    granted: boolean;
  }[];
}

interface EmployeeDirectoryItem {
  RowID?: string | number;
  EmployeeIndex?: string | number;
  EmployeeID?: string | number;
  FirstName?: string;
  LastName?: string;
  DepartnentDescripton?: string;
}

type PermissionMap = {
  [employeeId: string]: {
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
  isSaving = false;
  user_name = localStorage.getItem("loginUserName")?.toLowerCase();
  user_id = localStorage.getItem("ID")?.toString();
  sortDirection: 'asc' | 'desc' | 'none' = 'none';

  systems: PermissionSystem[] = [];

  employees: EmployeeP[] = [];
  employeesList: EmployeeDirectoryItem[] = [];
  employeeToAdd = new FormControl('');
  filteredEmployeeOptions: Observable<EmployeeDirectoryItem[]> = new Observable<EmployeeDirectoryItem[]>();
  addEmployeeError = '';
  savingPermissionMap: { [key: string]: boolean } = {};
  savingNoteMap: { [employeeId: string]: boolean } = {};
  approvingEmployeeMap: { [employeeId: string]: boolean } = {};

  permissionMap: PermissionMap = {};
  private originalPermissionMap: PermissionMap = {};
  private originalEmployees: EmployeeP[] = [];

  constructor(
    public dialog: MatDialog,
    private http: HttpClient,
  ) { }

  url = environment.url;
  ngOnInit(): void {
    this.filteredEmployeeOptions = this.employeeToAdd.valueChanges.pipe(
      startWith(''),
      map(value => this.filterEmployeeOptions(value))
    );

    this.initPermissions();
    this.getPoriyaSytems();
    this.getEmployeesList();
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
        this.systems = Response["d"] ?? [];
        this.initializePermissionMap();
      });
  }

  initPermissions(): void {
    this.http
      .post(this.url + "GetPermissionsReportByManager", {
        userId: this.user_id
      })
      .subscribe((Response) => {
        this.employees = (Response["d"] ?? []).map(employee => this.normalizeEmployee(employee));
        this.initializePermissionMap();
      });

  }

  getEmployeesList(): void {
    this.http
      .post(this.url + "GetEmployeesForWhatsapp", {
        _empId: '',
        _empFirstName: '',
        _empLastName: '',
        _phoneNumber: '',
        _gender: '',
        _department: '',
        _role: '',
        _sektor: '',
        _on: "1",
        _workPlace: ''
      })
      .subscribe((Response) => {
        this.employeesList = Response["d"] ?? [];
      });
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value || '';
  }

  clearSearch(): void {
    this.searchTerm = '';
  }

  displayEmployeeOption(employee: EmployeeDirectoryItem): string {
    if (!employee) {
      return '';
    }

    const fullName = `${employee.FirstName || ''} ${employee.LastName || ''}`.trim();
    const employeeId = employee.EmployeeID ? ` - ${employee.EmployeeID}` : '';

    return `${fullName}${employeeId}`;
  }


  toggleSortByName(): void {
    if (this.sortDirection === 'asc') {
      this.sortDirection = 'desc';
    } else {
      this.sortDirection = 'asc';
    }
    this.applySort();
  }

  applySort(): void {
    if (this.sortDirection === 'none') return;

    // שימוש ב-localeCompare('he') מבטיח מיון אלפביתי מושלם בעברית ובאנגלית משולבת
    this.filteredEmployees.sort((a, b) => {
      const nameA = a.fullName || '';
      const nameB = b.fullName || '';

      if (this.sortDirection === 'asc') {
        return nameA.localeCompare(nameB, 'he');
      } else {
        return nameB.localeCompare(nameA, 'he');
      }
    });
  }

  addMissingEmployee(): void {
    const selectedEmployee = this.employeeToAdd.value as EmployeeDirectoryItem;

    if (!selectedEmployee || !selectedEmployee.EmployeeID) {
      this.addEmployeeError = 'יש לבחור עובד מהרשימה';
      return;
    }

    const employeeNumber = String(selectedEmployee.EmployeeID);
    const alreadyExists = this.employees.some(employee => employee.employeeId === employeeNumber);

    if (alreadyExists) {
      this.addEmployeeError = 'העובד כבר מופיע בטבלה';
      return;
    }

    const rowId = Number(selectedEmployee.RowID ?? selectedEmployee.EmployeeIndex ?? selectedEmployee.EmployeeID);
    const employee: EmployeeP = {
      id: String(rowId),
      employeeId: employeeNumber,
      fullName: `${selectedEmployee.FirstName || ''} ${selectedEmployee.LastName || ''}`.trim(),
      department: selectedEmployee.DepartnentDescripton || '',
      note: '',
      approved: false,
      systems: [],
      exists: false
    };

    this.employees = [...this.employees, employee];
    this.permissionMap[employee.id] = {};

    this.systems.forEach(system => {
      this.permissionMap[employee.id][system.id] = false;
    });

    this.employeeToAdd.setValue('');
    this.addEmployeeError = '';
    this.markChanged();
  }

  hasPermission(employeeId: string, systemId: string): boolean {
    return !!this.permissionMap[employeeId]?.[systemId];
  }
  getPermissionValue(employeeId: string, systemId: string): string {
    const employee = this.employees.find(item => item.id === employeeId);
    const system = employee?.systems.find(item => item.system_id === systemId);
    return system?.PermissionValue || '';
  }

  togglePermission(employeeId: string, systemId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const employee = this.employees.find(item => item.id === employeeId);
    const system = this.systems.find(item => item.id === systemId);
    const previousGranted = this.permissionMap[employeeId]?.[systemId] === true;

    if (!this.permissionMap[employeeId]) {
      this.permissionMap[employeeId] = {};
    }

    this.permissionMap[employeeId][systemId] = input.checked;
    this.markChanged();

    if (employee && system) {
      this.savePermissionToggle(employee, system, input.checked, previousGranted);
    }
  }

  grantEmployeeAll(employeeId: string): void {
    if (!this.permissionMap[employeeId]) {
      this.permissionMap[employeeId] = {};
    }

    this.systems.forEach(system => {
      const previousGranted = this.permissionMap[employeeId]?.[system.id] === true;
      this.permissionMap[employeeId][system.id] = true;
      const employee = this.employees.find(item => item.id === employeeId);

      if (employee && previousGranted !== true) {
        this.savePermissionToggle(employee, system, true, previousGranted);
      }
    });

    this.markChanged();
  }

  clearEmployeeAll(employeeId: string): void {
    if (!this.permissionMap[employeeId]) {
      this.permissionMap[employeeId] = {};
    }

    this.systems.forEach(system => {
      const previousGranted = this.permissionMap[employeeId]?.[system.id] === true;
      this.permissionMap[employeeId][system.id] = false;
      const employee = this.employees.find(item => item.id === employeeId);

      if (employee && previousGranted !== false) {
        this.savePermissionToggle(employee, system, false, previousGranted);
      }
    });

    this.markChanged();
  }

  toggleSystem(systemId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const checked = input.checked;

    this.filteredEmployees.forEach(employee => {
      if (!this.permissionMap[employee.id]) {
        this.permissionMap[employee.id] = {};
      }

      const previousGranted = this.permissionMap[employee.id]?.[systemId] === true;
      this.permissionMap[employee.id][systemId] = checked;
      const system = this.systems.find(item => item.id === systemId);

      if (system && previousGranted !== checked) {
        this.savePermissionToggle(employee, system, checked, previousGranted);
      }
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

  // grantAllVisible(): void {
  //   this.filteredEmployees.forEach(employee => {
  //     if (!this.permissionMap[employee.id]) {
  //       this.permissionMap[employee.id] = {};
  //     }

  //     this.systems.forEach(system => {
  //       this.permissionMap[employee.id][system.id] = true;
  //     });
  //   });

  //   this.markChanged();
  // }

  // clearAllVisible(): void {
  //   this.filteredEmployees.forEach(employee => {
  //     if (!this.permissionMap[employee.id]) {
  //       this.permissionMap[employee.id] = {};
  //     }

  //     this.systems.forEach(system => {
  //       this.permissionMap[employee.id][system.id] = false;
  //     });
  //   });

  //   this.markChanged();
  // }

  resetChanges(): void {
    this.employees = this.cloneEmployees(this.originalEmployees);
    this.permissionMap = this.clonePermissions(this.originalPermissionMap);
    this.employeeToAdd.setValue('');
    this.addEmployeeError = '';
    this.hasChanges = false;
  }

  savePermissions(): void {
    const payload = this.buildPayload();

    console.log('Permissions payload to send:', payload);
    this.sendPermissionsPayload(payload);
  }

  savePermissionToggle(employee: EmployeeP, system: PermissionSystem, granted: boolean, previousGranted: boolean): void {
    const key = this.getPermissionKey(employee.id, system.id);
    this.savingPermissionMap[key] = true;

    this.http
      .post(this.url + "SavePermissionsReportToggle", {
        userId: this.user_id,
        userName: this.user_name,
        employeeId: employee.id,
        employeeNumber: employee.employeeId,
        employeeName: employee.fullName,
        department: employee.department,
        exists: employee.exists,
        system_Row_ID: system.Row_ID,
        system_id: system.id,
        system_name: system.name,
        granted: granted,
        note: employee.note
      })
      .subscribe(
        (Response) => {
          delete this.savingPermissionMap[key];

          if (Response["d"] === false) {
            this.permissionMap[employee.id][system.id] = previousGranted;
            this.markChanged();
            alert('תקלה! ההרשאה לא נשמרה');
            return;
          }

          this.syncEmployeeSystem(employee, system, granted);
          this.originalPermissionMap[employee.id] = this.originalPermissionMap[employee.id] || {};
          this.originalPermissionMap[employee.id][system.id] = granted;
          this.syncOriginalEmployeeSystem(employee, system, granted);
          this.markChanged();
        },
        (error) => {
          delete this.savingPermissionMap[key];
          this.permissionMap[employee.id][system.id] = previousGranted;
          this.markChanged();
          console.error('Error saving permission toggle:', error);
          alert('תקלה! ההרשאה לא נשמרה');
        }
      );
  }

  onNoteInput(employee: EmployeeP, event: Event): void {
    const input = event.target as HTMLInputElement;
    employee.note = input.value;
    this.markChanged();
  }

  saveEmployeeNote(employee: EmployeeP): void {
    const originalEmployee = this.originalEmployees.find(item => item.id === employee.id);
    const originalNote = originalEmployee?.note || '';
    const nextNote = employee.note || '';

    if (originalNote === nextNote || this.savingNoteMap[employee.id]) {
      return;
    }

    this.savingNoteMap[employee.id] = true;

    this.http
      .post(this.url + "SavePermissionsReportNote", {
        userId: this.user_id,
        userName: this.user_name,
        employeeId: employee.id,
        employeeNumber: employee.employeeId,
        employeeName: employee.fullName,
        department: employee.department,
        exists: employee.exists,
        note: nextNote
      })
      .subscribe(
        (Response) => {
          delete this.savingNoteMap[employee.id];

          if (Response["d"] === false) {
            employee.note = originalNote;
            this.markChanged();
            alert('תקלה! ההערה לא נשמרה');
            return;
          }

          this.syncOriginalEmployeeField(employee, 'note', nextNote);
          this.markChanged();
        },
        (error) => {
          delete this.savingNoteMap[employee.id];
          employee.note = originalNote;
          this.markChanged();
          console.error('Error saving employee note:', error);
          alert('תקלה! ההערה לא נשמרה');
        }
      );
  }

  unapproveEmployee(employee: any): void {
    // סימון במפה שהעובד נמצא בתהליך עבודה מול השרת (מונע לחיצות כפולות)
    this.approvingEmployeeMap[employee.id] = true;

    // קריאת ה-HTTP לשרת שלך (עדכן את ה-URL והפרמטרים לפי ה-API שלך)
    this.http
      .post(this.url + 'ApprovePermissionsReportEmployee', {
        userName: this.user_name,
        employeeId: employee.id,
        approved: false
      })
      .subscribe({
        next: (Response: any) => {
          this.approvingEmployeeMap[employee.id] = false;

          // עדכון הלוקאל סטורג' / מודל הנתונים המקומי להסרת הוי הירוק
          employee.approved = false;
          alert('אישור העובד בוטל בהצלחה.');
        },
        error: () => {
          this.approvingEmployeeMap[employee.id] = false;
          alert('שגיאה בביטול אישור העובד.');
        }
      });
  }

  approveEmployee(employee: EmployeeP): void {
    if (employee.approved || this.approvingEmployeeMap[employee.id]) {
      return;
    }

    this.approvingEmployeeMap[employee.id] = true;

    this.http
      .post(this.url + "ApprovePermissionsReportEmployee", {
        userName: this.user_name,
        employeeId: employee.id,
        approved: true
      })
      .subscribe(
        (Response) => {
          delete this.approvingEmployeeMap[employee.id];

          if (Response["d"] === false) {
            alert('תקלה! האישור לא נשמר');
            return;
          }

          employee.approved = true;
          this.syncOriginalEmployeeField(employee, 'approved', true);
          this.markChanged();
        },
        (error) => {
          delete this.approvingEmployeeMap[employee.id];
          console.error('Error approving permissions report employee:', error);
          alert('תקלה! האישור לא נשמר');
        }
      );
  }

  exportToExcel(): void {
    // קביעת רף בטוח מעט מתחת למגבלה של אקסל (32,767)
    const MAX_CELL_LIMIT = 32000;
    const dataToExport: any[] = [];

    this.filteredEmployees.forEach(employee => {
      // יצירת הבסיס של השורה
      const row: { [key: string]: string } = {
        'שם עובד': employee.fullName,
        'מספר עובד': employee.employeeId,
        'מחלקה': employee.department,
        'מאושר': employee.approved ? 'כן' : 'לא'
      };

      // 1. טיפול דינמי בטקסט ארוך פוטנציאלי בשדה ההערה
      const noteText = employee.note || '';
      if (noteText.length <= MAX_CELL_LIMIT) {
        row['הערה'] = noteText;
      } else {
        // אם ההערה ארוכה מדי, היא תפוצל אוטומטית לעמודות: הערה - חלק 1, הערה - חלק 2...
        for (let i = 0; i < noteText.length; i += MAX_CELL_LIMIT) {
          const chunkNum = Math.floor(i / MAX_CELL_LIMIT) + 1;
          row[`הערה - חלק ${chunkNum}`] = noteText.substring(i, i + MAX_CELL_LIMIT);
        }
      }

      // 2. טיפול דינמי בטקסט ארוך פוטנציאלי בערכי מערכות ההרשאה
      this.systems.forEach(system => {
        const permText = !this.permissionMap[employee.id]?.[system.id]
          ? 'לא'
          : this.getPermissionValue(employee.id, system.id);

        if (permText.length <= MAX_CELL_LIMIT) {
          row[system.name] = permText;
        } else {
          // במידה ופירוט הגישה למערכת ספציפית ארוך מדי, הוא יפוצל לעמודות המשך עבור אותה מערכת
          for (let i = 0; i < permText.length; i += MAX_CELL_LIMIT) {
            const chunkNum = Math.floor(i / MAX_CELL_LIMIT) + 1;
            row[`${system.name} - חלק ${chunkNum}`] = permText.substring(i, i + MAX_CELL_LIMIT);
          }
        }
      });

      dataToExport.push(row);
    });

    // יצירת קובץ האקסל עם הנתונים המפוצלים אופקית
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Permissions');
    XLSX.writeFile(wb, 'permissions-report.xlsx');
  }

  sendPermissionsPayload(payload: PermissionPayloadItem[]): void {
    if (this.isSaving) {
      return;
    }

    this.isSaving = true;

    this.http
      .post(this.url + "SavePermissionsReport", {
        userId: this.user_id,
        userName: this.user_name,
        permissions: payload
      })
      .subscribe(
        (Response) => {
          this.isSaving = false;

          if (Response["d"] === false) {
            alert('תקלה! ההרשאות לא נשמרו');
            return;
          }

          this.originalEmployees = this.cloneEmployees(this.employees);
          this.originalPermissionMap = this.clonePermissions(this.permissionMap);
          this.hasChanges = false;

          alert('ההרשאות נשמרו בהצלחה');
        },
        (error) => {
          this.isSaving = false;
          console.error('Error saving permissions report:', error);
          alert('תקלה! ההרשאות לא נשמרו');
        }
      );
  }

  buildPayload(): PermissionPayloadItem[] {
    return this.employees.map(employee => ({
      employeeId: employee.id,
      employeeNumber: employee.employeeId,
      employeeName: employee.fullName,
      department: employee.department,
      exists: employee.exists,
      note: employee.note || '',
      approved: employee.approved === true,
      systems: this.systems.map(system => ({
        system_Row_ID: system.Row_ID,
        system_id: system.id,
        system_name: system.name,
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

  trackByEmployeeId(index: number, employee: EmployeeP): string {
    return employee.id;
  }

  private markChanged(): void {
    this.hasChanges =
      JSON.stringify(this.permissionMap) !== JSON.stringify(this.originalPermissionMap) ||
      JSON.stringify(this.employees) !== JSON.stringify(this.originalEmployees);
  }

  private clonePermissions(source: PermissionMap): PermissionMap {
    return JSON.parse(JSON.stringify(source));
  }

  private cloneEmployees(source: EmployeeP[]): EmployeeP[] {
    return JSON.parse(JSON.stringify(source));
  }

  private initializePermissionMap(): void {
    if (!this.systems.length || !this.employees.length) {
      return;
    }

    this.permissionMap = {};

    this.employees.forEach(employee => {
      this.permissionMap[employee.id] = {};

      this.systems.forEach(system => {
        this.permissionMap[employee.id][system.id] = employee.systems?.find(s => s.system_id === system.id)?.granted ?? false;
      });
    });

    this.originalEmployees = this.cloneEmployees(this.employees);
    this.originalPermissionMap = this.clonePermissions(this.permissionMap);
    this.hasChanges = false;
  }

  isPermissionSaving(employeeId: string, systemId: string): boolean {
    return this.savingPermissionMap[this.getPermissionKey(employeeId, systemId)] === true;
  }

  private getPermissionKey(employeeId: string, systemId: string): string {
    return `${employeeId}_${systemId}`;
  }

  private normalizeEmployee(employee: any): EmployeeP {
    return {
      ...employee,
      id: String(employee.id ?? employee.Row_ID ?? employee.RowID ?? employee.employeeId ?? employee.EmployeeID),
      note: employee.note ?? employee.Note ?? '',
      approved: this.toBoolean(employee.approved ?? employee.Approved ?? employee.isApproved ?? employee.IsApproved)
    };
  }

  private toBoolean(value: any): boolean {
    return value === true || value === 'true' || value === 'True' || value === 1 || value === '1';
  }

  private syncEmployeeSystem(employee: EmployeeP, system: PermissionSystem, granted: boolean): void {
    const existingSystem = employee.systems?.find(item => item.system_id === system.id);

    if (existingSystem) {
      existingSystem.granted = granted;
      return;
    }

    employee.systems = employee.systems || [];
    employee.systems.push({
      system_Row_ID: system.Row_ID,
      system_id: system.id,
      system_name: system.name,
      granted: granted,
      PermissionValue: system.PermissionValue
    });
  }

  private syncOriginalEmployeeSystem(employee: EmployeeP, system: PermissionSystem, granted: boolean): void {
    const originalEmployee = this.getOrCreateOriginalEmployee(employee);
    this.syncEmployeeSystem(originalEmployee, system, granted);
  }

  private syncOriginalEmployeeField(employee: EmployeeP, field: 'note' | 'approved', value: string | boolean): void {
    const originalEmployee = this.getOrCreateOriginalEmployee(employee);
    (originalEmployee as any)[field] = value;
  }

  private getOrCreateOriginalEmployee(employee: EmployeeP): EmployeeP {
    let originalEmployee = this.originalEmployees.find(item => item.id === employee.id);

    if (!originalEmployee) {
      originalEmployee = this.cloneEmployees([employee])[0];
      this.originalEmployees = [...this.originalEmployees, originalEmployee];
    }

    return originalEmployee;
  }

  private filterEmployeeOptions(value: string | EmployeeDirectoryItem): EmployeeDirectoryItem[] {
    const filterValue = typeof value === 'string'
      ? value.toLowerCase()
      : this.displayEmployeeOption(value).toLowerCase();

    return this.employeesList
      .filter(employee => !this.employees.some(current => current.employeeId === String(employee.EmployeeID)))
      .filter(employee => {
        const fullName = `${employee.FirstName || ''} ${employee.LastName || ''}`.toLowerCase();
        const reverseName = `${employee.LastName || ''} ${employee.FirstName || ''}`.toLowerCase();
        const employeeId = String(employee.EmployeeID || '').toLowerCase();
        const department = (employee.DepartnentDescripton || '').toLowerCase();

        return fullName.includes(filterValue) ||
          reverseName.includes(filterValue) ||
          employeeId.includes(filterValue) ||
          department.includes(filterValue);
      })
      .slice(0, 25);
  }
}
