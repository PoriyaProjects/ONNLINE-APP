import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  normalizePlanReturnUsername,
  resolveAdUserDisplayName,
} from './department-plan-return.models';

@Injectable({ providedIn: 'root' })
export class DepartmentPlanReturnUserDirectoryService {
  private directory$?: Observable<ReadonlyMap<string, string>>;

  constructor(private http: HttpClient) {}

  loadDirectory(): Observable<ReadonlyMap<string, string>> {
    if (!this.directory$) {
      this.directory$ = this.http
        .post(environment.url + 'GetUsersForInquiries', {})
        .pipe(
          map((response) => this.mapDirectory(response)),
          catchError(() => of(new Map<string, string>())),
          shareReplay(1),
        );
    }
    return this.directory$;
  }

  resolveDisplayName(
    username: string | null | undefined,
    directory?: ReadonlyMap<string, string>,
  ): string {
    return resolveAdUserDisplayName(username, directory || new Map());
  }

  private mapDirectory(response: unknown): ReadonlyMap<string, string> {
    const rows = this.unwrapRows(response);
    const directory = new Map<string, string>();

    rows.forEach((row) => {
      const adUserName = normalizePlanReturnUsername(
        String(row.ADUserName || row.adUserName || ''),
      );
      if (!adUserName) {
        return;
      }

      const displayName = `${row.firstname || row.FirstName || ''} ${row.lastname || row.LastName || ''}`.trim();
      if (displayName) {
        directory.set(adUserName, displayName);
      }
    });

    return directory;
  }

  private unwrapRows(response: unknown): Array<Record<string, unknown>> {
    if (!response || typeof response !== 'object') {
      return [];
    }

    const payload = response as Record<string, unknown>;
    const rows = payload.d ?? payload.D ?? payload;
    return Array.isArray(rows) ? rows as Array<Record<string, unknown>> : [];
  }
}
