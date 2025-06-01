import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';


@Injectable({ providedIn: 'root' })
export class OperationalChartService {
  
  fetchTotalRevenueData(startDate: string, endDate: string, granularity: string): Observable<string> {
    const params = new HttpParams()
      .set('startDate', startDate || '01/01/2022')
      .set('endDate', endDate || '31/05/2025')
      .set('granularity', granularity || 'month');
  
    return this.http.get(`${environment.url}/GetRevenueOverTime`, {
      params,
      responseType: 'text'
    });
  }
  

  fetchTotalRevenueOverTime(startDate: string, endDate: string, granularity: string): Observable<string> {
    const params = new HttpParams()
      .set('startDate', startDate || '01/01/2022')
      .set('endDate', endDate || '31/05/2025')
      .set('granularity', granularity || 'month');
  
    return this.http.get(`${environment.url}/GetRevenueOverTime`, { params, responseType: 'text' });
  }
  


  fetchTotalRevenueLineChart(startDate: string, endDate: string, granularity: string): Observable<string> {
    const params = new HttpParams()
      .set('startDate', startDate || '01/01/2022').set('endDate', endDate || '31/05/2025').set('granularity', granularity || 'month');  
    return this.http.get(`${environment.url}/GetRevenueOverTime`, {params, responseType: 'text'});
  }
  
  fetchTotalRevenueBarChart(startDate: string, endDate: string, granularity: string): Observable<string> {
    const params = new HttpParams()
      .set('startDate', startDate || '01/01/2022').set('endDate', endDate || '31/05/2025').set('granularity', granularity || 'month');  
    return this.http.get(`${environment.url}/GetRevenueOverTime`, {params, responseType: 'text'});
  }

  fetchTotalRevenueColumnChart(startDate: string, endDate: string, granularity: string): Observable<string> {
    const params = new HttpParams()
      .set('startDate', startDate || '01/01/2022').set('endDate', endDate || '31/05/2025').set('granularity', granularity || 'month');  
    return this.http.get(`${environment.url}/GetRevenueOverTime`, {params, responseType: 'text'});
  }
  
  fetchTotalRevenuePieChart() {
    const params = new HttpParams()
    return this.http.get(`${environment.url}/GetRevenueByFund`, {params,responseType: 'text'});
  }

  // fetchTotalRevenuePieChartEx(startDate: string, endDate: string, timePeriod: string): Observable<string> {
  //   const params = new HttpParams()
  //   .set('startDate', startDate || '01/01/2022').set('endDate', endDate || '31/05/2025').set('timePeriod', timePeriod || 'last30days');  
  //   return this.http.get(`${environment.url}/GetRevenueByFundEx`, {params, responseType: 'text'});
  // }

  fetchTotalRevenuePieChartEx(startDate: string, endDate: string, timePeriod: string): Observable<string> {
    const params = new HttpParams()
    .set('startDate', startDate || '').set('endDate', endDate || '').set('timePeriod', timePeriod || '');  
    return this.http.get(`${environment.url}/GetRevenueByFundEx`, {params, responseType: 'text' });
  }
  

  fetchTotalRevenuePieChartExGrouped(startDate: string, endDate: string, timePeriod: string): Observable<string> {
    const params = new HttpParams()
    .set('startDate', startDate || '01/01/2022').set('endDate', endDate || '31/05/2025').set('timePeriod', timePeriod || 'month');  
    return this.http.get(`${environment.url}/GetRevenueByFundGrouped`, {params, responseType: 'text' });
  }


  fetchRevenueVsBudget(deptCode: string): Observable<any> {
    return this.http.post('/WebService.asmx/GaugeChart', {
      deptCode, param: '1', periodList: '', returnedPatients: false, surgerydeptType: '0'
    });
  }

  fetchRevenuePerPatient(deptCode: string): Observable<any> {
    return this.http.post('/WebService.asmx/GaugeChart', {
      deptCode, param: '1', periodList: '', returnedPatients: false, surgerydeptType: '0'
    });
  }

  fetchRevenueByPayer(deptCode: string): Observable<any> {
    return this.http.post('/WebService.asmx/GaugeChart', {
      deptCode, param: '1', periodList: '', returnedPatients: false, surgerydeptType: '0'
    });
  }


  fetchOperatingMargin(deptCode: string): Observable<any> {
    return this.http.post('/WebService.asmx/GaugeChart', {
      deptCode, param: '1', periodList: '', returnedPatients: false, surgerydeptType: '0'
    });
  }

  fetchNetIncomeTrend(deptCode: string): Observable<any> {
    return this.http.post('/WebService.asmx/GaugeChart', {
      deptCode, param: '1', periodList: '', returnedPatients: false, surgerydeptType: '0'
    });
  }
  fetchEbitdaMargin(deptCode: string): Observable<any> {
    return this.http.post('/WebService.asmx/GaugeChart', {
      deptCode, param: '1', periodList: '', returnedPatients: false, surgerydeptType: '0'
    });
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




