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
  SignIn_Doctor_Percentage: number;
  SignIn_Nurse_Percentage: number;
  SignIn_Anesthetist_Percentage: number | null;
  TimeOut_Doctor_Percentage: number;
  TimeOut_Nurse_Percentage: number;
  SignOut_Doctor_Percentage: number;
  SignOut_Nurse_Percentage: number;
}

/** Maps FetchInvasiveProceduresCases → d.Cases[] */
export interface InvasiveCaseRow {
  Unit?: number | string;
  Department: string;
  Admission_No: string;
  Medical_Record: string;
  Procedure_Name: string;
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
  SignIn_Anesthetist_Status: string;
  TimeOut_Doctor_Status: string;
  TimeOut_Nurse_Status: string;
  SignOut_Doctor_Status: string;
  SignOut_Nurse_Status: string;
  SignIn_Doctor_Name: string;
  SignIn_Nurse_Name: string;
  SignIn_Anesthetist_Name: string;
  TimeOut_Doctor_Name: string;
  TimeOut_Nurse_Name: string;
  SignOut_Doctor_Name: string;
  SignOut_Nurse_Name: string;
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

export function signatureCellDisplay(name: string, status: string): string {
  const trimmedName = (name || '').trim();
  if (trimmedName) {
    return trimmedName;
  }
  const trimmedStatus = (status || '').trim();
  return trimmedStatus || '—';
}

export function signatureCellIsOk(name: string, status: string): boolean {
  if ((name || '').trim()) {
    return true;
  }
  return isSignatureSigned(status);
}

export type InvasiveDateFilterMode = 'quarters' | 'custom';
export type QuarterNumber = 1 | 2 | 3 | 4;
export type InvasiveQuarterFilter = 'all' | QuarterNumber;

export const ALL_QUARTERS: QuarterNumber[] = [1, 2, 3, 4];

export interface InvasiveWeightedScore {
  filled: number;
  missing: number;
  expected: number;
  score: number;
}

export interface InvasiveQuarterScore extends InvasiveWeightedScore {
  quarter: 1 | 2 | 3 | 4;
  label: string;
  rangeLabel: string;
}

export function filterDepartments(
  rows: InvasiveDepartmentRow[],
  selectedNames: string[] | null | undefined
): InvasiveDepartmentRow[] {
  if (!rows || !rows.length) {
    return [];
  }
  if (!selectedNames || !selectedNames.length) {
    return rows.slice();
  }
  const selected = new Set(selectedNames);
  return rows.filter(row => selected.has(row.Name));
}

export interface InvasiveDepartmentChartItem {
  name: string;
  departmentName: string;
  quarter?: QuarterNumber;
  quarterLabel?: string;
  rangeLabel: string;
  score: number;
  /** Mean of case Total_Score — same metric as department Avg_Total_Score. */
  avgTotalScore: number;
  filled: number;
  missing: number;
}

/** Global dashboard rule: include only cases with at least one completed field. */
export function filterEligibleCases(rows: InvasiveCaseRow[]): InvasiveCaseRow[] {
  if (!rows || !rows.length) {
    return [];
  }
  return rows.filter(row => (row.Total_Filled || 0) > 0);
}

export function filterCasesWithCompletedFields(rows: InvasiveCaseRow[]): InvasiveCaseRow[] {
  return filterEligibleCases(rows);
}

function departmentGroupKey(row: InvasiveCaseRow): string {
  return (row.Department || '').trim() + '\u0001' + String(row.Unit != null ? row.Unit : '');
}

export function buildDepartmentSummariesFromCases(cases: InvasiveCaseRow[]): InvasiveDepartmentRow[] {
  const eligible = filterEligibleCases(cases);
  if (!eligible.length) {
    return [];
  }
  const groups = new Map<string, {
    Name: string;
    Unit: number | string;
    totalCases: number;
    totalFilled: number;
    totalNotFilled: number;
    signInAcc: number;
    timeOutAcc: number;
    signOutAcc: number;
    totalScoreAcc: number;
  }>();

  for (let i = 0; i < eligible.length; i++) {
    const row = eligible[i];
    const key = departmentGroupKey(row);
    let group = groups.get(key);
    if (!group) {
      group = {
        Name: row.Department || '',
        Unit: row.Unit != null ? row.Unit : '',
        totalCases: 0,
        totalFilled: 0,
        totalNotFilled: 0,
        signInAcc: 0,
        timeOutAcc: 0,
        signOutAcc: 0,
        totalScoreAcc: 0
      };
      groups.set(key, group);
    }
    group.totalCases += 1;
    group.totalFilled += row.Total_Filled || 0;
    group.totalNotFilled += row.Total_NotFilled || 0;
    group.signInAcc += row.SignIn_Score || 0;
    group.timeOutAcc += row.TimeOut_Score || 0;
    group.signOutAcc += row.SignOut_Score || 0;
    group.totalScoreAcc += row.Total_Score || 0;
  }

  const rows: InvasiveDepartmentRow[] = [];
  groups.forEach(group => {
    const criteriaTotal = group.totalFilled + group.totalNotFilled;
    const completion = criteriaTotal > 0
      ? round1((group.totalFilled / criteriaTotal) * 100)
      : 0;
    const weight = group.totalCases > 0 ? group.totalCases : 1;
    rows.push({
      Unit: group.Unit,
      Name: group.Name,
      Total_Cases: group.totalCases,
      Avg_SignIn_Score: round1(group.signInAcc / weight),
      Avg_TimeOut_Score: round1(group.timeOutAcc / weight),
      Avg_SignOut_Score: round1(group.signOutAcc / weight),
      Avg_Total_Score: round1(group.totalScoreAcc / weight),
      Total_Filled: group.totalFilled,
      Total_NotFilled: group.totalNotFilled,
      Overall_Fill_Percentage: completion,
      SignIn_Doctor_Percentage: 0,
      SignIn_Nurse_Percentage: 0,
      SignIn_Anesthetist_Percentage: null,
      TimeOut_Doctor_Percentage: 0,
      TimeOut_Nurse_Percentage: 0,
      SignOut_Doctor_Percentage: 0,
      SignOut_Nurse_Percentage: 0
    });
  });

  rows.sort((a, b) => {
    const nameCmp = a.Name.localeCompare(b.Name, 'he');
    if (nameCmp !== 0) {
      return nameCmp;
    }
    return String(a.Unit).localeCompare(String(b.Unit), 'he');
  });
  return rows;
}

export function applySignaturePercentages(
  rows: InvasiveDepartmentRow[],
  source: InvasiveDepartmentRow[]
): InvasiveDepartmentRow[] {
  if (!rows || !rows.length) {
    return rows || [];
  }
  const byKey = new Map<string, InvasiveDepartmentRow>();
  const byName = new Map<string, InvasiveDepartmentRow[]>();
  const list = source || [];
  for (let i = 0; i < list.length; i++) {
    const src = list[i];
    byKey.set(signatureDeptKey(src.Name, src.Unit), src);
    const name = (src.Name || '').trim();
    const bucket = byName.get(name);
    if (bucket) {
      bucket.push(src);
    } else {
      byName.set(name, [src]);
    }
  }
  return rows.map(row => {
    const named = byName.get((row.Name || '').trim());
    const match = byKey.get(signatureDeptKey(row.Name, row.Unit))
      || (named && named.length === 1 ? named[0] : null);
    if (!match) {
      return row;
    }
    return {
      ...row,
      SignIn_Doctor_Percentage: match.SignIn_Doctor_Percentage,
      SignIn_Nurse_Percentage: match.SignIn_Nurse_Percentage,
      SignIn_Anesthetist_Percentage: match.SignIn_Anesthetist_Percentage,
      TimeOut_Doctor_Percentage: match.TimeOut_Doctor_Percentage,
      TimeOut_Nurse_Percentage: match.TimeOut_Nurse_Percentage,
      SignOut_Doctor_Percentage: match.SignOut_Doctor_Percentage,
      SignOut_Nurse_Percentage: match.SignOut_Nurse_Percentage
    };
  });
}

function signatureDeptKey(name: string, unit: number | string | undefined): string {
  return (name || '').trim() + '\u0001' + String(unit != null ? unit : '');
}

export function computeKpisFromCases(cases: InvasiveCaseRow[]): InvasiveKpis {
  const eligible = filterEligibleCases(cases);
  const kpis = emptyKpis();
  if (!eligible.length) {
    return kpis;
  }
  const departments = buildDepartmentSummariesFromCases(eligible);
  kpis.departmentCount = departments.length;
  kpis.totalCases = eligible.length;
  let signInAcc = 0;
  let timeOutAcc = 0;
  let signOutAcc = 0;
  let totalScoreAcc = 0;
  for (let i = 0; i < eligible.length; i++) {
    const row = eligible[i];
    kpis.filled += row.Total_Filled || 0;
    kpis.missing += row.Total_NotFilled || 0;
    signInAcc += row.SignIn_Score || 0;
    timeOutAcc += row.TimeOut_Score || 0;
    signOutAcc += row.SignOut_Score || 0;
    totalScoreAcc += row.Total_Score || 0;
  }
  const caseCount = eligible.length;
  kpis.avgSignIn = round1(signInAcc / caseCount);
  kpis.avgTimeOut = round1(timeOutAcc / caseCount);
  kpis.avgSignOut = round1(signOutAcc / caseCount);
  kpis.avgCase = round1(totalScoreAcc / caseCount);
  const criteriaTotal = kpis.filled + kpis.missing;
  if (criteriaTotal > 0) {
    kpis.completion = round1((kpis.filled / criteriaTotal) * 100);
  }
  return kpis;
}

export function departmentOptionsFromCases(cases: InvasiveCaseRow[]): string[] {
  const eligible = filterEligibleCases(cases);
  const seen = new Set<string>();
  const names: string[] = [];
  for (let i = 0; i < eligible.length; i++) {
    const name = (eligible[i].Department || '').trim();
    if (!name || seen.has(name)) {
      continue;
    }
    seen.add(name);
    names.push(name);
  }
  names.sort((a, b) => a.localeCompare(b, 'he'));
  return names;
}

function aggregateCasesByDepartmentName(cases: InvasiveCaseRow[]): Map<string, InvasiveCaseRow[]> {
  const map = new Map<string, InvasiveCaseRow[]>();
  for (let i = 0; i < cases.length; i++) {
    const name = (cases[i].Department || '').trim();
    if (!name) {
      continue;
    }
    const bucket = map.get(name);
    if (bucket) {
      bucket.push(cases[i]);
    } else {
      map.set(name, [cases[i]]);
    }
  }
  return map;
}

function weightedCompletionFromCases(cases: InvasiveCaseRow[]): InvasiveWeightedScore {
  let filled = 0;
  let missing = 0;
  for (let i = 0; i < cases.length; i++) {
    filled += cases[i].Total_Filled || 0;
    missing += cases[i].Total_NotFilled || 0;
  }
  const expected = filled + missing;
  const score = expected > 0 ? round1((filled / expected) * 100) : 0;
  return { filled, missing, expected, score };
}

function averageTotalScore(cases: InvasiveCaseRow[]): number {
  if (!cases.length) {
    return 0;
  }
  let acc = 0;
  for (let i = 0; i < cases.length; i++) {
    acc += cases[i].Total_Score || 0;
  }
  return round1(acc / cases.length);
}

function sortChartItemsByAvgTotalScore(items: InvasiveDepartmentChartItem[]): void {
  items.sort((a, b) => {
    const byScore = (b.avgTotalScore || 0) - (a.avgTotalScore || 0);
    if (byScore !== 0) {
      return byScore;
    }
    const byDept = a.departmentName.localeCompare(b.departmentName, 'he');
    if (byDept !== 0) {
      return byDept;
    }
    return (a.quarter || 0) - (b.quarter || 0);
  });
}

export function buildDepartmentQuarterChartItems(
  parts: { quarter: QuarterNumber; cases: InvasiveCaseRow[] }[],
  selectedDepartmentNames: string[],
  year: number
): InvasiveDepartmentChartItem[] {
  const allowed = selectedDepartmentNames && selectedDepartmentNames.length
    ? new Set(selectedDepartmentNames)
    : null;
  const items: InvasiveDepartmentChartItem[] = [];

  for (let pi = 0; pi < parts.length; pi++) {
    const part = parts[pi];
    let eligible = filterEligibleCases(part.cases || []);
    if (allowed) {
      eligible = eligible.filter(row => allowed.has(row.Department));
    }
    const groups = aggregateCasesByDepartmentName(eligible);
    groups.forEach((deptCases, departmentName) => {
      const w = weightedCompletionFromCases(deptCases);
      if (w.expected <= 0) {
        return;
      }
      const quarterLabel = 'Q' + part.quarter;
      items.push({
        name: departmentName + ' – ' + quarterLabel,
        departmentName,
        quarter: part.quarter,
        quarterLabel,
        rangeLabel: quarterRangeLabel(year, part.quarter),
        score: w.score,
        avgTotalScore: averageTotalScore(deptCases),
        filled: w.filled,
        missing: w.missing
      });
    });
  }

  sortChartItemsByAvgTotalScore(items);
  return items;
}

export function buildDepartmentCustomRangeChartItems(
  cases: InvasiveCaseRow[],
  from: Date,
  to: Date
): InvasiveDepartmentChartItem[] {
  const eligible = filterEligibleCases(cases);
  const groups = aggregateCasesByDepartmentName(eligible);
  const rangeLabel = formatDateRangeLabel(from, to);
  const items: InvasiveDepartmentChartItem[] = [];
  groups.forEach((deptCases, departmentName) => {
    const w = weightedCompletionFromCases(deptCases);
    if (w.expected <= 0) {
      return;
    }
    items.push({
      name: departmentName,
      departmentName,
      rangeLabel,
      score: w.score,
      avgTotalScore: averageTotalScore(deptCases),
      filled: w.filled,
      missing: w.missing
    });
  });
  sortChartItemsByAvgTotalScore(items);
  return items;
}

export function filterCases(
  rows: InvasiveCaseRow[],
  selectedNames: string[] | null | undefined
): InvasiveCaseRow[] {
  if (!rows || !rows.length) {
    return [];
  }
  if (!selectedNames || !selectedNames.length) {
    return rows.slice();
  }
  const selected = new Set(selectedNames);
  return rows.filter(row => selected.has(row.Department));
}

export function weightedCompletion(rows: InvasiveDepartmentRow[]): InvasiveWeightedScore {
  let filled = 0;
  let missing = 0;
  for (let i = 0; i < rows.length; i++) {
    filled += rows[i].Total_Filled;
    missing += rows[i].Total_NotFilled;
  }
  const expected = filled + missing;
  const score = expected > 0 ? round1((filled / expected) * 100) : 0;
  return { filled, missing, expected, score };
}

export function quarterDateRange(year: number, quarter: 1 | 2 | 3 | 4): { from: Date; to: Date } {
  const startMonth = (quarter - 1) * 3;
  const from = new Date(year, startMonth, 1);
  from.setHours(0, 0, 0, 0);
  const to = new Date(year, startMonth + 3, 0);
  to.setHours(0, 0, 0, 0);
  return { from, to };
}

export function yearDateRange(year: number, quarter: InvasiveQuarterFilter): { from: Date; to: Date } {
  if (quarter !== 'all') {
    return quarterDateRange(year, quarter);
  }
  return fullYearDateRange(year);
}

export function fullYearDateRange(year: number): { from: Date; to: Date } {
  const from = new Date(year, 0, 1);
  from.setHours(0, 0, 0, 0);
  const endOfYear = new Date(year, 11, 31);
  endOfYear.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const to = year === today.getFullYear() && endOfYear.getTime() > today.getTime() ? today : endOfYear;
  return { from, to };
}

export function multiQuarterDateRange(year: number, quarters: QuarterNumber[]): { from: Date; to: Date } | null {
  if (!quarters || !quarters.length) {
    return null;
  }
  const unique = Array.from(new Set(quarters)).sort((a, b) => a - b) as QuarterNumber[];
  if (unique.length === ALL_QUARTERS.length) {
    return fullYearDateRange(year);
  }
  const first = quarterDateRange(year, unique[0]);
  const last = quarterDateRange(year, unique[unique.length - 1]);
  return { from: first.from, to: last.to };
}

export function resolveFilterDateRange(
  mode: InvasiveDateFilterMode,
  year: number,
  quarters: QuarterNumber[],
  customFrom: Date | null,
  customTo: Date | null
): { from: Date; to: Date } | null {
  if (mode === 'custom') {
    if (!customFrom || !customTo || isNaN(customFrom.getTime()) || isNaN(customTo.getTime())) {
      return null;
    }
    const from = new Date(customFrom.getTime());
    const to = new Date(customTo.getTime());
    from.setHours(0, 0, 0, 0);
    to.setHours(0, 0, 0, 0);
    return { from, to };
  }
  return multiQuarterDateRange(year, quarters);
}

export function formatDateRangeLabel(from: Date, to: Date): string {
  if (!from || !to || isNaN(from.getTime()) || isNaN(to.getTime())) {
    return '';
  }
  const pad = (n: number) => ('0' + n).slice(-2);
  const fmt = (d: Date) => pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
  return fmt(from) + ' – ' + fmt(to);
}

export function quarterRangeLabel(year: number, quarter: 1 | 2 | 3 | 4): string {
  const months = [
    'ינואר–מרץ',
    'אפריל–יוני',
    'יולי–ספטמבר',
    'אוקטובר–דצמבר'
  ];
  return months[quarter - 1] + ' ' + year;
}

export function buildYearOptions(anchorYear?: number): number[] {
  const end = anchorYear != null ? anchorYear : new Date().getFullYear();
  const years: number[] = [];
  for (let y = end; y >= end - 6; y--) {
    years.push(y);
  }
  return years;
}
