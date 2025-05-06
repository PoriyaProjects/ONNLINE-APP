import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private apiUrl = 'http://localhost:64964/WebService.asmx/GetDeparts';

  constructor(private http: HttpClient) {}

  getDepartments(): Observable<{ [key: string]: string }> {
    return this.http.get(this.apiUrl, { responseType: 'text' as 'json' }).pipe(
      map((response: string) => {
        try {
          const matched = response.match(/{.*}/);
          if (!matched) return {};
          const firstParsed = JSON.parse(matched[0]);
          return JSON.parse(firstParsed.Departs);
        } catch (err) {
          console.error('Failed to parse departments', err);
          return {};
        }
      })
    );
  }

  getInitialDepartment(departments: { [key: string]: string }): string {
    const stored = localStorage.getItem('Depart');
    return departments[stored!] ? stored! : '10'; // '0' = "הכל"
  }

  setCurrentDepartment(departmentId: string): void {
    localStorage.setItem('Depart', departmentId);
  }
}
