export interface F29Country {
  code: string;
  name: string;
  region: string;
}

export interface F29Stage {
  stageNo: number;
  name: string;
}

export interface F29CatalogCaps {
  code: boolean;
  name: boolean;
  doseForm: boolean;
  route: boolean;
  strength: boolean;
  composition: boolean;
  manufacturer: boolean;
  originCountry: boolean;
}

export interface F29Context {
  employeeId: string;
  employeeName: string;
  departmentId: string;
  departmentName: string;
  facilityId: string;
  facilityName: string;
  facilityVerified: boolean;
  templateVersion: string;
  declarationText: string;
  signingEnabled: boolean;
  signingBlockedReason: string;
  drugCatalog: F29CatalogCaps;
  stages: F29Stage[];
}

export interface F29ListItem {
  requestId: number;
  versionNo: number;
  drugCode: string;
  drugName: string;
  departmentName: string;
  requesterName: string;
  createdAt: string;
  status: string;
  statusLabel: string;
  stageLabel: string;
}

export interface F29FileMeta {
  fileId: number;
  fileName: string;
  kind: string;
  addedAt: string;
}

export interface F29Approval {
  stageNo: number;
  roleName: string;
  decision: string;
  actorName: string;
  decidedAt: string;
  decidedOn: string;
  reason: string;
  signatureImage: string;
}

export interface F29Request {
  requestId: number;
  caseId: string;
  versionNo: number;
  status: string;
  statusLabel: string;
  rowVer: string;
  facilityId: string;
  facilityName: string;
  departmentId: string;
  departmentName: string;
  drugCode: string;
  drugName: string;
  doseForm: string;
  route: string;
  strength: string;
  composition: string;
  manufacturer: string;
  originCountry: string;
  drugSnapshotComplete: boolean;
  indication: string;
  rationale: string;
  totalQty: string;
  qtyUnit: string;
  israelStatus: string;
  foreignRegistered: boolean | null;
  countries: F29Country[];
  templateVersion: string;
  declarationText: string;
  contentHash: string;
  createdBy: string;
  createdAt: string;
  submittedBy: string;
  submittedAt: string;
  canEdit: boolean;
  canSign: boolean;
  currentStage: number;
  signingEnabled: boolean;
  signingBlockedReason: string;
  validity: { validFrom: string; validUntil: string } | null;
  nextAction: string;
  stageLabel: string;
  approvals: F29Approval[];
  files: F29FileMeta[];
  stages: F29Stage[];
}

export interface F29DrugHit {
  drugCode: string;
  drugName: string;
  drugNameHe: string;
  drugNameEn: string;
  doseForm: string;
  route: string;
  strength: string;
  composition: string;
  manufacturer: string;
  originCountry: string;
  registrationHolder: string;
  registeredIndications: string;
  healthBasket: string;
  registrationDate: string;
  veterinaryUse: string;
  duplicateCount: number;
  snapshotComplete: boolean;
}
