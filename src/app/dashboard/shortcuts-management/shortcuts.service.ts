import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ShortcutsService {
  private apiUrl = 'http://your-backend-url/api/shortcuts'; // Replace with your backend API URL

  constructor(private http: HttpClient) {}

  getShortcuts(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  addShortcut(shortcut: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, shortcut);
  }

  updateShortcut(id: number, shortcut: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, shortcut);
  }

  deleteShortcut(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
