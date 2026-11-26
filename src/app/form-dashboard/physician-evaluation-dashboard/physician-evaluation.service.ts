import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface EvalDepartment {
  DepartmentId: string;
  DepartmentName: string;
}

export interface EvalPhysician {
  EmployeeID: string;
  FullName: string;
  DepartmentId: string;
  DepartmentName: string;
  FunctionDescription?: string;
  OvertimeHours?: number;
  ManualReports?: number;
  PublicInquiries?: number;
}

export interface EvalHome {
  CanViewAllDepartments: boolean;
  CanUploadManualReports: boolean;
  CanUploadOvertime: boolean;
  Departments: EvalDepartment[];
}

export interface MonthValue {
  Month: number;
  Value: number;
}

export interface QuarterSummary {
  Quarter: number;
  Thanks: number;
  Complaints: number;
}

export interface ActivityMonth {
  Month: number;
  Admissions: number;
  Discharges: number;
  PrimarySurgeries: number;
  SecondarySurgeries: number;
}

export interface DashboardSummary {
  Allowed: boolean;
  PhysicianId: string;
  PhysicianName: string;
  Year: number;
  Overtime: MonthValue[];
  OvertimeUpdatedAt: string;
  ManualReports: MonthValue[];
  ManualReportsUpdatedAt: string;
  Inquiries: QuarterSummary[];
  InquiriesSourcePending: boolean;
  Activity: ActivityMonth[];
  ActivityTotal: ActivityMonth;
  ActivitySourcePending: boolean;
}

export interface InquiryDetailRow {
  Date: string;
  Type: string;
  Summary: string;
  Status: string;
}

export interface UploadRow {
  EmployeeID: string;
  Year: number;
  Month: number;
  Value: number;
}

export interface UploadResult {
  Success: boolean;
  Message: string;
  SavedCount: number;
}

@Injectable({ providedIn: 'root' })
export class PhysicianEvaluationService {
  constructor(private http: HttpClient) {}

  getDepartments(): Observable<EvalHome> {
    return this.post<EvalHome>('GetPhysicianEvalDepartments', { userName: this.userName() });
  }

  getPhysicians(departmentId: string): Observable<EvalPhysician[]> {
    return this.post<EvalPhysician[]>('GetPhysicianEvalPhysicians', {
      userName: this.userName(),
      departmentId: departmentId || ''
    });
  }

  getSummary(physicianId: string, year: number): Observable<DashboardSummary> {
    return this.post<DashboardSummary>('GetPhysicianEvalSummary', {
      userName: this.userName(),
      physicianId: physicianId,
      year: year
    });
  }

  getInquiries(physicianId: string, year: number, quarter: number): Observable<InquiryDetailRow[]> {
    return this.post<InquiryDetailRow[]>('GetPhysicianEvalInquiries', {
      userName: this.userName(),
      physicianId: physicianId,
      year: year,
      quarter: quarter
    });
  }

  saveManualReports(rows: UploadRow[], fileName?: string): Observable<UploadResult> {
    return this.post<UploadResult>('SavePhysicianEvalManualReports', {
      userName: this.userName(),
      rows: rows,
      fileName: fileName || ''
    });
  }

  saveOvertime(rows: UploadRow[], fileName?: string): Observable<UploadResult> {
    return this.post<UploadResult>('SavePhysicianEvalOvertime', {
      userName: this.userName(),
      rows: rows,
      fileName: fileName || ''
    });
  }

  private post<T>(method: string, body: any): Observable<T> {
    return this.http.post(environment.url + method, body).pipe(
      map((response: any) => (response && response.d ? response.d : null) as T)
    );
  }

  private userName(): string {
    return (localStorage.getItem('loginUserName') || '').toLowerCase();
  }
}
