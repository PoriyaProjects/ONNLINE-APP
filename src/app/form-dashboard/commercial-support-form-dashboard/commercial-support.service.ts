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

  getAllSupportRequests(): Observable<any[]> {
    return this.http.post<any[]>(`${this.apiUrl}GetAllSupportRequests`, {});
  }

  deleteSupportRequest(id: any): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}DeleteSupportRequest`, {
      Id: id
    });
  }

  getSupportRequestsByRequesterName(name: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}search?name=${encodeURIComponent(name)}`);
  }

  saveSupportRequest(request: any): Observable<any> {
    return this.http.post(`${this.apiUrl}SaveSupportRequest`, {
      request: request
    });
  }
}
