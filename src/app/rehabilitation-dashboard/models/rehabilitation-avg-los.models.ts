/** DTO aligned with backend RehabilitationAvgLengthOfStay (C#). */
export interface RehabilitationAvgLengthOfStayDto {
  date: string;
  unit: number;
  departmentName: string;
  avgLosDays: number;
  patientCount: number;
}
