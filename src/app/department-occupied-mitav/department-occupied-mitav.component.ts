import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { environment } from 'src/environments/environment';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface DepartmentOccupiedMitavRecord {
  [key: string]: any;
  AdmissionNo: any;
  PName: string | null;
  UnitName: string | null;
  Room: any;
  BedName: any;
  Age: any;
  PhysiotherapyConsultation: string | null;
  MobilityAssessment: string | null;
  WalkingPrescription: string | null;
  MobilityAssessmentDate: string | null;
  MobilityAtReception: string | null;
  FunctionalStateExecution: string | null;
  DatesWithBothShifts: number;
  TotalDaysInHospital: number;
  PercentageOfBothShifts: any;
  AdmissionMedicalRecord: any;
  WalkingRecommendation: any;
  PatientEscort: any;
  RequiredWalkingAid: any;
  RecommendedWalkingDistance: any;
  TimesPerDay: any;
  MobilityNotes: any;
}

interface SummaryCard {
  label: string;
  icon: string;
  current: number;
  total: number;
  percent: number;
  scope: string;
  target: number | null;
}

interface WalkingField {
  key: keyof DepartmentOccupiedMitavRecord;
  label: string;
}

@Component({
  selector: 'app-department-occupied-mitav',
  templateUrl: './department-occupied-mitav.component.html',
  styleUrls: ['./department-occupied-mitav.component.scss'],
})
export class DepartmentOccupiedMitavComponent implements OnInit, AfterViewInit, OnDestroy {
  Title1: string = '  ';
  Title2: string = 'סה״כ מטופלים: ';
  titleUnit: string = 'דוח מיתב למחלקה - ניידות';
  totalResults: number = 0;
  isLoading: boolean = true;
  filteredData: DepartmentOccupiedMitavRecord[] = [];
  physiotherapyStats: string = '';
  mobilityStats: string = '';
  walkingStats: string = '';
  mobilityAtReceptionStats: string = '';
  functionalStateStats: string = '';
  datesWithBothShiftsStats: string = '';
  summaryCards: SummaryCard[] = [];
  selectedPatient: DepartmentOccupiedMitavRecord | null = null;

  loadingImages: string[] = [
    'assets/poriagood1.jfif',
    'assets/poriagood2.jfif',
    'assets/poria icon.jpg',
    'assets/poriagood3.jfif'
  ];
  currentImageIndex: number = 0;

  displayedColumns: string[] = [
    'UnitName', 'AdmissionNo', 'PName', 'Room', 'Age', 'MobilityAtReception',
    'FunctionalStateExecution', 'MobilityAssessment', 'MobilityAssessmentDate',
    'PhysiotherapyConsultation', 'WalkingPrescription', 'DatesWithBothShifts'
  ];

  columnLabels: { [key: string]: string } = {
    AdmissionNo: 'מספר מקרה ',
    PName: 'שם המטופל',
    UnitName: 'שם המחלקה',
    Room: 'חדר',
    BedName: 'מיטה',
    Age: 'גיל',
    PhysiotherapyConsultation: 'הזמנת ייעוץ פיזיותרפיה',
    MobilityAssessment: 'הערכת ניידות',
    WalkingPrescription: 'מרשם הליכה',
    MobilityAssessmentDate: 'תאריך הערכת ניידות',
    MobilityAtReception: 'ניידות בקבלה',
    FunctionalStateExecution: 'מצב תפקודי',
    DatesWithBothShifts: 'תיעוד הליכה (יעד 70%)'
  };

  walkingFields: WalkingField[] = [
    { key: 'WalkingRecommendation', label: 'המלצה להליכה' },
    { key: 'PatientEscort', label: 'ליווי המטופל' },
    { key: 'RequiredWalkingAid', label: 'אביזר עזר נדרש' },
    { key: 'RecommendedWalkingDistance', label: 'מרחק הליכה מומלץ' },
    { key: 'TimesPerDay', label: 'מספר פעמים ביום' },
    { key: 'MobilityNotes', label: 'התוויות, זהירות והערות לניידות' }
  ];

  dataSource: MatTableDataSource<DepartmentOccupiedMitavRecord> = new MatTableDataSource();
  unitOptions: string[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('pdfTable', { static: false }) pdfTable!: ElementRef;
  @ViewChild('walkingDialog') walkingDialog!: TemplateRef<any>;

  filterForm: FormGroup;
  private imageTimer: any = null;
  private readonly specialColumns: string[] = [
    'DatesWithBothShifts', 'MobilityAssessmentDate', 'MobilityAtReception',
    'FunctionalStateExecution', 'PhysiotherapyConsultation', 'MobilityAssessment', 'WalkingPrescription'
  ];
  /** Server literal for "אין תיעוד" is UTF-8 read as Windows-1252. */
  private readonly brokenNoDocumentation = '\u05f3\u0090\u05f3\u2122\u05f3\u009f \u05f3\u00d7\u05f3\u2122\u05f3\u00a2\u05f3\u2022\u05f3\u201c';

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private dialog: MatDialog
  ) {
    this.filterForm = this.fb.group({
      globalFilter: [''],
      unitFilter: [''],
    });
  }

  ngOnInit(): void {
    this.loadData();
    this.setupFilterListeners();
    this.startImageRotation();
  }

  ngAfterViewInit(): void {
    this.bindTableHelpers();
  }

  ngOnDestroy(): void {
    if (this.imageTimer) {
      clearInterval(this.imageTimer);
    }
  }

  private field(row: any, ...keys: string[]): any {
    for (const key of keys) {
      if (row && row[key] !== undefined && row[key] !== null) {
        return row[key];
      }
    }
    return null;
  }

  private statusText(value: any): string {
    return String(value ?? '').replace(/[\u200e\u200f\u202a-\u202e\ufeff]/g, '').trim();
  }

  private isMissingDocumentation(value: any): boolean {
    const text = this.statusText(value);
    return !text || text === 'אין תיעוד' || text === this.brokenNoDocumentation;
  }

  private cleanAssessment(value: any): any {
    if (value == null) {
      return null;
    }
    return this.isMissingDocumentation(value) ? 'אין תיעוד' : value;
  }

  private cleanText(value: any): any {
    if (value == null) {
      return null;
    }
    const text = this.statusText(value);
    if (!text) {
      return null;
    }
    return this.isMissingDocumentation(text) ? 'אין תיעוד' : text;
  }

  private parseDate(value: any): string | null {
    if (value == null || value === '') {
      return null;
    }
    if (typeof value === 'string') {
      const microsoftDate = /\/Date\((-?\d+)\)\//.exec(value);
      if (microsoftDate) {
        return new Date(parseInt(microsoftDate[1], 10)).toISOString();
      }
    }
    return value;
  }

  private normalizeRow(d: any): DepartmentOccupiedMitavRecord {
    return {
      AdmissionNo: this.field(d, 'AdmissionNo', 'admissionNo'),
      PName: this.field(d, 'PName', 'pName'),
      UnitName: this.field(d, 'UnitName', 'unitName'),
      Room: this.field(d, 'Room', 'room'),
      BedName: this.field(d, 'BedName', 'bedName'),
      Age: this.field(d, 'Age_Years', 'age_Years', 'Age', 'age'),
      PhysiotherapyConsultation: this.field(d, 'PhysiotherapyConsultation', 'physiotherapyConsultation'),
      MobilityAssessment: this.cleanAssessment(this.field(d, 'MobilityAssessment', 'mobilityAssessment')),
      WalkingPrescription: this.field(d, 'WalkingPrescription', 'walkingPrescription'),
      MobilityAssessmentDate: this.parseDate(this.field(d, 'MobilityAssessmentDate', 'mobilityAssessmentDate')),
      MobilityAtReception: this.cleanText(this.field(d, 'MobilityAtReception', 'mobilityAtReception')),
      FunctionalStateExecution: this.cleanText(this.field(d, 'FunctionalStateExecution', 'functionalStateExecution')),
      DatesWithBothShifts: this.field(d, 'DatesWithBothShifts', 'datesWithBothShifts') || 0,
      TotalDaysInHospital: this.field(d, 'TotalDaysInHospital', 'totalDaysInHospital') || 0,
      PercentageOfBothShifts: this.field(d, 'PercentageOfBothShifts', 'percentageOfBothShifts'),
      AdmissionMedicalRecord: this.field(d, 'AdmissionMedicalRecord', 'admissionMedicalRecord'),
      WalkingRecommendation: this.cleanText(this.field(d, 'WalkingRecommendation', 'walkingRecommendation')),
      PatientEscort: this.cleanText(this.field(d, 'PatientEscort', 'patientEscort')),
      RequiredWalkingAid: this.cleanText(this.field(d, 'RequiredWalkingAid', 'requiredWalkingAid')),
      RecommendedWalkingDistance: this.cleanText(this.field(d, 'RecommendedWalkingDistance', 'recommendedWalkingDistance')),
      TimesPerDay: this.cleanText(this.field(d, 'TimesPerDay', 'timesPerDay')),
      MobilityNotes: this.cleanText(this.field(d, 'MobilityNotes', 'mobilityNotes'))
    };
  }

  loadData(): void {
    this.isLoading = true;

    this.http.get(`${environment.url}GetDepartmentOccupiedMITAV`, { responseType: 'text' })
      .subscribe({
        next: (body) => {
          const rows = this.rowsFromMitavResponse(body);
          const normalized = rows.map(row => this.normalizeRow(row));

          this.dataSource = new MatTableDataSource(normalized);
          this.dataSource.filterPredicate = this.customFilterPredicate();
          this.dataSource.sortingDataAccessor = (item, property) => this.sortValue(item, property);
          const departmentNames: string[] = normalized
            .map((row): string => String(row.UnitName || '').trim())
            .filter((name: string): name is string => name.length > 0);
          this.unitOptions = Array.from(new Set<string>(departmentNames))
            .sort((a: string, b: string) => a.localeCompare(b, 'he'));

          this.bindTableHelpers();
          this.applyFilter();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error fetching data', err);
          this.dataSource = new MatTableDataSource<DepartmentOccupiedMitavRecord>([]);
          this.filteredData = [];
          this.updateCounts([]);
          this.isLoading = false;
        }
      });
  }

  private rowsFromMitavResponse(body: string): any[] {
    const text = (body || '').trim();
    if (!text) {
      return [];
    }
    if (text.charAt(0) === '{' || text.charAt(0) === '[') {
      const data = JSON.parse(text);
      return Array.isArray(data) ? data : (data && Array.isArray(data.d) ? data.d : []);
    }
    const doc = new DOMParser().parseFromString(text, 'text/xml');
    const ns = 'http://tempuri.org/';
    const nodes = doc.getElementsByTagNameNS(ns, 'DepartmentOccupiedMITAVModel');
    const list = nodes.length ? nodes : doc.getElementsByTagName('DepartmentOccupiedMITAVModel');
    const rows: any[] = [];
    for (let i = 0; i < list.length; i++) {
      const row: any = {};
      const children = list[i].children;
      for (let c = 0; c < children.length; c++) {
        const child = children[c];
        const nil = child.getAttributeNS('http://www.w3.org/2001/XMLSchema-instance', 'nil');
        row[child.localName] = nil === 'true' ? null : child.textContent;
      }
      rows.push(row);
    }
    return rows;
  }

  private bindTableHelpers(): void {
    setTimeout(() => {
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
      }
      if (this.sort) {
        this.dataSource.sort = this.sort;
      }
    });
  }

  private sortValue(item: DepartmentOccupiedMitavRecord, property: string): string | number {
    if (property === 'MobilityAssessmentDate') {
      const time = item.MobilityAssessmentDate ? new Date(item.MobilityAssessmentDate).getTime() : 0;
      return isNaN(time) ? 0 : time;
    }
    if (property === 'DatesWithBothShifts') {
      return this.rowPercent(item);
    }
    const value = item[property];
    if (value == null) {
      return '';
    }
    return typeof value === 'number' ? value : String(value);
  }

  setupFilterListeners(): void {
    this.filterForm.get('globalFilter')?.valueChanges.subscribe(() => this.applyFilter());
    this.filterForm.get('unitFilter')?.valueChanges.subscribe(() => this.applyFilter());
  }

  applyFilter(): void {
    const globalFilterValue = String(this.filterForm.get('globalFilter')?.value || '').trim().toLowerCase();
    const unitFilterValue = String(this.filterForm.get('unitFilter')?.value || '').trim();
    const filter = JSON.stringify({ global: globalFilterValue, unit: unitFilterValue });

    this.dataSource.filterPredicate = this.customFilterPredicate();
    this.dataSource.filter = filter;
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }

    const source = this.dataSource.data || [];
    this.filteredData = source.filter(row => this.dataSource.filterPredicate(row, filter));
    this.updateCounts(this.filteredData);
  }

  customFilterPredicate(): (data: DepartmentOccupiedMitavRecord, filter: string) => boolean {
    return (data, filter) => {
      let filterObject: { global?: string; unit?: string } = {};
      try {
        filterObject = JSON.parse(filter || '{}');
      } catch {
        return true;
      }

      const globalFilter = String(filterObject.global || '').trim().toLowerCase();
      const unitFilter = String(filterObject.unit || '').trim();
      const matchesUnit = !unitFilter || String(data.UnitName || '').trim() === unitFilter;
      if (!matchesUnit) {
        return false;
      }
      if (!globalFilter) {
        return true;
      }

      const haystack = this.searchableText(data);
      return globalFilter.split(/\s+/).filter(token => token.length > 0).every(token => haystack.includes(token));
    };
  }

  private searchableText(data: DepartmentOccupiedMitavRecord): string {
    const values = [
      data.UnitName, data.AdmissionNo, data.PName, data.Room, data.BedName, data.Age,
      data.MobilityAtReception, data.FunctionalStateExecution, data.MobilityAssessment,
      data.PhysiotherapyConsultation, data.WalkingPrescription,
      this.formatDateTime(data.MobilityAssessmentDate),
      data.WalkingRecommendation, data.PatientEscort, data.RequiredWalkingAid,
      data.RecommendedWalkingDistance, data.TimesPerDay, data.MobilityNotes,
      this.walkingRecord(data)
    ];
    return values.filter(value => value != null && String(value).trim() !== '').join(' ').toLowerCase();
  }

  resetFilters(): void {
    this.filterForm.reset({
      globalFilter: '',
      unitFilter: ''
    });
    this.applyFilter();
  }

  getColumnLabel(column: string): string {
    return this.columnLabels[column] || column;
  }

  isPlainColumn(column: string): boolean {
    return this.specialColumns.indexOf(column) === -1;
  }

  isPrescribed(value: any): boolean {
    return value === 'כן';
  }

  isMissing(value: any): boolean {
    return value == null || String(value).trim() === '';
  }

  displayValue(value: any): string {
    return this.isMissing(value) ? 'לא צוין' : this.statusText(value);
  }

  openWalkingDialog(row: DepartmentOccupiedMitavRecord): void {
    if (!this.isPrescribed(row?.WalkingPrescription) || !this.walkingDialog) {
      return;
    }
    this.selectedPatient = row;
    this.dialog.open(this.walkingDialog, {
      width: '760px',
      maxWidth: '96vw',
      autoFocus: false,
      direction: 'rtl',
      panelClass: 'walking-rx-panel'
    }).afterClosed().subscribe(() => {
      this.selectedPatient = null;
    });
  }

  updateCounts(data: DepartmentOccupiedMitavRecord[]): void {
    const total = data.length;
    const mobility2or3 = data.filter(item => {
      const assessment = item.MobilityAssessment;
      const match = assessment != null ? String(assessment).match(/(\d+)$/) : null;
      const mobilityValue = match ? parseInt(match[1], 10) : null;
      return mobilityValue === 2 || mobilityValue === 3;
    });

    const totalMobility2or3 = mobility2or3.length;
    const physiotherapyYes = mobility2or3.filter(item => item.PhysiotherapyConsultation === 'כן').length;
    const walkingYes = mobility2or3.filter(item => item.WalkingPrescription === 'כן').length;
    const mobilityValid = data.filter(item => !this.isMissingDocumentation(item.MobilityAssessment)).length;
    const mobilityAtReceptionValid = data.filter(item => !this.isMissingDocumentation(item.MobilityAtReception)).length;
    const functionalStateValid = data.filter(item => this.statusText(item.FunctionalStateExecution) === 'בוצע').length;
    const totalRecordedWalkingDays = data.reduce((sum, item) => sum + (Number(item.DatesWithBothShifts) || 0), 0);
    const totalDaysInHospital = data.reduce((sum, item) => sum + (Number(item.TotalDaysInHospital) || 1), 0);
    const walkingPercentage = totalDaysInHospital > 0
      ? (totalRecordedWalkingDays / totalDaysInHospital) * 100
      : 0;
    const rate = (part: number, whole: number) => whole > 0 ? (part / whole) * 100 : 0;
    const physioRate = rate(physiotherapyYes, totalMobility2or3);
    const walkingRate = rate(walkingYes, totalMobility2or3);
    const mobilityRate = rate(mobilityValid, total);
    const receptionRate = rate(mobilityAtReceptionValid, total);
    const functionalRate = rate(functionalStateValid, total);

    this.totalResults = total;
    this.physiotherapyStats = `הזמנת ייעוץ פיזיותרפיה: ${physiotherapyYes}/${totalMobility2or3} (${physioRate.toFixed(2)}%)`;
    this.walkingStats = `מרשם הליכה: ${walkingYes}/${totalMobility2or3} (${walkingRate.toFixed(2)}%)`;
    this.mobilityStats = `הערכת ניידות: ${mobilityValid}/${total} (${mobilityRate.toFixed(2)}%)`;
    this.mobilityAtReceptionStats = `ניידות בקבלה: ${mobilityAtReceptionValid}/${total} (${receptionRate.toFixed(2)}%)`;
    this.functionalStateStats = `מצב תפקודי: ${functionalStateValid}/${total} (${functionalRate.toFixed(2)}%)`;
    this.datesWithBothShiftsStats = `תיעוד הליכה (יעד 70%): ${totalRecordedWalkingDays}/${totalDaysInHospital} (${walkingPercentage.toFixed(2)}%)`;

    this.summaryCards = [
      { label: 'מרשם הליכה', icon: 'directions_walk', current: walkingYes, total: totalMobility2or3, percent: walkingRate, scope: 'מתוך ניידות 2 או 3', target: null },
      { label: 'הערכת ניידות', icon: 'accessibility', current: mobilityValid, total, percent: mobilityRate, scope: '', target: null },
      { label: 'ייעוץ פיזיותרפיה', icon: 'medical_services', current: physiotherapyYes, total: totalMobility2or3, percent: physioRate, scope: 'מתוך ניידות 2 או 3', target: null },
      { label: 'ניידות בקבלה', icon: 'transfer_within_a_station', current: mobilityAtReceptionValid, total, percent: receptionRate, scope: '', target: null },
      { label: 'מצב תפקודי', icon: 'self_improvement', current: functionalStateValid, total, percent: functionalRate, scope: '', target: null },
      { label: 'תיעוד הליכה', icon: 'event_available', current: totalRecordedWalkingDays, total: totalDaysInHospital, percent: walkingPercentage, scope: 'יעד 70%', target: 70 }
    ];
  }

  barWidth(percent: number): number {
    if (!percent || percent < 0) {
      return 0;
    }
    return percent > 100 ? 100 : percent;
  }

  formatPercent(value: any): string {
    const numeric = Number(String(value == null ? '' : value).replace('%', '').trim());
    return isNaN(numeric) ? '0.00' : numeric.toFixed(2);
  }

  rowPercent(row: DepartmentOccupiedMitavRecord): number {
    const given = row?.PercentageOfBothShifts;
    if (given != null && given !== '') {
      const numeric = Number(String(given).replace('%', '').trim());
      if (!isNaN(numeric)) {
        return numeric;
      }
    }
    const total = Number(row?.TotalDaysInHospital) || 0;
    const recorded = Number(row?.DatesWithBothShifts) || 0;
    return total > 0 ? (recorded / total) * 100 : 0;
  }

  walkingRecord(row: DepartmentOccupiedMitavRecord): string {
    const recorded = Number(row?.DatesWithBothShifts) || 0;
    const total = Number(row?.TotalDaysInHospital) || 0;
    return `${recorded}/${total} (${this.formatPercent(this.rowPercent(row))}%)`;
  }

  isLowWalking(row: DepartmentOccupiedMitavRecord): boolean {
    return this.rowPercent(row) < 70;
  }

  formatDateTime(value: any): string {
    if (value == null || value === '') {
      return '';
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return String(value);
    }
    const pad = (part: number) => (part < 10 ? '0' : '') + part;
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  startImageRotation(): void {
    this.imageTimer = setInterval(() => {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.loadingImages.length;
    }, 3000);
  }

  exportToExcel(): void {
    const dataToExport = this.filteredData || [];
    if (!dataToExport.length) {
      return;
    }

    const formattedData = dataToExport.map(item => ({
      'שם המחלקה': item.UnitName ?? '',
      'מספר מקרה': item.AdmissionNo ?? '',
      'שם המטופל': item.PName ?? '',
      'חדר': item.Room ?? '',
      'מיטה': item.BedName ?? '',
      'גיל': item.Age ?? '',
      'ניידות בקבלה': item.MobilityAtReception ?? '',
      'מצב תפקודי': item.FunctionalStateExecution ?? '',
      'הערכת ניידות': item.MobilityAssessment ?? '',
      'תאריך הערכת ניידות': this.formatDateTime(item.MobilityAssessmentDate),
      'הזמנת ייעוץ פיזיותרפיה': item.PhysiotherapyConsultation ?? '',
      'מרשם הליכה': item.WalkingPrescription ?? '',
      'המלצה להליכה': item.WalkingRecommendation ?? '',
      'ליווי המטופל': item.PatientEscort ?? '',
      'אביזר עזר נדרש': item.RequiredWalkingAid ?? '',
      'מרחק הליכה מומלץ': item.RecommendedWalkingDistance ?? '',
      'מספר פעמים ביום': item.TimesPerDay ?? '',
      'התוויות, זהירות והערות לניידות': item.MobilityNotes ?? '',
      'ימי תיעוד הליכה': Number(item.DatesWithBothShifts) || 0,
      'ימי אשפוז': Number(item.TotalDaysInHospital) || 0,
      'אחוז תיעוד הליכה': `${this.formatPercent(this.rowPercent(item))}%`,
      'תיעוד הליכה (יעד 70%)': this.walkingRecord(item)
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(formattedData);
    const headers = Object.keys(formattedData[0]);
    worksheet['!cols'] = headers.map(header => ({
      wch: header.indexOf('הערות') >= 0 ? 44 : Math.max(header.length + 3, 14)
    }));
    (worksheet as any)['!views'] = [{ rightToLeft: true }];

    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'דוח מיתב');
    workbook.Workbook = { Views: [{ RTL: true }] };
    XLSX.writeFile(workbook, 'דוח_מיתב_ניידות.xlsx');
  }

  exportToPDF(): void {
    if (!this.pdfTable || !this.pdfTable.nativeElement) {
      console.error('Error: Table reference not found.');
      return;
    }
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfContainer = document.createElement('div');
    pdfContainer.innerHTML = `
      <div dir="rtl" style="padding: 20px; font-size: 16px;">
        ${this.pdfTable.nativeElement.innerHTML}
      </div>`;
    document.body.appendChild(pdfContainer);

    html2canvas(pdfContainer, { scale: 2 })
      .then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pdf.internal.pageSize.getWidth();
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 20, imgWidth, imgHeight);
        pdf.save('תפוסת_מחלקה.pdf');
        pdfContainer.remove();
      })
      .catch((error) => {
        console.error('Error generating PDF:', error);
        pdfContainer.remove();
      });
  }
}
