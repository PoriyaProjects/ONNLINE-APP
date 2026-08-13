/** DTO aligned with backend RehabilitationRecommendedTarget (C#). */
export interface RehabilitationRecommendedTargetDto {
  date: string;
  unit: number;
  departmentName: string;
  actualValue: number;
  targetValue: number;
  gap: number;
  metricType: string;
  status: string;
}
