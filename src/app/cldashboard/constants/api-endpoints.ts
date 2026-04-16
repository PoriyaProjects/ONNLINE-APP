import { environment } from 'src/environments/environment';

export const API_ENDPOINTS = {
  OPERATIONS: `${environment.url}/GetCath?param=4&onlyLastMonth=false`,
  OPERATIONSF: `${environment.url}/GetCath?param=12&onlyLastMonth=false`,
  OPERATIONS_3Y: `${environment.url}/GetCath?param=36&onlyLastMonth=false`,
  INCOME: `${environment.url}/GetIncomeData`,
  INCOME_3Y: `${environment.url}/GetIncomeData`,
  TIME_AVG: `${environment.url}/GetExploitationTimeAvgJson?groupBy`,
  GAUGE: `${environment.url}/GetCurrentCath?param=1&onlyLastMonth=true`,
  EXPLOITATION: `${environment.url}/GetExploitation`,
  WORKING_DAYS: `${environment.url}/GetMonthWorkDays`,
//DEPARTMENTS: `${environment.url}/GetDepartmentList`,
//DEPARTMENTS: `${environment.url}/GetAvailableDepts`,
  DEPARTMENTS: `${environment.url}/GetDepartmentListEx`,  
  PERIODS: `${environment.url}/GetTimeTypes`,
//
  DIMDEPARTMENTS: `${environment.url}/GetDepartmentList`,
  DIMPERIODS: `${environment.url}/GetTimeTypes`,
};
