import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { F29Context, F29DrugHit, F29ListItem, F29Request } from './form29.models';

@Injectable({ providedIn: 'root' })
export class Form29Service {
  constructor(private http: HttpClient) {}

  context(): Observable<F29Context> {
    return this.post<F29Context>('F29GetContext', {});
  }

  list(q: string, status: string): Observable<F29ListItem[]> {
    return this.post<{ items: F29ListItem[] }>('F29List', { q: q || '', status: status || '' }).pipe(
      map((res) => (res && res.items) || [])
    );
  }

  get(requestId: number): Observable<F29Request> {
    return this.post<F29Request>('F29Get', { requestId: String(requestId) });
  }

  saveDraft(payload: object): Observable<F29Request> {
    return this.post<F29Request>('F29SaveDraft', { payload: JSON.stringify(payload) });
  }

  submit(payload: object): Observable<F29Request> {
    return this.post<F29Request>('F29Submit', { payload: JSON.stringify(payload) });
  }

  searchDrugs(q: string): Observable<F29DrugHit[]> {
    return this.post<{ items: F29DrugHit[] }>('F29SearchDrugs', { q: q || '' }).pipe(
      map((res) => (res && res.items) || [])
    );
  }

  getDrug(code: string): Observable<F29DrugHit> {
    return this.post<F29DrugHit>('F29GetDrug', { code: code || '' });
  }

  addFile(requestId: number, fileName: string, contentBase64: string): Observable<{ fileId: number; fileName: string }> {
    return this.post('F29AddFile', { requestId: String(requestId), fileName: fileName, contentBase64: contentBase64 });
  }

  file(fileId: number): Observable<{ fileName: string; contentType: string; contentBase64: string }> {
    return this.post('F29GetFile', { fileId: String(fileId) });
  }

  decide(requestId: number, stageNo: number, decision: string, reason: string, rowVer: string, signerName: string, signaturePng: string): Observable<F29Request> {
    return this.post<F29Request>('F29Decide', {
      requestId: String(requestId),
      stageNo: String(stageNo),
      decision: decision,
      reason: reason || '',
      rowVer: rowVer || '',
      signerName: signerName || '',
      signaturePng: signaturePng || '',
    });
  }

  lookupPatient(idNumber: string): Observable<any> {
    return this.post('F29LookupPatient', { idNumber: idNumber || '' });
  }

  get3(requestId: number): Observable<any> {
    return this.post('F29Get3', { requestId: String(requestId) });
  }

  saveDraft3(payload: object): Observable<any> {
    return this.post('F29SaveDraft3', { payload: JSON.stringify(payload) });
  }

  submit3(payload: object): Observable<any> {
    return this.post('F29Submit3', { payload: JSON.stringify(payload) });
  }

  decide3(requestId: number, stageNo: number, decision: string, reason: string, rowVer: string, signerName: string, signaturePng: string): Observable<any> {
    return this.post('F29Decide3', {
      requestId: String(requestId),
      stageNo: String(stageNo),
      decision: decision,
      reason: reason || '',
      rowVer: rowVer || '',
      signerName: signerName || '',
      signaturePng: signaturePng || '',
    });
  }

  private post<T>(method: string, body: any): Observable<T> {
    var employeeId = '';
    try {
      employeeId = localStorage.getItem('ID') || '';
    } catch (e) {
      employeeId = '';
    }
    var url = environment.url + method + '?employeeId=' + encodeURIComponent(employeeId);
    return this.http.post(url, body || {}).pipe(
      map((res: any) => {
        var payload = res && res.d !== undefined ? res.d : res;
        if (typeof payload === 'string') payload = JSON.parse(payload);
        if (payload && typeof payload.d === 'string') payload = JSON.parse(payload.d);
        if (!payload || payload.ok === false) {
          var error: any = new Error((payload && payload.error) || 'אירעה שגיאה');
          error.fields = payload && payload.fields ? payload.fields : {};
          throw error;
        }
        if (payload.ok === true) return payload.data as T;
        return payload as T;
      }),
      catchError((err) => {
        if (err && err.fields) return throwError(err);
        var wrapped: any = new Error('לא ניתן להתחבר לשירות. ודאו ש-WebService פועל.');
        wrapped.fields = {};
        return throwError(wrapped);
      })
    );
  }
}
