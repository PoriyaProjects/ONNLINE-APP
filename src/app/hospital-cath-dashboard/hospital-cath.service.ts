import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, Injectable, OnInit } from '@angular/core';
import { forkJoin, Observable, BehaviorSubject, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })

export class DashboardService {

  constructor(private http: HttpClient) {}
  
  // getChartsData(params: { fromDate: string; toDate: string; departmentIds: string[] }): Observable<any> {
  //   const rawStats = {
  //     surgeries: [
  //       { type: 'דחוף', count: 45 },
  //       { type: 'לא דחוף', count: 55 }
  //     ],
  //     cathsByMonth: [
  //       { month: 'ינואר', count: 120 },
  //       { month: 'פברואר', count: 140 },
  //       { month: 'מרץ', count: 100 }
  //     ],
  //     departments: [
  //       { name: 'פנימית א', count: 80 },
  //       { name: 'פנימית ב', count: 95 },
  //       { name: 'כירורגית', count: 70 }
  //     ],
  //     categories: [
  //       { name: 'קטגוריה 1', value: 50 },
  //       { name: 'קטגוריה 2', value: 70 }
  //     ],
  //     discharges: [
  //       { name: 'פנימית א', value: 30 },
  //       { name: 'כירורגית', value: 25 }
  //     ]
  //   };

  //   const transformed = {
  //     pie: rawStats.surgeries.map(s => ({ label: s.type, value: s.count })),
  //     bar: rawStats.cathsByMonth.map(m => ({ month: m.month, count: m.count })),
  //     grouped: rawStats.departments.map(d => ({ department: d.name, count: d.count })),
  //     group2: rawStats.categories.map(c => ({ label: c.name, value: c.value })),
  //     release: rawStats.discharges.map(d => ({ label: d.name, value: d.value }))
  //   };

  //   return of(transformed);
  // };
  getChartsData(
    chartType: string,
    params: {
      param: string;
      deptCode: string;
      surgerydeptType?: string;
      returnedPatients?: boolean;
      periodList?: string[];
    }
  ): Observable<any> {
    let url = environment.url;

    switch (chartType) {
      case 'ER': url += 'PieChartER'; break;
      case 'Delivery': url += 'PieChartDelivery'; break;
      case 'Merpaoot': url += 'PieChartMerpaoot'; break;
      case 'Departments': url += 'PieChartDepartments'; break;
      case 'RentgenDimot': url += 'PieChartRentgenDimot'; break;
      case 'Dialisa': url += 'PieChartDialisa'; break;
      default: url += 'PieChart'; break;
    }; 
    console.log('url: '+ url);

    return this.http.post(url, params);    
  }
}