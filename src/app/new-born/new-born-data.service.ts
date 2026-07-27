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

/** Mock data aligned with the SQL samples until backend endpoints are wired. */
const MOCK_SUMMARY: BirthSummaryRow[] = [
  { Year: 2015, Month: 1, Yishuv: 'טבריה', Births: 61 },
  { Year: 2015, Month: 1, Yishuv: 'כפר כנא', Births: 42 },
  { Year: 2015, Month: 2, Yishuv: 'טבריה', Births: 58 },
  { Year: 2015, Month: 2, Yishuv: 'נצרת', Births: 37 },
  { Year: 2024, Month: 11, Yishuv: 'טבריה', Births: 72 },
  { Year: 2024, Month: 12, Yishuv: 'טבריה', Births: 68 },
  { Year: 2025, Month: 1, Yishuv: 'טבריה', Births: 64 },
  { Year: 2025, Month: 1, Yishuv: 'כפר כנא', Births: 39 },
  { Year: 2025, Month: 2, Yishuv: 'נוף הגליל', Births: 28 },
  { Year: 2025, Month: 3, Yishuv: 'טבריה', Births: 71 },
];

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
export class NewBornDataService {
  /**
   * Placeholder endpoints — replace with real WebService methods when available.
   * e.g. GetBirthSummaryByYishuv, GetBirthDetails, GetPregnancyMonitoring
   */
  getBirthSummary(filters: NewBornDashboardFilters): Observable<BirthSummaryRow[]> {
    return of(this.filterSummary(MOCK_SUMMARY, filters)).pipe(delay(350));
  }

  getBirthDetails(filters: NewBornDashboardFilters): Observable<BirthDetailRow[]> {
    return of(this.filterDetails(MOCK_DETAILS, filters)).pipe(delay(350));
  }

  getPregnancyMonitoring(filters: NewBornDashboardFilters): Observable<PregnancyMonitoringRow[]> {
    return of(this.filterMonitoring(MOCK_MONITORING, filters)).pipe(delay(350));
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
