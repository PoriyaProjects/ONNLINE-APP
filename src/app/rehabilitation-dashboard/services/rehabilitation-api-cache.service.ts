import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { finalize, map, shareReplay, tap } from 'rxjs/operators';

interface RehabApiCacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class RehabilitationApiCacheService {
  private readonly storagePrefix = 'rehab-api-cache:v9:';
  private readonly defaultTtlMs = 30 * 60 * 1000;
  private readonly emptyTtlMs = 5 * 60 * 1000;
  private readonly memory = new Map<string, RehabApiCacheEntry<unknown>>();
  private readonly inflight = new Map<string, Observable<unknown>>();

  get<T>(method: string, fromDate: string, toDate: string): T | null {
    const key = this.buildKey(method, fromDate, toDate);
    const memEntry = this.memory.get(key);
    const mem = this.readEntry(memEntry);
    if (mem != null) {
      return mem as T;
    }

    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return null;
      }
      const entry = JSON.parse(raw) as RehabApiCacheEntry<T>;
      const data = this.readEntry(entry);
      if (data == null) {
        localStorage.removeItem(key);
        return null;
      }
      this.memory.set(key, entry as RehabApiCacheEntry<unknown>);
      return data as T;
    } catch {
      return null;
    }
  }

  set<T>(method: string, fromDate: string, toDate: string, data: T): void {
    const isEmptyArray = Array.isArray(data) && data.length === 0;
    const ttlMs = isEmptyArray ? this.emptyTtlMs : this.defaultTtlMs;
    const entry: RehabApiCacheEntry<T> = {
      data,
      expiresAt: Date.now() + ttlMs,
    };
    const key = this.buildKey(method, fromDate, toDate);
    this.memory.set(key, entry as RehabApiCacheEntry<unknown>);
    try {
      localStorage.setItem(key, JSON.stringify(entry));
    } catch {
      // localStorage full or unavailable — memory cache still helps this tab
    }
  }

  invalidate(method: string, fromDate: string, toDate: string): void {
    const key = this.buildKey(method, fromDate, toDate);
    this.memory.delete(key);
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  invalidateMethodPrefix(method: string): void {
    const prefix = `${this.storagePrefix}${method}:`;
    this.memory.forEach((_value, key) => {
      if (key.startsWith(prefix)) {
        this.memory.delete(key);
      }
    });
    try {
      for (let i = localStorage.length - 1; i >= 0; i -= 1) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // ignore
    }
  }

  /** Cache-first fetch; skips network when a fresh entry exists in localStorage/memory. */
  getCachedOrFetch<T>(
    method: string,
    fromDate: string,
    toDate: string,
    fetch: () => Observable<T>,
  ): Observable<{ value: T; fromCache: boolean }> {
    const key = this.buildKey(method, fromDate, toDate);
    const cached = this.get<T>(method, fromDate, toDate);
    if (cached != null) {
      return of({ value: cached, fromCache: true });
    }

    const existing = this.inflight.get(key);
    if (existing) {
      return existing.pipe(map((value) => ({ value: value as T, fromCache: false })));
    }

    const request = fetch().pipe(
      tap((value) => this.set(method, fromDate, toDate, value)),
      finalize(() => this.inflight.delete(key)),
      shareReplay(1),
    );
    this.inflight.set(key, request);
    return request.pipe(map((value) => ({ value: value as T, fromCache: false })));
  }

  private buildKey(method: string, fromDate: string, toDate: string): string {
    return `${this.storagePrefix}${method}:${fromDate}:${toDate}`;
  }

  private readEntry(entry: RehabApiCacheEntry<unknown> | undefined): unknown | null {
    if (!entry) {
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      return null;
    }
    return entry.data;
  }
}
