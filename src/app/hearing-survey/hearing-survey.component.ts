import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable, Subject, throwError } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, takeUntil } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface HearingCounts {
  A: number; C: number; D: number; E: number; F: number; G: number; H: number;
  I: number; J: number; K: number; L: number; M: number; O: number; P: number; Q: number;
  B?: number; N?: number;
}

interface HearingDetail {
  type: string;
  caseNumber: string;
}

interface HearingDetailsViewModel {
  byType: Record<string, HearingDetail[]>;
  columnOrder: string[];
}

interface TableRow {
  index: number;
  description: string;
  totalKey: keyof HearingCounts;
  splitKeys?: { key: keyof HearingCounts; label: string }[];
}

export interface HearingCaseNumbersDialogData {
  type: string;
  caseNumbers: string[];
}

function buildGetHearingDetailsUrl(baseUrl: string): string {
  const t = (baseUrl || '').trim().replace(/\/?$/, '');
  if (!t) {
    return '';
  }
  if (/WebService\.asmx$/i.test(t)) {
    return `${t}/GetHearingDetails`;
  }
  return `${t}/WebService.asmx/GetHearingDetails`;
}

function unwrapAsmxJsonBody(body: any): any {
  if (body == null) {
    return body;
  }
  let x = body;
  if (typeof x === 'object' && x !== null && Object.prototype.hasOwnProperty.call(x, 'd')) {
    x = x.d;
  }
  if (typeof x === 'string') {
    const s = x.trim();
    return s ? JSON.parse(s) : null;
  }
  return x;
}

function normalizeDetail(raw: any): HearingDetail {
  return {
    type: String(raw?.Type ?? raw?.type ?? '').trim(),
    caseNumber: String(raw?.CaseNumber ?? raw?.caseNumber ?? '').trim()
  };
}

function parseGetHearingDetailsPayload(raw: any): HearingDetailsViewModel {
  const byType: Record<string, HearingDetail[]> = {};
  const byTypeArr = raw?.ByType ?? raw?.byType;
  if (Array.isArray(byTypeArr)) {
    for (const entry of byTypeArr) {
      const typeKey = String(entry?.Type ?? entry?.type ?? '').trim().toUpperCase();
      const details = entry?.Details ?? entry?.details ?? [];
      const rows = Array.isArray(details) ? details.map(normalizeDetail) : [];
      if (typeKey) {
        byType[typeKey] = rows;
      }
    }
  }
  const order = raw?.ColumnOrder ?? raw?.columnOrder;
  const columnOrder = Array.isArray(order)
    ? order.map((x: any) => String(x).trim().toUpperCase())
    : Object.keys(byType);
  return { byType, columnOrder };
}

function httpErrorMessage(err: HttpErrorResponse): string {
  const e = err.error;
  if (e && typeof e === 'object' && (e as any).Message) {
    return String((e as any).Message);
  }
  return err.message || `HTTP ${err.status}`;
}

@Component({
  selector: 'app-hearing-case-numbers-dialog',
  template: `
    <h2 mat-dialog-title>סוג {{ data.type }} — מספרי תיק ({{ filtered.length }})</h2>
    <mat-dialog-content class="hcn-body">
      <mat-form-field appearance="outline" class="hcn-search">
        <mat-label>חיפוש מזהה</mat-label>
        <input matInput [(ngModel)]="searchInput" (ngModelChange)="onSearchChange($event)" autocomplete="off">
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>
      <div class="hcn-list-wrap">
        <ul class="hcn-list">
          <li *ngFor="let id of filtered">{{ id }}</li>
        </ul>
        <div *ngIf="!filtered.length" class="hcn-empty">אין תוצאות</div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close()">סגור</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .hcn-body { min-width: min(92vw, 420px); max-width: 520px; padding-top: 8px; }
    .hcn-search { width: 100%; margin-bottom: 8px; }
    .hcn-list-wrap {
      max-height: min(60vh, 420px);
      overflow: auto;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background: #fafafa;
    }
    .hcn-list { list-style: none; margin: 0; padding: 8px 12px; }
    .hcn-list li {
      padding: 6px 4px;
      border-bottom: 1px solid #eee;
      font-family: Tahoma, Arial, sans-serif;
      font-size: 14px;
    }
    .hcn-list li:last-child { border-bottom: none; }
    .hcn-empty { padding: 24px; text-align: center; color: #757575; }
  `]
})
export class HearingCaseNumbersDialogComponent implements OnInit, OnDestroy {
  searchInput = '';
  filtered: string[] = [];
  private readonly search$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    public dialogRef: MatDialogRef<HearingCaseNumbersDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: HearingCaseNumbersDialogData
  ) {
    this.filtered = [...(data.caseNumbers || [])];
  }

  ngOnInit(): void {
    this.search$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(term => this.applyFilter(term));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(value: string): void {
    this.search$.next((value || '').trim());
  }

  private applyFilter(term: string): void {
    const list = this.data.caseNumbers || [];
    if (!term) {
      this.filtered = [...list];
      return;
    }
    const t = term.toLowerCase();
    this.filtered = list.filter(id => id.toLowerCase().includes(t));
  }

  close(): void {
    this.dialogRef.close();
  }
}

@Component({
  selector: 'app-hearing-survey',
  templateUrl: './hearing-survey.component.html',
  styleUrls: ['./hearing-survey.component.css']
})
export class HearingSurveyComponent implements OnInit {
  startDate: string = '';
  endDate: string = '';
  loading = false;
  error: string | null = null;
  counts: HearingCounts | null = null;
  details: HearingDetailsViewModel | null = null;
  detailsError: string | null = null;

  readonly tableRows: TableRow[] = [
    {
      index: 1,
      description: "מס' היילודים ששוחררו מבית החולים. (אם לא ניתן לספק נתון זה, אנא ציינו מספר לידות חי)",
      totalKey: 'A',
    },
    {
      index: 3,
      description: "מס' היילודים ששוחררו ונבדקו בפרוטוקול סינון",
      totalKey: 'C',
      splitKeys: [
        { key: 'D', label: 'D' },
        { key: 'E', label: 'E' },
        { key: 'F', label: 'F' },
      ],
    },
    {
      index: 4,
      description: "מס' היילודים שעשו בדיקה במסגרת האשפוז, וקיבלו אבחנה ולא השלימו",
      totalKey: 'G',
    },
    {
      index: 5,
      description: "מס' היילודים ששוחררו ללא בדיקות סינון כלל",
      totalKey: 'H',
    },
    {
      index: 6,
      description: "סכום האבחנות 796.61/796.62/796.63 מקבוצה 1 (האבחנה החדשה ביותר)",
      totalKey: 'I',
      splitKeys: [
        { key: 'K', label: '796.61' },
        { key: 'L', label: '796.62' },
        { key: 'M', label: '796.63' },
      ],
    },
    {
      index: 16,
      description: "מספר היילודים שהופנו ל-AABR בגלל כישלון בבדיקת OAE",
      totalKey: 'J',
      splitKeys: [
        { key: 'O', label: '796.64' },
        { key: 'P', label: '796.65' },
        { key: 'Q', label: '796.66' },
      ],
    },
  ];

  readonly splitColumnKeys = ['D', 'E', 'F', 'K', 'L', 'M', 'O', 'P', 'Q'] as const;

  private readonly webServiceBase: string;

  constructor(private http: HttpClient, private dialog: MatDialog) {
    this.webServiceBase = (environment.hearingDetailsAsmxBase || environment.url || '').trim();
  }

  ngOnInit(): void { }

  runSurvey() {
    if (!this.startDate || !this.endDate) {
      this.error = 'יש לבחור תאריכים';
      return;
    }
    this.loading = true;
    this.error = null;
    this.detailsError = null;
    this.counts = null;
    this.details = null;

    let pending = 2;
    const finishOne = () => {
      pending--;
      if (pending <= 0) {
        this.loading = false;
      }
    };

    this.getCounts(this.startDate, this.endDate).then(
      data => {
        this.counts = data;
        finishOne();
      },
      err => {
        this.error = typeof err === 'string' ? err : (err?.message || 'Unknown error');
        finishOne();
      }
    );

    this.getHearingDetails(this.startDate, this.endDate).subscribe(
      data => {
        this.details = data;
        finishOne();
      },
      err => {
        this.detailsError = typeof err === 'string' ? err : 'שגיאה בטעינת פירוט מקרים';
        finishOne();
      }
    );
  }

  /** GET `{BASE}/WebService.asmx/GetHearingDetails` — JSON, optional `{ d: ... }`. */
  private getHearingDetails(dateIn: string, dateOut: string): Observable<HearingDetailsViewModel> {
    const url = buildGetHearingDetailsUrl(this.webServiceBase);
    if (!url) {
      return throwError('Missing WebService base URL');
    }
    const params = new HttpParams().set('dateIn', dateIn).set('dateOut', dateOut);
    return this.http.get(url, { params, responseType: 'text' }).pipe(
      map(text => {
        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new Error('GetHearingDetails: invalid JSON');
        }
        const inner = unwrapAsmxJsonBody(parsed);
        if (inner == null) {
          throw new Error('GetHearingDetails: empty payload');
        }
        return parseGetHearingDetailsPayload(inner);
      }),
      catchError((err: HttpErrorResponse | Error) => {
        if (err instanceof HttpErrorResponse) {
          return throwError(httpErrorMessage(err));
        }
        return throwError(err.message || String(err));
      })
    );
  }

  countForType(letter: string): number {
    const rows = this.details?.byType?.[letter];
    return rows ? rows.length : 0;
  }

  openTypeDetails(letter: string): void {
    if (!this.details) {
      return;
    }
    const rows = this.details.byType[letter] || [];
    const caseNumbers = rows.map(r => r.caseNumber);
    this.dialog.open(HearingCaseNumbersDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { type: letter, caseNumbers }
    });
  }

  getCounts(dateIn: string, dateOut: string): Promise<HearingCounts> {
    const params = new HttpParams().set('dateIn', dateIn).set('dateOut', dateOut);
    const baseUrl = environment.url || '/WebService.asmx/';
    const url = baseUrl.replace(/\/?$/, '/') + 'GetHearingCounts';
    return this.http.get(url, { params, responseType: 'text' }).toPromise().then(xml => this.parseHearingCountsXml(xml));
  }

  parseHearingCountsXml(xml: string): HearingCounts {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'application/xml');
      const ns = 'http://tempuri.org/';
      const getVal = (tag: string) => {
        const el = doc.getElementsByTagNameNS(ns, tag)[0];
        return el && el.textContent ? parseInt(el.textContent, 10) : 0;
      };
      return {
        A: getVal('A'),
        C: getVal('C'),
        D: getVal('D'),
        E: getVal('E'),
        F: getVal('F'),
        G: getVal('G'),
        H: getVal('H'),
        I: getVal('I'),
        J: getVal('J'),
        K: getVal('K'),
        L: getVal('L'),
        M: getVal('M'),
        O: getVal('O'),
        P: getVal('P'),
        Q: getVal('Q'),
        B: getVal('B'),
        N: getVal('N'),
      };
    } catch (e) {
      throw new Error('Failed to parse HearingCounts XML: ' + e);
    }
  }

  getSplitValue(row: TableRow, key: keyof HearingCounts): number | '' {
    if (!row.splitKeys?.some(s => s.key === key)) return '';
    return this.counts ? this.counts[key] || 0 : 0;
  }
}
