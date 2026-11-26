import { Component, OnInit } from '@angular/core';
import * as XLSX from 'xlsx';
import { PhysicianEvaluationService, UploadRow } from './physician-evaluation.service';

@Component({
  selector: 'app-physician-evaluation-upload',
  templateUrl: './physician-evaluation-upload.component.html',
  styleUrls: ['./physician-evaluation-upload.component.scss']
})
export class PhysicianEvaluationUploadComponent implements OnInit {
  loading = true;
  saving = false;
  canManual = false;
  canOvertime = false;
  fileKind: 'manual' | 'overtime' = 'manual';
  year = new Date().getFullYear();
  years: number[] = [];
  fileName = '';
  rows: UploadRow[] = [];
  errors: string[] = [];
  preview: UploadRow[] = [];
  successMessage = '';
  savedCount = 0;

  constructor(private api: PhysicianEvaluationService) {
    const now = new Date().getFullYear();
    for (let y = now; y >= now - 4; y--) {
      this.years.push(y);
    }
  }

  ngOnInit(): void {
    this.api.getDepartments().subscribe(data => {
      const home = data || ({} as any);
      this.canManual = !!home.CanUploadManualReports;
      this.canOvertime = !!home.CanUploadOvertime;
      if (this.canManual) {
        this.fileKind = 'manual';
      } else if (this.canOvertime) {
        this.fileKind = 'overtime';
      }
      this.loading = false;
    }, () => {
      this.loading = false;
    });
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    this.rows = [];
    this.errors = [];
    this.preview = [];
    this.fileName = '';
    this.successMessage = '';
    this.savedCount = 0;
    if (!file) {
      return;
    }
    const name = file.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      this.errors = ['יש לבחור קובץ Excel בפורמט xlsx או xls'];
      return;
    }
    this.fileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const workbook = XLSX.read(reader.result, { type: 'array', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
        const parsed = this.parseMatrix(matrix);
        this.rows = parsed.rows;
        this.errors = parsed.errors;
        this.preview = this.rows.slice(0, 8);
      } catch (e) {
        this.errors = ['לא ניתן לקרוא את קובץ האקסל'];
      }
    };
    reader.readAsArrayBuffer(file);
  }

  save(): void {
    if (this.errors.length || !this.rows.length || this.saving) {
      return;
    }
    const request = this.fileKind === 'overtime'
      ? this.api.saveOvertime(this.rows, this.fileName)
      : this.api.saveManualReports(this.rows, this.fileName);
    this.saving = true;
    this.successMessage = '';
    this.savedCount = 0;
    request.subscribe(result => {
      this.saving = false;
      if (result && result.Success) {
        this.savedCount = result.SavedCount || this.rows.length;
        this.successMessage = result.Message || 'הקובץ נשמר';
        this.rows = [];
        this.preview = [];
        this.fileName = '';
      } else {
        this.errors = [result && result.Message ? result.Message : 'השמירה נכשלה'];
      }
    }, () => {
      this.saving = false;
      this.errors = ['השמירה נכשלה'];
    });
  }

  private parseMatrix(matrix: any[][]): { rows: UploadRow[]; errors: string[] } {
    const errors: string[] = [];
    const rows: UploadRow[] = [];
    if (!matrix || matrix.length < 2) {
      return { rows: [], errors: ['הקובץ לא מכיל שורות נתונים'] };
    }
    const header = (matrix[0] || []).map(cell => this.norm(cell));
    const employeeCol = this.findCol(header, ['employeeid', 'מספרעובד', 'תעודתזהות', 'תז', 'קודעובד']);
    const yearCol = this.findCol(header, ['year', 'שנה']);
    const monthCol = this.findCol(header, ['month', 'חודש']);
    const valueNames = this.fileKind === 'overtime'
      ? ['hours', 'שעות', 'שעותנוספות']
      : ['count', 'כמות', 'דיווחים', 'דיווחיםידניים'];
    const valueCol = this.findCol(header, valueNames);
    if (employeeCol < 0 || monthCol < 0 || valueCol < 0) {
      const valueLabel = this.fileKind === 'overtime' ? 'שעות' : 'כמות';
      return { rows: [], errors: ['חסרות עמודות. נדרש: מספר עובד, חודש, ' + valueLabel + '. שנה יכולה להיות בעמודה או בבחירה למעלה.'] };
    }
    const seen = {};
    for (let i = 1; i < matrix.length; i++) {
      const line = matrix[i] || [];
      const employee = this.cellText(line[employeeCol]);
      const monthCell = line[monthCol];
      const valueCell = line[valueCol];
      const blank = !employee && (monthCell === '' || monthCell == null) && (valueCell === '' || valueCell == null);
      if (blank) {
        continue;
      }
      const rowNo = i + 1;
      if (!employee) {
        errors.push('שורה ' + rowNo + ': חסר מספר עובד');
        continue;
      }
      let rowYear = yearCol >= 0 ? this.asYear(line[yearCol]) : this.year;
      let rowMonth = this.asMonth(monthCell);
      if (monthCell instanceof Date) {
        rowMonth = monthCell.getMonth() + 1;
        if (yearCol < 0) {
          rowYear = monthCell.getFullYear();
        }
      }
      if (!rowYear) {
        errors.push('שורה ' + rowNo + ': חסרה שנה');
        continue;
      }
      if (!rowMonth) {
        errors.push('שורה ' + rowNo + ': חודש לא תקין');
        continue;
      }
      const value = this.asNumber(valueCell);
      if (value == null || value < 0) {
        errors.push('שורה ' + rowNo + ': ערך לא תקין');
        continue;
      }
      if (this.fileKind === 'manual' && Math.abs(value - Math.round(value)) > 0.001) {
        errors.push('שורה ' + rowNo + ': כמות חייבת להיות מספר שלם');
        continue;
      }
      const key = employee + '|' + rowYear + '|' + rowMonth;
      if (seen[key]) {
        errors.push('שורה ' + rowNo + ': כפילות לאותו עובד, שנה וחודש');
        continue;
      }
      seen[key] = true;
      rows.push({ EmployeeID: employee, Year: rowYear, Month: rowMonth, Value: value });
    }
    if (!rows.length && !errors.length) {
      errors.push('הקובץ לא מכיל שורות נתונים');
    }
    return { rows: errors.length ? [] : rows, errors: errors.slice(0, 15) };
  }

  private findCol(header: string[], names: string[]): number {
    for (let i = 0; i < header.length; i++) {
      if (names.indexOf(header[i]) >= 0) {
        return i;
      }
    }
    return -1;
  }

  private norm(value: any): string {
    return this.cellText(value).replace(/\s+/g, '').replace(/["']/g, '').toLowerCase();
  }

  private cellText(value: any): string {
    if (value == null) {
      return '';
    }
    if (typeof value === 'number') {
      return String(Math.trunc(value));
    }
    if (value instanceof Date) {
      return '';
    }
    return String(value).trim();
  }

  private asYear(value: any): number {
    if (value instanceof Date) {
      return value.getFullYear();
    }
    const year = parseInt(this.cellText(value), 10);
    if (year >= 2000 && year <= 2100) {
      return year;
    }
    return 0;
  }

  private asMonth(value: any): number {
    if (value instanceof Date) {
      return value.getMonth() + 1;
    }
    const text = this.norm(value);
    const names = {
      '1': 1, '01': 1, 'ינו': 1, 'ינואר': 1,
      '2': 2, '02': 2, 'פבר': 2, 'פברואר': 2,
      '3': 3, '03': 3, 'מרץ': 3,
      '4': 4, '04': 4, 'אפר': 4, 'אפריל': 4,
      '5': 5, '05': 5, 'מאי': 5,
      '6': 6, '06': 6, 'יוני': 6,
      '7': 7, '07': 7, 'יולי': 7,
      '8': 8, '08': 8, 'אוג': 8, 'אוגוסט': 8,
      '9': 9, '09': 9, 'ספט': 9, 'ספטמבר': 9,
      '10': 10, 'אוק': 10, 'אוקטובר': 10,
      '11': 11, 'נוב': 11, 'נובמבר': 11,
      '12': 12, 'דצמ': 12, 'דצמבר': 12
    };
    if (names[text]) {
      return names[text];
    }
    const month = parseInt(text, 10);
    if (month >= 1 && month <= 12) {
      return month;
    }
    return 0;
  }

  resetParse(input?: HTMLInputElement): void {
    this.rows = [];
    this.preview = [];
    this.errors = [];
    this.fileName = '';
    this.successMessage = '';
    this.savedCount = 0;
    if (input) {
      input.value = '';
    }
  }

  private asNumber(value: any): number | null {
    if (typeof value === 'number') {
      return value;
    }
    const text = String(value == null ? '' : value).trim().replace(',', '.');
    if (!text) {
      return null;
    }
    const num = Number(text);
    if (isNaN(num)) {
      return null;
    }
    return num;
  }
}
