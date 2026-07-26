import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  private apiUrl = environment.AuthUrl+'Authentication';//'http://srv-apps-prod:47001/AutoAuthentication';
   
  url = this.apiUrl;

  constructor(private http: HttpClient) {}

  getAuthentication(): Observable<any> {
    if (!environment.AuthUrl) {
      return new Observable((subscriber) => {
        subscriber.error(new Error('AuthUrl is not configured'));
        subscriber.complete();
      });
    }

    return this.http.get(environment.AuthUrl + 'Authentication', {
      withCredentials: true,
    });
  }
}