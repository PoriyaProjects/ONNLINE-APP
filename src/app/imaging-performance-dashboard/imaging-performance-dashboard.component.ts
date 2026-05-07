import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import {
  ImagingCaseDetailRow,
  ImagingDoctor,
  ImagingPerformanceDashboardService,
  ImagingPerformanceResult,
  SourceType,
} from './imaging-performance-dashboard.service';

type SortKey = 'DocName' | 'CaseCount' | 'AvgMinutesToDecision';

/** Preferred column order for backend keys (then remaining keys alphabetically). */
const DETAIL_KEY_ORDER: string[] = [
  'Id_Num',
  'id_Num',
  'Admission_No',
  'AdmissionNo',
  'admissionNo',
  'Admission',
  'ImagingTime',
  'imagingTime',
  'DocName',
  'docName',
  'DecisionTime',
  'decisionTime',
  'DocDepart',
  'docDepart',
  'Minutes_To_Decision',
  'minutes_To_Decision',
  'Patient_Name',
  'PatientName',
  'Doctor_Name',
  'DoctorName',
  'doctorName',
  'Doctor',
  'Time',
  'time',
  'Send_Time',
  'SendTime',
  'sendTime',
  'Accept_Time',
  'AcceptTime',
  'acceptTime',
  'Admission_Date',
  'AdmissionDate',
  'Visit_Date',
  'VisitDate',
  'Department_Name',
  'DepartmentName',
  'Room_Name',
  'RoomName',
  'ERBOE',
  'MinutesToDecision',
  'minutesToDecision',
];

const DETAIL_LABEL_HE: Record<string, string> = {
  Id_Num: 'תעודת זהות',
  id_Num: 'תעודת זהות',
  Admission_No: 'מספר קבלה',
  AdmissionNo: 'מספר קבלה',
  admissionNo: 'מספר קבלה',
  Admission: 'מספר קבלה',
  ImagingTime: 'זמן הדמיה',
  imagingTime: 'זמן הדמיה',
  DecisionTime: 'זמן החלטה/קריאה',
  decisionTime: 'זמן החלטה/קריאה',
  DocDepart: 'מחלקת רופא / יחידה',
  docDepart: 'מחלקת רופא / יחידה',
  Minutes_To_Decision: 'דקות עד החלטה',
  minutes_To_Decision: 'דקות עד החלטה',
  Patient_Name: 'שם מטופל',
  PatientName: 'שם מטופל',
  Doctor_Name: 'רופא מטפל',
  DoctorName: 'רופא מטפל',
  doctorName: 'רופא מטפל',
  DocName: 'רופא מטפל',
  docName: 'רופא מטפל',
  Doctor: 'רופא מטפל',
  Time: 'זמן',
  time: 'זמן',
  Send_Time: 'זמן שליחה',
  SendTime: 'זמן שליחה',
  sendTime: 'זמן שליחה',
  Accept_Time: 'זמן קריאה / תשובה',
  AcceptTime: 'זמן קריאה / תשובה',
  acceptTime: 'זמן קריאה / תשובה',
  Admission_Date: 'תאריך קבלה',
  AdmissionDate: 'תאריך קבלה',
  Visit_Date: 'תאריך ביקור',
  VisitDate: 'תאריך ביקור',
  Department_Name: 'מחלקה',
  DepartmentName: 'מחלקה',
  Room_Name: 'חדר / אגף',
  RoomName: 'חדר / אגף',
  ERBOE: 'סוג הדמיה',
  Erboe: 'סוג הדמיה',
  MinutesToDecision: 'דקות עד החלטה',
  minutesToDecision: 'דקות עד החלטה',
};

@Component({
  selector: 'app-imaging-performance-dashboard',
  templateUrl: './imaging-performance-dashboard.html',
  styleUrls: ['./imaging-performance-dashboard.css'],
})
export class ImagingPerformanceDashboardComponent implements OnInit {

  /** Hebrew headers for drill-down table (fields match optional `Details` from API). */
  readonly caseDetailColumns: { field: keyof ImagingCaseDetailRow; label: string }[] = [
    { field: 'Id_Num', label: 'תעודת זהות' },
    { field: 'Admission_No', label: 'מספר קבלה' },
    { field: 'Admission_Date', label: 'תאריך קבלה' },
    { field: 'Patient_Name', label: 'שם מטופל' },
    { field: 'Department_Name', label: 'מחלקה' },
    { field: 'Room_Name', label: 'חדר / אגף' },
    { field: 'Doctor_Name', label: 'רופא מטפל' },
    { field: 'ERBOE', label: 'סוג הדמיה' },
    { field: 'Send_Time', label: 'זמן שליחה' },
    { field: 'Accept_Time', label: 'זמן קריאה / תשובה' },
    { field: 'MinutesToDecision', label: 'דקות עד החלטה' },
    { field: 'Visit_Date', label: 'תאריך ביקור' },
  ];

  readonly sourceOptions: { value: SourceType; label: string }[] = [
    { value: 'EmergencyVisits', label: 'ביקורי חירום' },
    { value: 'OutpatientClinics', label: 'מרפאות חוץ' },
  ];

  sourceType: SourceType = 'EmergencyVisits';
  fromDate = '';
  toDate = '';

  loading = false;
  error: string | null = null;
  result: ImagingPerformanceResult | null = null;

  doctors: ImagingDoctor[] = [];
  caseDetails: ImagingCaseDetailRow[] = [];
  /** Rows as returned by the API (dynamic columns). */
  detailRawRows: Record<string, unknown>[] = [];
  casesDialogOpen = false;

  trend: { Day: string; AvgMinutesToDecision: number; CaseCount: number }[] = [];

  @ViewChild('chartPanel', { read: ElementRef }) chartPanel?: ElementRef<HTMLElement>;

  chartType = 'LineChart';
  chartColumns: (string | { type: string; label: string })[] = [];
  chartRows: (string | number)[][] = [];
  chartOptions: Record<string, unknown> = {};
  chartWidth = 900;
  chartHeight = 320;

  private sortKey: SortKey = 'CaseCount';
  private sortDir: 'asc' | 'desc' = 'desc';

  constructor(private svc: ImagingPerformanceDashboardService) {}

  /** Single KPI when totals match (מטופלים vs קבלות); prefer total עם הדמיה. */
  get kpiImagingCaseCount(): number {
    return this.result?.TotalPatientsWithImaging ?? 0;
  }

  /** Columns that have at least one non-empty value (cleaner table). */
  get visibleCaseColumns(): { field: keyof ImagingCaseDetailRow; label: string }[] {
    if (!this.caseDetails.length) {
      return this.caseDetailColumns;
    }
    return this.caseDetailColumns.filter(col =>
      this.caseDetails.some(r => {
        const v = r[col.field];
        return v != null && v !== '';
      })
    );
  }

  /** Modal table from raw API rows (any property names). */
  get useRawDetailTable(): boolean {
    return this.detailRawRows.length > 0;
  }

  get hasModalDetailTable(): boolean {
    return this.useRawDetailTable || this.caseDetails.length > 0;
  }

  get modalDetailKeys(): string[] {
    if (!this.detailRawRows.length) {
      return [];
    }
    const keys = new Set<string>();
    for (const row of this.detailRawRows) {
      Object.keys(row).forEach(k => keys.add(k));
    }
    const ordered: string[] = [];
    for (const k of DETAIL_KEY_ORDER) {
      if (keys.has(k)) {
        ordered.push(k);
      }
    }
    for (const k of Array.from(keys).sort((a, b) => a.localeCompare(b))) {
      if (!ordered.includes(k)) {
        ordered.push(k);
      }
    }
    return ordered;
  }

  hebrewDetailLabel(key: string): string {
    return DETAIL_LABEL_HE[key] ?? key;
  }

  formatRawDetailCell(value: unknown): string {
    if (value == null || value === '') {
      return '—';
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    try {
      return JSON.stringify(value);
    } catch {
      return '—';
    }
  }

  ngOnInit(): void {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    this.fromDate = this.toYmd(start);
    this.toDate = this.toYmd(now);
    this.initChartShell();
    this.recalcChartSize();
  }

  get sortedDoctors(): ImagingDoctor[] {
    const list = [...this.doctors];
    const mul = this.sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      if (this.sortKey === 'DocName') {
        return mul * (a.DocName || '').localeCompare(b.DocName || '', 'he');
      }
      const av = Number(a[this.sortKey]) || 0;
      const bv = Number(b[this.sortKey]) || 0;
      return mul * (av - bv);
    });
    return list;
  }

  setSort(key: SortKey): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = key === 'DocName' ? 'asc' : 'desc';
    }
  }

  sortIcon(key: SortKey): string {
    if (this.sortKey !== key) {
      return '↕';
    }
    return this.sortDir === 'asc' ? '↑' : '↓';
  }

  fmtMins(m: number): string {
    if (m == null || Number.isNaN(Number(m))) {
      return '—';
    }
    const v = Math.round(Number(m) * 10) / 10;
    return `${v} דק'`;
  }

  timeClass(mins: number): string {
    if (mins <= 30) {
      return 'chip chip--green';
    }
    if (mins <= 60) {
      return 'chip chip--yellow';
    }
    if (mins <= 120) {
      return 'chip chip--orange';
    }
    return 'chip chip--red';
  }

  openCasesDialog(): void {
    this.casesDialogOpen = true;
  }

  closeCasesDialog(): void {
    this.casesDialogOpen = false;
  }

  caseCell(row: ImagingCaseDetailRow, field: keyof ImagingCaseDetailRow): string {
    const v = row[field];
    if (v == null || v === '') {
      return '—';
    }
    if (typeof v === 'number') {
      return Number.isFinite(v) ? String(v) : '—';
    }
    return String(v);
  }

  loadData(): void {
    if (!this.fromDate || !this.toDate) {
      this.error = 'נא לבחור טווח תאריכים';
      return;
    }
    this.loading = true;
    this.error = null;
    this.svc.getData(this.sourceType, this.fromDate, this.toDate).subscribe(res => {
      this.loading = false;
      this.result = res;
      if (!res) {
        this.error = 'לא ניתן לטעון נתונים';
        this.doctors = [];
        this.caseDetails = [];
        this.detailRawRows = [];
        this.trend = [];
        this.chartRows = [];
        return;
      }
      this.doctors = res.Doctors || [];
      this.caseDetails = res.Details || [];
      this.detailRawRows = res.DetailsRaw ?? [];
      this.trend = res.DailyTrend || [];
      this.buildChart();
      setTimeout(() => this.recalcChartSize(), 0);
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.recalcChartSize();
  }

  private toYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private initChartShell(): void {
    this.chartColumns = [
      { type: 'string', label: 'יום' },
      { type: 'number', label: 'ממוצע דקות לקריאה' },
    ];
    this.chartOptions = {
      legend: { position: 'bottom', maxLines: 2 },
      chartArea: { left: 52, right: 28, top: 16, bottom: 56, width: '84%', height: '68%' },
      hAxis: { slantedText: true, slantedTextAngle: 40 },
      vAxis: { minValue: 0, textStyle: { fontSize: 11 } },
      colors: ['#2B6CB0'],
      curveType: 'function',
      pointSize: 4,
    };
  }

  private buildChart(): void {
    this.chartRows = this.trend.map(t => [
      t.Day,
      t.AvgMinutesToDecision,
    ]);
  }

  private recalcChartSize(): void {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 900;
    const n = Math.max(this.trend.length, 1);
    const scrollEl = this.chartPanel?.nativeElement?.querySelector('.ipd-chart-scroll') as HTMLElement | undefined;
    const cw = scrollEl?.clientWidth
      ?? this.chartPanel?.nativeElement?.clientWidth
      ?? Math.floor(vw * 0.42);
    const minScrollContent = n * 72 + 100;
    this.chartWidth = Math.max(minScrollContent, Math.max(cw - 8, 360));
    this.chartHeight = vw < 640 ? 260 : 340;
  }
}
