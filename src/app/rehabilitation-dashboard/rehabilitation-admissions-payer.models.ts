/** DTO aligned with backend RehabilitationAdmissionsByPayer (C#). */
export interface RehabilitationAdmissionsByPayerDto {
  date: string;
  payerCategory: string;
  payerName: string;
  admissionsCount: number;
  unit: number;
  departmentName: string;
}
