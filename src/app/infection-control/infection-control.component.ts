import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ChangeDetectorRef } from '@angular/core';
import { environment } from 'src/environments/environment';
import { ConfirmationDialogService } from '../confirmation-dialog/confirmation-dialog.service';
import { BacteriaDialogComponent } from './bacteria-dialog/bacteria-dialog.component';

/** ASMX response row: MDRO_ID, MDRO_Desc, IsActive */
export interface MdroDto {
  MDRO_ID: number;
  MDRO_Desc: string;
  IsActive: boolean;
}

/** ASMX department row: DepartnentDescripton (display and value) */
export interface DepartmentDto {
  DepartnentDescripton?: string;
  [key: string]: any;
}

/** ASMX response row: HospDays_ID, YearMonth, Hospitalization_Days */
export interface HospitalDayDto {
  HospDays_ID: number;
  YearMonth: string;
  Hospitalization_Days: number;
}

/** Accu log row for Bacteria Log table (by month). Bind to response.d. Bacteria name from join = MDRO_Desc. */
export interface AccuLogRowDto {
  Id?: number;
  AccuLog_ID?: number;
  MDRO_ID?: number;
  MDRO_Desc?: string;
  BacteriaName?: string;
  EP_Department: string;
  YearMonth: string;
  Total_Acc: number;
  Total_Positive_Tests: number;
  Hospitalization_Days: number;
}

export interface ShowReportRowDto {
  BacteriaName: string;
  YearMonth: string;
  Department: string;
  Total_Acc: number;
  Total_Positive_Tests: number;
  Hospitalization_Days?: number;
}

@Component({
  selector: 'app-infection-control',
  templateUrl: './infection-control.component.html',
  styleUrls: ['./infection-control.component.css']
})
export class InfectionControlComponent implements OnInit {

  // Update tab
  mdros: MdroDto[] = [];
  departments: DepartmentDto[] = [];
  hospitalDays: HospitalDayDto[] = [];
  activeMdros: MdroDto[] = [];

  /** Bacteria Log list for selected month only */
  accuLogList: AccuLogRowDto[] = [];
  loadingAccuLogList = false;

  bacteriaLogForm = {
    mdroId: null as number | null,
    department: '',
    yearMonth: '',
    totalAcc: 0,
    totalPositiveTests: 0,
    hospitalizationDays: 0
  };

  hospitalDaysForm = {
    yearMonth: '',
    hospitalizationDays: 0
  };
  editingHospitalDayId: number | null = null;

  // Show tab
  selectedYear: number = new Date().getFullYear();
  showReportData: ShowReportRowDto[] = [];
  years: number[] = [];

  loadingMdros = false;
  loadingDepartments = false;
  loadingHospitalDays = false;
  loadingAccuLog = false;
  loadingShowReport = false;
  savingHospitalDay = false;

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private confirmationDialog: ConfirmationDialogService
  ) {}

  ngOnInit(): void {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 10; y--) {
      this.years.push(y);
    }
    this.bacteriaLogForm.yearMonth = this.getCurrentYearMonth();
    this.loadMdros();
    this.loadActiveMdros();
    this.loadDepartments();
    this.loadHospitalDays();
    this.loadAccuLogByMonth(this.bacteriaLogForm.yearMonth);
  }

  /** Default and normalized format for backend: YYYY-MM */
  getCurrentYearMonth(): string {
    return this.formatYearMonth(new Date());
  }

  /** Convert selected date/value to YYYY-MM for saving, filtering, loading. */
  formatYearMonth(value: string | Date): string {
    if (value instanceof Date) {
      return value.getFullYear() + '-' + String(value.getMonth() + 1).padStart(2, '0');
    }
    const s = (value || '').toString().trim();
    if (!s) return '';
    if (/^\d{4}-\d{2}$/.test(s)) return s.substring(0, 7);
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    }
    return s.substring(0, 7);
  }

  private getData(res: any): any {
    let data = res?.d ?? res;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (_) {
        data = [];
      }
    }
    return data;
  }

  loadMdros(): void {
    this.loadingMdros = true;
    this.http.post(environment.url + 'InfectionControl_GetMdros', { activeOnly: false })
      .subscribe(
        (res: any) => {
          this.mdros = Array.isArray(res.d) ? res.d : [];
          this.loadingMdros = false;
          this.cdr.detectChanges();
        },
        (error) => {
          console.error('Error loading MDROs:', error);
          this.snackBar.open('Error loading bacteria', 'Close', { duration: 3000 });
          this.loadingMdros = false;
          this.cdr.detectChanges();
        }
      );
  }

  loadActiveMdros(): void {
    this.http.post(environment.url + 'InfectionControl_GetMdros', { activeOnly: true })
      .subscribe(
        (res: any) => {
          this.activeMdros = Array.isArray(res.d) ? res.d : [];
          this.cdr.detectChanges();
        },
        (error) => {
          console.error('Error loading active MDROs:', error);
          this.activeMdros = [];
          this.cdr.detectChanges();
        }
      );
  }

  loadDepartments(): void {
    this.loadingDepartments = true;
    this.http.post(environment.url + 'InfectionControl_GetDepartments', {})
      .subscribe(
        (res: any) => {
          this.departments = Array.isArray(res.d) ? res.d : [];
          this.loadingDepartments = false;
          this.cdr.detectChanges();
        },
        (error) => {
          console.error('Error loading departments:', error);
          this.snackBar.open('Error loading departments', 'Close', { duration: 3000 });
          this.loadingDepartments = false;
          this.cdr.detectChanges();
        }
      );
  }

  loadHospitalDays(): void {
    this.loadingHospitalDays = true;
    this.http.post(environment.url + 'InfectionControl_GetHospitalDays', {})
      .subscribe(
        (res: any) => {
          this.hospitalDays = Array.isArray(res.d) ? res.d : [];
          this.loadingHospitalDays = false;
          this.cdr.detectChanges();
        },
        (error) => {
          console.error('Error loading hospital days:', error);
          this.snackBar.open('Error loading hospitalization days', 'Close', { duration: 3000 });
          this.loadingHospitalDays = false;
          this.cdr.detectChanges();
        }
      );
  }

  openAddBacteria(): void {
    const dialogRef = this.dialog.open(BacteriaDialogComponent, {
      width: '420px',
      data: { id: 0, mdroDesc: '', isActive: true, isEdit: false }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.loadMdros();
        this.loadActiveMdros();
      }
    });
  }

  openEditBacteria(m: MdroDto): void {
    const dialogRef = this.dialog.open(BacteriaDialogComponent, {
      width: '420px',
      data: { id: m.MDRO_ID, mdroDesc: m.MDRO_Desc, isActive: m.IsActive, isEdit: true }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.loadMdros();
        this.loadActiveMdros();
      }
    });
  }

  deleteBacteria(m: MdroDto): void {
    this.confirmationDialog.confirm(
      'Delete Bacteria',
      `Soft delete "${m.MDRO_Desc}"?`,
      'Yes',
      'No'
    ).then(ok => {
      if (!ok) return;
      this.http.post(environment.url + 'InfectionControl_DeleteMdro', { id: m.MDRO_ID })
        .subscribe(
          () => {
            this.snackBar.open('Bacteria deleted', 'Close', { duration: 2000 });
            this.loadMdros();
            this.loadActiveMdros();
          },
          (error) => {
            this.snackBar.open(error?.error?.Message || 'Delete failed', 'Close', { duration: 3000 });
          }
        );
    }).catch(() => {});
  }

  loadAccuLogByMonth(yearMonth: string): void {
    const formattedYearMonth = this.formatYearMonth(yearMonth);
    if (!formattedYearMonth) {
      this.accuLogList = [];
      this.cdr.detectChanges();
      return;
    }
    this.loadingAccuLogList = true;
    this.http.post(environment.url + 'InfectionControl_GetAccuLogByMonth', { yearMonth: formattedYearMonth })
      .subscribe(
        (res: any) => {
          this.accuLogList = Array.isArray(res.d) ? res.d : [];
          this.loadingAccuLogList = false;
          this.cdr.detectChanges();
        },
        () => {
          this.accuLogList = [];
          this.loadingAccuLogList = false;
          this.cdr.detectChanges();
        }
      );
  }

  onBacteriaLogYearMonthChange(): void {
    const formatted = this.formatYearMonth(this.bacteriaLogForm.yearMonth);
    this.bacteriaLogForm.yearMonth = formatted;
    this.loadAccuLogByMonth(formatted);
  }

  saveAccuLog(): void {
    const f = this.bacteriaLogForm;
    if (f.mdroId == null || f.department == null || f.department === '' || !f.yearMonth ||
        f.totalAcc == null || f.totalPositiveTests == null || f.hospitalizationDays == null) {
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
      return;
    }
    const formattedYearMonth = this.formatYearMonth(f.yearMonth);
    this.loadingAccuLog = true;
    this.http.post(environment.url + 'InfectionControl_CreateAccuLog', {
      mdroId: f.mdroId,
      yearMonth: formattedYearMonth,
      epDepartment: f.department,
      totalAcc: f.totalAcc,
      totalPositiveTests: f.totalPositiveTests,
      hospitalizationDays: f.hospitalizationDays
    }).subscribe(
      () => {
        this.loadingAccuLog = false;
        this.snackBar.open('Bacteria log saved', 'Close', { duration: 2000 });
        this.bacteriaLogForm = {
          mdroId: null,
          department: '',
          yearMonth: formattedYearMonth,
          totalAcc: 0,
          totalPositiveTests: 0,
          hospitalizationDays: 0
        };
        this.loadAccuLogByMonth(formattedYearMonth);
        this.cdr.detectChanges();
      },
      (error) => {
        this.loadingAccuLog = false;
        this.snackBar.open(error?.error?.Message || 'Save failed', 'Close', { duration: 3000 });
        this.cdr.detectChanges();
      }
    );
  }

  getAccuLogId(row: AccuLogRowDto): number | undefined {
    return row.AccuLog_ID ?? row.Id;
  }

  deleteAccuLog(row: AccuLogRowDto): void {
    const selectedId = this.getAccuLogId(row);
    if (selectedId == null) return;
    this.confirmationDialog.confirm(
      'Delete record',
      'Are you sure you want to delete this record?',
      'Yes',
      'No'
    ).then(ok => {
      if (!ok) return;
      this.http.post(environment.url + 'InfectionControl_DeleteAccuLog', { id: selectedId })
        .subscribe(
          () => {
            this.snackBar.open('Record deleted', 'Close', { duration: 2000 });
            this.loadAccuLogByMonth(this.formatYearMonth(this.bacteriaLogForm.yearMonth));
          },
          (error) => {
            this.snackBar.open(error?.error?.Message || 'Delete failed', 'Close', { duration: 3000 });
          }
        );
    }).catch(() => {});
  }

  deleteHospitalDay(h: HospitalDayDto): void {
    this.confirmationDialog.confirm(
      'Delete record',
      'Are you sure you want to delete this record?',
      'Yes',
      'No'
    ).then(ok => {
      if (!ok) return;
      this.http.post(environment.url + 'InfectionControl_DeleteHospitalizationDays', { id: h.HospDays_ID })
        .subscribe(
          () => {
            this.snackBar.open('Record deleted', 'Close', { duration: 2000 });
            this.loadHospitalDays();
          },
          (error) => {
            this.snackBar.open(error?.error?.Message || 'Delete failed', 'Close', { duration: 3000 });
          }
        );
    }).catch(() => {});
  }

  saveHospitalDay(): void {
    const ym = (this.hospitalDaysForm.yearMonth + '').trim();
    if (!ym) {
      this.snackBar.open('Please enter Year-Month (YYYY-MM)', 'Close', { duration: 3000 });
      return;
    }
    const yyyyMm = ym.length >= 7 ? ym.substring(0, 7) : ym;
    this.savingHospitalDay = true;
    if (this.editingHospitalDayId != null) {
      this.http.post(environment.url + 'InfectionControl_UpdateHospitalDays', {
        id: this.editingHospitalDayId,
        yearMonth: yyyyMm,
        hospitalizationDays: this.hospitalDaysForm.hospitalizationDays
      }).subscribe(
        () => {
          this.savingHospitalDay = false;
          this.snackBar.open('Hospitalization days updated', 'Close', { duration: 2000 });
          this.editingHospitalDayId = null;
          this.hospitalDaysForm = { yearMonth: '', hospitalizationDays: 0 };
          this.loadHospitalDays();
        },
        (error) => {
          this.savingHospitalDay = false;
          this.snackBar.open(error?.error?.Message || 'Update failed', 'Close', { duration: 3000 });
        }
      );
    } else {
      this.http.post(environment.url + 'InfectionControl_CreateHospitalDays', {
        yearMonth: yyyyMm,
        hospitalizationDays: this.hospitalDaysForm.hospitalizationDays
      }).subscribe(
        () => {
          this.savingHospitalDay = false;
          this.snackBar.open('Hospitalization days added', 'Close', { duration: 2000 });
          this.hospitalDaysForm = { yearMonth: '', hospitalizationDays: 0 };
          this.loadHospitalDays();
        },
        (error) => {
          this.savingHospitalDay = false;
          this.snackBar.open(error?.error?.Message || 'Create failed', 'Close', { duration: 3000 });
        }
      );
    }
  }

  editHospitalDay(h: HospitalDayDto): void {
    this.editingHospitalDayId = h.HospDays_ID;
    this.hospitalDaysForm = { yearMonth: h.YearMonth, hospitalizationDays: h.Hospitalization_Days };
    this.cdr.detectChanges();
  }

  cancelEditHospitalDay(): void {
    this.editingHospitalDayId = null;
    this.hospitalDaysForm = { yearMonth: '', hospitalizationDays: 0 };
    this.cdr.detectChanges();
  }

  displayShowReport(): void {
    this.loadingShowReport = true;
    this.showReportData = [];
    this.loadHospitalDays();
    this.http.post(environment.url + 'InfectionControl_GetShowReport', { year: this.selectedYear })
      .subscribe(
        (response: any) => {
          const data = this.getData(response);
          this.showReportData = Array.isArray(data) ? data : [];
          this.loadingShowReport = false;
          this.cdr.detectChanges();
        },
        (error) => {
          console.error('Error loading report:', error);
          this.snackBar.open('Error loading report', 'Close', { duration: 3000 });
          this.loadingShowReport = false;
          this.cdr.detectChanges();
        }
      );
  }

  getReportByMonth(): { month: string; rows: ShowReportRowDto[] }[] {
    const map = new Map<string, ShowReportRowDto[]>();
    for (const r of this.showReportData) {
      const m = r.YearMonth || '';
      if (!map.has(m)) map.set(m, []);
      map.get(m)!.push(r);
    }
    const months = Array.from(map.keys()).sort();
    return months.map(month => ({ month, rows: map.get(month)! }));
  }

  /** Monthly hospitalization days from infection_control_Hospitalization_Days for the Show table. */
  getHospitalizationForMonth(yearMonth: string): number | '' {
    if (!yearMonth || !this.hospitalDays.length) return '';
    const found = this.hospitalDays.find(h => (h.YearMonth || '').substring(0, 7) === (yearMonth + '').substring(0, 7));
    return found && found.Hospitalization_Days != null ? found.Hospitalization_Days : '';
  }

  getDepartmentDisplayName(d: DepartmentDto | string): string {
    if (typeof d === 'string') return d;
    return (d as any).DepartnentDescripton ?? '';
  }

  getDepartmentValue(d: DepartmentDto | string): string {
    if (typeof d === 'string') return d;
    return (d as any).DepartnentDescripton ?? '';
  }
}
