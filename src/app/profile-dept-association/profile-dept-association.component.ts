import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, Observable, of } from 'rxjs';
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

type ExistingSelection = {
  rowKeys: Set<string>;
  profileCodes: Set<string>;
  unitCodes: Set<string>;
};

export type DepartmentMappingOverviewRow = {
  DepartnentCode: string;
  DepartnentDescripton: string;
  Unit: string;
  UnitName: string;
};

export type ProfileMappingOverviewRow = {
  FunctionID: string;
  FunctionDescription: string;
  Profile_Code: string;
  Profile_Name: string;
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
  private readonly urlSaveDeptMappings = 'SaveDepartmentUnitMappings';
  private readonly urlSaveProfileMappings = 'SaveProfileMappings';
  private readonly urlGetDeptMappings = 'GetDepartmentUnitMappings';
  private readonly urlGetProfileMappings = 'GetProfileMappings';
  private readonly urlGetMappingsOverview = 'GetMappingsOverview';

  private static readonly jsonUtf8Headers = new HttpHeaders({
    'Content-Type': 'application/json; charset=utf-8'
  });

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

  overviewOpen = false;
  overviewLoading = false;
  overviewError: string | null = null;
  overviewSearch = '';
  overviewDepartmentMappings: DepartmentMappingOverviewRow[] = [];
  overviewProfileMappings: ProfileMappingOverviewRow[] = [];

  /** Matches backend audit field on SaveDepartmentUnitMappings / optional on other saves */
  private updatedBy(): string {
    return String(localStorage.getItem('ID') ?? '').trim();
  }

  /** Unit id used for API + checkbox matching (GetDepartmentUnitMappings / SaveDepartmentUnitMappings). */
  private pickerRowUnitCode(row: PickerRow): string {
    return String(row.DepartmentCode || row.Unit || '').trim();
  }

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
    this.closeOverviewMappings();
    this.mode = next;
    this.mainError = null;
    this.loadMainList();
  }

  openOverviewMappings(): void {
    this.closePicker();
    this.overviewOpen = true;
    this.overviewError = null;
    this.overviewSearch = '';
    this.overviewDepartmentMappings = [];
    this.overviewProfileMappings = [];
    this.loadOverviewMappings();
  }

  closeOverviewMappings(): void {
    this.overviewOpen = false;
    this.overviewLoading = false;
    this.overviewError = null;
    this.overviewSearch = '';
    this.overviewDepartmentMappings = [];
    this.overviewProfileMappings = [];
  }

  private loadOverviewMappings(): void {
    this.overviewLoading = true;
    this.cdr.markForCheck();
    this.http
      .post(
        environment.url + this.urlGetMappingsOverview,
        {},
        { headers: ProfileDeptAssociationComponent.jsonUtf8Headers }
      )
      .pipe(
        map((r) => this.unwrapServiceResponse(r)),
        catchError((e) => {
          console.error(e);
          this.overviewError = 'שגיאה בטעינת סיכום השיוכים';
          return of(null);
        })
      )
      .subscribe((data) => {
        this.overviewLoading = false;
        if (data == null) {
          this.cdr.markForCheck();
          return;
        }
        const parsed = this.parseMappingsOverview(data);
        this.overviewDepartmentMappings = parsed.departmentMappings;
        this.overviewProfileMappings = parsed.profileMappings;
        this.cdr.markForCheck();
      });
  }

  private parseMappingsOverview(raw: any): {
    departmentMappings: DepartmentMappingOverviewRow[];
    profileMappings: ProfileMappingOverviewRow[];
  } {
    let base = raw;
    if (typeof base === 'string') {
      try {
        base = JSON.parse(base);
      } catch {
        return { departmentMappings: [], profileMappings: [] };
      }
    }
    const obj =
      base && typeof base === 'object' && !Array.isArray(base)
        ? base
        : {};
    const deptSrc =
      obj.DepartmentMappings ?? obj.departmentMappings ?? [];
    const profSrc = obj.ProfileMappings ?? obj.profileMappings ?? [];

    const departmentMappings = Array.isArray(deptSrc)
      ? deptSrc.map((r: any) => ({
          DepartnentCode: String(
            r?.DepartnentCode ?? r?.departnentCode ?? ''
          ),
          DepartnentDescripton: String(
            r?.DepartnentDescripton ?? r?.departnentDescripton ?? ''
          ),
          Unit: String(r?.Unit ?? r?.unit ?? ''),
          UnitName: String(r?.UnitName ?? r?.unitName ?? '')
        }))
      : [];

    const profileMappings = Array.isArray(profSrc)
      ? profSrc.map((r: any) => ({
          FunctionID: String(r?.FunctionID ?? r?.functionId ?? ''),
          FunctionDescription: String(
            r?.FunctionDescription ?? r?.functionDescription ?? ''
          ),
          Profile_Code: String(
            r?.Profile_Code ?? r?.profile_Code ?? r?.ProfileCode ?? ''
          ),
          Profile_Name: String(
            r?.Profile_Name ?? r?.profile_Name ?? r?.ProfileName ?? ''
          )
        }))
      : [];

    return { departmentMappings, profileMappings };
  }

  get filteredOverviewDepartmentRows(): DepartmentMappingOverviewRow[] {
    const q = (this.overviewSearch || '').trim().toLowerCase();
    if (!q) {
      return this.overviewDepartmentMappings;
    }
    return this.overviewDepartmentMappings.filter((row) => {
      const hay = [
        row.DepartnentCode,
        row.DepartnentDescripton,
        row.Unit,
        row.UnitName
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }

  get filteredOverviewProfileRows(): ProfileMappingOverviewRow[] {
    const q = (this.overviewSearch || '').trim().toLowerCase();
    if (!q) {
      return this.overviewProfileMappings;
    }
    return this.overviewProfileMappings.filter((row) => {
      const hay = [
        row.FunctionID,
        row.FunctionDescription,
        row.Profile_Code,
        row.Profile_Name
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
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

    const rows$ = this.http.post(environment.url + url, {}).pipe(
      map((r) => this.unwrapPickerRows(r)),
      catchError((e) => {
        console.error(e);
        this.snackBar.open('שגיאה בטעינת הרשימה', 'סגור', { duration: 4000 });
        return of([] as PickerRow[]);
      })
    );

    forkJoin({
      rows: rows$,
      existingSelection: this.loadExistingSelection()
    }).subscribe(({ rows, existingSelection }) => {
      this.pickerRows = rows;
      this.pickerSelection = this.mergeExistingSelectionWithRows(
        existingSelection,
        rows
      );
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

  private loadExistingSelection(): Observable<ExistingSelection> {
    if (this.pickerKind === 'unitNames' && this.selectedDepartment) {
      const payload = {
        departnentCode: String(this.selectedDepartment.DepartnentCode || '').trim()
      };
      return this.http.post(environment.url + this.urlGetDeptMappings, payload).pipe(
        map((r) => this.unwrapServiceResponse(r)),
        map((data) => this.parseExistingSelection(data)),
        catchError((e) => {
          console.warn('Could not load existing department mappings', e);
          return of(this.createEmptySelection());
        })
      );
    }

    if (this.pickerKind === 'profileNames' && this.selectedFunction) {
      const payload = {
        functionId: this.selectedFunction.FunctionID
      };
      return this.http.post(environment.url + this.urlGetProfileMappings, payload).pipe(
        map((r) => this.unwrapServiceResponse(r)),
        map((data) => this.parseExistingSelection(data)),
        catchError((e) => {
          console.warn('Could not load existing profile mappings', e);
          return of(this.createEmptySelection());
        })
      );
    }

    return of(this.createEmptySelection());
  }

  private parseExistingSelection(raw: any): ExistingSelection {
    const selection = this.createEmptySelection();
    const rows = Array.isArray(raw) ? raw : [];
    rows.forEach((row: any) => {
      if (this.pickerKind === 'unitNames') {
        const name = this.pickFirstNonEmpty(
          row?.Name,
          row?.ChameleonDepartment,
          row?.DepartmentName
        );
        const code = this.pickFirstNonEmpty(row?.DepartmentCode, row?.Unit);
        if (code) {
          selection.unitCodes.add(code);
        }
        if (name && code) {
          selection.rowKeys.add(`${name}||${code}`);
        }
        return;
      }

      const profileCode = this.pickFirstNonEmpty(
        row?.Profile_Code,
        row?.ProfileCode,
        row?.profileCode
      );
      if (profileCode) {
        selection.profileCodes.add(profileCode);
      }

      const profileName = this.pickFirstNonEmpty(
        row?.Profile_Name,
        row?.ProfileName,
        row?.profileName
      );
      if (profileCode && profileName) {
        selection.rowKeys.add(`${profileCode}||${profileName}`);
      }
    });

    return selection;
  }

  private mergeExistingSelectionWithRows(
    existing: ExistingSelection,
    rows: PickerRow[]
  ): Set<string> {
    const merged = new Set<string>(existing.rowKeys);

    if (this.pickerKind === 'unitNames' && existing.unitCodes.size > 0) {
      rows.forEach((row) => {
        const code = this.pickerRowUnitCode(row);
        if (code && existing.unitCodes.has(code)) {
          merged.add(this.rowValue(row));
        }
      });
    }

    if (this.pickerKind === 'profileNames' && existing.profileCodes.size > 0) {
      rows.forEach((row) => {
        const code = String(row.Profile_Code || '').trim();
        if (code && existing.profileCodes.has(code)) {
          merged.add(this.rowValue(row));
        }
      });
    }

    return merged;
  }

  private createEmptySelection(): ExistingSelection {
    return {
      rowKeys: new Set<string>(),
      profileCodes: new Set<string>(),
      unitCodes: new Set<string>()
    };
  }

  private pickFirstNonEmpty(...values: any[]): string {
    for (const value of values) {
      const normalized = value != null ? String(value).trim() : '';
      if (normalized) {
        return normalized;
      }
    }
    return '';
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
      const code = this.pickerRowUnitCode(row);
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
        this.snackBar.open(
          'חסר מזהה פונקציה. יש לעדכן את השירות כך שיחזיר מזהה לכל פונקציה.',
          'סגור',
          {
            duration: 4500
          }
        );
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
        'חסר קוד מחלקה. יש לעדכן את השירות כך שיחזיר קוד מחלקה לכל שורה.',
        'סגור',
        { duration: 4500 }
      );
      return;
    }

    const selectedRows = this.pickerRows.filter((row) =>
      this.pickerSelection.has(this.rowValue(row))
    );
    const units = Array.from(
      new Set(
        selectedRows.map((row) => this.pickerRowUnitCode(row)).filter((unit) => unit.length > 0)
      )
    );

    const payload = {
      departnentCode: String(this.selectedDepartment.DepartnentCode || '').trim(),
      units,
      updatedBy: this.updatedBy()
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
      .subscribe((res: any) => {
        this.savingPicker = false;
        if (res == null) {
          return;
        }
        const insertedRaw = res.inserted ?? res.count;
        const deletedRaw = res.deleted;
        const skippedRaw = res.skipped ?? res.unchanged;
        const hasStats =
          insertedRaw !== undefined ||
          deletedRaw !== undefined ||
          skippedRaw !== undefined;
        const msg = hasStats
          ? `נשמר בהצלחה. נוספו: ${Number(insertedRaw ?? 0)}, הוסרו: ${Number(deletedRaw ?? 0)}, ללא שינוי: ${Number(skippedRaw ?? 0)}`
          : 'השיוך נשמר בהצלחה';
        this.snackBar.open(msg, 'סגור', { duration: hasStats ? 4000 : 3000 });
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
