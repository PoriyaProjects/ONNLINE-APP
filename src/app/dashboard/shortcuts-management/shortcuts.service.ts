import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ShortcutsService {
  userName = localStorage.getItem('loginUserName').toLowerCase();

  constructor(private http: HttpClient) { }

  getShortcuts(): Observable<any[]> {
    return this.http.post<any[]>(environment.url + 'GetShortCutsLinks', {
      _userName: this.userName
    });
  }

  addShortcut(shortcut: any): Observable<any> {
    return this.http.post<any>(environment.url + 'AddShortCutsLinks', {
      _shortcut: shortcut
    });
  }

  deleteShortcut(id: string): Observable<any> {
    return this.http.post<any>(environment.url + 'DeleteShortCut', {
      _id: id
    });
  }
}
