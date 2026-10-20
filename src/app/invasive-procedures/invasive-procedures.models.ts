/** Maps FetchInvasiveProceduresSummary → d.Departments[] */
export interface InvasiveDepartmentRow {
  Unit: number | string;
  Name: string;
  Total_Cases: number;
  Avg_SignIn_Score: number;
  Avg_TimeOut_Score: number;
  Avg_SignOut_Score: number;
  Avg_Total_Score: number;
  Total_Filled: number;
  Total_NotFilled: number;
  Overall_Fill_Percentage: number;
}

/** Maps FetchInvasiveProceduresCases → d.Cases[] */
export interface InvasiveCaseRow {
  Unit?: number | string;
  Department: string;
  Admission_No: string;
  Medical_Record: string;
  SignIn_Filled: number;
  SignIn_NotFilled: number;
  SignIn_Score: number;
  TimeOut_Filled: number;
  TimeOut_NotFilled: number;
  TimeOut_Score: number;
  SignOut_Filled: number;
  SignOut_NotFilled: number;
  SignOut_Score: number;
  Total_Filled: number;
  Total_NotFilled: number;
  Total_Score: number;
  SignIn_Doctor_Status: string;
  SignIn_Nurse_Status: string;
  TimeOut_Doctor_Status: string;
  TimeOut_Nurse_Status: string;
  SignOut_Doctor_Status: string;
  SignOut_Nurse_Status: string;
}

export interface InvasiveKpis {
  departmentCount: number;
  totalCases: number;
  avgSignIn: number;
  avgTimeOut: number;
  avgSignOut: number;
  avgCase: number;
  filled: number;
  missing: number;
  completion: number;
}

export function emptyKpis(): InvasiveKpis {
  return {
    departmentCount: 0,
    totalCases: 0,
    avgSignIn: 0,
    avgTimeOut: 0,
    avgSignOut: 0,
    avgCase: 0,
    filled: 0,
    missing: 0,
    completion: 0
  };
}

export function computeKpis(rows: InvasiveDepartmentRow[]): InvasiveKpis {
  const kpis = emptyKpis();
  if (!rows || !rows.length) {
    return kpis;
  }
  kpis.departmentCount = rows.length;
  let caseWeight = 0;
  let signInAcc = 0;
  let timeOutAcc = 0;
  let signOutAcc = 0;
  let caseAcc = 0;
  let completionAcc = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const weight = row.Total_Cases > 0 ? row.Total_Cases : 1;
    kpis.totalCases += row.Total_Cases;
    kpis.filled += row.Total_Filled;
    kpis.missing += row.Total_NotFilled;
    signInAcc += row.Avg_SignIn_Score * weight;
    timeOutAcc += row.Avg_TimeOut_Score * weight;
    signOutAcc += row.Avg_SignOut_Score * weight;
    caseAcc += row.Avg_Total_Score * weight;
    completionAcc += row.Overall_Fill_Percentage * weight;
    caseWeight += weight;
  }
  if (caseWeight > 0) {
    kpis.avgSignIn = round1(signInAcc / caseWeight);
    kpis.avgTimeOut = round1(timeOutAcc / caseWeight);
    kpis.avgSignOut = round1(signOutAcc / caseWeight);
    kpis.avgCase = round1(caseAcc / caseWeight);
    kpis.completion = round1(completionAcc / caseWeight);
  }
  const criteriaTotal = kpis.filled + kpis.missing;
  if (criteriaTotal > 0) {
    kpis.completion = round1((kpis.filled / criteriaTotal) * 100);
  }
  return kpis;
}

export function round1(n: number): number {
  if (!isFinite(n)) {
    return 0;
  }
  return Math.round(n * 10) / 10;
}

export function scoreLevel(score: number): 'high' | 'mid' | 'low' {
  if (score >= 90) {
    return 'high';
  }
  if (score >= 70) {
    return 'mid';
  }
  return 'low';
}

/** SQL returns literal "חתום" when signed; any other non-empty text is a missing/problem status. */
export function isSignatureSigned(value: string): boolean {
  return (value || '').trim() === 'חתום';
}

export function signatureDisplayText(value: string): string {
  const text = (value || '').trim();
  return text || '—';
}
