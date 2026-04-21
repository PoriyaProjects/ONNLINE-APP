import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export type ScreenMode = 'departments' | 'profiles';

type DepartmentRow = {
  DepartnentCode: string;
  DepartnentDescripton: string;
};

type FunctionRow = {
  FunctionID: string;
  FunctionDescription: string;
};

type PickerRow = {
  Name?: string;
  Unit?: string;
  DepartmentCode?: string;
  Profile_Code?: string;
  Profile_Name?: string;
};

@Component({
  selector: 'app-profile-dept-association',
  templateUrl: './profile-dept-association.component.html',
  styleUrls: ['./profile-dept-association.component.css']
})
export class ProfileDeptAssociationComponent implements OnInit {

  private readonly urlDeptDescriptions = 'GetEpDepartnentDescriptions';
  private readonly urlSystemUnitNames = 'GetChameleonSystemUnitNames';
  private readonly urlFunctionDescriptions = 'GetOnlineProfileFunctionDescriptions';
  private readonly urlProfileNames = 'GetChameleonProfileNames';
  private readonly urlSaveDeptMappings = 'SaveOnlineDeptToChamMappings';
  private readonly urlSaveProfileMappings = 'SaveProfileMappings';

  mode: ScreenMode = 'departments';

  mainLoading = false;
  mainError: string | null = null;
  /** Main list: DepartnentCode + DepartnentDescripton */
  departmentRows: DepartmentRow[] = [];
  departmentSearch = '';
  /** Main list: FunctionID + FunctionDescription */
  functionRows: FunctionRow[] = [];
  profileSearch = '';

  pickerOpen = false;
  pickerLoading = false;
  savingPicker = false;
  pickerTitle = '';
  pickerSearch = '';
  /** 'unitNames' => row.Name + row.Unit; 'profileNames' => row.Profile_Name */
  pickerKind: 'unitNames' | 'profileNames' = 'unitNames';
  pickerRows: PickerRow[] = [];
  pickerSelection = new Set<string>();
  private pickerKeyField: 'Name' | 'Profile_Name' = 'Name';
  private selectedDepartment: DepartmentRow | null = null;
  private selectedFunction: FunctionRow | null = null;

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadMainList();
  }

  setMode(next: ScreenMode): void {
    if (this.mode === next) {
      return;
    }
    this.closePicker();
    this.mode = next;
    this.mainError = null;
    this.loadMainList();
  }

  loadMainList(): void {
    this.mainLoading = true;
    this.mainError = null;
    const url =
      this.mode === 'departments'
        ? this.urlDeptDescriptions
        : this.urlFunctionDescriptions;

    this.http
      .post(environment.url + url, {})
      .pipe(
        map((r) => this.unwrapMainList(r)),
        catchError((e) => {
          console.error(e);
          this.mainError = 'שגיאה בטעינת הנתונים';
          return of([] as DepartmentRow[] | FunctionRow[]);
        })
      )
      .subscribe((list) => {
        this.mainLoading = false;
        if (this.mode === 'departments') {
          this.departmentRows = list as DepartmentRow[];
          this.functionRows = [];
        } else {
          this.functionRows = list as FunctionRow[];
          this.departmentRows = [];
        }
        this.cdr.markForCheck();
      });
  }

  /**
   * Backend returns [{ "DepartnentDescripton": "..." }] or [{ "FunctionDescription": "..." }]
   */
  private unwrapMainList(response: any): DepartmentRow[] | FunctionRow[] {
    let data = response && (response.d !== undefined ? response.d : response);
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        return [];
      }
    }
    if (!Array.isArray(data)) {
      return [];
    }
    if (this.mode === 'departments') {
      return data
        .map((row: any) => ({
          DepartnentCode:
            row && row.DepartnentCode != null ? String(row.DepartnentCode) : '',
          DepartnentDescripton:
            row && row.DepartnentDescripton != null
              ? String(row.DepartnentDescripton)
              : ''
        }))
        .filter((row: DepartmentRow) => row.DepartnentDescripton.length > 0);
    }
    return data
      .map((row: any) => ({
        FunctionID:
          row && row.FunctionID != null ? String(row.FunctionID) : '',
        FunctionDescription:
          row && row.FunctionDescription != null
            ? String(row.FunctionDescription)
            : ''
      }))
      .filter(
        (row: FunctionRow) =>
          row.FunctionID.length > 0 && row.FunctionDescription.length > 0
      );
  }

  onDepartmentRowClick(department: DepartmentRow): void {
    this.selectedDepartment = department;
    this.selectedFunction = null;
    this.pickerTitle = department.DepartnentDescripton;
    this.pickerKind = 'unitNames';
    this.pickerKeyField = 'Name';
    this.pickerSearch = '';
    this.pickerSelection.clear();
    this.pickerOpen = true;
    this.loadPickerData();
  }

  onProfileRowClick(functionRow: FunctionRow): void {
    this.selectedDepartment = null;
    this.selectedFunction = functionRow;
    this.pickerTitle = functionRow.FunctionDescription;
    this.pickerKind = 'profileNames';
    this.pickerKeyField = 'Profile_Name';
    this.pickerSearch = '';
    this.pickerSelection.clear();
    this.pickerOpen = true;
    this.loadPickerData();
  }

  private loadPickerData(): void {
    this.pickerLoading = true;
    const url =
      this.pickerKind === 'unitNames'
        ? this.urlSystemUnitNames
        : this.urlProfileNames;

    this.http
      .post(environment.url + url, {})
      .pipe(
        map((r) => this.unwrapPickerRows(r)),
        catchError((e) => {
          console.error(e);
          this.snackBar.open('שגיאה בטעינת הרשימה', 'סגור', { duration: 4000 });
          return of([] as PickerRow[]);
        })
      )
      .subscribe((rows) => {
        this.pickerRows = rows;
        this.pickerLoading = false;
        this.cdr.markForCheck();
      });
  }

  private unwrapPickerRows(response: any): PickerRow[] {
    let data = response && (response.d !== undefined ? response.d : response);
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        return [];
      }
    }
    if (!Array.isArray(data)) {
      return [];
    }
    if (this.pickerKind === 'unitNames') {
      return data.map((row: any) => ({
        Name: row.Name != null ? String(row.Name) : '',
        // Support either "Unit" or "DepartmentCode" from backend.
        Unit:
          row.Unit != null
            ? String(row.Unit)
            : row.DepartmentCode != null
              ? String(row.DepartmentCode)
              : '',
        DepartmentCode:
          row.DepartmentCode != null
            ? String(row.DepartmentCode)
            : row.Unit != null
              ? String(row.Unit)
              : ''
      }));
    }
    return data.map((row: any) => ({
      Profile_Code: row.Profile_Code != null ? String(row.Profile_Code) : '',
      Profile_Name: row.Profile_Name != null ? String(row.Profile_Name) : ''
    }));
  }

  get filteredDepartmentRows(): DepartmentRow[] {
    const q = (this.departmentSearch || '').trim().toLowerCase();
    if (!q) {
      return this.departmentRows;
    }
    return this.departmentRows.filter((row) =>
      `${row.DepartnentCode} ${row.DepartnentDescripton}`.toLowerCase().includes(q)
    );
  }

  get filteredFunctionRows(): FunctionRow[] {
    const q = (this.profileSearch || '').trim().toLowerCase();
    if (!q) {
      return this.functionRows;
    }
    return this.functionRows.filter((fn) =>
      `${fn.FunctionID} ${fn.FunctionDescription}`.toLowerCase().includes(q)
    );
  }

  get filteredPickerRows(): PickerRow[] {
    const q = (this.pickerSearch || '').trim().toLowerCase();
    if (!q) {
      return this.pickerRows;
    }
    return this.pickerRows.filter((row) => {
      const v =
        this.pickerKeyField === 'Name'
          ? `${row.Name || ''} ${row.DepartmentCode || row.Unit || ''}`
          : `${row.Profile_Code || ''} ${row.Profile_Name || ''}`;
      return String(v).toLowerCase().includes(q);
    });
  }

  rowValue(row: PickerRow): string {
    if (this.pickerKeyField === 'Name') {
      const name = String(row.Name || '');
      const code = String(row.DepartmentCode || row.Unit || '');
      return `${name}||${code}`;
    }
    const profileCode = String(row.Profile_Code || '');
    const profileName = String(row.Profile_Name || '');
    return `${profileCode}||${profileName}`;
  }

  isRowChecked(row: PickerRow): boolean {
    return this.pickerSelection.has(this.rowValue(row));
  }

  toggleRow(row: PickerRow, checked: boolean): void {
    const k = this.rowValue(row);
    if (!k) {
      return;
    }
    if (checked) {
      this.pickerSelection.add(k);
    } else {
      this.pickerSelection.delete(k);
    }
  }

  closePicker(): void {
    this.pickerOpen = false;
    this.pickerRows = [];
    this.pickerSearch = '';
    this.pickerSelection.clear();
    this.pickerLoading = false;
    this.savingPicker = false;
  }

  confirmPicker(): void {
    if (this.pickerKind === 'profileNames') {
      if (!this.selectedFunction) {
        this.snackBar.open('חסרה פונקציה מקור לשמירה', 'סגור', { duration: 3000 });
        return;
      }
      if (!String(this.selectedFunction.FunctionID || '').trim()) {
        this.snackBar.open('חסר FunctionID. יש לעדכן את GetEpFunctionsForProfileMapping', 'סגור', {
          duration: 4500
        });
        return;
      }

      const selectedRows = this.pickerRows.filter((row) =>
        this.pickerSelection.has(this.rowValue(row))
      );
      const profileCodes = Array.from(
        new Set(
          selectedRows
            .map((row) => String(row.Profile_Code || '').trim())
            .filter((code) => code.length > 0)
        )
      );

      if (!profileCodes.length) {
        this.snackBar.open('לא נבחרו Profile_Code תקינים לשמירה', 'סגור', { duration: 3000 });
        return;
      }

      const payload = {
        functionId: this.selectedFunction.FunctionID,
        profileCodes
      };

      this.savingPicker = true;
      this.http
        .post(environment.url + this.urlSaveProfileMappings, payload)
        .pipe(
          map((r: any) => this.unwrapServiceResponse(r)),
          catchError((e) => {
            console.error(e);
            this.snackBar.open('שגיאה בשמירת שיוך פרופילים', 'סגור', { duration: 4000 });
            return of(null);
          })
        )
        .subscribe((res: any) => {
          this.savingPicker = false;
          if (res == null) {
            return;
          }
          const inserted = Number(res.count ?? 0);
          const skipped = Number(res.skipped ?? 0);
          const msg =
            Number.isFinite(inserted) || Number.isFinite(skipped)
              ? `נשמר בהצלחה. נוספו: ${inserted || 0}, קיימים: ${skipped || 0}`
              : 'שיוך הפרופילים נשמר בהצלחה';
          this.snackBar.open(msg, 'סגור', { duration: 4000 });
          this.closePicker();
        });

      this.snackBar.open('שומר שיוכי פרופילים...', 'סגור', { duration: 1200 });
      return;
    }

    if (!this.selectedDepartment) {
      this.snackBar.open('חסרה מחלקת מקור לשמירה', 'סגור', { duration: 3000 });
      return;
    }
    if (!String(this.selectedDepartment.DepartnentCode || '').trim()) {
      this.snackBar.open(
        'חסר DepartnentCode. יש לעדכן את GetEpDepartnentDescriptions להחזיר קוד מחלקה',
        'סגור',
        { duration: 4500 }
      );
      return;
    }

    const selectedRows = this.pickerRows.filter((row) =>
      this.pickerSelection.has(this.rowValue(row))
    );
    const mappings = selectedRows
      .map((row) => ({
        ChameleonDepartment: String(row.Name || '').trim(),
        DepartmentCode: String(row.DepartmentCode || row.Unit || '').trim()
      }))
      .filter(
        (row) => row.ChameleonDepartment.length > 0 && row.DepartmentCode.length > 0
      );

    if (!mappings.length) {
      this.snackBar.open('לא נבחרו פריטים תקינים לשמירה', 'סגור', { duration: 3000 });
      return;
    }

    const payload = {
      _department: {
        DepartnentCode: this.selectedDepartment.DepartnentCode,
        DepartnentDescripton: this.selectedDepartment.DepartnentDescripton
      },
      _mappings: mappings,
      _updatedBy: ''
    };

    this.savingPicker = true;
    this.http
      .post(environment.url + this.urlSaveDeptMappings, payload)
      .pipe(
        map((r: any) => this.unwrapServiceResponse(r)),
        catchError((e) => {
          console.error(e);
          this.snackBar.open('שגיאה בשמירת השיוך', 'סגור', { duration: 4000 });
          return of(null);
        })
      )
      .subscribe((res) => {
        this.savingPicker = false;
        if (res == null) {
          return;
        }
        this.snackBar.open('השיוך נשמר בהצלחה', 'סגור', { duration: 3000 });
        this.closePicker();
      });

    this.snackBar.open(
      'שומר שיוכים...',
      'סגור',
      { duration: 1200 }
    );
  }

  private unwrapServiceResponse(response: any): any {
    let data = response && (response.d !== undefined ? response.d : response);
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        return data;
      }
    }
    return data;
  }
}
