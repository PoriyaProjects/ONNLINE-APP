import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

/** ASMX POST JSON — same as training-management and other WebService callers. */
export const REHAB_ASMX_JSON_HEADERS = new HttpHeaders({
  'Content-Type': 'application/json; charset=utf-8',
});

export function getRehabAsmxBaseUrl(): string {
  return (environment.url || '').replace(/\/?$/, '/');
}

export interface RehabAsmxDateRangeBody {
  FromDate: string;
  ToDate: string;
}

/** Server ParseD uses ParseExact — wire format must be yyyy-MM-dd (not dd/MM/yyyy). */
export function formatRehabAsmxRequestDate(value: string): string {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const ddMmYyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (ddMmYyyy) {
    const dd = ddMmYyyy[1].padStart(2, '0');
    const mm = ddMmYyyy[2].padStart(2, '0');
    return `${ddMmYyyy[3]}-${mm}-${dd}`;
  }
  return trimmed;
}

/** BODY: { FromDate, ToDate } as yyyy-MM-dd strings — same as ClinicsDashboard / injury report. */
export function buildRehabAsmxDateBody(fromDate: string, toDate: string): RehabAsmxDateRangeBody {
  return {
    FromDate: formatRehabAsmxRequestDate(fromDate),
    ToDate: formatRehabAsmxRequestDate(toDate),
  };
}

/**
 * ASMX may append an HTML error page after valid JSON when headers were already sent.
 * HttpClient responseType 'json' then fails even though the JSON prefix is valid.
 */
export function parseRehabAsmxJsonText(raw: string): unknown | null {
  const text = (raw ?? '').trim();
  if (!text) {
    return null;
  }

  let cut = -1;
  for (const re of [/<!DOCTYPE\b/i, /<\s*html\b/i]) {
    const index = text.search(re);
    if (index >= 0 && (cut < 0 || index < cut)) {
      cut = index;
    }
  }
  const jsonPart = cut >= 0 ? text.slice(0, cut).trim() : text;
  if (!jsonPart) {
    return null;
  }

  try {
    return JSON.parse(jsonPart) as unknown;
  } catch {
    return null;
  }
}

/** Unwrap ASMX `{ d: ... }` and nested JSON strings. */
export function unwrapRehabAsmxPayload(value: unknown): unknown {
  let current = value;
  for (let depth = 0; depth < 6; depth += 1) {
    if (current == null) {
      return null;
    }
    if (typeof current === 'string') {
      const trimmed = current.trim();
      if (!trimmed) {
        return null;
      }
      const parsed = parseRehabAsmxJsonText(trimmed);
      if (parsed == null || parsed === trimmed) {
        return trimmed;
      }
      current = parsed;
      continue;
    }
    if (typeof current === 'object' && !Array.isArray(current) && 'd' in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>).d;
      continue;
    }
    break;
  }
  return current;
}

export function parseRehabAsmxListResponse(raw: unknown): unknown[] {
  const payload = unwrapRehabAsmxPayload(raw);
  if (payload == null) {
    return [];
  }
  if (Array.isArray(payload)) {
    return payload;
  }
  if (typeof payload === 'object') {
    return [payload];
  }
  return [];
}

export function postRehabAsmx(
  http: HttpClient,
  methodName: string,
  fromDate: string,
  toDate: string,
): Observable<unknown> {
  return http.post(
    `${getRehabAsmxBaseUrl()}${methodName}`,
    buildRehabAsmxDateBody(fromDate, toDate),
    { headers: REHAB_ASMX_JSON_HEADERS, responseType: 'text' },
  ).pipe(
    map((text) => parseRehabAsmxJsonText(text)),
  );
}
