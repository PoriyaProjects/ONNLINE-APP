import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupportRequestService {

  private apiUrl = environment.url; // שים לב לשנות ל-API שלך בפועל

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

  saveSupportRequest(request: any): Observable<any> {
    return this.http.post(`${this.apiUrl}SaveSupportRequest`, {
      request: request
    });
  }

  savePresentationRequest(request: any): Observable<any> {
    return this.http.post(`${this.apiUrl}SavePresentationRequest`, {
      request: request
    });
  }

  saveResearchRequest(request: any): Observable<any> {
    return this.http.post(`${this.apiUrl}SaveResearchRequest`, {
      request: request
    });
  }

  saveGatheringRequest(request: any): Observable<any> {
    return this.http.post(`${this.apiUrl}SaveGatheringRequest`, {
      request: request
    });
  }

  getEmployeeDetails(id: any): Observable<any> {
    return this.http.post(`${this.apiUrl}GetEmployeesToUpdateByID`, {
      _empId: id
    });
  }
}
