import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, take } from 'rxjs/operators';
import { NpsBaseApiService } from './services/nps-base-api.service';

/**
 * Allows catalog/admin NPS routes only for global admins and employees who are
 * Manager1 or Manager2 of at least one active employee (see server `NpsGetAccessContext`).
 */
@Injectable({ providedIn: 'root' })
export class NpsConfigurationAccessGuard implements CanActivate {
  constructor(private api: NpsBaseApiService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    const id = typeof localStorage !== 'undefined' ? localStorage.getItem('ID') || '' : '';
    return this.api.getAccessContext(id).pipe(
      take(1),
      map((ctx) =>
        ctx.canAccessNpsConfiguration ? true : this.router.createUrlTree(['/nps-permissions/dashboard']),
      ),
      catchError(() => of(this.router.createUrlTree(['/nps-permissions/dashboard']))),
    );
  }
}
