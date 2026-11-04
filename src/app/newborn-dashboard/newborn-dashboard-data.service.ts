import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  BirthStreetHeatRow,
  buildStreetHeatmapSample,
  normalizeStreetHeatRow,
  streetHeatCacheHit,
  streetHeatCacheKey,
  streetHeatSignature,
  StreetHeatCacheEntry,
} from './street-heatmap.logic';

/** סיכום לידות לפי שנה / חודש / יישוב */
export interface BirthSummaryRow {
  Year: number;
  Month: number;
  Yishuv: string;
  Births: number;
}

export interface FertilitySheetRow {
  naphah: string;
  magzar: string;
  city: string;
  area: string;
  women: number;
  children: number;
  childrenPerWoman: number;
  isTotal?: boolean;
  geographicAreaCode?: string;
  authority?: string;
  leadingSector?: string;
  dominantFamilyCharacter?: string;
}

interface GeographicDemographicApiRow {
  GeographicAreaCode: string;
  Authority: string;
  LeadingSector: string;
  DominantFamilyCharacter: string;
  Area: string;
  City: string;
  District: string;
  WomenOfReproductiveAge: number | null;
  Children: number | null;
}

/** פירוט לידות */
export interface BirthDetailRow {
  Year: number;
  PatientId: string;
  MotherDob: string;
  MotherAgeAtBirth: number;
  NewbornDob: string;
  City: string;
  HealthFund: string;
  Nationality: string;
  PreviousChildren: string;
  PregnancyWeek: number;
  PregnancyDay: number;
  BirthNumberAtHospital: number;
  TotalBirthsAtHospital: number;
}

export type PregnancyMonitoringStatus = 'לידה' | 'ללא לידה' | 'עדיין במעקב';

export interface PregnancyMonitoringRow {
  Year: number;
  Month: number;
  MonthYear: string;
  PatientId: string;
  PatientNumber: string;
  City: string;
  HealthFund: string;
  Nationality: string;
  Age: number;
  PreviousChildren: string;
  VisitDate: string;
  PregnancyWeekLabel: string;
  EstimatedBirthDate: string;
  DaysUntilEstimatedBirth: number;
  DaysAfterEstimatedBirth: number;
  VisitCount: number;
  FirstVisit: string;
  LastVisit: string;
  Status: PregnancyMonitoringStatus;
}

export interface StreetHeatmapResult {
  rows: BirthStreetHeatRow[];
  fromServer: boolean;
  fromCache?: boolean;
  unchanged?: boolean;
}

export interface NewBornDashboardFilters {
  startDate: string;
  endDate: string;
  year: number | null;
  month: number | null;
  yishuv: string;
  status: string;
}

export interface NewBornDashboardKpis {
  totalBirths: number;
  uniqueCities: number;
  avgPregnancyWeek: number;
  monitoringActive: number;
  monitoringDelivered: number;
  monitoringMissed: number;
}

export interface WeeklyBirthStats {
  currentWeekBirths: number;
  weeklyAverage: number;
  deltaPercent: number;
  weekLabel: string;
}

export interface WeeklyTrendPoint {
  weekLabel: string;
  births: number;
}

export interface HomeSliceCard {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  trend: 'up' | 'down' | 'flat';
}

export interface MonthlyYearPoint {
  year: number;
  births: number;
}

function getIsoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  const normalized = value.slice(0, 10).replace(/(\d{2})-(\d{2})-(\d{4})/, '$3-$2-$1');
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

function weekStart(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() + diff);
  return copy;
}

export function buildFertilitySheetSample(): FertilitySheetRow[] {
  return [
    { naphah: 'כנרת', magzar: 'חרדי', city: 'טבריה', area: 'טבריה עילית ובן גוריון', women: 507, children: 2045, childrenPerWoman: 4.0 },
    { naphah: 'כנרת', magzar: 'חרדי', city: '', area: 'נוף כנרת פוריה', women: 339, children: 1273, childrenPerWoman: 3.8 },
    { naphah: 'כנרת', magzar: 'חרדי', city: '', area: 'קרית שמואל', women: 908, children: 2930, childrenPerWoman: 3.2 },
    { naphah: 'כנרת', magzar: 'חרדי', city: '', area: 'דון יוסף נשיא', women: 459, children: 1368, childrenPerWoman: 3.0 },
    { naphah: 'כנרת', magzar: 'חרדי', city: '', area: 'שיכון ג', women: 559, children: 1244, childrenPerWoman: 2.2 },
    { naphah: 'כנרת', magzar: '', city: 'טבריה סה"כ', area: '', women: 2772, children: 8860, childrenPerWoman: 3.2, isTotal: true },
    { naphah: 'כנרת', magzar: '', city: 'יבנאל', area: 'יבנאל', women: 668, children: 2196, childrenPerWoman: 3.3 },
    { naphah: 'כנרת', magzar: '', city: 'יבנאל סה"כ', area: '', women: 668, children: 2196, childrenPerWoman: 3.3, isTotal: true },
    { naphah: 'כנרת', magzar: 'חרדי סה"כ', city: '', area: '', women: 3440, children: 11056, childrenPerWoman: 3.2, isTotal: true },
    { naphah: 'כנרת', magzar: 'דתי לאומי', city: '', area: '', women: 386, children: 1100, childrenPerWoman: 2.8, isTotal: true },
    { naphah: 'כנרת', magzar: 'ללא', city: '', area: '', women: 9583, children: 19091, childrenPerWoman: 2.0, isTotal: true },
    { naphah: 'כנרת', magzar: 'ערבי', city: '', area: '', women: 6287, children: 10874, childrenPerWoman: 1.7, isTotal: true },
    { naphah: 'כנרת', magzar: 'סה"כ', city: '', area: '', women: 19696, children: 42121, childrenPerWoman: 2.1, isTotal: true },
    { naphah: 'יזרעאל', magzar: 'חרדי', city: 'עפולה', area: 'עפולה עילית', women: 823, children: 2690, childrenPerWoman: 3.3 },
    { naphah: 'יזרעאל', magzar: 'חרדי', city: '', area: 'גבעת המורה, רוממה, נווה יוסף', women: 541, children: 1441, childrenPerWoman: 2.7 },
    { naphah: 'יזרעאל', magzar: '', city: 'עפולה סה"כ', area: '', women: 1364, children: 4131, childrenPerWoman: 3.0, isTotal: true },
    { naphah: 'יזרעאל', magzar: '', city: 'נוף הגליל', area: 'הר יונה ג', women: 527, children: 2336, childrenPerWoman: 4.4 },
    { naphah: 'יזרעאל', magzar: '', city: 'נוף הגליל סה"כ', area: '', women: 527, children: 2336, childrenPerWoman: 4.4, isTotal: true },
    { naphah: 'יזרעאל', magzar: 'חרדי סה"כ', city: '', area: '', women: 1891, children: 6467, childrenPerWoman: 3.4, isTotal: true },
    { naphah: 'יזרעאל', magzar: 'דתי לאומי', city: '', area: '', women: 1343, children: 4249, childrenPerWoman: 3.2, isTotal: true },
    { naphah: 'יזרעאל', magzar: 'ללא', city: '', area: '', women: 29611, children: 59671, childrenPerWoman: 2.0, isTotal: true },
    { naphah: 'יזרעאל', magzar: 'ערבי', city: '', area: '', women: 39206, children: 74565, childrenPerWoman: 1.9, isTotal: true },
    { naphah: 'יזרעאל', magzar: 'רוסי', city: '', area: '', women: 2113, children: 3724, childrenPerWoman: 1.8, isTotal: true },
  ];
}

@Injectable({ providedIn: 'root' })
export class NewbornDashboardDataService {
  private readonly api = environment.urlipracticom;
  private cachedSummary: BirthSummaryRow[] = [];
  private streetHeatState: StreetHeatCacheEntry | null = null;
  private readonly streetHeatStorageKey = 'newbornDashboard.streetHeatmap';
  private cachedDetails: BirthDetailRow[] = [];

  constructor(private http: HttpClient) {}

  getBirthSummary(filters: NewBornDashboardFilters): Observable<BirthSummaryRow[]> {
    return this.postList<BirthSummaryRow>('GetBirthSummaryByYishuv', this.summaryBody(filters)).pipe(
      tap((rows) => { this.cachedSummary = rows; })
    );
  }

  getBirthDetails(filters: NewBornDashboardFilters): Observable<BirthDetailRow[]> {
    return this.postList<BirthDetailRow>('GetBirthDetails', this.summaryBody(filters)).pipe(
      tap((rows) => { this.cachedDetails = rows; })
    );
  }

  getPregnancyMonitoring(filters: NewBornDashboardFilters): Observable<PregnancyMonitoringRow[]> {
    return this.postList<PregnancyMonitoringRow>('GetPregnancyMonitoring', {
      ...this.summaryBody(filters),
      status: filters.status || '',
    });
  }

  getGeographicDemographicData(): Observable<FertilitySheetRow[]> {
    return this.http.post<{ d?: unknown } | unknown[]>(
      this.api + 'GetGeographicDemographicData',
      {}
    ).pipe(
      map((response) => {
        const wrapped = response as { d?: unknown };
        const raw = wrapped && wrapped.d !== undefined ? wrapped.d : response;
        if (!Array.isArray(raw)) {
          throw new Error('GetGeographicDemographicData returned an invalid response');
        }

        return (raw as GeographicDemographicApiRow[]).map((row) => {
          const women = Number(row.WomenOfReproductiveAge) || 0;
          const children = Number(row.Children) || 0;
          return {
            naphah: row.District || '',
            magzar: row.LeadingSector || '',
            city: row.City || '',
            area: row.Area || '',
            women,
            children,
            childrenPerWoman: women ? Math.round((children / women) * 10) / 10 : 0,
            geographicAreaCode: row.GeographicAreaCode || '',
            authority: row.Authority || '',
            leadingSector: row.LeadingSector || '',
            dominantFamilyCharacter: row.DominantFamilyCharacter || '',
          };
        });
      })
    );
  }

  /** Stored rows for this filter key. Null when local state has nothing to reuse. */
  peekStreetHeatmap(filters: NewBornDashboardFilters): BirthStreetHeatRow[] | null {
    const key = streetHeatCacheKey(filters);
    if (!this.streetHeatState) this.streetHeatState = this.readStreetHeatStorage();
    return streetHeatCacheHit(this.streetHeatState, key);
  }

  /** Real rows from GetBirthStreetHeatmap. Sample rows only when that call fails. */
  getBirthStreetHeatmap(filters: NewBornDashboardFilters, force = false): Observable<StreetHeatmapResult> {
    const key = streetHeatCacheKey(filters);
    if (!this.streetHeatState) this.streetHeatState = this.readStreetHeatStorage();
    if (!force) {
      const cached = this.peekStreetHeatmap(filters);
      if (cached) return of({ rows: cached, fromServer: true, fromCache: true });
    }
    const body = this.summaryBody(filters);
    return this.http.post<{ d?: unknown } | unknown[]>(this.api + 'GetBirthStreetHeatmap', body).pipe(
      map((response) => {
        const wrapped = response as { d?: unknown };
        const raw = wrapped && wrapped.d !== undefined ? wrapped.d : response;
        const list = Array.isArray(raw) ? raw : [];
        const rows = list
          .map((row) => normalizeStreetHeatRow(row))
          .filter((row) => row.City || row.Kind);
        return { rows, fromServer: true, fromCache: false, unchanged: false };
      }),
      tap((result) => {
        if (!result.fromServer) return;
        const signature = streetHeatSignature(result.rows);
        const previous = this.streetHeatState && this.streetHeatState.key === key ? this.streetHeatState : null;
        if (previous && previous.signature === signature) {
          result.unchanged = true;
          result.rows = previous.rows;
          return;
        }
        this.streetHeatState = { key, signature, rows: result.rows };
        this.writeStreetHeatStorage(this.streetHeatState);
      }),
      catchError(() => of({ rows: buildStreetHeatmapSample(), fromServer: false }))
    );
  }

  getAllSummaryRows(): BirthSummaryRow[] {
    return this.cachedSummary;
  }

  getAvailableYears(summary: BirthSummaryRow[] = this.cachedSummary): number[] {
    return Array.from(new Set(summary.map((r) => r.Year))).sort((a, b) => b - a);
  }

  getYishuvOptions(summary: BirthSummaryRow[]): string[] {
    return Array.from(new Set(summary.map((r) => r.Yishuv).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'he')
    );
  }

  getYearOptions(
    summary: BirthSummaryRow[],
    details: BirthDetailRow[],
    monitoring: PregnancyMonitoringRow[]
  ): number[] {
    const years = new Set<number>();
    summary.forEach((r) => years.add(r.Year));
    details.forEach((r) => years.add(r.Year));
    monitoring.forEach((r) => years.add(r.Year));
    return Array.from(years).sort((a, b) => b - a);
  }

  computeWeeklyStats(summary: BirthSummaryRow[], details: BirthDetailRow[] = this.cachedDetails): WeeklyBirthStats {
    const trend = this.getWeeklyTrend(details);
    const currentWeekBirths = trend[trend.length - 1]?.births ?? 0;
    const weeklyAverage = trend.length
      ? Math.round(trend.reduce((s, p) => s + p.births, 0) / trend.length)
      : 0;
    const deltaPercent = weeklyAverage
      ? Math.round(((currentWeekBirths - weeklyAverage) / weeklyAverage) * 1000) / 10
      : 0;
    const now = new Date();
    return {
      currentWeekBirths,
      weeklyAverage,
      deltaPercent,
      weekLabel: `שבוע ${getIsoWeek(now)}, ${now.getFullYear()}`,
    };
  }

  getWeeklyTrend(details: BirthDetailRow[] = this.cachedDetails): WeeklyTrendPoint[] {
    const now = new Date();
    const points: WeeklyTrendPoint[] = [];

    for (let i = 11; i >= 0; i--) {
      const anchor = new Date(now);
      anchor.setDate(anchor.getDate() - i * 7);
      const start = weekStart(anchor);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      const births = details.filter((row) => {
        const dob = parseDate(row.NewbornDob);
        return dob != null && dob >= start && dob <= end;
      }).length;

      points.push({
        weekLabel: `שבוע ${getIsoWeek(anchor)}`,
        births,
      });
    }

    return points;
  }

  computeHomeSlices(summary: BirthSummaryRow[]): HomeSliceCard[] {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const mtd = this.sumMonthTotal(summary, currentYear, currentMonth);
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const prevMtd = this.sumMonthTotal(summary, prevYear, prevMonth);
    const ytd = this.sumYearToDate(summary, currentYear, currentMonth);
    const prevYtd = this.sumYearToDate(summary, currentYear - 1, currentMonth);
    const topCity = this.topCityInMonth(summary, currentYear, currentMonth);
    const avgMonthly = this.avgMonthlyTotal(summary, currentYear);

    return [
      {
        id: 'mtd',
        title: 'לידות החודש',
        value: String(mtd),
        subtitle: `${currentMonth}/${currentYear}`,
        icon: 'calendar_month',
        trend: mtd >= prevMtd ? 'up' : 'down',
      },
      {
        id: 'ytd',
        title: 'מצטבר שנתי',
        value: String(ytd),
        subtitle: `עד ${currentMonth}/${currentYear}`,
        icon: 'trending_up',
        trend: ytd >= prevYtd ? 'up' : 'down',
      },
      {
        id: 'top-city',
        title: 'יישוב מוביל',
        value: topCity.name,
        subtitle: `${topCity.births} לידות החודש`,
        icon: 'location_city',
        trend: 'flat',
      },
      {
        id: 'avg-month',
        title: 'ממוצע חודשי',
        value: String(avgMonthly),
        subtitle: `שנת ${currentYear}`,
        icon: 'insights',
        trend: 'flat',
      },
    ];
  }

  computeMonthlyByYear(
    summary: BirthSummaryRow[],
    month: number,
    fromYear: number,
    toYear: number
  ): MonthlyYearPoint[] {
    const start = Math.min(fromYear, toYear);
    const end = Math.max(fromYear, toYear);
    const points: MonthlyYearPoint[] = [];
    for (let year = start; year <= end; year++) {
      points.push({
        year,
        births: this.sumMonthTotal(summary, year, month),
      });
    }
    return points;
  }

  computeKpis(
    summary: BirthSummaryRow[],
    monitoring: PregnancyMonitoringRow[],
    details: BirthDetailRow[]
  ): NewBornDashboardKpis {
    const totalBirths = summary.reduce((sum, r) => sum + (Number(r.Births) || 0), 0);
    const uniqueCities = new Set(summary.map((r) => r.Yishuv).filter(Boolean)).size;
    const pregnancyWeeks = details.map((r) => Number(r.PregnancyWeek)).filter((w) => w > 0);
    const avgPregnancyWeek = pregnancyWeeks.length
      ? Math.round((pregnancyWeeks.reduce((a, b) => a + b, 0) / pregnancyWeeks.length) * 10) / 10
      : 0;

    return {
      totalBirths,
      uniqueCities,
      avgPregnancyWeek,
      monitoringActive: monitoring.filter((r) => r.Status === 'עדיין במעקב').length,
      monitoringDelivered: monitoring.filter((r) => r.Status === 'לידה').length,
      monitoringMissed: monitoring.filter((r) => r.Status === 'ללא לידה').length,
    };
  }

  private postList<T>(method: string, body: Record<string, unknown>): Observable<T[]> {
    return this.http.post<{ d: T[] } | T[]>(this.api + method, body).pipe(
      map((response) => {
        const data = (response as { d?: T[] }).d !== undefined
          ? (response as { d: T[] }).d
          : (response as T[]);
        return Array.isArray(data) ? data : [];
      }),
      catchError(() => of([]))
    );
  }

  private readStreetHeatStorage(): StreetHeatCacheEntry | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(this.streetHeatStorageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StreetHeatCacheEntry;
      if (!parsed || !parsed.key || !Array.isArray(parsed.rows)) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  private writeStreetHeatStorage(entry: StreetHeatCacheEntry): void {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(this.streetHeatStorageKey, JSON.stringify(entry));
    } catch (e) {
      return;
    }
  }

  private summaryBody(filters: NewBornDashboardFilters): Record<string, unknown> {
    return {
      startDate: filters.startDate,
      endDate: filters.endDate,
      year: filters.year,
      month: filters.month,
      yishuv: filters.yishuv || '',
    };
  }

  private sumMonthTotal(summary: BirthSummaryRow[], year: number, month: number): number {
    return summary
      .filter((r) => r.Year === year && r.Month === month)
      .reduce((s, r) => s + (Number(r.Births) || 0), 0);
  }

  private sumYearToDate(summary: BirthSummaryRow[], year: number, throughMonth: number): number {
    return summary
      .filter((r) => r.Year === year && r.Month <= throughMonth)
      .reduce((s, r) => s + (Number(r.Births) || 0), 0);
  }

  private avgMonthlyTotal(summary: BirthSummaryRow[], year: number): number {
    const monthly = new Map<number, number>();
    summary.filter((r) => r.Year === year).forEach((r) => {
      monthly.set(r.Month, (monthly.get(r.Month) || 0) + (Number(r.Births) || 0));
    });
    const vals = Array.from(monthly.values());
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }

  private topCityInMonth(summary: BirthSummaryRow[], year: number, month: number): { name: string; births: number } {
    const byCity = new Map<string, number>();
    summary
      .filter((r) => r.Year === year && r.Month === month)
      .forEach((r) => byCity.set(r.Yishuv, (byCity.get(r.Yishuv) || 0) + (Number(r.Births) || 0)));
    let name = '—';
    let births = 0;
    byCity.forEach((b, city) => {
      if (b > births) {
        births = b;
        name = city;
      }
    });
    return { name, births };
  }
}
