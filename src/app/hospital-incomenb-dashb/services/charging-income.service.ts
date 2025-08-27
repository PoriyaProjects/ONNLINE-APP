import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ChargingIncomeResponse,
  ChargingIncomeRow,
  YearTotal
} from '../services/charging-income.models'; // adjust path if needed
import { environment } from 'src/environments/environment';

export type IncomeKind = 'combined' | 'govrament' | 'tagid' | 'other' | 'bySource';

export const INCOME_KIND_LABEL: Record<Exclude<IncomeKind, 'bySource'>, string> = {
  combined: 'סה״כ',
  govrament: 'מדינה',
  tagid: 'תאגיד',
  other: 'אחר'
};

export interface GroupInfo { groupId: number; groupName: string; }
export interface DeptInfo  { deptId: number; deptName: string; groupId: number; groupName: string; }

export interface KPIs {
  scope: 'hospital' | 'group' | 'dept';
  title: string;
  year: number;
  total: number;
  yoyPct: number | null;         // fraction (0.123 => 12.3%)
  countGroups: number;           // only meaningful hospital|group
  countDepts: number;            // only meaningful hospital|group
  topName?: string;              // top contributor
  topValue?: number;
  topShare?: number;             // fraction
}

@Injectable({ providedIn: 'root' })
export class ChargingIncomeService {
  constructor(private http: HttpClient) {}

  private getChargingIncomeUrl(): string {
    const base = (environment.url || '').replace(/\/+$/, '');
    return `${base}/GetChargingIncome`;
  }

  // ---------- API ----------

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

  prefetchHospital(opts: {
    fromYear: number; toYear: number; isYtd: boolean;
    incomeCategory?: 'totalCharging'|'totalGovrament'|'totalTagid'|'totalOther'
  }): Observable<ChargingIncomeResponse> {
    return this.getChargingIncome({
      incomeCategory: opts.incomeCategory || 'totalCharging',
      fromYear: opts.fromYear, toYear: opts.toYear, isYtd: opts.isYtd
    });
  }

  // ---------- Discovery (groups & depts) ----------

  listGroups(rows: ChargingIncomeRow[]): GroupInfo[] {
    const seen = new Map<number, string>();
    rows.forEach(r => { if (!seen.has(r.groupId)) seen.set(r.groupId, r.groupName); });
    return Array.from(seen.entries()).map(([groupId, groupName]) => ({ groupId, groupName }));
  }

  listDepts(rows: ChargingIncomeRow[], groupId?: number): DeptInfo[] {
    const list: DeptInfo[] = [];
    const key = new Set<number>();
    rows.forEach(r => {
      if (groupId != null && r.groupId !== groupId) return;
      if (!key.has(r.deptId)) {
        key.add(r.deptId);
        list.push({ deptId: r.deptId, deptName: r.deptName, groupId: r.groupId, groupName: r.groupName });
      }
    });
    // sort for nicer button order
    list.sort((a, b) => a.deptName.localeCompare(b.deptName));
    return list;
  }

  filterRows(rows: ChargingIncomeRow[], groupId?: number|null, deptId?: number|null): ChargingIncomeRow[] {
    return rows.filter(r =>
      (groupId == null || r.groupId === groupId) &&
      (deptId  == null || r.deptId  === deptId)
    );
  }

  // ---------- Value selection ----------

  private valueOf(row: ChargingIncomeRow, kind: IncomeKind): number {
    switch (kind) {
      case 'govrament': return row.totalGovrament || 0; // State
      case 'tagid':     return row.totalTagid || 0;     // Corporation
      case 'other':     return row.totalOther || 0;     // Other
      case 'combined':
      default:          return row.totalCharging || 0;  // Total
    }
  }

  // ---------- Chart data (combined/per-source/stacked) ----------

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

  toDeptTableForKind(rows: ChargingIncomeRow[], year: number, kind: IncomeKind): any[] {
    const header = ['מחלקה', 'הכנסות', 'שינוי', 'שינוי %'];
    const body = rows
      .filter(r => r.year === year)
      .map(r => [
        r.deptName,
        this.valueOf(r, kind),
        kind === 'combined' ? (r.chargingDiff ?? 0) : 0,
        kind === 'combined' ? ((r.chargingPct ?? 0) * 100) : null // we'll format in component if needed
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

  /** Source pie that reacts to selected kind */
  toSourcePieForKind(rows: ChargingIncomeRow[], year: number, kind: IncomeKind): any[] {
    const slice = rows.filter(r => r.year === year);
    const gov = slice.reduce((s, r) => s + (r.totalGovrament || 0), 0);
    const tag = slice.reduce((s, r) => s + (r.totalTagid || 0), 0);
    const oth = slice.reduce((s, r) => s + (r.totalOther || 0), 0);

    if (kind === 'combined' || kind === 'bySource') {
      return [
        ['מקור', 'סכום'],
        ['מדינה', gov],
        ['תאגיד', tag],
        ['אחר', oth]
      ];
    }

    // Selected vs Others
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

  // ---------- Hospital-only visuals ----------

  toTreemapGroups(rows: ChargingIncomeRow[]): any[] {
    if (!rows.length) return [['Group','Parent','Value','Change']];
    const latestYear = Math.max(...rows.map(r => r.year));
    const curr = rows.filter(r => r.year === latestYear);
    const prev = rows.filter(r => r.year === (latestYear - 1));
    const prevByGroup = new Map<string, number>();
    prev.forEach(r => prevByGroup.set(r.groupName, (prevByGroup.get(r.groupName) || 0) + (r.totalCharging || 0)));

    const byGroup = new Map<string, number>();
    curr.forEach(r => byGroup.set(r.groupName, (byGroup.get(r.groupName) || 0) + (r.totalCharging || 0)));

    const header = ['Group', 'Parent', 'Value', 'Change'];
    const table: any[] = [header, ['כלל בית החולים', null, 0, 0]];
    Array.from(byGroup.entries()).forEach(([g, v]) => {
      const pv = prevByGroup.get(g) || 0;
      const pct = pv ? (v - pv) / pv : 0;
      table.push([g, 'כלל בית החולים', Math.max(0, v), pct]);
    });
    return table;
  }

  toByYearByGroup100(rows: ChargingIncomeRow[]): any[] {
    const years = Array.from(new Set(rows.map(r => r.year))).sort();
    const groups = Array.from(new Set(rows.map(r => r.groupName)));
    const header = ['שנה', ...groups];
    const table: any[] = [header];
    years.forEach(y => {
      const slice = rows.filter(r => r.year === y);
      const totalsByGroup = new Map<string, number>();
      groups.forEach(g => totalsByGroup.set(g, 0));
      slice.forEach(r => totalsByGroup.set(r.groupName, (totalsByGroup.get(r.groupName) || 0) + (r.totalCharging || 0)));
      const sum = Array.from(totalsByGroup.values()).reduce((a,b)=>a+b,0) || 1;
      const row: any[] = [String(y)];
      groups.forEach(g => row.push((totalsByGroup.get(g) || 0) / sum));
      table.push(row);
    });
    return table;
  }

  toContributionToGrowth(rows: ChargingIncomeRow[], level: 'group'|'dept', groupId?: number): any[] {
    const years = Array.from(new Set(rows.map(r => r.year))).sort();
    if (years.length < 2) return [['שם','שינוי']];
    const currY = years[years.length-1];
    const prevY = years[years.length-2];

    let currSlice = rows.filter(r => r.year === currY);
    let prevSlice = rows.filter(r => r.year === prevY);
    if (level === 'dept' && groupId != null) {
      currSlice = currSlice.filter(r => r.groupId === groupId);
      prevSlice = prevSlice.filter(r => r.groupId === groupId);
    }

    const key = (r: ChargingIncomeRow) => level === 'group' ? r.groupName : r.deptName;
    const sumBy = (slice: ChargingIncomeRow[]) => {
      const m = new Map<string, number>();
      slice.forEach(r => m.set(key(r), (m.get(key(r)) || 0) + (r.totalCharging || 0)));
      return m;
    };

    const currMap = sumBy(currSlice);
    const prevMap = sumBy(prevSlice);
    const names = new Set<string>([...Array.from(currMap.keys()), ...Array.from(prevMap.keys())]);

    const header = ['שם', 'שינוי'];
    const rowsOut: any[] = [header];
    names.forEach(n => {
      const delta = (currMap.get(n) || 0) - (prevMap.get(n) || 0);
      rowsOut.push([n, delta]);
    });
    rowsOut.splice(1, rowsOut.length-1, ...rowsOut.slice(1).sort((a,b)=> (b[1] as number) - (a[1] as number)));
    return rowsOut;
  }

  // ---------- Group-level visuals ----------

  toParetoForGroup(rows: ChargingIncomeRow[], groupId: number, year: number): any[] {
    const slice = rows.filter(r => r.groupId === groupId && r.year === year);
    const byDept = new Map<string, number>();
    slice.forEach(r => byDept.set(r.deptName, (byDept.get(r.deptName) || 0) + (r.totalCharging || 0)));
    const pairs = Array.from(byDept.entries()).sort((a,b)=>b[1]-a[1]);
    const sum = pairs.reduce((a, [,v]) => a+v, 0) || 1;
    let cum = 0;
    const header = ['מחלקה', 'הכנסות', 'מצטבר %'];
    const table: any[] = [header];
    pairs.forEach(([name, v]) => { cum += v; table.push([name, v, cum / sum]); });
    return table;
  }

  // ---------- Any level ----------

  toCumulativeByYear(rows: ChargingIncomeRow[], kind: IncomeKind): any[] {
    const vals = new Map<number, number>();
    rows.forEach(r => vals.set(
      r.year,
      (vals.get(r.year) || 0) +
        (kind === 'govrament' ? (r.totalGovrament || 0)
        : kind === 'tagid'    ? (r.totalTagid || 0)
        : kind === 'other'    ? (r.totalOther || 0)
                              : (r.totalCharging || 0))
    ));
    const years = Array.from(vals.keys()).sort();
    let run = 0;
    const table: any[] = [['שנה', 'מצטבר']];
    years.forEach(y => { run += vals.get(y) || 0; table.push([String(y), run]); });
    return table;
  }

  // ---------- KPIs ----------

  computeKPIs(rows: ChargingIncomeRow[], scope: 'hospital'|'group'|'dept', title: string): KPIs | null {
    if (!rows || !rows.length) return null;
    const years = Array.from(new Set(rows.map(r => r.year))).sort();
    const year = years[years.length - 1];
    const prev = years.length > 1 ? years[years.length - 2] : null;

    const total = rows.filter(r => r.year === year).reduce((s, r) => s + (r.totalCharging || 0), 0);
    const totalPrev = prev == null ? null : rows.filter(r => r.year === prev).reduce((s, r) => s + (r.totalCharging || 0), 0);
    const yoyPct = (totalPrev && totalPrev !== 0) ? (total - totalPrev) / totalPrev : null;

    const countGroups = new Set(rows.map(r => r.groupId)).size;
    const countDepts  = new Set(rows.map(r => r.deptId)).size;

    // top contributor (by share in latest year) – group or dept based on scope
    let topName: string | undefined;
    let topValue: number | undefined;
    let topShare: number | undefined;

    if (scope === 'hospital') {
      const byGroup = new Map<string, number>();
      rows.filter(r => r.year === year).forEach(r => {
        byGroup.set(r.groupName, (byGroup.get(r.groupName) || 0) + (r.totalCharging || 0));
      });
      const entries = Array.from(byGroup.entries()).sort((a,b)=> b[1]-a[1]);
      if (entries.length) {
        topName = entries[0][0];
        topValue = entries[0][1];
        topShare = total ? (entries[0][1] / total) : 0;
      }
    } else if (scope === 'group') {
      const byDept = new Map<string, number>();
      rows.filter(r => r.year === year).forEach(r => {
        byDept.set(r.deptName, (byDept.get(r.deptName) || 0) + (r.totalCharging || 0));
      });
      const entries = Array.from(byDept.entries()).sort((a,b)=> b[1]-a[1]);
      if (entries.length) {
        topName = entries[0][0];
        topValue = entries[0][1];
        topShare = total ? (entries[0][1] / total) : 0;
      }
    }

    return { scope, title, year, total, yoyPct, countGroups, countDepts, topName, topValue, topShare };
  }
}
