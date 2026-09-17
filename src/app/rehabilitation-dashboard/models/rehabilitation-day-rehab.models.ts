/** DTOs aligned with backend DayRehab* classes (C#). */
export interface DayRehabPatientsByPayerDto {
  date: string;
  payerName: string;
  patientCount: number;
  departmentName: string;
}

export interface DayRehabPatientsByDirectionDto {
  date: string;
  direction: string;
  funderName: string;
  patientCount: number;
  departmentName: string;
}

export interface DayRehabDischargesWithRecommendationDto {
  date: string;
  dischargeCount: number;
  treatedHere: number;
  notTreatedHere: number;
  departmentName: string;
}

export interface DayRehabTreatmentsDailyCumulativeDto {
  date: string;
  dailyCount: number;
  cumulativeCount: number;
  departmentName: string;
}

export interface DayRehabTreatmentsBySectorDto {
  date: string;
  sectorName: string;
  treatmentCount: number;
  departmentName: string;
}

export interface DayRehabTreatmentsPerPositionDto {
  date: string;
  sectorName: string;
  treatmentsPerPosition: number;
  departmentName: string;
}

export interface DayRehabAvgTreatmentsPerPatientDto {
  date: string;
  avgTreatments: number;
  patientCount: number;
  departmentName: string;
}

export interface DayRehabTreatmentsIndividualGroupDto {
  date: string;
  treatmentType: string;
  treatmentCount: number;
  departmentName: string;
}

export type DayRehabApiRows =
  | DayRehabPatientsByPayerDto[]
  | DayRehabPatientsByDirectionDto[]
  | DayRehabDischargesWithRecommendationDto[]
  | DayRehabTreatmentsDailyCumulativeDto[]
  | DayRehabTreatmentsBySectorDto[]
  | DayRehabTreatmentsPerPositionDto[]
  | DayRehabAvgTreatmentsPerPatientDto[]
  | DayRehabTreatmentsIndividualGroupDto[];

export const REHAB_DAY_API_BLOCK_CODES = ['2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8'] as const;

export type RehabDayApiBlockCode = typeof REHAB_DAY_API_BLOCK_CODES[number];

export const REHAB_DAY_METRIC_TO_BLOCK: Record<string, RehabDayApiBlockCode> = {
  'day-patients-payer': '2.1',
  'day-patients-internal-external': '2.2',
  'day-discharges-recommendation': '2.3',
  'day-treatments-daily-cumulative': '2.4',
  'day-treatments-sectors': '2.5',
  'day-treatments-per-position': '2.6',
  'day-avg-treatments-per-patient': '2.7',
  'day-treatments-individual-group': '2.8',
};

export function getDayRehabBlockCodeForMetric(metricKey: string): RehabDayApiBlockCode | null {
  return REHAB_DAY_METRIC_TO_BLOCK[metricKey] ?? null;
}
