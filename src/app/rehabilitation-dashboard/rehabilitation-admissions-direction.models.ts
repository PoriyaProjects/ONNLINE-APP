/** DTO aligned with backend RehabilitationAdmissionsByDirection (C#). */
export interface RehabilitationAdmissionsByDirectionDto {
  date: string;
  funderName: string; // קופת חולים | צה״ל + משרד הביטחון | פרטי | אחר
  direction: string;
  admissionsCount: number;
  unit: number;
  departmentName: string;
}
