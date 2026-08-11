/**
 * Pure "clinic pressure" scoring — no DOM, no Angular, fully unit-testable.
 *
 * Ranks busiest clinics for the carousel. Card rates:
 *  1) inviteArrivalRate — invited arrivals (no walk-ins) / invited Total
 *  2) walkInRate — walk-ins / all arrivals (invited arrivals + walk-ins)
 *  3) capacityRate — all arrivals / AmountToRequest (מכסה)
 */

export interface ClinicPressureInput {
  id: string;
  name: string;
  /** Display-ready visit date (no clock time). */
  visitDate: string;
  /** Invited patients (Total). */
  patients: number;
  /** Arrived among invitees (API Arrived — without walk-ins). */
  arrived: number;
  notArrived: number;
  /** Capacity quota (AmountToRequest). */
  requested: number;
  /** Walk-ins / matparzim (PatientsWithoutOrder). */
  walkIns: number;
  /** Raw "HH:mm" (or "HH:mm:ss") strings straight from the backend row. */
  startTime: string;
  endTime: string;
}

export type PressureLevel = 'critical' | 'high' | 'moderate' | 'low';
export type WasteLevel = 'high' | 'moderate' | 'low';

export interface ClinicPressureResult extends ClinicPressureInput {
  workingHours: number;
  patientsPerHour: number;
  loadRate: number;
  noShowRate: number;
  /** Total footfall: invited arrivals + walk-ins. */
  allArrivals: number;
  /**
   * % הגעה מוזמנים — arrived (ללא מתפרצים) / Total.
   * Kept as arrivalRate for any legacy bindings.
   */
  arrivalRate: number;
  inviteArrivalRate: number;
  /** אחוז מתפרצים — walk-ins / all arrivals. */
  walkInRate: number;
  /** אחוז מכסה — all arrivals / capacity (may exceed 100). */
  capacityRate: number;
  pressureScore: number;
  pressureLevel: PressureLevel;
  wasteLevel: WasteLevel;
  /** Color band for inviteArrivalRate (higher = better/green). */
  arrivalLevel: WasteLevel;
  walkInLevel: WasteLevel;
  capacityLevel: WasteLevel;
}

function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec((value || '').trim());
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
}

/** Working hours for the shift, or 0 when start/end can't be parsed. */
function workingHoursOf(startTime: string, endTime: string): number {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (start == null || end == null || end <= start) {
    return 0;
  }
  return (end - start) / 60;
}

function maxOf(values: number[]): number {
  return values.reduce((max, v) => Math.max(max, v), 0) || 1;
}

function pressureLevelFor(score: number): PressureLevel {
  if (score >= 75) { return 'critical'; }
  if (score >= 50) { return 'high'; }
  if (score >= 25) { return 'moderate'; }
  return 'low';
}

function wasteLevelFor(noShowRate: number): WasteLevel {
  if (noShowRate >= 25) { return 'high'; }
  if (noShowRate >= 12) { return 'moderate'; }
  return 'low';
}

/** Higher invite arrival rate → “low” waste band (green); poor turnout → high/red. */
function arrivalLevelFor(rate: number): WasteLevel {
  if (rate >= 80) { return 'low'; }
  if (rate >= 55) { return 'moderate'; }
  return 'high';
}

/** Higher walk-in share leans warm (more unplanned traffic). */
function walkInLevelFor(rate: number): WasteLevel {
  if (rate >= 30) { return 'high'; }
  if (rate >= 15) { return 'moderate'; }
  return 'low';
}

/** Capacity utilization: low fill is red, near-full/over is warm or green mid. */
function capacityLevelFor(rate: number): WasteLevel {
  if (rate >= 90) { return 'high'; }
  if (rate >= 60) { return 'moderate'; }
  return 'low';
}

function clampPct(value: number): number {
  return Math.max(0, Math.round(value));
}

/**
 * Scores every clinic's current "pressure" relative to peers (for ranking only).
 * Card rates use invite/walk-in/capacity formulas above.
 */
export function computeClinicPressure(inputs: ClinicPressureInput[]): ClinicPressureResult[] {
  const withMetrics = inputs.map((input) => {
    const walkIns = Math.max(0, input.walkIns || 0);
    const invitedArrived = Math.max(0, input.arrived || 0);
    const allArrivals = invitedArrived + walkIns;
    const workingHours = workingHoursOf(input.startTime, input.endTime);
    const patientsPerHour = workingHours > 0 ? input.patients / workingHours : 0;
    const loadRate = input.requested > 0 ? (input.patients / input.requested) * 100 : 0;
    const noShowRate = input.patients > 0 ? (input.notArrived / input.patients) * 100 : 0;
    return { input, walkIns, invitedArrived, allArrivals, workingHours, patientsPerHour, loadRate, noShowRate };
  });

  const maxPatientsPerHour = maxOf(withMetrics.map(m => m.patientsPerHour));
  const maxLoadRate = maxOf(withMetrics.map(m => Math.min(m.loadRate, 150)));
  const maxPatients = maxOf(withMetrics.map(m => m.input.patients));

  return withMetrics.map(({ input, walkIns, invitedArrived, allArrivals, workingHours, patientsPerHour, loadRate, noShowRate }) => {
    const score = Math.round(100 * (
      0.5 * (patientsPerHour / maxPatientsPerHour) +
      0.3 * (Math.min(loadRate, 150) / maxLoadRate) +
      0.2 * (input.patients / maxPatients)
    ));
    const inviteArrivalRate = input.patients > 0
      ? clampPct((invitedArrived / input.patients) * 100)
      : 0;
    const walkInRate = allArrivals > 0
      ? clampPct((walkIns / allArrivals) * 100)
      : 0;
    const capacityRate = input.requested > 0
      ? clampPct((allArrivals / input.requested) * 100)
      : 0;

    return {
      ...input,
      walkIns,
      workingHours,
      patientsPerHour: Math.round(patientsPerHour * 10) / 10,
      loadRate: Math.round(loadRate),
      noShowRate: Math.round(noShowRate),
      allArrivals,
      arrivalRate: inviteArrivalRate,
      inviteArrivalRate,
      walkInRate,
      capacityRate,
      pressureScore: Math.max(0, Math.min(100, score)),
      pressureLevel: pressureLevelFor(score),
      wasteLevel: wasteLevelFor(noShowRate),
      arrivalLevel: arrivalLevelFor(inviteArrivalRate),
      walkInLevel: walkInLevelFor(walkInRate),
      capacityLevel: capacityLevelFor(capacityRate)
    };
  });
}

export function topByPressure(results: ClinicPressureResult[], count: number): ClinicPressureResult[] {
  return [...results].sort((a, b) => b.pressureScore - a.pressureScore).slice(0, count);
}

export function topByPatients<T extends { patients: number }>(inputs: T[], count: number): T[] {
  return [...inputs].sort((a, b) => b.patients - a.patients).slice(0, count);
}
