/** DTO aligned with backend RehabilitationOccupancy (C#). */
export interface RehabilitationOccupancyDto {
  date: string;
  unit: number;
  departmentName: string;
  occupiedPatients: number;
}

export interface RehabOccupancyDateRange {
  fromDate: string;
  toDate: string;
}
