/** Label for admissions without an assigned payer (shown in table, excluded from pie). */
export const REHAB_UNASSIGNED_PAYER_LABEL = 'טרם שוייך';

const LEGACY_UNASSIGNED_PAYER_LABELS = new Set(['', 'לא ידוע']);

export function normalizePayerName(name: string | null | undefined): string {
  const trimmed = String(name ?? '').trim();
  if (LEGACY_UNASSIGNED_PAYER_LABELS.has(trimmed)) {
    return REHAB_UNASSIGNED_PAYER_LABEL;
  }
  return trimmed;
}

export function isUnassignedPayerName(name: string): boolean {
  return normalizePayerName(name) === REHAB_UNASSIGNED_PAYER_LABEL;
}

/** DTO aligned with backend RehabilitationAdmissionsByPayer (C#). */
export interface RehabilitationAdmissionsByPayerDto {
  date: string;
  payerCategory: string;
  payerName: string;
  admissionsCount: number;
  unit: number;
  departmentName: string;
}
