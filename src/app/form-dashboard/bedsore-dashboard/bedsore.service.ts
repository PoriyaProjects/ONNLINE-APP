import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BedsoreService {
  private apiUrl = environment.url;
  private namerApiUrl = environment.urlipracticom;

  constructor(private http: HttpClient) { }

  private userName(): string {
    return localStorage.getItem('loginUserName') || '';
  }

  getChamelleonCurrentPatients(): Observable<any[]> {
    return this.http.post<any>(`${this.apiUrl}GetChamelleonCurrentPatients`, {
      user_name: this.userName()
    }).pipe(map(r => r['d'] ?? []));
  }

  getAllBedsoreList(): Observable<any[]> {
    return this.http.post<any>(`${this.apiUrl}GetAllBedsoreList`, {
      user_name: this.userName()
    }).pipe(map(r => r['d'] ?? []));
  }

  getBedsoreImagesByRowID(id: string | number): Observable<any[]> {
    return this.http.post<any>(`${this.apiUrl}GetBedsoreImagesByRowID`, {
      id,
      user_name: this.userName()
    }).pipe(map(r => r['d'] ?? []));
  }

  saveBedsoreForm(fullForm: any, patientDetails: any): Observable<number> {
    return this.http.post<any>(`${this.apiUrl}SaveBedsoreForm`, {
      _fullForm: fullForm,
      _patientDetails: patientDetails,
      user_name: this.userName()
    }).pipe(map(r => r['d'] ?? 0));
  }

  saveBedsoreImages(imageForm: any, formIdFk: number): Observable<boolean> {
    return this.http.post<any>(`${this.apiUrl}SaveBedsoreImages`, {
      _imageForm: imageForm,
      _formIDFK: formIdFk,
      user_name: this.userName()
    }).pipe(map(r => !!r['d']));
  }

  updateBedsoreImages(imageForm: any, formIdFk: number): Observable<boolean> {
    return this.http.post<any>(`${this.apiUrl}UpdateBedsoreImages`, {
      _imageForm: imageForm,
      _formIDFK: formIdFk,
      user_name: this.userName()
    }).pipe(map(r => !!r['d']));
  }

  deleteBedsoreForm(formId: string | number): Observable<boolean> {
    return this.http.post<any>(`${this.apiUrl}DeleteBedsoreForm`, {
      _formId: formId,
      user_name: this.userName()
    }).pipe(map(r => !!r['d']));
  }

  getPatientDetailsByCaseNumber(caseNumber: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}getPatientDetailsByCaseNumber`, {
      _caseNumber: caseNumber,
      user_name: this.userName()
    }).pipe(map(r => r['d']));
  }

  createBedsorePdf(patient: any, html: string, category: string): Observable<string> {
    return this.http.post<any>(`${this.namerApiUrl}CreateBedsorePdf`, {
      _patient: patient,
      html,
      Catigory: category
    }).pipe(map(r => r['d']));
  }

  linkPdfToPatientNamer(caseNumber: string, formId: string | number, category: string, fileSource: string): Observable<string> {
    return this.http.post<any>(`${this.namerApiUrl}LinkPdfToPatientNamer`, {
      CaseNumber: caseNumber,
      FormID: formId,
      Catigory: category,
      fileSource
    }).pipe(map(r => r['d']));
  }
}
