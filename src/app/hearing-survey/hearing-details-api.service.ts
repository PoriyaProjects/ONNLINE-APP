import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface HearingDetailRow {
  type: string;
  caseNumber: string;
}

export interface HearingDetailsResponse {
  byType: Record<string, HearingDetailRow[]>;
  columnOrder: string[];
}

/**
 * Base URL for `{base}/api/hearing/details` (no trailing slash).
 * 1. `explicit` (environment.hearingDetailsApiBase) if set
 * 2. Else `authApiUrl` origin when it looks like a modern API root (`.../api/...`) and not ASMX
 * 3. Else folder next to legacy WebService.asmx (localhost / single-host setups)
 */
export function resolveHearingDetailsApiBase(
  webServiceUrl: string,
  explicit?: string,
  authApiUrl?: string
): string {
  const trimmed = (explicit || '').trim();
  if (trimmed) {
    return trimmed.replace(/\/$/, '');
  }

  const auth = (authApiUrl || '').trim();
  if (auth && !/WebService\.asmx/i.test(auth)) {
    try {
      const u = new URL(auth);
      if (/\/api(\/|$)/i.test(u.pathname)) {
        return u.origin;
      }
    } catch {
      /* fall through */
    }
  }

  try {
    const u = new URL(webServiceUrl);
    const path = u.pathname.replace(/\/?WebService\.asmx\/?$/i, '').replace(/\/$/, '');
    return path ? `${u.origin}/${path.replace(/^\//, '')}` : u.origin;
  } catch {
    return '';
  }
}

function normalizeRow(raw: any): HearingDetailRow {
  const type = String(raw?.type ?? raw?.Type ?? '').trim();
  const caseNumber = String(raw?.caseNumber ?? raw?.CaseNumber ?? '').trim();
  return { type, caseNumber };
}

function normalizeResponse(raw: any): HearingDetailsResponse {
  const byType: Record<string, HearingDetailRow[]> = {};
  const src = raw?.byType ?? raw?.ByType ?? {};
  if (src && typeof src === 'object') {
    for (const key of Object.keys(src)) {
      const arr = src[key];
      const rows = Array.isArray(arr) ? arr.map(normalizeRow) : [];
      const canon = String(key).toUpperCase();
      if (!byType[canon]) {
        byType[canon] = [];
      }
      byType[canon].push(...rows);
    }
  }
  const order = raw?.columnOrder ?? raw?.ColumnOrder;
  const columnOrder = Array.isArray(order)
    ? order.map((x: any) => String(x).toUpperCase())
    : Object.keys(byType);
  return { byType, columnOrder };
}

@Injectable({ providedIn: 'root' })
export class HearingDetailsApiService {

  constructor(private http: HttpClient) { }

  getDetails(baseUrl: string, dateIn: string, dateOut: string): Observable<HearingDetailsResponse> {
    const root = baseUrl.replace(/\/$/, '');
    const url = `${root}/api/hearing/details`;
    const params = new HttpParams().set('dateIn', dateIn).set('dateOut', dateOut);
    return this.http.get(url, { params }).pipe(
      map((body: any) => normalizeResponse(body)),
      catchError((err: HttpErrorResponse) => {
        const msg =
          (err.error && typeof err.error === 'object' && err.error.error) ? String(err.error.error)
            : err.message || `HTTP ${err.status}`;
        return throwError(msg);
      })
    );
  }
}
