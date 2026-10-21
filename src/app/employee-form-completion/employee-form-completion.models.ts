/** Maps FetchEmployeeFormCompletion → d */
export interface EmployeeFormCompletionResult {
  TotalEmployees: number;
  CompletedEmployees: number;
  CompletionRate: number;
  Employees: EmployeeFormCompletionRow[];
}

export interface EmployeeFormCompletionRow {
  EmployeeID: string;
  FirstName: string;
  LastName: string;
  Department: string;
  HasCompletedForm: boolean;
  FormFillId: string;
}

export function emptyResult(): EmployeeFormCompletionResult {
  return {
    TotalEmployees: 0,
    CompletedEmployees: 0,
    CompletionRate: 0,
    Employees: [],
  };
}
