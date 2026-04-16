import { AfterViewInit, ElementRef, Injectable, Input, OnChanges, OnInit, ViewChild } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { formatDateForApi } from '../utils/api-utils';
import { toChartData } from '../utils/date-utils';
import { ChartLoaderService } from '../utils/google-charts-loader';
import { sanitizeApiJson } from '../utils/sanitize-util';
import { catchError, map, timeout } from 'rxjs/operators';
import { RevenueDataPoint } from '../components/cl-dashboard-overview/cl-dashboard-overview.component';
import { tap } from 'rxjs/operators';

export interface ChargingDataRow {
  groupName: string;
  deptName: string;
  year: string;
  charging: number;
}


@Injectable({ providedIn: 'root' })
export class OperationalChartService {
  fetchRevenueVsBudget(deptCode: string) {
    return of(null); 
    throw new Error('Method not implemented.');
  }
  fetchRevenuePerPatient(deptCode: string) {
    return of(null); 
    throw new Error('Method not implemented.');
  }
  fetchRevenueByPayer(deptCode: string) {
    return of(null); 
    throw new Error('Method not implemented.');
  }
  fetchOperatingMargin(deptCode: string) {
    return of(null); 
    throw new Error('Method not implemented.');
  }
  fetchEbitdaMargin(deptCode: string) {
    return of(null); 
    throw new Error('Method not implemented.');
  }
  fetchDepartmentProfitability(deptCode: string) {
    return of(null); 
    throw new Error('Method not implemented.');
  }
  fetchStaffingCosts(deptCode: string) {
    return of(null); 
    throw new Error('Method not implemented.');
  }
  fetchFixedVariableCosts(deptCode: string) {
    return of(null); 
    throw new Error('Method not implemented.');
  }
  fetchExpensesByDepartments(deptCode: string) {
    return of(null); 
    throw new Error('Method not implemented.');
  }
  fetchEquipmentCosts(deptCode: string) {
    return of(null); 
    throw new Error('Method not implemented.');
  }
  fetchDSO(deptCode: string) {
    return of(null); 
    throw new Error('Method not implemented.');
  }
  fetchCashOnHand(deptCode: string) {
    return of(null); 
    throw new Error('Method not implemented.');
  }
  fetchCashCollectionsRate(deptCode: string) {
    return of(null); 
    throw new Error('Method not implemented.');
  }
  fetchBadDebtRate(deptCode: string) {
    return of(null); 
    throw new Error('Method not implemented.');
  }
  fetchARAging(deptCode: string) {
    return of(null); 
    throw new Error('Method not implemented.');
  }
  fetchDenialRate(deptCode: string) {
    return of(null); 
    throw new Error('Method not implemented.');
  }
  fetchTotalRevenuePieChartEx(start: string, end: string, period: string) {
    return of(null); 
    throw new Error('Method not implemented.');
  }
  fetchMonthlyOps(deptCode: string) {
    return of(null); 
    throw new Error('Method not implemented.');
  }
  fetchGaugeData(deptCode: string) {
    return of(null); 
    throw new Error('Method not implemented.');
  }
  fetchLineTrend(deptCode: string) {
    return of(null); 
    throw new Error('Method not implemented.');
  }
  fetchClaimProcessingTime(deptCode: string) {
    return of(null); 
    throw new Error('Method not implemented.');
  }
  fetchBillingErrors(deptCode: string) {
    return of(null); 
    throw new Error('Method not implemented.');
  }
  
  fetchAppealSuccessRate(deptCode: string) {
    return of(null); 
    throw new Error('Method not implemented.');
  }

  private revenueDataCache: { [key: string]: { label: string; value: number; dept: string }[] } = {};


  private getRevenueKey(startDate: string, endDate: string, dept: string, granularity: string): string {
    return `${startDate}_${endDate}_${dept}_${granularity}`;
  }

  
  fetchCompareRevenueDataOnce(groupDeptId: string = '', deptId: string = ''): Observable<ChargingDataRow[]> {
    const url = `${environment.url}/GetChargingChartData?groupName=${encodeURIComponent(groupDeptId)}&deptId=${encodeURIComponent(deptId)}`;
  
    return this.http.get(url, { responseType: 'text' }).pipe(
      map(response => {
        let jsonString = response;
  
        // Handle WCF XML <string> wrapper
        const match = response.match(/<string[^>]*>(.*?)<\/string>/);
        if (match && match[1]) {
          jsonString = match[1];
        }
  
        try {
          let parsed: unknown = JSON.parse(jsonString);
  
          // Handle double-encoded JSON
          if (typeof parsed === 'string') {
            parsed = JSON.parse(parsed);
          }
  
          if (!Array.isArray(parsed)) {
            console.error('[OperationalChartService] ❌ Response is not an array. Parsed value:', parsed);
            throw new Error('Expected an array from server');
          }
  
          // ✅ Sort chronologically by year (e.g. -5 → -1)
          const sorted = (parsed as ChargingDataRow[]).sort(
            (a, b) => parseInt(a.year, 10) - parseInt(b.year, 10)
          );
  
          return sorted;
        } catch (e) {
          console.error('[OperationalChartService] ❌ JSON parsing failed:', e, '\nOriginal:', jsonString);
          throw e;
        }
      })
    );
  }
  
  
  fetchCompareMRevenueDataOnce(deptGroupId: string | number): Observable<{ aliasName: string; TotalCharging: number }[]> {
    const deptParam = deptGroupId ? deptGroupId : '';
    const url = `${environment.url}/GetIncome?dimTimeTypeId=6&subDescFilter=${deptParam}`;

    return this.http.get(url, { responseType: 'text' }).pipe(
      tap((rawXml) => {
        console.debug('[OperationalChartService] Raw XML response:', rawXml);
      }),
      map((xmlResponse: string) => {
        const match = xmlResponse.match(/<string[^>]*>([\s\S]*?)<\/string>/);
        
        if (!match || !match[1]) {
          console.error('[OperationalChartService] <string> tag not found or empty:', xmlResponse);
          throw new Error('No valid <string> content found in XML response');
        }

        let parsed;
        try {
          parsed = JSON.parse(match[1]);
        } catch (e) {
          console.error('[OperationalChartService] JSON parse error:', e, '\nRaw string:', match[1]);
          throw new Error('Failed to parse JSON content from XML string');
        }

        if (!Array.isArray(parsed)) {
          console.error('[OperationalChartService] Parsed data is not an array:', parsed);
          throw new Error('Parsed content is not a valid array');
        }

        return parsed;
      }),
      catchError(err => {
        console.error('[OperationalChartService] HTTP or parsing error:', err);
        return throwError(() => err);
      })
    );
  }


  fetchCompareCMRevenueDataOnce(deptGroupId: string | number): Observable<{ aliasName: string; TotalCharging: number }[]> {
    const deptParam = deptGroupId ? deptGroupId : '';
    const url = `${environment.url}/GetIncome?dimTimeTypeId=2&subDescFilter=${deptParam}`;

    return this.http.get(url, { responseType: 'text' }).pipe(
      tap((rawXml) => {
        console.debug('[OperationalChartService] Raw XML response:', rawXml);
      }),
      map((xmlResponse: string) => {
        const match = xmlResponse.match(/<string[^>]*>([\s\S]*?)<\/string>/);
        
        if (!match || !match[1]) {
          console.error('[OperationalChartService] <string> tag not found or empty:', xmlResponse);
          throw new Error('No valid <string> content found in XML response');
        }

        let parsed;
        try {
          parsed = JSON.parse(match[1]);
        } catch (e) {
          console.error('[OperationalChartService] JSON parse error:', e, '\nRaw string:', match[1]);
          throw new Error('Failed to parse JSON content from XML string');
        }

        if (!Array.isArray(parsed)) {
          console.error('[OperationalChartService] Parsed data is not an array:', parsed);
          throw new Error('Parsed content is not a valid array');
        }

        return parsed;
      }),
      catchError(err => {
        console.error('[OperationalChartService] HTTP or parsing error:', err);
        return throwError(() => err);
      })
    );
  }


public fetchTotalRevenueDataOnce(

  deptGroupName: string,
  deptId:string,
): Observable<RevenueDataPoint[]> {
  //const url = `${environment.url}/GetRevenueOverTimeWChargingDept?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&dept=${encodeURIComponent(deptGroupIdParam)}&granularity=${encodeURIComponent(granularity)}`;
  const url = `${environment.url}/GetChargingChartData?groupName=${deptGroupName}&deptId=${deptId}`;
 // console.log('[fetchTotalRevenueDataOnce] Request URL:', url);

  return this.http.get(url, { responseType: 'text' }).pipe(
    map(response => {
     // console.log('[fetchTotalRevenueDataOnce] Response was:', response);
      const cleaned = sanitizeApiJson(response, 'label-value-dept');
     // console.log('[fetchTotalRevenueDataOnce] Cleaned RevenueDataPoint[]:', cleaned);
      return cleaned;
    })
  );
}



  constructor(private http: HttpClient) {}

}

