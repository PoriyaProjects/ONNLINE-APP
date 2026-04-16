import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { sanitizeApiJson } from '../utils/sanitize-util';

@Injectable({ providedIn: 'root' })
export class ChartDataService {
  private cache: Map<string, BehaviorSubject<any[]>> = new Map();

  constructor(private http: HttpClient) {}

  /**
   * Get observable for chart data by key.
   */
  getChartData(key: string): Observable<any[]> {
    if (!this.cache.has(key)) {
      this.cache.set(key, new BehaviorSubject<any[]>([]));
    }
    return this.cache.get(key)!.asObservable();
  }

  /**
   * Load chart data from API and update cache.
   */
  fetchChartDataFromApi(
    key: string,
    url: string,
    mode: 'label-value' | 'id-name' = 'label-value'
  ): void {
    this.http.get(url, { responseType: 'text' }).pipe(
      tap(raw => {
        const sanitized = sanitizeApiJson(raw, mode);
        if (!this.cache.has(key)) {
          this.cache.set(key, new BehaviorSubject<any[]>(sanitized));
        } else {
          this.cache.get(key)!.next(sanitized);
        }
      })
    ).subscribe();
  }

  /**
   * Clear cached data for a specific key
   */
  clearCache(key: string): void {
    if (this.cache.has(key)) {
      this.cache.get(key)!.next([]);
    }
  }
}
