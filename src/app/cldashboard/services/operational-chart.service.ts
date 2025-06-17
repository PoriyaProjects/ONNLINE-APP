import { AfterViewInit, ElementRef, Injectable, Input, OnChanges, OnInit, ViewChild } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { formatDateForApi } from '../utils/api-utils';
import { toChartData } from '../utils/date-utils';
import { ChartLoaderService } from '../utils/google-charts-loader';
import { sanitizeApiJson } from '../utils/sanitize-util';
import { catchError, map, timeout } from 'rxjs/operators';
import { RevenueDataPoint } from '../components/cl-dashboard-overview/cl-dashboard-overview.component';
import { tap } from 'rxjs/operators';




@Injectable({ providedIn: 'root' })
export class OperationalChartService {

  private revenueDataCache: { [key: string]: { label: string; value: number; dept: string }[] } = {};


  private getRevenueKey(startDate: string, endDate: string, dept: string, granularity: string): string {
    return `${startDate}_${endDate}_${dept}_${granularity}`;
  }

  

  fetchCompareRevenueDataOnce(deptGroupId: string | number): Observable<{ aliasName: string; TotalCharging: number }[]> {
    const deptParam = deptGroupId ? deptGroupId : '';
    const url = `${environment.url}/GetIncome?dimTimeTypeId=4&subDescFilter=${deptParam}`;

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
  startDate: string,
  endDate: string,
  deptGroupIdParam: string,
  granularity: string
): Observable<RevenueDataPoint[]> {
  const url = `${environment.url}/GetRevenueOverTimeWChargingDept?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&dept=${encodeURIComponent(deptGroupIdParam)}&granularity=${encodeURIComponent(granularity)}`;

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




 
  
  fetchTotalRevenueBarChart(startDate: string, endDate: string, granularity: string): Observable<string> {
    const params = new HttpParams()
      .set('startDate', startDate || '01/01/2022').set('endDate', endDate || '31/05/2025').set('granularity', granularity || 'month');  
    return this.http.get(`${environment.url}/GetRevenueOverTime`, {params, responseType: 'text'}).pipe(timeout(160000));
  }

  fetchTotalRevenueColumnChart(startDate: string, endDate: string, granularity: string): Observable<string> {
    const params = new HttpParams()
      .set('startDate', startDate || '01/01/2022').set('endDate', endDate || '31/05/2025').set('granularity', granularity || 'month');  
    return this.http.get(`${environment.url}/GetRevenueOverTime`, {params, responseType: 'text'}).pipe(timeout(160000));
  }
  
  fetchTotalRevenuePieChart() {
    const params = new HttpParams()
    return this.http.get(`${environment.url}/GetRevenueByFund`, {params,responseType: 'text'}).pipe(timeout(160000));
  }


  fetchTotalRevenuePieChartEx(startDate: string, endDate: string, timePeriod: string): Observable<string> {
    const params = new HttpParams()
    .set('startDate', startDate || '').set('endDate', endDate || '').set('timePeriod', timePeriod || '');  
    return this.http.get(`${environment.url}/GetRevenueByFundEx`, {params, responseType: 'text' }).pipe(timeout(160000));
  }
  

  fetchRevenueVsBudget(deptCode: string): Observable<any> {
    return this.http.post('/WebService.asmx/GaugeChart', {
      deptCode, param: '1', periodList: '', returnedPatients: false, surgerydeptType: '0'
    }).pipe(timeout(160000));
  }

  fetchRevenuePerPatient(deptCode: string): Observable<any> {
    return this.http.post('/WebService.asmx/GaugeChart', {
      deptCode, param: '1', periodList: '', returnedPatients: false, surgerydeptType: '0'
    }).pipe(timeout(160000));
  }

  fetchRevenueByPayer(deptCode: string): Observable<any> {
    return this.http.post('/WebService.asmx/GaugeChart', {
      deptCode, param: '1', periodList: '', returnedPatients: false, surgerydeptType: '0'
    }).pipe(timeout(160000));
  }


  fetchOperatingMargin(deptCode: string): Observable<any> {
    return this.http.post('/WebService.asmx/GaugeChart', {
      deptCode, param: '1', periodList: '', returnedPatients: false, surgerydeptType: '0'
    }).pipe(timeout(160000));
  }

  fetchNetIncomeTrend(deptCode: string): Observable<any> {
    return this.http.post('/WebService.asmx/GaugeChart', {
      deptCode, param: '1', periodList: '', returnedPatients: false, surgerydeptType: '0'
    }).pipe(timeout(160000));
  }
  fetchEbitdaMargin(deptCode: string): Observable<any> {
    return this.http.post('/WebService.asmx/GaugeChart', {
      deptCode, param: '1', periodList: '', returnedPatients: false, surgerydeptType: '0'
    }).pipe(timeout(160000));
  }
  fetchDepartmentProfitability(deptCode: string): Observable<any> {
    return this.http.post('/WebService.asmx/GaugeChart', {
      deptCode, param: '1', periodList: '', returnedPatients: false, surgerydeptType: '0'
    });
  }
  fetchStaffingCosts(deptCode: string): Observable<any> {
    return this.http.post('/WebService.asmx/GaugeChart', {
      deptCode, param: '1', periodList: '', returnedPatients: false, surgerydeptType: '0'
    });
  }

  fetchFixedVariableCosts(deptCode: string): Observable<any> {
    return this.http.post('/WebService.asmx/GaugeChart', {
      deptCode, param: '1', periodList: '', returnedPatients: false, surgerydeptType: '0'
    });
  }
  
  fetchExpensesByDepartments(deptCode: string): Observable<any> {
    return this.http.post('/WebService.asmx/GaugeChart', {
      deptCode, param: '1', periodList: '', returnedPatients: false, surgerydeptType: '0'
    });
  }

  fetchEquipmentCosts(deptCode: string): Observable<any> {
    return this.http.post('/WebService.asmx/GaugeChart', {
      deptCode, param: '1', periodList: '', returnedPatients: false, surgerydeptType: '0'
    });
  }
  fetchCashCollectionsRate(deptCode: string): Observable<any> {
    return this.http.post('/WebService.asmx/GaugeChart', {
      deptCode, param: '1', periodList: '', returnedPatients: false, surgerydeptType: '0'
    });
  }

  fetchBadDebtRate(deptCode: string): Observable<any> {
    return this.http.post('/WebService.asmx/GaugeChart', {
      deptCode, param: '1', periodList: '', returnedPatients: false, surgerydeptType: '0'
    });
  }

  fetchARAging(deptCode: string): Observable<any> {
    return this.http.post('/WebService.asmx/GaugeChart', {
      deptCode, param: '1', periodList: '', returnedPatients: false, surgerydeptType: '0'
    });
  }

  fetchDSO(deptCode: string): Observable<any> {
    return this.http.post('/WebService.asmx/GaugeChart', {
      deptCode, param: '1', periodList: '', returnedPatients: false, surgerydeptType: '0'
    });
  }
  fetchClaimProcessingTime(deptCode: string): Observable<any> {
    return this.http.post('/WebService.asmx/GaugeChart', {
      deptCode, param: '1', periodList: '', returnedPatients: false, surgerydeptType: '0'
    });
  }
  fetchCashOnHand(deptCode: string): Observable<any> {
    return this.http.post('/WebService.asmx/GaugeChart', {
      deptCode, param: '1', periodList: '', returnedPatients: false, surgerydeptType: '0'
    });
  }

 

  
  fetchDenialRate (deptCode: string): Observable<any> {
    return this.http.post('/WebService.asmx/GaugeChart', {
      deptCode, param: '1', periodList: '', returnedPatients: false, surgerydeptType: '0'
    });
  }

  fetchGaugeData(deptCode: string): Observable<any> {
    return this.http.post('/WebService.asmx/GaugeChart', {
      deptCode, param: '1', periodList: '', returnedPatients: false, surgerydeptType: '0'
    });
  }

  fetchMonthlyOps(deptCode: string): Observable<any> {
    return this.http.post('/WebService.asmx/BarChart', {
      deptCode, param: '1', periodList: '', returnedPatients: false, surgerydeptType: '0'
    });
  }

  fetchLineTrend(deptCode: string): Observable<any> {
    return this.http.post('/WebService.asmx/LineChart', {
      deptCode, param: '1', periodList: '', returnedPatients: false, surgerydeptType: '0'
    });
  }

  fetchAppealSuccessRate (deptCode: string): Observable<any> {
    return this.http.post('/WebService.asmx/LineChart', {
      deptCode, param: '1', periodList: '', returnedPatients: false, surgerydeptType: '0'
    });
  }

  fetchBillingErrors  (deptCode: string): Observable<any> {
    return this.http.post('/WebService.asmx/LineChart', {
      deptCode, param: '1', periodList: '', returnedPatients: false, surgerydeptType: '0'
    });
  }

  constructor(private http: HttpClient) {}

}

