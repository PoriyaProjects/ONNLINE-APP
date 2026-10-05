import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

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

interface DeliriumGeriatricConsultRow {
  Total_Patients_With_Consult?: number | string;
  Total_Consultations?: number | string;
  Consultations_By_Geriatric_Doctors?: number | string;
  Column4?: number | string;
}

interface DeliriumSummaryResponse {
  Summary?: DeliriumSummaryRow[];
  AgeGender?: DeliriumAgeGenderRow[];
  AgeDaysScreening?: DeliriumAgeDaysScreeningRow[];
  AgeDaysDiagnosis?: DeliriumAgeDaysDiagnosisRow[];
  GeriatricConsult?: DeliriumGeriatricConsultRow[];
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
  geriatricConsultTableData: any[] = [];

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

  get years(): FilterOption[] {
    return this.availableYears;
  }

  get quarters(): FilterOption[] {
    return this.availableQuarters;
  }

  private backendData: DeliriumSummaryResponse | null = null;

  private readonly EXPORT_TEMPLATE_URL = 'assets/templates/DeliriumSummaryAH.xlsx';
  private readonly EXPORT_SHEET_NAME = 'יעדים 3+4';

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.initializeFilters();
    this.isLoading = false;
  }

  private initializeFilters(): void {
    const currentYear = new Date().getFullYear();

    this.availableYears = [
      {
        value: null,
        label: 'ללא'
      },
      {
        value: -1,
        label: 'הכל'
      }
    ];

    for (
      let year = currentYear;
      year >= currentYear - 6;
      year--
    ) {
      this.availableYears.push({
        value: year,
        label: year.toString()
      });
    }

    this.availableQuarters = [
      {
        value: null,
        label: 'ללא'
      },
      {
        value: -1,
        label: 'הכל'
      },
      {
        value: 1,
        label: QUARTER_LABELS[1]
      },
      {
        value: 2,
        label: QUARTER_LABELS[2]
      },
      {
        value: 3,
        label: QUARTER_LABELS[3]
      },
      {
        value: 4,
        label: QUARTER_LABELS[4]
      }
    ];

    this.selectedYear = -1;
    this.selectedQuarter = -1;
  }

  onYearChange(): void {

    if (this.selectedYear === null) {
      this.selectedQuarter = null;
      return;
    }

    if (
      this.selectedQuarter === null ||
      this.selectedQuarter === undefined
    ) {
      this.selectedQuarter = -1;
    }
  }

  canSearch(): boolean {

    const hasDateRange =
      !!this.dateFrom &&
      !!this.dateTo;

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

      const startDate = new Date(
        year,
        startMonth,
        1
      );

      const endDate = new Date(
        year,
        startMonth + 3,
        0
      );

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

    console.log(
      'DeliriumSummary request:',
      requestBody
    );

    this.isLoading = true;

    this.http
      .post(
        environment.url + 'fetchMitavDeliriumSummary',
        requestBody
      )
      .subscribe(
        (response: any) => {

          console.log(
            'DeliriumSummary response:',
            response
          );

          const parsed =
            this.parseBackendResponse(response);

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

  private formatDateForApi(
    date: Date | null
  ): string | null {

    if (!date) {
      return null;
    }

    const year =
      date.getFullYear();

    const month =
      String(date.getMonth() + 1)
        .padStart(2, '0');

    const day =
      String(date.getDate())
        .padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private parseBackendResponse(
    response: any
  ): DeliriumSummaryResponse | null {

    let payload =
      response &&
        response.d !== undefined
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

    if (
      !payload ||
      typeof payload !== 'object'
    ) {

      console.error(
        'DeliriumSummary: invalid response object.'
      );

      return null;
    }

    if (
      payload.Delirium_MitavDeliriumSummary &&
      typeof payload.Delirium_MitavDeliriumSummary === 'object'
    ) {

      payload =
        payload.Delirium_MitavDeliriumSummary;
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
    this.mapGeriatricConsultTable(data);
  }

  private mapSummaryTable(
    data: DeliriumSummaryResponse
  ): void {

    const source =
      data.Summary || [];

    this.summaryTableData =
      source.map(row => ({

        rowNumber:
          row.RowNumber ?? '',

        parameter:
          row.Description || '',

        value:
          this.toNumber(row.Total)

      }));
  }

  private mapAgeGenderTable(
    data: DeliriumSummaryResponse
  ): void {

    const source =
      data.AgeGender || [];

    this.ageGenderTableData =
      source.map(row => ({

        ageGroup:
          row.Age_Group || '',

        totalMale:
          this.toNumber(row.Total_Male),

        totalFemale:
          this.toNumber(row.Total_Female),

        screenedMale:
          this.toNumber(row.Screened_Male),

        screenedFemale:
          this.toNumber(row.Screened_Female),

        diagnosedMale:
          this.toNumber(row.Diagnosed_Male),

        diagnosedFemale:
          this.toNumber(row.Diagnosed_Female),

        nonPharmMale:
          this.toNumber(row.NonDrug_Male),

        nonPharmFemale:
          this.toNumber(row.NonDrug_Female)

      }));
  }

  private mapAgeDaysScreeningTable(
    data: DeliriumSummaryResponse
  ): void {

    const source =
      data.AgeDaysScreening || [];

    this.ageDaysScreeningTableData =
      source.map(row => ({

        ageGroup:
          row.Age_Group || '',

        totalUpTo3:
          this.toNumber(row.Total_UpTo3),

        total4to5:
          this.toNumber(row.Total_4_5),

        total6Plus:
          this.toNumber(row.Total_6Plus),

        screenedUpTo3:
          this.toNumber(row.Screened_UpTo3),

        screened4to5:
          this.toNumber(row.Screened_4_5),

        screened6Plus:
          this.toNumber(row.Screened_6Plus)

      }));
  }

  private mapAgeDaysDiagnosisTable(
    data: DeliriumSummaryResponse
  ): void {

    const source =
      data.AgeDaysDiagnosis || [];

    this.ageDaysDiagnosisTableData =
      source.map(row => ({

        ageGroup:
          row.Age_Group || '',

        diagnosedUpTo3:
          this.toNumber(row.Diagnosed_UpTo3),

        diagnosed4to5:
          this.toNumber(row.Diagnosed_4_5),

        diagnosed6Plus:
          this.toNumber(row.Diagnosed_6Plus),

        nonPharmUpTo3:
          this.toNumber(row.NonDrug_UpTo3),

        nonPharm4to5:
          this.toNumber(row.NonDrug_4_5),

        nonPharm6Plus:
          this.toNumber(row.NonDrug_6Plus)

      }));
  }

  private mapGeriatricConsultTable(
    data: DeliriumSummaryResponse
  ): void {

    const source =
      data.GeriatricConsult || [];

    this.geriatricConsultTableData =
      source.map(row => ({
        totalPatientsWithConsult:
          this.toNumber(row.Total_Patients_With_Consult),

        totalConsultations:
          this.toNumber(row.Total_Consultations),

        consultationsByGeriatricDoctors:
          this.toNumber(row.Consultations_By_Geriatric_Doctors),

        column4:
          this.toNumber(row.Column4)
      }));
  }

  private clearTables(): void {

    this.summaryTableData = [];
    this.ageGenderTableData = [];
    this.ageDaysScreeningTableData = [];
    this.ageDaysDiagnosisTableData = [];
    this.geriatricConsultTableData = [];
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

  private toNumber(
    value: any
  ): number {

    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return 0;
    }

    const numberValue =
      Number(
        String(value)
          .replace(/,/g, '')
          .replace('%', '')
          .trim()
      );

    return isNaN(numberValue)
      ? 0
      : numberValue;
  }

  getSummaryValue(index: number): number {

    const row =
      this.summaryTableData[index];

    return row
      ? row.value
      : 0;
  }

  applyFilter(): void {
    this.search();
  }

  exportToExcel(): void {
    this.exportAllTables();
  }

  /**
   * Loads the ORIGINAL template workbook, writes the Delirium results into
   * the existing worksheet "יעדים 3+4" and downloads the modified workbook.
   */
  async exportAllTables(): Promise<void> {
    try {
      console.log('DeliriumSummary export: template-based ExcelJS version');

      if (!this.summaryTableData.length) {
        alert('אין נתונים לייצוא. יש לבצע חיפוש תחילה.');
        return;
      }

      const response = await fetch(this.EXPORT_TEMPLATE_URL);

      if (!response.ok) {
        throw new Error(
          `Failed to load Excel template: ${response.status} ${response.statusText}`
        );
      }

      const buffer = await response.arrayBuffer();

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const ws = workbook.getWorksheet(this.EXPORT_SHEET_NAME);

      if (!ws) {
        throw new Error(
          `Worksheet "${this.EXPORT_SHEET_NAME}" was not found in the template.`
        );
      }

      const put = (address: string, value: any): void => {
        ws.getCell(address).value = this.toNumber(value);
      };

      const resolveRow = (
        ageGroup: any,
        row75: number,
        row85: number
      ): number | null => {
        const g = String(ageGroup || '').replace(/\s/g, '');
        if (g.indexOf('75') === 0) { return row75; }
        if (g.indexOf('85') === 0) { return row85; }
        return null;
      };

      // SECTION 1 - D6:D11 (B:C are merged description cells)
      this.summaryTableData.slice(0, 6).forEach((row: any, i: number) => {
        put(`D${6 + i}`, row.value);
      });

      // SECTION 2 - C17:J18
      this.ageGenderTableData.forEach((row: any) => {
        const r = resolveRow(row.ageGroup, 17, 18);
        if (r === null) { return; }
        put(`C${r}`, row.totalMale);
        put(`D${r}`, row.totalFemale);
        put(`E${r}`, row.screenedMale);
        put(`F${r}`, row.screenedFemale);
        put(`G${r}`, row.diagnosedMale);
        put(`H${r}`, row.diagnosedFemale);
        put(`I${r}`, row.nonPharmMale);
        put(`J${r}`, row.nonPharmFemale);
      });

      // SECTION 3A - C24:H25
      this.ageDaysScreeningTableData.forEach((row: any) => {
        const r = resolveRow(row.ageGroup, 24, 25);
        if (r === null) { return; }
        put(`C${r}`, row.totalUpTo3);
        put(`D${r}`, row.total4to5);
        put(`E${r}`, row.total6Plus);
        put(`F${r}`, row.screenedUpTo3);
        put(`G${r}`, row.screened4to5);
        put(`H${r}`, row.screened6Plus);
      });

      // SECTION 3B - C31:H32
      this.ageDaysDiagnosisTableData.forEach((row: any) => {
        const r = resolveRow(row.ageGroup, 31, 32);
        if (r === null) { return; }
        put(`C${r}`, row.diagnosedUpTo3);
        put(`D${r}`, row.diagnosed4to5);
        put(`E${r}`, row.diagnosed6Plus);
        put(`F${r}`, row.nonPharmUpTo3);
        put(`G${r}`, row.nonPharm4to5);
        put(`H${r}`, row.nonPharm6Plus);
      });

      // SECTION 4 - B37:E37
      // geriatricConsultTableData exists in this component and is filled from
      // the API's GeriatricConsult dataset. Written only if a row was returned.
      const consult = this.geriatricConsultTableData[0];
      if (consult) {
        put('B37', consult.totalPatientsWithConsult);
        put('C37', consult.totalConsultations);
        put('D37', consult.consultationsByGeriatricDoctors);
        put('E37', consult.column4);
      }

      // TOTAL ROWS (19 / 26 / 33): the template's SUM formulas are preserved;
      // only their cached results are refreshed.
      const refreshTotals = (
        first: number,
        last: number,
        total: number,
        cols: number
      ): void => {
        for (let col = 3; col < 3 + cols; col++) {
          const cell = ws.getCell(total, col);
          const v: any = cell.value;
          // Regular formulas have `formula`; the template also uses shared
          // formulas (`sharedFormula`). Keep either one, refresh only `result`.
          if (v && typeof v === 'object' && (v.formula || v.sharedFormula)) {
            let sum = 0;
            for (let r = first; r <= last; r++) {
              sum += this.toNumber(ws.getCell(r, col).value);
            }
            cell.value = Object.assign({}, v, { result: sum }) as ExcelJS.CellValue;
          }
        }
      };

      refreshTotals(17, 18, 19, 8);   // C19:J19
      refreshTotals(24, 25, 26, 6);   // C26:H26
      refreshTotals(31, 32, 33, 6);   // C33:H33

      const output = await workbook.xlsx.writeBuffer();

      const blob = new Blob(
        [output],
        {
          type:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      );

      saveAs(blob, 'DeliriumSummary.xlsx');

    } catch (error) {
      console.error(
        'DeliriumSummary Excel export error:',
        error
      );

      alert(
        'אירעה שגיאה בייצוא קובץ Excel.'
      );
    }
  }
}