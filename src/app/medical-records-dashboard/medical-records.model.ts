export interface BoxStatusSummary {
  Remarks: string;
  BoxCount: number;
}

export interface CasesPerDateSummary {
  MDate: string;
  TotalCases: number;
}

export interface MissingCasesSummary {
  BoxID: string;
  MissingCount: number;
}

export interface BoxDetailRow {
  BoxID: string;
  InsertDate: string;
  QOnnline?: number | null;
  QNamer: number;
  BoxStatus: number;
  Remarks: string;
}

export interface CaseDetailRow {
  BoxID: string;
  CaseNumber: string;
  SavedByImageStore: string;
  MDate: string;
}

export interface WrongCaseDetailRow {
  BoxID: string;
  CaseNumber: string;
}

export interface MedicalRecordsDashboardDTO {
  BoxStatusSummaries: BoxStatusSummary[];
  CasesPerDateSummaries: CasesPerDateSummary[];
  MissingCasesSummaries: MissingCasesSummary[];
  BoxDetails: BoxDetailRow[];
  CaseDetails: CaseDetailRow[];
  WrongCaseDetails: WrongCaseDetailRow[];
}
