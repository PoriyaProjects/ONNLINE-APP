import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DoctorPermissionsService } from './services/doctor-permissions.service';

@Injectable({ providedIn: 'root' })
export class DpAdminGuard implements CanActivate {
  constructor(private service: DoctorPermissionsService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.service.loadAccess().pipe(
      map((access) => {
        if (access && access.isAdmin) {
          return true;
        }
        this.router.navigate(['/doctors-permissions/dashboard']);
        return false;
      }),
      catchError(() => {
        this.router.navigate(['/doctors-permissions/dashboard']);
        return of(false);
      })
    );
  }
}

@Injectable({ providedIn: 'root' })
export class DpTemplateGuard implements CanActivate {
  constructor(private service: DoctorPermissionsService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.service.loadAccess().pipe(
      map((access) => {
        if (access && (access.isAdmin || access.isDepartmentManager)) {
          return true;
        }
        this.router.navigate(['/doctors-permissions/dashboard']);
        return false;
      }),
      catchError(() => {
        this.router.navigate(['/doctors-permissions/dashboard']);
        return of(false);
      })
    );
  }
}
