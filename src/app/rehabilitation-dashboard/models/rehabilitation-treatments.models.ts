/** DTO aligned with backend RehabilitationTreatment (C#). */
export interface RehabilitationTreatmentDto {
  date: string;
  professionName: string;
  totalTreatments: number;
  avgPerPatientDay: number;
  unit: number;
  departmentName: string;
  weekdayOnly: boolean;
}

export const REHAB_TREATMENT_PROFESSION_ORDER = [
  'פיזיותרפיה',
  'ריפוי בעיסוק',
  'קלינאות תקשורת',
  'פסיכולוגיה',
  'סיעוד שיקומי',
] as const;
