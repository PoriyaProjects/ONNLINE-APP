import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { NursePermissionsService } from './services/nurse-permissions.service';

@Injectable({
  providedIn: 'root',
})
export class EpPermissionsAdminGuard implements CanActivate {
  constructor(private service: NursePermissionsService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    if (this.service.currentUserRole === 'Admin') {
      return of(true);
    }

    return this.service.getDashboardSummary().pipe(
      map((summary) =>
        summary?.UserRole === 'Admin'
          ? true
          : this.router.createUrlTree(['/ep-permissions/dashboard']),
      ),
      catchError(() => of(this.router.createUrlTree(['/ep-permissions/dashboard']))),
    );
  }
}
