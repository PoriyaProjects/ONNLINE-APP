// A document/certification type that can be added from the admin screen without a code
// change — SOC2, privacy documents, and whatever comes next.
export interface DocumentType {
  id: number;
  label: string;
  isActive: boolean;
  displayOrder: number;
}

// One supplier's status for one dynamic document type. The server returns an entry for
// every active type, so a supplier that has never been assessed still gets a blank row.
export interface SupplierDocumentStatus {
  documentTypeId: number;
  label: string;
  status: string | null;
  notes: string | null;
}

// One recorded change to a document status. `changedBy` is null when the request arrived
// without Windows Authentication.
export interface DocumentHistoryEntry {
  documentTypeId: number;
  label: string | null;
  oldStatus: string | null;
  newStatus: string | null;
  changedBy: string | null;
  changedAt: string;
}

// `truncated` is true when the supplier has more changes than the server returns.
export interface DocumentHistory {
  truncated: boolean;
  entries: DocumentHistoryEntry[];
}

export interface Supplier {
  id: number;
  name: string;
  service: string | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  nature: string | null;
  connectionType: string | null;
  authenticationMethod: string | null;
  securityMeasures: string | null;
  isoCertified: string | null;
  systemType: string | null;
  ndaSignedBy: string | null;
  ndaSigned: string | null;
  cloudCommitteeFormStatus: string | null;
  infosecQuestionnaireDocStatus: string | null;
  procurementTechQuestionnaireStatus: string | null;
  businessContinuityRisk: string | null;
  dataSensitivityRisk: string | null;
  financialRisk: string | null;
  likelihoodRisk: string | null;
  status: string;
  lastReviewDate: string | null;
  reviewNotes: string | null;
  reviewType: string | null;
  reviewStatus: string | null;
  nextReviewDate: string | null;
  riskScore: string | null;
  reviewRecommendations: string | null;
  notes: string | null;
  extraDocuments: SupplierDocumentStatus[];
  createdAt: string;
  updatedAt: string | null;
  hativaApproved: string | null;
  isCloudProduct: string | null;

  // Computed / DB-computed (server-provided, read-only)
  isDivision: boolean;
  isApproved: boolean;
  isMohSuspect: boolean;
  category: string;
  criticalityTier: string;
  recommendedAction: string;
  recommendedActionLevel: 'critical' | 'warning' | 'good' | 'muted' | string;
  missingContactFields: string[];
  isCriticalSupplier: boolean | null;
}

export type SupplierUpsert = Omit<
  Supplier,
  'id' | 'createdAt' | 'updatedAt' | 'isDivision' | 'isApproved' | 'isMohSuspect' |
  'category' | 'criticalityTier' | 'recommendedAction' | 'recommendedActionLevel' | 'missingContactFields' |
  'isCriticalSupplier'
>;

export interface SupplierOptions {
  nature: string[];
  connectionType: string[];
  authenticationMethod: string[];
  securityMeasures: string[];
  isoCertified: string[];
  systemType: string[];
  docStatus: string[];
  extraDocStatus: string[];
  riskLevel: string[];
  reviewType: string[];
  reviewStatus: string[];
  riskScore: string[];
  status: string[];
  supplierFoldersBasePath: string | null;
}

export function emptySupplier(): SupplierUpsert {
  return {
    name: '',
    service: '',
    contactPerson: '',
    email: '',
    phone: '',
    nature: '',
    connectionType: '',
    authenticationMethod: '',
    securityMeasures: '',
    isoCertified: '',
    systemType: '',
    ndaSignedBy: '',
    ndaSigned: '',
    cloudCommitteeFormStatus: '',
    infosecQuestionnaireDocStatus: '',
    procurementTechQuestionnaireStatus: '',
    businessContinuityRisk: '',
    dataSensitivityRisk: '',
    financialRisk: '',
    likelihoodRisk: '',
    status: 'פעיל',
    lastReviewDate: null,
    reviewNotes: '',
    reviewType: '',
    reviewStatus: '',
    nextReviewDate: null,
    riskScore: '',
    reviewRecommendations: '',
    notes: '',
    extraDocuments: [],
    hativaApproved: '',
    isCloudProduct: '',
  };
}
