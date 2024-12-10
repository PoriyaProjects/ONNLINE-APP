import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  private apiUrl = environment.AuthUrl+'AutoAuthentication';//'http://srv-apps-prod:47001/AutoAuthentication';
   

  constructor(private http: HttpClient) {}

  getAuthentication(): Observable<any> {
    // Example headers if needed, otherwise you can omit
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });
  
    return this.http.get(this.apiUrl, {
      headers: headers,
      responseType: 'text' as 'json',
      withCredentials: true, // Include credentials (e.g., cookies, auth headers)
    });
  }
}