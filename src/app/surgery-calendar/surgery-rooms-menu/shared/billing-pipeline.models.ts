export type BillingPipelineDepartment = 'orthopedic' | 'cardiology' | 'other';
export type BillingPipelineCheckInType = 'emergency' | 'elective';

export interface BillingPipelineLookupInput {
  hospReport: string;
  diagnosis?: string;
  department: BillingPipelineDepartment;
  surgeryDate: string;
  hospitalizationDate?: string;
  releaseDate?: string;
  checkInType: BillingPipelineCheckInType;
  icd9Diagnosis?: string[];
}

export interface TextToIcd9Response {
  procedure_names?: string[];
  icd9_codes?: string[];
  is_primary_procedure?: Record<string, boolean>;
  chosen_surgeries?: Record<string, {
    icd9_code?: string;
    confidence?: number;
  }>;
  error?: string;
}

export interface Icd9ToDrgResponse {
  drg_codes?: string[];
  service_code_prices?: Record<string, number>;
  chosen_service_code?: string;
  hospitalization_duration?: number | null;
  error?: string;
}

export interface BillingPipelineLookupResult {
  serviceCode: string;
  price: number;
  icd9Codes: string[];
  drgCodes: string[];
}
