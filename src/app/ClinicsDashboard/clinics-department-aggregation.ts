/**
 * Pure department-level aggregation — no DOM, no Angular, fully unit-testable.
 *
 * Every clinic row from the API belongs to a department (Depart_Name). This
 * module is the single source of truth for turning a flat list of clinic
 * rows into per-department totals, so the Galaxy view, the weekly summary
 * table, and any future consumer all group/sum the exact same way.
 */

// `import type` only — erased at compile time, so this never creates a
// runtime circular dependency with clinics-dashboard.component.ts.
import type { GetClinicsDashboardDto } from './clinics-dashboard.component';

/** Used when a row has no Depart_Name at all, so totals never silently drop data. */
export const UNASSIGNED_DEPARTMENT_LABEL = 'ללא מחלקה';

export interface DepartmentAggregate {
  /** Depart_Name as returned by the API (or UNASSIGNED_DEPARTMENT_LABEL). */
  departName: string;
  /** The original clinic rows that make up this department, unmodified. */
  clinics: GetClinicsDashboardDto[];
  clinicCount: number;
  total: number;
  arrived: number;
  notArrived: number;
  amountToRequest: number;
  postHospitalizationVisit: number;
  postScreeningVisit: number;
  visitedLast1Month: number;
  visitedLast3Months: number;
  newPatientsToClinic: number;
  /** Rounded percentage, 0 when total is 0. */
  arrivalRate: number;
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function sumField(clinics: GetClinicsDashboardDto[], field: keyof GetClinicsDashboardDto): number {
  return clinics.reduce((sum, row) => sum + toNumber(row[field]), 0);
}

function departmentKey(row: GetClinicsDashboardDto): string {
  const name = (row.Depart_Name || '').trim();
  return name || UNASSIGNED_DEPARTMENT_LABEL;
}

/**
 * Groups clinic rows by Depart_Name and sums every relevant numeric metric
 * for each department. Frontend-only — the API and its shape are untouched.
 */
export function groupRowsByDepartment(rows: GetClinicsDashboardDto[]): DepartmentAggregate[] {
  const buckets = new Map<string, GetClinicsDashboardDto[]>();

  for (const row of rows) {
    const key = departmentKey(row);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(row);
    } else {
      buckets.set(key, [row]);
    }
  }

  const aggregates: DepartmentAggregate[] = [];
  buckets.forEach((clinics, departName) => {
    const total = sumField(clinics, 'Total');
    const arrived = sumField(clinics, 'Arrived');

    aggregates.push({
      departName,
      clinics,
      clinicCount: clinics.length,
      total,
      arrived,
      notArrived: sumField(clinics, 'NotArrived'),
      amountToRequest: sumField(clinics, 'AmountToRequest'),
      postHospitalizationVisit: sumField(clinics, 'PostHospitalizationVisit'),
      postScreeningVisit: sumField(clinics, 'PostScreeningVisit'),
      visitedLast1Month: sumField(clinics, 'Visited_Last1Month'),
      visitedLast3Months: sumField(clinics, 'Visited_Last3Months'),
      newPatientsToClinic: sumField(clinics, 'NewPatientsToClinic'),
      arrivalRate: total > 0 ? Math.round((arrived / total) * 100) : 0
    });
  });

  return aggregates;
}

/** Busiest department (by aggregated Total) first. */
export function sortDepartmentsByTotalDesc(departments: DepartmentAggregate[]): DepartmentAggregate[] {
  return [...departments].sort((a, b) => b.total - a.total);
}

export function topDepartmentsByTotal(departments: DepartmentAggregate[], count: number): DepartmentAggregate[] {
  return sortDepartmentsByTotalDesc(departments).slice(0, count);
}
