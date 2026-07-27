import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

/** סיכום לידות לפי שנה / חודש / יישוב */
export interface BirthSummaryRow {
  Year: number;
  Month: number;
  Yishuv: string;
  Births: number;
}

/** פירוט לידות — HEARING_REPORT + PM */
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

/** מעקב הריון — ביקורים וסטטוס */
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

const CITIES = ['טבריה', 'כפר כנא', 'נצרת', 'נוף הגליל'];

const MONTHLY_BASE: Record<number, number> = {
  1: 58, 2: 52, 3: 61, 4: 55, 5: 57, 6: 54,
  7: 53, 8: 56, 9: 59, 10: 62, 11: 65, 12: 68,
};

function buildMockSummary(): BirthSummaryRow[] {
  const rows: BirthSummaryRow[] = [];
  for (let year = 2021; year <= 2026; year++) {
    for (let month = 1; month <= 12; month++) {
      const yearGrowth = (year - 2021) * 4;
      CITIES.forEach((yishuv, cityIdx) => {
        const births = MONTHLY_BASE[month] + yearGrowth + cityIdx * 7 + (month % 3);
        rows.push({ Year: year, Month: month, Yishuv: yishuv, Births: births });
      });
    }
  }
  return rows;
}

/** 12 שבועות אחרונים — mock עד חיבור API שבועי */
function buildMockWeeklyTrend(): WeeklyTrendPoint[] {
  const now = new Date();
  const points: WeeklyTrendPoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const weekNum = getIsoWeek(d);
    points.push({
      weekLabel: `שבוע ${weekNum}`,
      births: 118 + Math.round(Math.sin(i * 0.9) * 14) + (11 - i) * 2,
    });
  }
  return points;
}

function getIsoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

const MOCK_SUMMARY: BirthSummaryRow[] = buildMockSummary();
const MOCK_WEEKLY_TREND: WeeklyTrendPoint[] = buildMockWeeklyTrend();

const MOCK_DETAILS: BirthDetailRow[] = [
  {
    Year: 2022,
    PatientId: '30795992-4',
    MotherDob: '1993-02-10',
    MotherAgeAtBirth: 29,
    NewbornDob: '2022-01-03',
    City: 'כפר כנא',
    HealthFund: 'כללית',
    Nationality: 'מוסלמי',
    PreviousChildren: '02',
    PregnancyWeek: 37,
    PregnancyDay: 1,
    BirthNumberAtHospital: 1,
    TotalBirthsAtHospital: 1,
  },
  {
    Year: 2024,
    PatientId: '20485123-7',
    MotherDob: '1990-08-14',
    MotherAgeAtBirth: 34,
    NewbornDob: '2024-06-18',
    City: 'טבריה',
    HealthFund: 'מכבי',
    Nationality: 'יהודי',
    PreviousChildren: '01',
    PregnancyWeek: 39,
    PregnancyDay: 2,
    BirthNumberAtHospital: 2,
    TotalBirthsAtHospital: 2,
  },
  {
    Year: 2025,
    PatientId: '31200441-1',
    MotherDob: '1996-11-22',
    MotherAgeAtBirth: 28,
    NewbornDob: '2025-02-11',
    City: 'נוף הגליל',
    HealthFund: 'לאומית',
    Nationality: 'נוצרי',
    PreviousChildren: '00',
    PregnancyWeek: 38,
    PregnancyDay: 4,
    BirthNumberAtHospital: 1,
    TotalBirthsAtHospital: 1,
  },
];

const MOCK_MONITORING: PregnancyMonitoringRow[] = [
  {
    Year: 2025,
    Month: 3,
    MonthYear: '2025-03',
    PatientId: '29887712-3',
    PatientNumber: '1004521',
    City: 'טבריה',
    HealthFund: 'כללית',
    Nationality: 'יהודי',
    Age: 31,
    PreviousChildren: '01',
    VisitDate: '2025-03-12',
    PregnancyWeekLabel: '36+2',
    EstimatedBirthDate: '2025-03-28',
    DaysUntilEstimatedBirth: 16,
    DaysAfterEstimatedBirth: -16,
    VisitCount: 4,
    FirstVisit: '2025-01-08',
    LastVisit: '2025-03-12',
    Status: 'עדיין במעקב',
  },
  {
    Year: 2025,
    Month: 1,
    MonthYear: '2025-01',
    PatientId: '30112298-6',
    PatientNumber: '1003890',
    City: 'כפר כנא',
    HealthFund: 'מכבי',
    Nationality: 'מוסלמי',
    Age: 27,
    PreviousChildren: '00',
    VisitDate: '2025-01-20',
    PregnancyWeekLabel: '39+1',
    EstimatedBirthDate: '2025-01-25',
    DaysUntilEstimatedBirth: 5,
    DaysAfterEstimatedBirth: 42,
    VisitCount: 6,
    FirstVisit: '2024-10-03',
    LastVisit: '2025-01-20',
    Status: 'לידה',
  },
  {
    Year: 2024,
    Month: 11,
    MonthYear: '2024-11',
    PatientId: '28770015-9',
    PatientNumber: '1002104',
    City: 'נצרת',
    HealthFund: 'כללית',
    Nationality: 'מוסלמי',
    Age: 33,
    PreviousChildren: '02',
    VisitDate: '2024-11-05',
    PregnancyWeekLabel: '37+5',
    EstimatedBirthDate: '2024-11-18',
    DaysUntilEstimatedBirth: 13,
    DaysAfterEstimatedBirth: 28,
    VisitCount: 3,
    FirstVisit: '2024-09-14',
    LastVisit: '2024-11-05',
    Status: 'ללא לידה',
  },
];

@Injectable({ providedIn: 'root' })
export class NewbornDashboardDataService {
  getBirthSummary(filters: NewBornDashboardFilters): Observable<BirthSummaryRow[]> {
    return of(this.filterSummary(MOCK_SUMMARY, filters)).pipe(delay(350));
  }

  getBirthDetails(filters: NewBornDashboardFilters): Observable<BirthDetailRow[]> {
    return of(this.filterDetails(MOCK_DETAILS, filters)).pipe(delay(350));
  }

  getPregnancyMonitoring(filters: NewBornDashboardFilters): Observable<PregnancyMonitoringRow[]> {
    return of(this.filterMonitoring(MOCK_MONITORING, filters)).pipe(delay(350));
  }

  getAllSummaryRows(): BirthSummaryRow[] {
    return MOCK_SUMMARY;
  }

  getAvailableYears(summary: BirthSummaryRow[] = MOCK_SUMMARY): number[] {
    return Array.from(new Set(summary.map(r => r.Year))).sort((a, b) => b - a);
  }

  getYishuvOptions(summary: BirthSummaryRow[]): string[] {
    return Array.from(new Set(summary.map(r => r.Yishuv).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'he')
    );
  }

  getYearOptions(summary: BirthSummaryRow[], details: BirthDetailRow[], monitoring: PregnancyMonitoringRow[]): number[] {
    const years = new Set<number>();
    summary.forEach(r => years.add(r.Year));
    details.forEach(r => years.add(r.Year));
    monitoring.forEach(r => years.add(r.Year));
    return Array.from(years).sort((a, b) => b - a);
  }

  computeWeeklyStats(summary: BirthSummaryRow[]): WeeklyBirthStats {
    const trend = MOCK_WEEKLY_TREND;
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

  getWeeklyTrend(): WeeklyTrendPoint[] {
    return MOCK_WEEKLY_TREND;
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
    const totalBirths = summary.reduce((sum, r) => sum + r.Births, 0);
    const uniqueCities = new Set(summary.map(r => r.Yishuv)).size;
    const pregnancyWeeks = details.map(r => r.PregnancyWeek).filter(w => w > 0);
    const avgPregnancyWeek = pregnancyWeeks.length
      ? Math.round((pregnancyWeeks.reduce((a, b) => a + b, 0) / pregnancyWeeks.length) * 10) / 10
      : 0;

    return {
      totalBirths,
      uniqueCities,
      avgPregnancyWeek,
      monitoringActive: monitoring.filter(r => r.Status === 'עדיין במעקב').length,
      monitoringDelivered: monitoring.filter(r => r.Status === 'לידה').length,
      monitoringMissed: monitoring.filter(r => r.Status === 'ללא לידה').length,
    };
  }

  private sumMonthTotal(summary: BirthSummaryRow[], year: number, month: number): number {
    return summary
      .filter(r => r.Year === year && r.Month === month)
      .reduce((s, r) => s + r.Births, 0);
  }

  private sumYearToDate(summary: BirthSummaryRow[], year: number, throughMonth: number): number {
    return summary
      .filter(r => r.Year === year && r.Month <= throughMonth)
      .reduce((s, r) => s + r.Births, 0);
  }

  private avgMonthlyTotal(summary: BirthSummaryRow[], year: number): number {
    const monthly = new Map<number, number>();
    summary.filter(r => r.Year === year).forEach(r => {
      monthly.set(r.Month, (monthly.get(r.Month) || 0) + r.Births);
    });
    const vals = Array.from(monthly.values());
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }

  private topCityInMonth(summary: BirthSummaryRow[], year: number, month: number): { name: string; births: number } {
    const byCity = new Map<string, number>();
    summary
      .filter(r => r.Year === year && r.Month === month)
      .forEach(r => byCity.set(r.Yishuv, (byCity.get(r.Yishuv) || 0) + r.Births));
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

  private filterSummary(rows: BirthSummaryRow[], filters: NewBornDashboardFilters): BirthSummaryRow[] {
    return rows.filter(r => {
      if (filters.year != null && r.Year !== filters.year) return false;
      if (filters.month != null && r.Month !== filters.month) return false;
      if (filters.yishuv && r.Yishuv !== filters.yishuv) return false;
      return true;
    });
  }

  private filterDetails(rows: BirthDetailRow[], filters: NewBornDashboardFilters): BirthDetailRow[] {
    return rows.filter(r => {
      if (filters.year != null && r.Year !== filters.year) return false;
      if (filters.yishuv && r.City.trim() !== filters.yishuv) return false;
      return this.inDateRange(r.NewbornDob, filters.startDate, filters.endDate);
    });
  }

  private filterMonitoring(rows: PregnancyMonitoringRow[], filters: NewBornDashboardFilters): PregnancyMonitoringRow[] {
    return rows.filter(r => {
      if (filters.year != null && r.Year !== filters.year) return false;
      if (filters.month != null && r.Month !== filters.month) return false;
      if (filters.yishuv && r.City.trim() !== filters.yishuv) return false;
      if (filters.status && r.Status !== filters.status) return false;
      return this.inDateRange(r.VisitDate, filters.startDate, filters.endDate);
    });
  }

  private inDateRange(value: string, start: string, end: string): boolean {
    if (!value) return true;
    const d = value.slice(0, 10);
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  }
}
