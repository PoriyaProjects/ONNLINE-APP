import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import {
  ImagingCaseDetailRow,
  ImagingDoctor,
  ImagingPerformanceDashboardService,
  ImagingPerformanceResult,
  OutpatientDepartmentCode,
  OutpatientImagingCaseRow,
  OutpatientImagingDoctor,
  OutpatientImagingResult,
  SourceType,
} from './imaging-performance-dashboard.service';

type SortKey = 'DocName' | 'CaseCount' | 'AvgMinutesToDecision';
type OutpatientSortKey = 'DocName' | 'CaseCount' | 'AvgMinutesToDecision';

export interface OutpatientDepartmentOption {
  code: OutpatientDepartmentCode;
  name: string;
  icon: string;
}

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

const DETAIL_DATE_KEY_RE = /(?:^|_)(?:Date|DATE)(?:$|_)/;
const DETAIL_TIME_ONLY_KEY_RE = /(?:^|_)(?:Time|TIME)(?:$|_)/;
const DETAIL_MINUTES_KEY_RE = /minutes/i;

/** Emergency imaging doctors included in the ranking table. */
const EMERGENCY_APPROVED_DOCTORS: readonly string[] = [
  'אי.דבורין',
  'אי.וולוביק',
  'אל.ויניקוב',
  'אל.פוקס',
  'אנ.אדלר',
  'אנ.טשרניחו',
  'בו.צ\'וטקו',
  'בוש.נאסר',
  'דו.קטרינה',
  'דר.טוקרב',
  'חמ.מעתוק',
  'טט.צייקה',
  'יא.מחאמיד',
  'יב.סקלרנקו',
  'יו.אברנטס',
  'מג.אבו חוס',
  'מו.עודה',
  'מונ.זועבי',
  'מח.קאק',
  'מי.ז\'רדב',
  'מרי.סמובסק',
  'נט.פוצ\'קוב',
  'נמ.בלנק',
  'סא.מטר',
  'ענ.מריסאת',
  'פא.זועבי',
  'פו.קבלאן',
  'פי.ויגדר',
  'קו.קרוגר',
  'רב.ברבארה',
  'רב.לופזאל',
];

const EMERGENCY_APPROVED_DOCTOR_KEYS = new Set(
  EMERGENCY_APPROVED_DOCTORS.map(normalizeDoctorKey)
);

function normalizeDoctorKey(name: string): string {
  return (name || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(/[''`׳]/g, '')
    .toLowerCase();
}

const OUTPATIENT_DATE_FIELDS = new Set<keyof OutpatientImagingCaseRow>([
  'CreateDate',
  'AppoitmentDate',
  'TechDate',
  'DocDate',
  'BKIDOT',
  'DIMOTAN',
  'TOR',
]);

const OUTPATIENT_TIME_FIELDS = new Set<keyof OutpatientImagingCaseRow>([
  'TechTime',
  'DocTime',
]);

const OUTPATIENT_CASE_COLUMNS: { field: keyof OutpatientImagingCaseRow; label: string }[] = [
  { field: 'PatientNumber', label: 'מספר מטופל' },
  { field: 'FirstName', label: 'שם פרטי' },
  { field: 'LastName', label: 'שם משפחה' },
  { field: 'CaseNumber', label: 'מספר מקרה' },
  { field: 'Depart', label: 'מחלקה' },
  { field: 'CreateDate', label: 'תאריך יצירה' },
  { field: 'BKIDOT', label: 'פקידות' },
  { field: 'DIMOTAN', label: 'דימותן' },
  { field: 'TOR', label: 'קביעת תור' },
  { field: 'DaysDiff', label: 'ימים (יצירה←תור)' },
  { field: 'HoursDiff', label: 'שעות (יצירה←תור)' },
  { field: 'TechDate', label: 'תאריך הדמיה' },
  { field: 'TechTime', label: 'שעת הדמיה' },
  { field: 'DocDate', label: 'תאריך דיווח' },
  { field: 'DocTime', label: 'שעת דיווח' },
  { field: 'DocName', label: 'רופא מדווח' },
];

@Component({
  selector: 'app-imaging-performance-dashboard',
  templateUrl: './imaging-performance-dashboard.html',
  styleUrls: ['./imaging-performance-dashboard.css'],
})
export class ImagingPerformanceDashboardComponent implements OnInit {

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

  readonly outpatientCaseColumns = OUTPATIENT_CASE_COLUMNS;

  readonly sourceOptions: { value: SourceType; label: string }[] = [
    { value: 'EmergencyVisits', label: 'ביקורי חירום' },
    { value: 'OutpatientClinics', label: 'מרפאות חוץ' },
  ];

  readonly outpatientDepartments: OutpatientDepartmentOption[] = [
    { code: 'CT', name: 'CT', icon: '🩺' },
    { code: 'MRI', name: 'MRI', icon: '🧲' },
  ];

  sourceType: SourceType = 'EmergencyVisits';
  fromDate = '';
  toDate = '';
  /** Material datepicker models (display dd/mm/yyyy via en-GB locale). */
  fromDateModel: Date | null = null;
  toDateModel: Date | null = null;

  loading = false;
  error: string | null = null;
  result: ImagingPerformanceResult | null = null;

  doctors: ImagingDoctor[] = [];
  caseDetails: ImagingCaseDetailRow[] = [];
  detailRawRows: Record<string, unknown>[] = [];
  casesDialogOpen = false;

  selectedOutpatientDept: OutpatientDepartmentOption | null = null;
  outpatientResult: OutpatientImagingResult | null = null;
  outpatientDoctors: OutpatientImagingDoctor[] = [];
  outpatientCases: OutpatientImagingCaseRow[] = [];
  outpatientCasesDialogOpen = false;

  trend: { Day: string; AvgMinutesToDecision: number; CaseCount: number }[] = [];
  outpatientTrend: { Day: string; AvgMinutesToDecision: number; CaseCount: number }[] = [];

  @ViewChild('chartPanel', { read: ElementRef }) chartPanel?: ElementRef<HTMLElement>;
  @ViewChild('outpatientChartPanel', { read: ElementRef }) outpatientChartPanel?: ElementRef<HTMLElement>;

  chartType = 'LineChart';
  chartColumns: (string | { type: string; label?: string; role?: string; p?: Record<string, unknown> })[] = [];
  chartRows: (string | number)[][] = [];
  chartOptions: Record<string, unknown> = {};
  chartWidth = 900;
  chartHeight = 320;

  private sortKey: SortKey = 'CaseCount';
  private sortDir: 'asc' | 'desc' = 'desc';
  private outpatientSortKey: OutpatientSortKey = 'CaseCount';
  private outpatientSortDir: 'asc' | 'desc' = 'desc';

  constructor(private svc: ImagingPerformanceDashboardService) {}

  get isOutpatientSource(): boolean {
    return this.sourceType === 'OutpatientClinics';
  }

  get showOutpatientDeptPicker(): boolean {
    return this.isOutpatientSource && !this.selectedOutpatientDept;
  }

  get showEmergencyDashboard(): boolean {
    return !this.isOutpatientSource && !!this.result && !this.loading;
  }

  get showOutpatientDashboard(): boolean {
    return this.isOutpatientSource && !!this.selectedOutpatientDept && !!this.outpatientResult && !this.loading;
  }

  get kpiImagingExamCount(): number {
    return this.result?.TotalImagingExaminations ?? 0;
  }

  get outpatientPipelineStages(): { label: string; avg: number; icon: string }[] {
    const r = this.outpatientResult;
    if (!r) {
      return [];
    }
    if (r.PipelineStages?.length) {
      return r.PipelineStages
        .filter(s => s.Key !== 'TechToDoc' && s.Key !== 'ToDecision')
        .slice(0, 3)
        .map((s, i) => ({
          label: this.pipelineStageLabel(s.Key, s.LabelHe),
          avg: s.AvgMinutes,
          icon: ['📋', '🔍', '📅'][i] ?? '⏱️',
        }));
    }
    return [
      { label: 'יצירה ← דימותן', avg: r.AvgMinutesCreateToBkidot, icon: '📋' },
      { label: 'דימותן ← קביעת תור', avg: r.AvgMinutesBkidotToDimotan, icon: '🔍' },
      { label: 'קביעת תור ← תור נקבע', avg: r.AvgMinutesDimotanToTor, icon: '📅' },
    ];
  }

  private pipelineStageLabel(key: string, fallback: string): string {
    const labels: Record<string, string> = {
      CreateToBkidot: 'יצירה ← דימותן',
      BkidotToDimotan: 'דימותן ← קביעת תור',
      DimotanToTor: 'קביעת תור ← תור נקבע',
    };
    return this.rtlStageLabel(labels[key] ?? fallback);
  }

  get outpatientAvgDaysCreateToTor(): number {
    return this.outpatientResult?.AvgDaysCreateToTor ?? 0;
  }

  get outpatientAvgHoursCreateToTor(): number {
    return this.outpatientResult?.AvgHoursCreateToTor ?? 0;
  }

  fmtAvgDays(d: number | null | undefined): string {
    if (d == null || Number.isNaN(Number(d))) {
      return '—';
    }
    const v = Math.round(Number(d) * 10) / 10;
    return `${v} ימים`;
  }

  fmtAvgHours(h: number | null | undefined): string {
    if (h == null || Number.isNaN(Number(h))) {
      return '—';
    }
    return `${Math.round(Number(h))} שע׳`;
  }

  /** Normalize stage labels to RTL arrows (←). */
  rtlStageLabel(label: string): string {
    return (label || '').replace(/\s*→\s*/g, ' ← ');
  }

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

  formatRawDetailCell(key: string, value: unknown): string {
    if (value == null || value === '') {
      return '—';
    }
    if (typeof value === 'number' && DETAIL_MINUTES_KEY_RE.test(key)) {
      return this.fmtHoursFromMinutes(value);
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? String(value) : '—';
    }
    if (typeof value === 'boolean') {
      return String(value);
    }
    const s = String(value).trim();
    if (DETAIL_MINUTES_KEY_RE.test(key) && /^-?\d+(\.\d+)?$/.test(s)) {
      return this.fmtHoursFromMinutes(Number(s));
    }
    const iso = this.parseIsoDateTime(s);
    if (iso) {
      if (DETAIL_DATE_KEY_RE.test(key) && !DETAIL_TIME_ONLY_KEY_RE.test(key)) {
        return this.formatDisplayDate(iso);
      }
      if (DETAIL_TIME_ONLY_KEY_RE.test(key)) {
        return this.formatDisplayDateTime(iso);
      }
      return this.formatDisplayDateTime(iso);
    }
    if (DETAIL_DATE_KEY_RE.test(key)) {
      return this.extractDateOnly(s);
    }
    return s;
  }

  ngOnInit(): void {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    this.fromDate = this.toYmd(start);
    this.toDate = this.toYmd(now);
    this.fromDateModel = start;
    this.toDateModel = now;
    this.initChartShell();
    this.recalcChartSize();
  }

  syncFromDateModel(): void {
    if (this.fromDateModel) {
      this.fromDate = this.toYmd(this.fromDateModel);
    }
  }

  syncToDateModel(): void {
    if (this.toDateModel) {
      this.toDate = this.toYmd(this.toDateModel);
    }
  }

  onSourceTypeChange(value: SourceType): void {
    if (this.sourceType === value) {
      return;
    }
    this.sourceType = value;
    this.error = null;
    this.result = null;
    this.outpatientResult = null;
    this.selectedOutpatientDept = null;
    this.doctors = [];
    this.caseDetails = [];
    this.detailRawRows = [];
    this.outpatientDoctors = [];
    this.outpatientCases = [];
    this.trend = [];
    this.outpatientTrend = [];
    this.chartRows = [];
  }

  selectOutpatientDepartment(dept: OutpatientDepartmentOption): void {
    this.selectedOutpatientDept = dept;
    this.loadData();
  }

  closeOutpatientDepartment(): void {
    this.selectedOutpatientDept = null;
    this.outpatientResult = null;
    this.outpatientDoctors = [];
    this.outpatientCases = [];
    this.outpatientTrend = [];
    this.error = null;
  }

  get sortedDoctors(): ImagingDoctor[] {
    const list = this.doctors.filter(d => this.isApprovedEmergencyDoctor(d.DocName || ''));
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

  get sortedOutpatientDoctors(): OutpatientImagingDoctor[] {
    const list = [...this.outpatientDoctors];
    const mul = this.outpatientSortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      if (this.outpatientSortKey === 'DocName') {
        return mul * (a.DocName || '').localeCompare(b.DocName || '', 'he');
      }
      const av = Number(a[this.outpatientSortKey]) || 0;
      const bv = Number(b[this.outpatientSortKey]) || 0;
      return mul * (av - bv);
    });
    return list;
  }

  isApprovedEmergencyDoctor(docName: string): boolean {
    const key = normalizeDoctorKey(docName);
    if (!key) {
      return false;
    }
    if (EMERGENCY_APPROVED_DOCTOR_KEYS.has(key)) {
      return true;
    }
    for (const approved of EMERGENCY_APPROVED_DOCTOR_KEYS) {
      if (key.includes(approved) || approved.includes(key)) {
        return true;
      }
    }
    return false;
  }

  setSort(key: SortKey): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = key === 'DocName' ? 'asc' : 'desc';
    }
  }

  setOutpatientSort(key: OutpatientSortKey): void {
    if (this.outpatientSortKey === key) {
      this.outpatientSortDir = this.outpatientSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.outpatientSortKey = key;
      this.outpatientSortDir = key === 'DocName' ? 'asc' : 'desc';
    }
  }

  sortIcon(key: SortKey): string {
    if (this.sortKey !== key) {
      return '↕';
    }
    return this.sortDir === 'asc' ? '↑' : '↓';
  }

  outpatientSortIcon(key: OutpatientSortKey): string {
    if (this.outpatientSortKey !== key) {
      return '↕';
    }
    return this.outpatientSortDir === 'asc' ? '↑' : '↓';
  }

  fmtMins(m: number | null | undefined): string {
    if (m == null || Number.isNaN(Number(m))) {
      return '—';
    }
    const v = Math.round(Number(m) * 10) / 10;
    return `${v} דק'`;
  }

  fmtHoursFromMinutes(m: number | null | undefined): string {
    if (m == null || Number.isNaN(Number(m))) {
      return '—';
    }
    const mins = Math.round(Number(m));
    if (mins < 60) {
      return this.fmtMins(mins);
    }
    if (mins >= 1440) {
      const days = Math.floor(mins / 1440);
      const remMins = mins % 1440;
      const hours = Math.floor(remMins / 60);
      const minRem = remMins % 60;
      const parts: string[] = [`${days} ימים`];
      if (hours > 0) {
        parts.push(`${hours} שע׳`);
      }
      if (minRem > 0 && days < 14) {
        parts.push(`${minRem} דק׳`);
      }
      return parts.join(' ');
    }
    const h = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${h} שע׳ ${rem} דק׳` : `${h} שע׳`;
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

  openOutpatientCasesDialog(): void {
    this.outpatientCasesDialogOpen = true;
  }

  closeOutpatientCasesDialog(): void {
    this.outpatientCasesDialogOpen = false;
  }

  caseCell(row: ImagingCaseDetailRow, field: keyof ImagingCaseDetailRow): string {
    return this.formatRawDetailCell(String(field), row[field]);
  }

  /** Date-only in tables (`2026-04-06`); time fields as `HH:mm:ss`. */
  fmtOutpatientDisplay(field: keyof OutpatientImagingCaseRow, value: unknown): string {
    if (value == null || value === '') {
      return '—';
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? String(value) : '—';
    }
    const s = String(value).trim();
    if (OUTPATIENT_TIME_FIELDS.has(field)) {
      const t = s.includes('T') ? s.split('T')[1] : s;
      return t.replace(/\.\d+.*$/, '').slice(0, 8) || '—';
    }
    if (OUTPATIENT_DATE_FIELDS.has(field) || /^\d{4}-\d{2}-\d{2}/.test(s)) {
      return this.extractDateOnly(s);
    }
    return s;
  }

  private extractDateOnly(raw: string): string {
    const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) {
      return this.formatDisplayDateFromYmd(iso[1]);
    }
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      return this.formatDisplayDate(d);
    }
    return raw.slice(0, 10);
  }

  private parseIsoDateTime(raw: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      return null;
    }
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private formatDisplayDate(d: Date): string {
    const day = String(d.getDate()).padStart(2, '0');
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const y = d.getFullYear();
    return `${day}/${m}/${y}`;
  }

  private formatDisplayDateFromYmd(ymd: string): string {
    const [y, m, day] = ymd.split('-');
    return y && m && day ? `${day}/${m}/${y}` : ymd;
  }

  private formatDisplayDateTime(d: Date): string {
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${this.formatDisplayDate(d)} ${h}:${min}`;
  }

  outpatientCaseCell(row: OutpatientImagingCaseRow, field: keyof OutpatientImagingCaseRow): string {
    return this.fmtOutpatientDisplay(field, row[field]);
  }

  loadData(): void {
    this.syncFromDateModel();
    this.syncToDateModel();
    if (!this.fromDate || !this.toDate) {
      this.error = 'נא לבחור טווח תאריכים';
      return;
    }
    if (this.isOutpatientSource) {
      if (!this.selectedOutpatientDept) {
        this.error = null;
        return;
      }
      this.loadOutpatientData();
      return;
    }
    this.loadEmergencyData();
  }

  private loadEmergencyData(): void {
    this.loading = true;
    this.error = null;
    this.svc.getData('EmergencyVisits', this.fromDate, this.toDate).subscribe(res => {
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

  private loadOutpatientData(): void {
    const dept = this.selectedOutpatientDept;
    if (!dept) {
      return;
    }
    this.loading = true;
    this.error = null;
    this.svc.getOutpatientData(dept.code, this.fromDate, this.toDate).subscribe(res => {
      this.loading = false;
      this.outpatientResult = res;
      if (!res) {
        this.error = 'לא ניתן לטעון נתוני מרפאות חוץ — ודא שהשרת מחזיר GetImagingOutpatientPerformanceDashboard';
        this.outpatientDoctors = [];
        this.outpatientCases = [];
        this.outpatientTrend = [];
        this.chartRows = [];
        return;
      }
      this.outpatientDoctors = res.Doctors || [];
      this.outpatientCases = res.Details || [];
      this.outpatientTrend = res.DailyTrend || [];
      this.buildOutpatientChart();
      setTimeout(() => this.recalcChartSize(true), 0);
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.recalcChartSize();
    this.recalcChartSize(true);
  }

  private toYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private minutesToChartHours(mins: number): number {
    return Math.round((Number(mins) / 60) * 100) / 100;
  }

  private formatChartDay(day: string): string {
    const s = String(day ?? '').trim();
    const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) {
      return iso[1];
    }
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      return this.toYmd(d);
    }
    return s.slice(0, 10);
  }

  private buildChartTooltip(day: string, minutes: number): string {
    const dateLabel = this.formatChartDay(day);
    const valueLabel = this.fmtHoursFromMinutes(minutes);
    return `<div style="padding:6px 10px;text-align:right;direction:rtl;font-family:Rubik,sans-serif;">
      <div style="font-weight:700;margin-bottom:4px;">${dateLabel}</div>
      <div>${valueLabel}</div>
    </div>`;
  }

  private setChartHoursColumnLabel(label: string): void {
    if (this.chartColumns.length >= 2 && typeof this.chartColumns[1] === 'object') {
      (this.chartColumns[1] as { label: string }).label = label;
    }
  }

  private initChartShell(): void {
    this.chartColumns = [
      { type: 'string', label: 'יום' },
      { type: 'number', label: 'ממוצע שעות' },
      { type: 'string', role: 'tooltip', p: { html: true } },
    ];
    this.chartOptions = {
      legend: { position: 'bottom', maxLines: 2 },
      chartArea: { left: 52, right: 28, top: 16, bottom: 56, width: '84%', height: '68%' },
      hAxis: { slantedText: true, slantedTextAngle: 40 },
      vAxis: { minValue: 0, textStyle: { fontSize: 11 } },
      colors: ['#2B6CB0'],
      curveType: 'function',
      pointSize: 4,
      tooltip: { isHtml: true, trigger: 'focus' },
    };
  }

  private buildChart(): void {
    this.setChartHoursColumnLabel('ממוצע שעות');
    this.chartRows = this.trend.map(t => [
      this.formatChartDay(t.Day),
      this.minutesToChartHours(t.AvgMinutesToDecision),
      this.buildChartTooltip(t.Day, t.AvgMinutesToDecision),
    ]);
  }

  private buildOutpatientChart(): void {
    this.setChartHoursColumnLabel('ממוצע שעות הדמיה→דיווח');
    this.chartRows = this.outpatientTrend.map(t => [
      this.formatChartDay(t.Day),
      this.minutesToChartHours(t.AvgMinutesToDecision),
      this.buildChartTooltip(t.Day, t.AvgMinutesToDecision),
    ]);
  }

  private recalcChartSize(outpatient = false): void {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 900;
    const panel = outpatient ? this.outpatientChartPanel : this.chartPanel;
    const scrollEl = panel?.nativeElement?.querySelector('.ipd-chart-scroll') as HTMLElement | undefined;
    const cw = scrollEl?.clientWidth ?? panel?.nativeElement?.clientWidth ?? Math.floor(vw * 0.45);
    this.chartWidth = Math.max(cw - 12, 280);
    this.chartHeight = vw < 640 ? 240 : 300;
  }
}
