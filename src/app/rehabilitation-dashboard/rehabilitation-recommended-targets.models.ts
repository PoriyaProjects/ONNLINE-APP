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
  /** Sum of daily occupied-patient counts in the bucket (optional rollup field from API). */
  totalOccupiedPatientDays?: number;
  /** Days included in this bucket (optional rollup field from API). */
  daysInPeriod?: number;
}
