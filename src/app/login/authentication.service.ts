import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  url = "http://srv-apps-prod:47001/AutoAuthentication";

  constructor(
    private http: HttpClient,
  ) { }

  login() {
    //.set('Access-Control-Allow-Origin', GlobalVariabelComponent.appUrlOrigin);
    return this.http.get<any>(this.url, { responseType: 'text' as 'json' })
      .pipe(map(user => {
        console.log(user)
        return user;
      }));
  }
}