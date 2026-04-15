import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Router } from '@angular/router';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { environment } from 'src/environments/environment';
import { MedicalInternAddUpdateComponent } from './medical-intern-add-update/medical-intern-add-update.component';
import { LecturesManageDialogComponent } from './lectures-manage-dialog/lectures-manage-dialog.component';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-medical-interns-dashboard',
  templateUrl: './medical-interns-dashboard.component.html',
  styleUrls: ['./medical-interns-dashboard.component.css']
})
export class MedicalInternsDashboardComponent implements OnInit {

  /** Toggle between interns table, departments table, server data table, and feedback table */
  viewMode: 'interns' | 'departments' | 'serverData' | 'feedback' = 'interns';

  stats = {
    total: 0,
    withEmail: 0,
    withPhone: 0,
    uniqueDepartments: 0
  };

  TABLE_DATA: any[] = [];
  displayedColumns: string[] = [
    'Image', 'EmployeeID', 'FirstName', 'LastName', 'CellNumber', 'Email', 'DepartnentDescripton', 'Actions'
  ];
  dataSource = new MatTableDataSource(this.TABLE_DATA);
  @ViewChild('internsPaginator') paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  searchInternsGroup: FormGroup;
  DepartmentsList: any[] = [];
  loaded = false;
  url = environment.url;
  emptyIntern: any;

  horizontalPosition: MatSnackBarHorizontalPosition = 'start';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';
  /** All departments from API - admin selects which go to first/second dropdown */
  allDepartments: any[] = [];
  allDepartmentsLoading = false;
  /** Department codes selected for first and second dropdown */
  departmentCodesForFirst: string[] = [];
  departmentCodesForSecond: string[] = [];
  /** Map DepartCode -> Row_ID for updates (one row per department with FirstDepartment/SecondDepartment) */
  private departmentRowIds: Map<string, number> = new Map();
  displayDepartmentsSaving = false;
  /** Filter for departments visibility panel */
  departmentsFilter = '';

  /** Departments pivot table (monthly intern counts per department) */
  departmentsTableData: any[] = [];
  departmentsDataSource = new MatTableDataSource<any>([]);
  departmentsYear: number = new Date().getFullYear();
  departmentsDisplayedColumns: string[] = ['DepartDesc', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  /** Month-Year options for search filter (YYYY-MM format) */
  monthYearOptions: { value: string; label: string }[] = [];
  private readonly hebrewMonthFormatter = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' });

  /** Hebrew labels for month columns */
  monthLabels: Record<string, string> = {
    jan: 'ינואר', feb: 'פברואר', mar: 'מרץ', apr: 'אפריל', may: 'מאי', jun: 'יוני',
    jul: 'יולי', aug: 'אוגוסט', sep: 'ספטמבר', oct: 'אוקטובר', nov: 'נובמבר', dec: 'דצמבר'
  };
  departmentsLoaded = false;
  @ViewChild('departmentsPaginator') departmentsPaginator: MatPaginator;

  /** Server data table (dynamic columns from SqlDataReader JSON) */
  serverDataTableData: Record<string, any>[] = [];
  serverDataSource = new MatTableDataSource<Record<string, any>>([]);
  serverDataDisplayedColumns: string[] = [];
  serverDataLoaded = false;
  @ViewChild('serverDataPaginator') serverDataPaginator: MatPaginator;

  /** Interns feedback table (from VW_EP_InternQuestionnaireResaultNumeric) */
  feedbackTableData: Record<string, any>[] = [];
  feedbackDataSource = new MatTableDataSource<Record<string, any>>([]);
  feedbackDisplayedColumns: string[] = [];
  feedbackLoaded = false;
  feedbackYear: number = new Date().getFullYear();
  feedbackDepartmentFilter = '';
  @ViewChild('feedbackPaginator') feedbackPaginator: MatPaginator;
  /** Hebrew labels for feedback columns */
  feedbackColumnLabels: Record<string, string> = {
    מחלקה: 'מחלקה',
    סבב: 'סבב',
    רבעון: 'רבעון',
    תהליך_הקבלה: 'תהליך הקבלה',
    יחס_לסטאזרים: 'יחס לסטאזרים',
    עומס_עבודה: 'עומס עבודה',
    הדרכה_קבלה_מעקב_שחרור: 'הדרכה קבלה מעקב שחרור',
    מעקב_אחר_קבלה_מעקב_שחרור: 'מעקב אחר קבלה מעקב שחרור',
    חלוקת_תורנויות: 'חלוקת תורנויות',
    לימוד_אקדמיה: 'לימוד אקדמיה',
    בטחון_ומסוגלות: 'בטחון ומסוגלות',
    השתתפות_בהרצאות_מחוץ_למחלקה: 'השתתפות בהרצאות מחוץ למחלקה',
    ימי_ספריה_החזר: 'ימי ספריה החזר',
    שביעות_רצון_כללית: 'שביעות רצון כללית',
    מעורבות_המנטור: 'מעורבות המנטור',
    יש_מנטור: 'יש מנטור',
    אין_מנטור: 'אין מנטור',
    יש_קושי_בתקשורת_שפה: 'יש קושי בתקשורת שפה',
    אין_קושי_בתקשורת_שפה: 'אין קושי בתקשורת שפה',
    יש_מקום_לינה: 'יש מקום לינה',
    אין_מקום_לינה: 'אין מקום לינה',
    יש_המלצה_לאלקטיב: 'יש המלצה לאלקטיב',
    אין_המלצה_לאלקטיב: 'אין המלצה לאלקטיב',
    הערות_סטאזר: 'הערות סטאזר'
  };

  constructor(
    public dialog: MatDialog,
    private http: HttpClient,
    private formBuilder: FormBuilder,
    private router: Router,
    private _snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.emptyIntern = this.getEmptyIntern();
    this.searchInternsGroup = this.formBuilder.group({
      EmployeeID: new FormControl('', null),
      FirstName: new FormControl('', null),
      LastName: new FormControl('', null),
      PhoneNumber: new FormControl('', null),
      Department: new FormControl('', null),
      On: new FormControl('', null),
      MonthYear: new FormControl('', null),
    });
    this.buildMonthYearOptions();
    this.getMedicalInterns();
    this.getDepartmentList();
    this.loadAllDepartments();
  }

  get filteredDepartments(): any[] {
    if (!this.departmentsFilter || !this.departmentsFilter.trim()) {
      return this.allDepartments;
    }
    const term = this.departmentsFilter.trim().toLowerCase();
    return this.allDepartments.filter(
      (d) =>
        (d.DepartDesc || d.DepartnentDescripton || d.DepartmentDescription || '').toLowerCase().includes(term) ||
        (d.DepartCode || d.DepartnentCodeFirst || d.DepartmentCode || '').toLowerCase().includes(term)
    );
  }

  loadAllDepartments(): void {
    this.allDepartmentsLoading = true;
    this.http.post(this.url + 'GetMedicalInternDepartmentsAll', {}).subscribe(
      (response) => {
        this.allDepartmentsLoading = false;
        const raw = response['d'] || [];
        this.allDepartments = raw;
        this.departmentRowIds.clear();
        this.departmentCodesForFirst = [];
        this.departmentCodesForSecond = [];
        raw.forEach((r: any) => {
          const code = r.DepartCode || r.DepartnentCodeFirst || r.DepartmentCode || '';
          if (!code) return;
          const rowId = r.Row_ID ?? r.RowID;
          if (rowId != null && rowId !== '') {
            this.departmentRowIds.set(code, typeof rowId === 'string' ? parseInt(rowId, 10) : rowId);
          }
          if (r.FirstDepartment === 'True' || r.FirstDepartment === 1) {
            this.departmentCodesForFirst.push(code);
          }
          if (r.SecondDepartment === 'True' || r.SecondDepartment === 1) {
            this.departmentCodesForSecond.push(code);
          }
        });
      },
      () => {
        this.allDepartmentsLoading = false;
        this.allDepartments = [];
        this.openSnackBar('שגיאה בטעינת רשימת המחלקות');
      }
    );
  }

  saveDisplayDepartments(): void {
    this.displayDepartmentsSaving = true;
    const records = this.allDepartments.map((d) => {
      const code = d.DepartCode || d.DepartnentCodeFirst || d.DepartmentCode;
      const desc = d.DepartDesc || d.DepartnentDescripton || d.DepartmentDescription || '';
      return {
        Row_ID: this.departmentRowIds.get(code) || 0,
        DepartCode: code,
        DepartDesc: desc,
        Status: d.Status ?? 1,
        FirstDepartment: this.departmentCodesForFirst.includes(code) ? 1 : 0,
        SecondDepartment: this.departmentCodesForSecond.includes(code) ? 1 : 0
      };
    });
    this.http.post(this.url + 'SaveMedicalInternDepartments', { _items: records }).subscribe(
      (response) => {
        this.displayDepartmentsSaving = false;
        if (response['d']) {
          this.openSnackBar('נשמר בהצלחה');
          this.loadAllDepartments();
          this.loadDepartmentsData();
        } else {
          this.openSnackBar('משהו השתבש, לא נשמר');
        }
      },
      () => {
        this.displayDepartmentsSaving = false;
        this.openSnackBar('משהו השתבש, לא נשמר');
      }
    );
  }

  isInFirstList(code: string): boolean {
    return this.departmentCodesForFirst.includes(code);
  }

  isInSecondList(code: string): boolean {
    return this.departmentCodesForSecond.includes(code);
  }

  toggleFirstList(code: string): void {
    const idx = this.departmentCodesForFirst.indexOf(code);
    if (idx >= 0) {
      this.departmentCodesForFirst = this.departmentCodesForFirst.filter((c) => c !== code);
    } else {
      this.departmentCodesForFirst = [...this.departmentCodesForFirst, code];
    }
  }

  toggleSecondList(code: string): void {
    const idx = this.departmentCodesForSecond.indexOf(code);
    if (idx >= 0) {
      this.departmentCodesForSecond = this.departmentCodesForSecond.filter((c) => c !== code);
    } else {
      this.departmentCodesForSecond = [...this.departmentCodesForSecond, code];
    }
  }

  openSnackBar(message: string) {
    this._snackBar.open(message, 'X', {
      duration: 5000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }

  getEmptyIntern(): any {
    return {
      RowID: '',
      EmployeeID: '',
      FirstName: '',
      LastName: '',
      CellNumber: '',
      Email: '',
      DepartnentCode: '',
      DepartnentDescripton: '',
      ProfilePicture: 'http://srv-apps-prod/Images/default.jpg',
    };
  }

  get activeFiltersCount(): number {
    if (!this.searchInternsGroup) return 0;

    return Object.values(this.searchInternsGroup.value)
      .filter(v => v !== null && v !== undefined && v.toString().trim() !== '')
      .length;
  }


  private toPeriodString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  private buildMonthYearOptions(): void {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = -6; i <= 18; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      options.push({
        value: this.toPeriodString(d),
        label: this.hebrewMonthFormatter.format(d)
      });
    }
    this.monthYearOptions = options;
  }

  getDepartmentList() {
    const monthYear = this.searchInternsGroup?.get('MonthYear')?.value || null;
    this.http.post(this.url + 'GetMedicalInternDepartments', { _InternPeriod: monthYear || null }).subscribe((response) => {
      this.DepartmentsList = response['d'] || [];
    });
  }

  previousDepartmentsYear(): void {
    this.departmentsYear--;
    this.loadDepartmentsData();
  }

  nextDepartmentsYear(): void {
    this.departmentsYear++;
    this.loadDepartmentsData();
  }

  /** Load departments pivot data (intern counts per department per month) */
  loadDepartmentsData() {
    this.departmentsLoaded = false;
    this.http.post(this.url + 'GetInternDepartmentMonthPeriodTable', { year: this.departmentsYear }).subscribe(
      (response) => {
        this.departmentsLoaded = true;
        const data = response['d'] || [];
        this.departmentsTableData = data;
        this.departmentsDataSource = new MatTableDataSource<any>(data);
        setTimeout(() => {
          this.departmentsDataSource.paginator = this.departmentsPaginator;
        }, 0);
        this.departmentsDataSource.filterPredicate = (row, filter) => {
          const term = filter.toLowerCase();
          return (row.DepartDesc || '').toLowerCase().includes(term) ||
            this.departmentsDisplayedColumns.some((col) => col !== 'DepartDesc' && String(row[col] || '').includes(term));
        };
      },
      () => {
        this.departmentsLoaded = true;
        this.departmentsTableData = [];
        this.departmentsDataSource = new MatTableDataSource<any>([]);
        this.openSnackBar('שגיאה בטעינת נתוני המחלקות');
      }
    );
  }

  setViewMode(mode: 'interns' | 'departments' | 'serverData' | 'feedback') {
    this.viewMode = mode;
    if (mode === 'departments') {
      this.loadDepartmentsData();
    } else if (mode === 'serverData') {
      this.loadServerData();
    } else if (mode === 'feedback') {
      this.loadFeedbackData();
    }
  }

  onServerDataMonthYearChange(): void {
    this.loadServerData();
  }

  previousFeedbackYear(): void {
    this.feedbackYear--;
    this.loadFeedbackData();
  }

  nextFeedbackYear(): void {
    this.feedbackYear++;
    this.loadFeedbackData();
  }

  /**
   * Loads data from server that returns JSON in format:
   * [{ column1: value1, column2: value2, ... }, ...]
   * (from C# SqlDataReader serialized with JsonConvert.SerializeObject(rows))
   */
  loadServerData(): void {
    this.serverDataLoaded = false;
    const monthYear = this.searchInternsGroup?.get('MonthYear')?.value || '';
    this.http.post(this.url + 'GetInternRotationMatrix', { _monthYear: monthYear }).subscribe(
      (response) => {
        this.serverDataLoaded = true;
        let raw = response['d'];
        if (typeof raw === 'string') {
          try {
            raw = JSON.parse(raw);
          } catch {
            raw = [];
          }
        }
        const rows: Record<string, any>[] = Array.isArray(raw) ? raw : [];
        this.serverDataTableData = rows;
        this.serverDataSource = new MatTableDataSource<Record<string, any>>(rows);
        this.serverDataDisplayedColumns = this.getServerDataColumns(rows);
        setTimeout(() => {
          this.serverDataSource.paginator = this.serverDataPaginator;
        }, 0);
        this.serverDataSource.filterPredicate = (row, filter) => {
          const term = filter.toLowerCase();
          return this.serverDataDisplayedColumns.some(
            (col) => String(row[col] ?? '').toLowerCase().includes(term)
          );
        };
      },
      () => {
        this.serverDataLoaded = true;
        this.serverDataTableData = [];
        this.serverDataSource = new MatTableDataSource<Record<string, any>>([]);
        this.serverDataDisplayedColumns = [];
        this.openSnackBar('שגיאה בטעינת נתוני השרת');
      }
    );
  }

  private getServerDataColumns(rows: Record<string, any>[]): string[] {
    const cols = new Set<string>();
    rows.forEach((row) => Object.keys(row).forEach((k) => cols.add(k)));
    return Array.from(cols);
  }

  /**
   * Loads interns feedback data from VW_EP_InternQuestionnaireResaultNumeric.
   * Backend endpoint should return JSON array of objects with columns matching the view.
   */
  loadFeedbackData(): void {
    this.feedbackLoaded = false;
    this.http.post(this.url + 'GetInternDepartmentsFeedbackMatrix', { year: this.feedbackYear }).subscribe(
      (response) => {
        this.feedbackLoaded = true;
        let raw = response['d'];
        if (typeof raw === 'string') {
          try {
            raw = JSON.parse(raw);
          } catch {
            raw = [];
          }
        }
        const rows: Record<string, any>[] = Array.isArray(raw) ? raw : [];
        this.feedbackTableData = rows;
        this.feedbackDataSource = new MatTableDataSource<Record<string, any>>(rows);
        this.feedbackDisplayedColumns = this.getFeedbackColumns(rows);
        this.feedbackDepartmentFilter = '';
        setTimeout(() => {
          this.feedbackDataSource.paginator = this.feedbackPaginator;
        }, 0);
        this.feedbackDataSource.filterPredicate = (row, filter) => {
          const deptCol = this.feedbackDepartmentColumn;
          if (this.feedbackDepartmentFilter && deptCol && String(row[deptCol] ?? '') !== this.feedbackDepartmentFilter) {
            return false;
          }
          const term = (filter || '').trim().toLowerCase();
          if (!term) return true;
          return this.feedbackDisplayedColumns.some(
            (col) => String(row[col] ?? '').toLowerCase().includes(term)
          );
        };
      },
      () => {
        this.feedbackLoaded = true;
        this.feedbackTableData = [];
        this.feedbackDataSource = new MatTableDataSource<Record<string, any>>([]);
        this.feedbackDisplayedColumns = [];
        this.openSnackBar('שגיאה בטעינת משוב סטאג\'רים');
      }
    );
  }

  private getFeedbackColumns(rows: Record<string, any>[]): string[] {
    const cols = new Set<string>();

    rows.forEach((row) => {
        Object.keys(row).forEach((k) => {
            if (k !== '__type') { // Check specifically for the key you want to exclude
                cols.add(k);
            }
        });
    });

    return Array.from(cols);
}

  getFeedbackColumnLabel(col: string): string {
    return this.feedbackColumnLabels[col] || col;
  }

  /** Column name that holds department in feedback data */
  get feedbackDepartmentColumn(): string | null {
    const candidates = ['מחלקה', 'DepartDesc', 'Department', 'DepartnentDescripton'];
    return candidates.find((c) => this.feedbackDisplayedColumns.includes(c)) ?? null;
  }

  /** Unique department values from feedback table for the dropdown */
  get feedbackDepartmentsList(): string[] {
    const col = this.feedbackDepartmentColumn;
    if (!col || !this.feedbackTableData?.length) return [];
    const set = new Set<string>();
    this.feedbackTableData.forEach((row) => {
      const v = String(row[col] ?? '').trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort();
  }

  onFeedbackDepartmentChange(): void {
    this.feedbackDataSource.filter = (this.feedbackDataSource.filter || '').trim() + ' ';
  }

  /** Truncates feedback text for display; full text goes in tooltip */
  truncateFeedbackText(val: any, maxLen: number = 45): string {
    if (val == null || val === undefined) return '—';
    const s = String(val);
    if (s.length <= maxLen) return s;
    return s.substring(0, maxLen) + '...';
  }

  getFeedbackCellTooltip(val: any, maxLen: number = 45): string {
    if (val == null || val === undefined) return '';
    const s = String(val);
    return s.length > maxLen ? s : '';
  }

  /** Replaces "-" with "\\" for display in server data table */
  replaceDash(val: any): string {
    if(val === 'EmployeeID') return 'מזהה סטאגר';
    if(val === 'FirstName') return 'שם פרטי';
    if(val === 'LastName') return 'שם משפחה';
    if (val == null || val === undefined) return '';
    return String(val).replace(/-/g, '\\');
  }

  getMedicalInterns() {
    this.loaded = false;
    this.getDepartmentList();
    const EmployeeID = this.searchInternsGroup?.controls['EmployeeID']?.value || '';
    const firstName = this.searchInternsGroup?.controls['FirstName']?.value || '';
    const lastName = this.searchInternsGroup?.controls['LastName']?.value || '';
    const phoneNumber = this.searchInternsGroup?.controls['PhoneNumber']?.value || '';
    const department = this.searchInternsGroup?.controls['Department']?.value || '';
    const onValue = this.searchInternsGroup?.controls['On']?.value || '';
    const monthYear = this.searchInternsGroup?.controls['MonthYear']?.value || '';
    this.http
      .post(this.url + 'GetMedicalInterns', {
        _employeeID: EmployeeID,
        _firstName: firstName,
        _lastName: lastName,
        _phoneNumber: phoneNumber,
        _department: department,
        _on: onValue,
        _monthYear: monthYear,
      })
      .subscribe(
        (response) => {
          this.loaded = true;
          const data = response['d'] || [];

          this.TABLE_DATA = data;
          this.dataSource = new MatTableDataSource<any>(data);
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;

          this.calculateStats(data);
        },
        () => {
          this.loaded = true;
          this.dataSource = new MatTableDataSource<any>([]);
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
        }
      );
  }

  private calculateStats(data: any[]): void {
    const total = data.length;
    const withEmail = data.filter(x => !!x.Email).length;
    const withPhone = data.filter(x => !!x.CellNumber).length;
    const uniqueDepartments = new Set(
      data.map(x => x.DepartnentDescripton).filter(x => !!x)
    ).size;

    this.stats = {
      total,
      withEmail,
      withPhone,
      uniqueDepartments
    };
  }

  resetSearch(): void {
    this.searchInternsGroup.reset({
      EmployeeID: '',
      FirstName: '',
      LastName: '',
      PhoneNumber: '',
      Department: '',
      On: '',
      MonthYear: ''
    });

    this.getMedicalInterns();
  }

  clearSearchFields(): void {
    this.searchInternsGroup.reset({
      EmployeeID: '',
      FirstName: '',
      LastName: '',
      PhoneNumber: '',
      Department: '',
      On: '',
      MonthYear: ''
    });
  }

  get isLoading(): boolean {
    return (this.viewMode === 'interns' && !this.loaded) ||
      (this.viewMode === 'departments' && !this.departmentsLoaded) ||
      (this.viewMode === 'serverData' && !this.serverDataLoaded) ||
      (this.viewMode === 'feedback' && !this.feedbackLoaded);
  }


  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    const val = filterValue.trim().toLowerCase();
    if (this.viewMode === 'interns') {
      this.dataSource.filter = val;
    } else if (this.viewMode === 'departments') {
      this.departmentsDataSource.filter = val;
    } else if (this.viewMode === 'feedback') {
      this.feedbackDataSource.filter = val;
    } else {
      this.serverDataSource.filter = val;
    }
  }

  clearActiveTableFilter(input: HTMLInputElement) {
    input.value = '';
    if (this.viewMode === 'interns') {
      this.dataSource.filter = '';
    } else if (this.viewMode === 'departments') {
      this.departmentsDataSource.filter = '';
    } else if (this.viewMode === 'feedback') {
      this.feedbackDataSource.filter = '';
    } else {
      this.serverDataSource.filter = '';
    }
  }

  addUpdateIntern(intern: any) {
    const dialogRef = this.dialog.open(MedicalInternAddUpdateComponent, {
      width: '680px',
      maxWidth: '95vw',
    });
    dialogRef.componentInstance.intern = intern ? { ...intern } : { ...this.emptyIntern };
    dialogRef.afterClosed().subscribe((result) => {
      if (result == 1) this.getMedicalInterns();
    });
  }

  navigateToDepartments(intern: any, event: Event) {
    event.stopPropagation();
    if (intern?.EmployeeID) {
      this.router.navigate(['/intern-departments-manage', intern.EmployeeID]);
    }
  }

  navigateToSms() {
    this.router.navigate(['/medical-interns-sms']);
  }

  openLecturesManage() {
    this.dialog.open(LecturesManageDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      disableClose: false
    });
  }

  exportToExcel(): void {
    if (!this.TABLE_DATA || this.TABLE_DATA.length === 0) return;

    const exportData = this.TABLE_DATA.map(x => ({
      תז: x.EmployeeID,
      שם_פרטי: x.FirstName,
      שם_משפחה: x.LastName,
      מחלקה: x.DepartnentDescripton + ' ' + (x.FunctionID == '39' ? 'סטאזר/ית באלקטיב' : '') ,
      טלפון: x.CellNumber,
      מייל: x.Email
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
    const workbook: XLSX.WorkBook = {
      Sheets: { 'סטאגרים': worksheet },
      SheetNames: ['סטאגרים']
    };

    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    saveAs(blob, 'Medical_Interns.xlsx');
  }

  exportFeedbackToExcel(): void {
    const rows = this.feedbackDataSource.filteredData || [];
    if (rows.length === 0) {
      this.openSnackBar('אין נתונים לייצוא');
      return;
    }
    const headers = this.feedbackDisplayedColumns.map(col => this.getFeedbackColumnLabel(col));
    const exportData = rows.map(row => {
      const obj: Record<string, any> = {};
      this.feedbackDisplayedColumns.forEach((col, i) => {
        obj[headers[i]] = row[col] ?? '';
      });
      return obj;
    });
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
    const workbook: XLSX.WorkBook = {
      Sheets: { 'משוב': worksheet },
      SheetNames: ['משוב']
    };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    saveAs(blob, 'Feedback_Export.xlsx');
    this.openSnackBar('הייצוא הושלם בהצלחה');
  }

}
