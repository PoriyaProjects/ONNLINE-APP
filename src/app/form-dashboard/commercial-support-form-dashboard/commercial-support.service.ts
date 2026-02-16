import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { environment as environmentprod } from 'src/environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class SupportRequestService {

  private apiUrl = environment.url; // שים לב לשנות ל-API שלך בפועל
  private apiUrlipracticom = environmentprod.urlipracticom; // שים לב לשנות ל-API שלך בפועל

  constructor(private http: HttpClient) { }

  getAllSupportRequests(UserName: string): Observable<any[]> {
    return this.http.post<any[]>(`${this.apiUrl}GetAllSupportRequests`, {
      user_name: UserName
    });
  }

  deleteSupportRequest(id: any): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}DeleteSupportRequest`, {
      Id: id
    });
  }

  getSupportRequestsByID(id: string): Observable<any[]> {
    return this.http.post<any[]>(`${this.apiUrl}GetSupportRequestById`, {
      id: id
    });
  }

  getPresentationRequestById(id: string): Observable<any[]> {
    return this.http.post<any[]>(`${this.apiUrl}GetPresentationRequestById`, {
      id: id
    });
  }

  getResearchRequestById(id: string): Observable<any[]> {
    return this.http.post<any[]>(`${this.apiUrl}GetResearchRequestById`, {
      id: id
    });
  }

  getGatheringRequestById(id: string): Observable<any[]> {
    return this.http.post<any[]>(`${this.apiUrl}GetGatheringRequestById`, {
      id: id
    });
  }

  getSupportDecissionRequestById(id: string): Observable<any[]> {
    return this.http.post<any[]>(`${this.apiUrl}GetSupportDecissionRequestById`, {
      id: id,
      form_char: 'D'
    });
  }

  saveSupportRequest(request: any, type: any): Observable<any> {
    return this.http.post(`${this.apiUrl}SaveSupportRequest`, {
      request: request,
      type: type,
    });
  }

  savePresentationRequest(request: any, type: any): Observable<any> {
    return this.http.post(`${this.apiUrl}SavePresentationRequest`, {
      request: request,
      type: type,
    });
  }

  saveResearchRequest(request: any, type: any): Observable<any> {
    return this.http.post(`${this.apiUrl}SaveResearchRequest`, {
      request: request,
      type: type,
    });
  }

  saveGatheringRequest(formData: FormData): Observable<string> {
    return this.http.post(
      `${this.apiUrlipracticom}SaveGatheringRequest`,
      formData,
      { responseType: 'text' } // 👈 critical
    );
  }

  saveDecission(request: any): Observable<any> {
    return this.http.post(`${this.apiUrl}SaveSupportRequestDecision`, {
      request: request
    });
  }

  getEmployeeDetails(id: any): Observable<any> {
    return this.http.post(`${this.apiUrl}GetEmployeesToUpdateByID`, {
      _empId: id
    });
  }
}
