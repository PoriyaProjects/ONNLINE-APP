import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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

  /** Procurement (חריגת רכש) — data from ProcurementRequest + ProcurementFiles */
  getProcurementRequestById(id: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}GetProcurementRequestById`, { id: id });
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

  saveSupportRequestFormData(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}SaveSupportRequest`,
      formData,
      { responseType: 'text' }
    );
  }

  /**
   * ASMX [WebMethod] bool returns SOAP/XML, e.g.
   * `<boolean xmlns="http://tempuri.org/">true</boolean>` — not plain `true`.
   * This maps the response body to a real boolean for callers.
   */
  private parseAsmxBooleanResponseBody(body: string | null | undefined): boolean {
    if (body == null) {
      return false;
    }
    const s = String(body).trim();
    if (/^true$/i.test(s)) {
      return true;
    }
    if (/^false$/i.test(s)) {
      return false;
    }
    const m = s.match(/<(?:boolean|string)[^>]*>\s*(true|false)\s*<\/(?:boolean|string)>/i);
    if (m) {
      return m[1].toLowerCase() === 'true';
    }
    try {
      const j = JSON.parse(s) as { d?: boolean };
      if (typeof j?.d === 'boolean') {
        return j.d;
      }
    } catch {
      /* not JSON */
    }
    return false;
  }

  /** Persists to Forms.dbo.ProcurementRequest + ProcurementFiles */
  saveProcurementRequestFormData(formData: FormData): Observable<boolean> {
    return this.http
      .post(`${this.apiUrl}SaveProcurementRequest`, formData, { responseType: 'text' })
      .pipe(map((text) => this.parseAsmxBooleanResponseBody(text)));
  }

  savePresentationRequestFormData(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrlipracticom}SavePresentationRequest`,
      formData,
      { responseType: 'text' }
    );
  }

  saveResearchRequestFormData(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrlipracticom}SaveResearchRequest`,
      formData,
      { responseType: 'text' }
    );
  }

  saveGatheringRequest(formData: FormData): Observable<string> {
    return this.http.post(
      `${this.apiUrlipracticom}SaveGatheringRequest`,
      formData,
      { responseType: 'text' } // 👈 critical
    );
  }

  getEmployeeDetails(id: any): Observable<any> {
    return this.http.post(`${this.apiUrl}GetEmployeesToUpdateByID`, {
      _empId: id
    });
  }
}
