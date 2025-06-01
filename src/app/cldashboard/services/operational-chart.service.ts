import { AfterViewInit, ElementRef, Injectable, Input, OnChanges, OnInit, ViewChild } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { formatDateForApi } from '../utils/api-utils';
import { toChartData } from '../utils/date-utils';
import { ChartLoaderService } from '../utils/google-charts-loader';
import { sanitizeApiJson } from '../utils/sanitize-util';
import { timeout } from 'rxjs/operators';


@Injectable({ providedIn: 'root' })
export class OperationalChartService {

  // private revenueCacheKey = '';
  // private revenueDataCache: { [key: string]: { label: string; value: number }[] } = {};

  
  // getRevenueKey(start: string, end: string, granularity: string) {
  //   return `${start}_${end}_${granularity}`;
  // }


  // fetchTotalRevenueDataOnce(startDate: string, endDate: string, granularity: string): Observable<{ label: string; value: number }[]> {
  //   const key = this.getRevenueKey(startDate, endDate, granularity);
  //   if (this.revenueDataCache[key]) {
  //     return new Observable(observer => {
  //       observer.next(this.revenueDataCache[key]);
  //       observer.complete();
  //     });
  //   }
  
  //   const params = new HttpParams()
  //     .set('startDate', startDate || '01/01/2024')
  //     .set('endDate', endDate || '31/05/2025')
  //     .set('granularity', granularity || 'month');
  
  //   return new Observable(observer => {
  //     this.http.get(`${environment.url}/GetRevenueOverTime`, { params, responseType: 'text' })
  //       .pipe(timeout(160000))
  //       .subscribe({
  //         next: (raw: string) => {
  //           // זיהוי תגובה ריקה מבוססת XML
  //           const cleanedRaw = raw.trim();
  //           if (cleanedRaw.includes('>[]</string>') || cleanedRaw.includes('>[]<')) {
  //             observer.error(new Error('[Server Response Error] Empty revenue data array returned in XML'));
  //             return;
  //           }
  
  //           try {
  //             const clean = sanitizeApiJson(raw, 'label-value');
  //             this.revenueDataCache[key] = clean;
  //             observer.next(clean);
  //             observer.complete();
  //           } catch (err) {
  //             observer.error(new Error('[Parse Error] Unable to sanitize revenue data'));
  //           }
  //         },
  //         error: (err) => observer.error(err)
  //       });
  //   });
  // }

  

  // clearRevenueCache() {
  //   this.revenueDataCache = {};
  // }
  ///////

  private revenueDataCache: { [key: string]: { label: string; value: number }[] } = {};

private getRevenueKey(startDate: string, endDate: string, granularity: string): string {
  return `${startDate}_${endDate}_${granularity}`;
}

public fetchTotalRevenueDataOnce(
  startDate: string,
  endDate: string,
  granularity: string
): Observable<{ label: string; value: number }[]> {
  const key = this.getRevenueKey(startDate, endDate, granularity);

  if (this.revenueDataCache[key]) {
    return new Observable(observer => {
      observer.next(this.revenueDataCache[key]);
      observer.complete();
    });
  }

  const params = new HttpParams()
    .set('startDate', startDate || '01/01/2024')
    .set('endDate', endDate || '31/05/2025')
    .set('granularity', granularity || 'month');

  return new Observable(observer => {
    this.http.get(`${environment.url}/GetRevenueOverTime`, { params, responseType: 'text' })
      .pipe(timeout(60000))
      .subscribe({
        next: (raw: string) => {
          if (raw.includes('>[]</string>') || raw.includes('>[]<')) {
            observer.error(new Error('Empty data from server'));
            return;
          }

          const cleaned = sanitizeApiJson(raw, 'label-value');
          this.revenueDataCache[key] = cleaned;
          observer.next(cleaned);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
  });
}

/////////////////////////////////

  // fetchTotalRevenueOverTime(startDate: string, endDate: string, granularity: string): Observable<string> {
  //   const params = new HttpParams()
  //     .set('startDate', startDate || '01/01/2022')
  //     .set('endDate', endDate || '31/05/2025')
  //     .set('granularity', granularity || 'month');
  
  //   return this.http.get(`${environment.url}/GetRevenueOverTime`, { params, responseType: 'text' }).pipe(timeout(160000));
  // }
  


  fetchTotalRevenueLineChart(startDate: string, endDate: string, granularity: string): Observable<string> {
    const params = new HttpParams()
      .set('startDate', startDate || '01/01/2022').set('endDate', endDate || '31/05/2025').set('granularity', granularity || 'month');  
    return this.http.get(`${environment.url}/GetRevenueOverTime`, {params, responseType: 'text'}).pipe(timeout(160000));
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

