import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from "src/environments/environment";

@Injectable({ providedIn: 'root' })
export class ChartDataService {
  constructor(private http: HttpClient) {}

  getGaugeData(departmentId: string): Observable<any> {
    //return this.http.get(`api/operations/monthlyGauge?departmentId=${departmentId}`);
    return this.http.get(`${environment.url}/nGetCurrentCath?param=1&onlyLastMonth=true`);
  }

  getMonthlyOpsData(departmentId: string): Observable<any> {
    return this.http.get(`${environment.url}/nGetCath?param=4&onlyLastMonth=false`);
  }

  getFinancialData(): Observable<any> {
    return this.http.get(`${environment.url}/nGetTIncomeData`);
  }

  getIncomeTrendData(): Observable<any> {
    return this.http.get(`${environment.url}/nGetTIncomeData`);
  }

  getIncomeBarData(): Observable<any> {
    return this.http.get('http://localhost:64964/WebService.asmx/GetIncomeBarData', {
      responseType: 'json'
    });
  }
}

