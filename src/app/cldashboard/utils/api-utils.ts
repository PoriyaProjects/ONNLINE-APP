// utils/api-utils.ts
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { sanitizeApiJson } from './sanitize-util';

export function fetchSanitized<T>(
  http: HttpClient,
  url: string,
  fallback: T[],
  mode: 'label-value' | 'id-name' = 'id-name'
): Observable<T[]> {
  return http.get(url, { responseType: 'text' }).pipe(
    map(response => {
      const data = sanitizeApiJson(response, mode);
      return Array.isArray(data) ? (data as unknown as T[]) : [];
    }),
    catchError(err => {
      console.warn(`[API FALLBACK] Using mock data for ${url}:`, err);
      return of(fallback);
    })
  );
}


export function formatDateForApi(date: string): string {
  const [yyyy, mm, dd] = date.split('-');
  return `${dd}/${mm}/${yyyy}`;
}


// export function retryWithBackoff(maxRetry: number, delayMs: number) {
//   return retryWhen(errors =>
//     errors.pipe(
//       scan((retryCount, err) => {
//         if (retryCount >= maxRetry) {
//           throw err;
//         }
//         console.warn(`Retrying getDepartments() - Attempt #${retryCount + 1}`);
//         return retryCount + 1;
//       }, 0),
//       delay(delayMs)
//     )
//   );
// }
