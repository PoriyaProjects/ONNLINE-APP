import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import * as XLSX from 'xlsx';

interface DeliriumSummaryRow {
  RowNumber?: number | string;
  Description?: string;
  Total?: number | string;
}

interface DeliriumAgeGenderRow {
  Age_Group?: string;
  Total_Male?: number | string;
  Total_Female?: number | string;
  Screened_Male?: number | string;
  Screened_Female?: number | string;
  Diagnosed_Male?: number | string;
  Diagnosed_Female?: number | string;
  NonDrug_Male?: number | string;
  NonDrug_Female?: number | string;
}

interface DeliriumAgeDaysScreeningRow {
  Age_Group?: string;
  Total_UpTo3?: number | string;
  Total_4_5?: number | string;
  Total_6Plus?: number | string;
  Screened_UpTo3?: number | string;
  Screened_4_5?: number | string;
  Screened_6Plus?: number | string;
}

interface DeliriumAgeDaysDiagnosisRow {
  Age_Group?: string;
  Diagnosed_UpTo3?: number | string;
  Diagnosed_4_5?: number | string;
  Diagnosed_6Plus?: number | string;
  NonDrug_UpTo3?: number | string;
  NonDrug_4_5?: number | string;
  NonDrug_6Plus?: number | string;
}

interface DeliriumSummaryResponse {
  Summary?: DeliriumSummaryRow[];
  AgeGender?: DeliriumAgeGenderRow[];
  AgeDaysScreening?: DeliriumAgeDaysScreeningRow[];
  AgeDaysDiagnosis?: DeliriumAgeDaysDiagnosisRow[];
}

interface FilterOption {
  label: string;
  value: number | string | null;
}

const QUARTER_LABELS: { [quarter: number]: string } = {
  1: 'רבעון 1 (ינואר-מרץ)',
  2: 'רבעון 2 (אפריל-יוני)',
  3: 'רבעון 3 (יולי-ספטמבר)',
  4: 'רבעון 4 (אוקטובר-דצמבר)'
};

@Component({
  selector: 'app-delirium-summary',
  templateUrl: './delirium-summary.component.html',
  styleUrls: ['./delirium-summary.component.css']
})
export class DeliriumSummaryComponent implements OnInit {

  isLoading = false;

  summaryTableData: any[] = [];
  ageGenderTableData: any[] = [];
  ageDaysScreeningTableData: any[] = [];
  ageDaysDiagnosisTableData: any[] = [];

  // Display columns used by delirium-summary.component.html
  summaryDisplayedColumns: string[] = [
    'rowNumber',
    'parameter',
    'value'
  ];

  ageGenderGroupColumns: string[] = [
    'ageGroup',
    'totalGroup',
    'screenedGroup',
    'diagnosedGroup',
    'nonPharmGroup'
  ];

  ageGenderDisplayedColumns: string[] = [
    'totalMale',
    'totalFemale',
    'screenedMale',
    'screenedFemale',
    'diagnosedMale',
    'diagnosedFemale',
    'nonPharmMale',
    'nonPharmFemale'
  ];

  ageDaysScreeningGroupColumns: string[] = [
    'ageGroup',
    'totalDaysGroup',
    'screenedDaysGroup'
  ];

  ageDaysScreeningDisplayedColumns: string[] = [
    'totalUpTo3',
    'total4to5',
    'total6Plus',
    'screenedUpTo3',
    'screened4to5',
    'screened6Plus'
  ];

  ageDaysDiagnosisGroupColumns: string[] = [
    'ageGroup',
    'diagnosedDaysGroup',
    'nonPharmDaysGroup'
  ];

  ageDaysDiagnosisDisplayedColumns: string[] = [
    'diagnosedUpTo3',
    'diagnosed4to5',
    'diagnosed6Plus',
    'nonPharmUpTo3',
    'nonPharm4to5',
    'nonPharm6Plus'
  ];

  availableYears: FilterOption[] = [];
  availableQuarters: FilterOption[] = [];

  selectedYear: number | null = null;
  selectedQuarter: number | null = null;

  dateFrom: Date | null = null;
  dateTo: Date | null = null;

  // Template aliases
  get years(): FilterOption[] {
    return this.availableYears;
  }

  get quarters(): FilterOption[] {
    return this.availableQuarters;
  }

  private backendData: DeliriumSummaryResponse | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.initializeFilters();
    this.isLoading = false;
  }

  private initializeFilters(): void {
    const currentYear = new Date().getFullYear();

    this.availableYears = [
      { value: null, label: 'ללא' },
      { value: -1, label: 'הכל' }
    ];

    for (let year = currentYear; year >= currentYear - 6; year--) {
      this.availableYears.push({
        value: year,
        label: year.toString()
      });
    }

    this.availableQuarters = [
      { value: null, label: 'ללא' },
      { value: -1, label: 'הכל' },
      { value: 1, label: QUARTER_LABELS[1] },
      { value: 2, label: QUARTER_LABELS[2] },
      { value: 3, label: QUARTER_LABELS[3] },
      { value: 4, label: QUARTER_LABELS[4] }
    ];

    this.selectedYear = -1;
    this.selectedQuarter = -1;
  }

  onYearChange(): void {
    if (this.selectedYear === null) {
      this.selectedQuarter = null;
      return;
    }

    if (this.selectedQuarter === null ||
        this.selectedQuarter === undefined) {
      this.selectedQuarter = -1;
    }
  }

  canSearch(): boolean {
    const hasDateRange = !!this.dateFrom && !!this.dateTo;

    const hasYearQuarter =
      this.selectedYear !== null &&
      this.selectedYear !== -1 &&
      this.selectedQuarter !== null &&
      this.selectedQuarter !== -1;

    return hasDateRange || hasYearQuarter;
  }

  search(): void {
    let dateIn: string | null = null;
    let dateOut: string | null = null;

    if (this.dateFrom && this.dateTo) {
      if (this.dateFrom > this.dateTo) {
        console.warn(
          'DeliriumSummary: DateIn cannot be later than DateOut.'
        );
        return;
      }

      dateIn = this.formatDateForApi(this.dateFrom);
      dateOut = this.formatDateForApi(this.dateTo);
    } else if (
      this.selectedYear !== null &&
      this.selectedYear !== -1 &&
      this.selectedQuarter !== null &&
      this.selectedQuarter !== -1
    ) {
      const year = this.selectedYear;
      const quarter = this.selectedQuarter;
      const startMonth = (quarter - 1) * 3;

      const startDate = new Date(year, startMonth, 1);
      const endDate = new Date(year, startMonth + 3, 0);

      dateIn = this.formatDateForApi(startDate);
      dateOut = this.formatDateForApi(endDate);
    } else {
      console.warn(
        'DeliriumSummary: please select a date range or Year + Quarter.'
      );
      return;
    }

    const requestBody = {
      DateIn: dateIn,
      DateOut: dateOut
    };

    console.log('DeliriumSummary request:', requestBody);

    this.isLoading = true;

    this.http
      .post(
        environment.url + 'fetchMitavDeliriumSummary',
        requestBody
      )
      .subscribe(
        (response: any) => {
          console.log('DeliriumSummary response:', response);

          const parsed = this.parseBackendResponse(response);

          if (!parsed) {
            console.error(
              'DeliriumSummary: invalid backend response.'
            );
            this.clearTables();
            this.isLoading = false;
            return;
          }

          this.backendData = parsed;
          this.mapBackendToTables(parsed);
          this.isLoading = false;
        },
        (error) => {
          console.error(
            'DeliriumSummary API error:',
            error
          );
          this.clearTables();
          this.isLoading = false;
        }
      );
  }

  private formatDateForApi(date: Date | null): string | null {
    if (!date) {
      return null;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private parseBackendResponse(
    response: any
  ): DeliriumSummaryResponse | null {

    let payload =
      response && response.d !== undefined
        ? response.d
        : response;

    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (error) {
        console.error(
          'DeliriumSummary: unable to parse response.d.',
          error
        );
        return null;
      }
    }

    if (!payload || typeof payload !== 'object') {
      console.error(
        'DeliriumSummary: invalid response object.'
      );
      return null;
    }

    if (
      payload.Delirium_MitavDeliriumSummary &&
      typeof payload.Delirium_MitavDeliriumSummary === 'object'
    ) {
      payload = payload.Delirium_MitavDeliriumSummary;
    }

    return payload as DeliriumSummaryResponse;
  }

  private mapBackendToTables(
    data: DeliriumSummaryResponse
  ): void {
    this.mapSummaryTable(data);
    this.mapAgeGenderTable(data);
    this.mapAgeDaysScreeningTable(data);
    this.mapAgeDaysDiagnosisTable(data);
  }

  private mapSummaryTable(
    data: DeliriumSummaryResponse
  ): void {
    const source = data.Summary || [];

    this.summaryTableData = source.map(row => ({
      rowNumber: row.RowNumber ?? '',
      parameter: row.Description || '',
      value: this.toNumber(row.Total)
    }));
  }

  private mapAgeGenderTable(
    data: DeliriumSummaryResponse
  ): void {
    const source = data.AgeGender || [];

    this.ageGenderTableData = source.map(row => ({
      ageGroup: row.Age_Group || '',

      totalMale: this.toNumber(row.Total_Male),
      totalFemale: this.toNumber(row.Total_Female),

      screenedMale: this.toNumber(row.Screened_Male),
      screenedFemale: this.toNumber(row.Screened_Female),

      diagnosedMale: this.toNumber(row.Diagnosed_Male),
      diagnosedFemale: this.toNumber(row.Diagnosed_Female),

      nonPharmMale: this.toNumber(row.NonDrug_Male),
      nonPharmFemale: this.toNumber(row.NonDrug_Female)
    }));
  }

  private mapAgeDaysScreeningTable(
    data: DeliriumSummaryResponse
  ): void {
    const source = data.AgeDaysScreening || [];

    this.ageDaysScreeningTableData = source.map(row => ({
      ageGroup: row.Age_Group || '',

      totalUpTo3: this.toNumber(row.Total_UpTo3),
      total4to5: this.toNumber(row.Total_4_5),
      total6Plus: this.toNumber(row.Total_6Plus),

      screenedUpTo3: this.toNumber(row.Screened_UpTo3),
      screened4to5: this.toNumber(row.Screened_4_5),
      screened6Plus: this.toNumber(row.Screened_6Plus)
    }));
  }

  private mapAgeDaysDiagnosisTable(
    data: DeliriumSummaryResponse
  ): void {
    const source = data.AgeDaysDiagnosis || [];

    this.ageDaysDiagnosisTableData = source.map(row => ({
      ageGroup: row.Age_Group || '',

      diagnosedUpTo3: this.toNumber(row.Diagnosed_UpTo3),
      diagnosed4to5: this.toNumber(row.Diagnosed_4_5),
      diagnosed6Plus: this.toNumber(row.Diagnosed_6Plus),

      nonPharmUpTo3: this.toNumber(row.NonDrug_UpTo3),
      nonPharm4to5: this.toNumber(row.NonDrug_4_5),
      nonPharm6Plus: this.toNumber(row.NonDrug_6Plus)
    }));
  }

  private clearTables(): void {
    this.summaryTableData = [];
    this.ageGenderTableData = [];
    this.ageDaysScreeningTableData = [];
    this.ageDaysDiagnosisTableData = [];
  }

  isTotalRow(row: any): boolean {
    if (!row) {
      return false;
    }

    return (
      row.ageGroup === 'סה"כ' ||
      row.parameter === 'סה"כ'
    );
  }

  private toNumber(value: any): number {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return 0;
    }

    const numberValue = Number(
      String(value)
        .replace(/,/g, '')
        .replace('%', '')
        .trim()
    );

    return isNaN(numberValue) ? 0 : numberValue;
  }

  applyFilter(): void {
    this.search();
  }

  exportToExcel(): void {
    this.exportAllTables();
  }

  exportAllTables(): void {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([]);

    let rowOffset = 0;

    const addSection = (
      title: string,
      headers: string[],
      data: any[],
      columns: string[]
    ) => {
      XLSX.utils.sheet_add_aoa(
        ws,
        [[title]],
        { origin: { r: rowOffset, c: 0 } }
      );

      rowOffset++;

      XLSX.utils.sheet_add_aoa(
        ws,
        [headers],
        { origin: { r: rowOffset, c: 0 } }
      );

      rowOffset++;

      const rows = data.map(row =>
        columns.map(column => row[column])
      );

      if (rows.length > 0) {
        XLSX.utils.sheet_add_aoa(
          ws,
          rows,
          { origin: { r: rowOffset, c: 0 } }
        );
      }

      rowOffset += rows.length + 2;
    };

    addSection(
      '1. סיקור דליריום וטיפול בו',
      ['מספר', 'מדד', 'סה"כ'],
      this.summaryTableData,
      ['rowNumber', 'parameter', 'value']
    );

    addSection(
      '2. סיקור, אבחון וטיפול בדליריום לפי מין וגיל',
      [
        'גיל / מין',
        'סה"כ מאושפזים - זכר',
        'סה"כ מאושפזים - נקבה',
        'עברו סיקור - זכר',
        'עברו סיקור - נקבה',
        'אובחנו עם דליריום - זכר',
        'אובחנו עם דליריום - נקבה',
        'טיפול לא-תרופתי - זכר',
        'טיפול לא-תרופתי - נקבה'
      ],
      this.ageGenderTableData,
      [
        'ageGroup',
        'totalMale',
        'totalFemale',
        'screenedMale',
        'screenedFemale',
        'diagnosedMale',
        'diagnosedFemale',
        'nonPharmMale',
        'nonPharmFemale'
      ]
    );

    addSection(
      '3. סיקור דליריום לפי גיל ומשך האשפוז',
      [
        'גיל / משך אשפוז',
        'סה"כ עד 3 ימים',
        'סה"כ 4-5 ימים',
        'סה"כ 6 ימים ומעלה',
        'סיקור עד 3 ימים',
        'סיקור 4-5 ימים',
        'סיקור 6 ימים ומעלה'
      ],
      this.ageDaysScreeningTableData,
      [
        'ageGroup',
        'totalUpTo3',
        'total4to5',
        'total6Plus',
        'screenedUpTo3',
        'screened4to5',
        'screened6Plus'
      ]
    );

    addSection(
      '4. אבחון וטיפול לא-תרופתי בדליריום לפי גיל ומשך האשפוז',
      [
        'גיל / משך אשפוז',
        'אובחנו עד 3 ימים',
        'אובחנו 4-5 ימים',
        'אובחנו 6 ימים ומעלה',
        'טיפול לא-תרופתי עד 3 ימים',
        'טיפול לא-תרופתי 4-5 ימים',
        'טיפול לא-תרופתי 6 ימים ומעלה'
      ],
      this.ageDaysDiagnosisTableData,
      [
        'ageGroup',
        'diagnosedUpTo3',
        'diagnosed4to5',
        'diagnosed6Plus',
        'nonPharmUpTo3',
        'nonPharm4to5',
        'nonPharm6Plus'
      ]
    );

    ws['!dir'] = 'rtl';

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      'דו״ח דליריום'
    );

    XLSX.writeFile(
      wb,
      'DeliriumSummary.xlsx'
    );
  }
}
