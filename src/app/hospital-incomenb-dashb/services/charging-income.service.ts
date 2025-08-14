import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ChargingIncomeResponse,
  ChargingIncomeRow,
  YearTotal
} from '../services/charging-income.models';
import { environment } from 'src/environments/environment';

export type IncomeKind = 'combined' | 'govrament' | 'tagid' | 'other' | 'bySource';

export const INCOME_KIND_LABEL: Record<Exclude<IncomeKind, 'bySource'>, string> = {
  combined: 'סה״כ',
  govrament: 'מדינה',
  tagid: 'תאגיד',
  other: 'אחר'
};

@Injectable({ providedIn: 'root' })
export class ChargingIncomeService {
  constructor(private http: HttpClient) {}

  private getChargingIncomeUrl(): string {
    const base = (environment.url || '').replace(/\/+$/, '');
    return `${base}/GetChargingIncome`;
  }

  getChargingIncome(opts: {
    groupId?: number;
    deptId?: number;
    incomeCategory?: 'totalCharging' | 'totalGovrament' | 'totalTagid' | 'totalOther';
    fromYear?: number;
    toYear?: number;
    isYtd?: boolean;
  } = {}): Observable<ChargingIncomeResponse> {
    let params = new HttpParams();
    if (opts.groupId != null) params = params.set('groupId', String(opts.groupId));
    if (opts.deptId  != null) params = params.set('deptId',  String(opts.deptId));
    params = params.set('incomeCategory', opts.incomeCategory || 'totalCharging');
    if (opts.fromYear != null) params = params.set('fromYear', String(opts.fromYear));
    if (opts.toYear   != null) params = params.set('toYear',   String(opts.toYear));
    if (opts.isYtd    != null) params = params.set('isYtd',    String(opts.isYtd));
    return this.http.get<ChargingIncomeResponse>(this.getChargingIncomeUrl(), { params });
  }

  // ---------- combined helpers ----------
  toByYearTable(byYear: YearTotal[]): any[] {
    const table: any[] = [['שנה', 'סה"כ הכנסות']];
    byYear.forEach(y => table.push([String(y.year), y.totalCharging || 0]));
    return table;
  }

  toDeptTable(rows: ChargingIncomeRow[], year: number): any[] {
    const header = ['מחלקה', 'הכנסות', 'שינוי', 'שינוי %'];
    const body = rows
      .filter(r => r.year === year)
      .map(r => [
        r.deptName,
        r.totalCharging || 0,
        r.chargingDiff == null ? 0 : r.chargingDiff,
        this.formatPercent(r.chargingPct)
      ]);
    body.sort((a, b) => (b[1] as number) - (a[1] as number));
    return [header, ...body];
  }

  toDeptPie(rows: ChargingIncomeRow[], year: number): any[] {
    const header = ['מחלקה', 'חלק'];
    const body: [string, number][] = rows
      .filter(r => r.year === year)
      .map(r => [r.deptName, r.totalCharging || 0] as [string, number])
      .filter(r => r[1] > 0);
    return [header, ...body];
  }

  toGroupsBarLatestYear(rows: ChargingIncomeRow[]): any[] {
    if (!rows.length) return [['קבוצה', 'הכנסות']];
    const latestYear = Math.max(...rows.map(r => r.year));
    const byGroup = new Map<string, number>();
    rows.filter(r => r.year === latestYear).forEach(r => {
      byGroup.set(r.groupName, (byGroup.get(r.groupName) || 0) + (r.totalCharging || 0));
    });
    const table: any[] = [['קבוצה', 'הכנסות']];
    Array.from(byGroup.entries()).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => table.push([k, v]));
    return table;
  }

  toDeptByYearBar(rows: ChargingIncomeRow[]): any[] {
    const years = Array.from(new Set(rows.map(r => r.year))).sort();
    const deptNames = Array.from(new Set(rows.map(r => r.deptName)));
    const header = ['שנה', ...deptNames];
    const table: any[] = [header];
    years.forEach(y => {
      const row: any[] = [String(y)];
      deptNames.forEach(dn => {
        const r = rows.find(x => x.year === y && x.deptName === dn);
        row.push(r && r.totalCharging ? r.totalCharging : 0);
      });
      table.push(row);
    });
    return table;
  }

  // ---------- category-aware helpers ----------
  private valueOf(row: ChargingIncomeRow, kind: IncomeKind): number {
    switch (kind) {
      case 'govrament': return row.totalGovrament || 0; // State
      case 'tagid':     return row.totalTagid || 0;     // Corporation
      case 'other':     return row.totalOther || 0;     // Other
      case 'combined':
      default:          return row.totalCharging || 0;  // Total
    }
  }

  toByYearTableForKind(rows: ChargingIncomeRow[], kind: IncomeKind): any[] {
    const map = new Map<number, number>();
    rows.forEach(r => {
      const v = this.valueOf(r, kind);
      map.set(r.year, (map.get(r.year) || 0) + v);
    });
    const years = Array.from(map.keys()).sort();
    const label = INCOME_KIND_LABEL[kind as Exclude<IncomeKind, 'bySource'>] || 'סה״כ';
    const table: any[] = [['שנה', label]];
    years.forEach(y => table.push([String(y), map.get(y) || 0]));
    return table;
  }

  toDeptTableForKind(rows: ChargingIncomeRow[], year: number, kind: IncomeKind): any[] {
    const header = ['מחלקה', 'הכנסות', 'שינוי', 'שינוי %'];
    const body = rows
      .filter(r => r.year === year)
      .map(r => [
        r.deptName,
        this.valueOf(r, kind),
        kind === 'combined' ? (r.chargingDiff ?? 0) : 0,
        kind === 'combined' ? this.formatPercent(r.chargingPct) : ''
      ]);
    body.sort((a, b) => (b[1] as number) - (a[1] as number));
    return [header, ...body];
  }

  toDeptPieForKind(rows: ChargingIncomeRow[], year: number, kind: IncomeKind): any[] {
    const header = ['מחלקה', 'חלק'];
    const body: [string, number][] = rows
      .filter(r => r.year === year)
      .map(r => [r.deptName, this.valueOf(r, kind)] as [string, number])
      .filter(r => r[1] > 0);
    return [header, ...body];
  }

  toGroupsBarLatestYearForKind(rows: ChargingIncomeRow[], kind: IncomeKind): any[] {
    if (!rows.length) return [['קבוצה', 'הכנסות']];
    const latestYear = Math.max(...rows.map(r => r.year));
    const byGroup = new Map<string, number>();
    rows.filter(r => r.year === latestYear).forEach(r => {
      byGroup.set(r.groupName, (byGroup.get(r.groupName) || 0) + this.valueOf(r, kind));
    });
    const table: any[] = [['קבוצה', 'הכנסות']];
    Array.from(byGroup.entries()).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => table.push([k, v]));
    return table;
  }

  toByYearStackedBySource(rows: ChargingIncomeRow[]): any[] {
    const years = Array.from(new Set(rows.map(r => r.year))).sort();
    const header = ['שנה', 'מדינה', 'תאגיד', 'אחר'];
    const table: any[] = [header];
    years.forEach(y => {
      const slice = rows.filter(r => r.year === y);
      const gov = slice.reduce((s, r) => s + (r.totalGovrament || 0), 0);
      const tag = slice.reduce((s, r) => s + (r.totalTagid || 0), 0);
      const oth = slice.reduce((s, r) => s + (r.totalOther || 0), 0);
      table.push([String(y), gov, tag, oth]);
    });
    return table;
  }

  /** NEW: source pie that reacts to the selected kind */
  toSourcePieForKind(rows: ChargingIncomeRow[], year: number, kind: IncomeKind): any[] {
    const slice = rows.filter(r => r.year === year);
    const gov = slice.reduce((s, r) => s + (r.totalGovrament || 0), 0);
    const tag = slice.reduce((s, r) => s + (r.totalTagid || 0), 0);
    const oth = slice.reduce((s, r) => s + (r.totalOther || 0), 0);

    // Combined or stacked mode -> show the full split
    if (kind === 'combined' || kind === 'bySource') {
      return [
        ['מקור', 'סכום'],
        ['מדינה', gov],
        ['תאגיד', tag],
        ['אחר', oth]
      ];
    }

    // Selected source vs. all others
    let selected = 0;
    let labelSel = '';
    switch (kind) {
      case 'govrament': selected = gov; labelSel = 'מדינה'; break;
      case 'tagid':     selected = tag; labelSel = 'תאגיד'; break;
      case 'other':     selected = oth; labelSel = 'אחר';    break;
    }
    const others = Math.max(0, gov + tag + oth - selected);
    return [
      ['מקור', 'סכום'],
      [labelSel, selected],
      ['שאר מקורות', others]
    ];
  }

  // ---------- utils ----------
  private formatPercent(frac?: number | null): string {
    if (frac == null) return '';
    return `${(frac * 100).toFixed(1)}%`;
  }
}
