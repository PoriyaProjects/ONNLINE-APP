/**
 * Pure "clinic pressure" scoring — no DOM, no Angular, fully unit-testable.
 *
 * Turns raw per-clinic counters into a single, explainable 0-100 "pressure"
 * score used to rank which clinics are under the most strain right now, plus
 * a separate "wasted time" signal (how much of that load never shows up).
 */

export interface ClinicPressureInput {
  id: string;
  name: string;
  patients: number;
  arrived: number;
  notArrived: number;
  requested: number;
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
  /** Share of invited patients who arrived — 0–100, drives the card bar/score. */
  arrivalRate: number;
  pressureScore: number;
  pressureLevel: PressureLevel;
  wasteLevel: WasteLevel;
  /** Color band for arrivalRate (higher arrival = better/green). */
  arrivalLevel: WasteLevel;
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

/** Higher arrival rate → “low” waste band (green); poor turnout → high/red. */
function arrivalLevelFor(arrivalRate: number): WasteLevel {
  if (arrivalRate >= 80) { return 'low'; }
  if (arrivalRate >= 55) { return 'moderate'; }
  return 'high';
}

/**
 * Scores every clinic's current "pressure" (how busy/overloaded it is)
 * relative to the busiest clinic in the same dataset:
 *
 *   50% patients seen per open hour   (throughput intensity)
 * + 30% booking load vs. its quota    (AmountToRequest utilization, can exceed 100%)
 * + 20% raw patient volume            (absolute scale)
 *
 * `noShowRate` is intentionally kept separate from the score (not blended
 * in) so a clinic that books a lot but wastes much of it on no-shows isn't
 * hidden by a high score — it shows up as "pressure" + a visible waste flag.
 */
export function computeClinicPressure(inputs: ClinicPressureInput[]): ClinicPressureResult[] {
  const withMetrics = inputs.map((input) => {
    const workingHours = workingHoursOf(input.startTime, input.endTime);
    const patientsPerHour = workingHours > 0 ? input.patients / workingHours : 0;
    const loadRate = input.requested > 0 ? (input.patients / input.requested) * 100 : 0;
    const noShowRate = input.patients > 0 ? (input.notArrived / input.patients) * 100 : 0;
    return { input, workingHours, patientsPerHour, loadRate, noShowRate };
  });

  const maxPatientsPerHour = maxOf(withMetrics.map(m => m.patientsPerHour));
  const maxLoadRate = maxOf(withMetrics.map(m => Math.min(m.loadRate, 150)));
  const maxPatients = maxOf(withMetrics.map(m => m.input.patients));

  return withMetrics.map(({ input, workingHours, patientsPerHour, loadRate, noShowRate }) => {
    const score = Math.round(100 * (
      0.5 * (patientsPerHour / maxPatientsPerHour) +
      0.3 * (Math.min(loadRate, 150) / maxLoadRate) +
      0.2 * (input.patients / maxPatients)
    ));
    const arrivalRate = input.patients > 0
      ? Math.round((input.arrived / input.patients) * 100)
      : 0;

    return {
      ...input,
      workingHours,
      patientsPerHour: Math.round(patientsPerHour * 10) / 10,
      loadRate: Math.round(loadRate),
      noShowRate: Math.round(noShowRate),
      arrivalRate: Math.max(0, Math.min(100, arrivalRate)),
      pressureScore: Math.max(0, Math.min(100, score)),
      pressureLevel: pressureLevelFor(score),
      wasteLevel: wasteLevelFor(noShowRate),
      arrivalLevel: arrivalLevelFor(arrivalRate)
    };
  });
}

export function topByPressure(results: ClinicPressureResult[], count: number): ClinicPressureResult[] {
  return [...results].sort((a, b) => b.pressureScore - a.pressureScore).slice(0, count);
}

export function topByPatients<T extends { patients: number }>(inputs: T[], count: number): T[] {
  return [...inputs].sort((a, b) => b.patients - a.patients).slice(0, count);
}
