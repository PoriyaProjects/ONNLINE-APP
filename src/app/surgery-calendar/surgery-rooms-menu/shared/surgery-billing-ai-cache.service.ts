import { Injectable } from '@angular/core';
import { BillingPipelineLookupInput, BillingPipelineLookupResult } from './billing-pipeline.models';

const STORAGE_PREFIX = 'surgeryAiBilling_v3_';
const ROW_STORAGE_PREFIX = 'surgeryAiBillingRow_v3_';
const MAX_STORAGE_ENTRIES = 400;
const MAX_ROW_STORAGE_ENTRIES = 600;

interface CachedBillingPipelineEntry extends BillingPipelineLookupResult {
  cachedAt: string;
}

@Injectable({ providedIn: 'root' })
export class SurgeryBillingAiCacheService {
  private readonly memoryCache = new Map<string, BillingPipelineLookupResult>();
  private readonly memoryRowCache = new Map<string, BillingPipelineLookupResult>();

  constructor() {
    this.warmMemoryFromStorage();
  }

  buildCacheKey(input: BillingPipelineLookupInput): string {
    const payload = {
      hosp_report: this.normalizeReport(input.hospReport),
      diagnosis: String(input.diagnosis ?? '').trim(),
      department: input.department,
      surgery_date: input.surgeryDate,
      hospitalization_date: input.hospitalizationDate ?? input.surgeryDate,
      release_date: input.releaseDate ?? input.surgeryDate,
      check_in_type: input.checkInType,
      icd9_diagnosis: (input.icd9Diagnosis ?? []).map(String).sort(),
    };

    return `${STORAGE_PREFIX}${this.hashString(JSON.stringify(payload))}`;
  }

  get(input: BillingPipelineLookupInput): BillingPipelineLookupResult | null {
    const cacheKey = this.buildCacheKey(input);
    const fromMemory = this.memoryCache.get(cacheKey);
    if (fromMemory) {
      return this.cloneResult(fromMemory);
    }

    const fromStorage = this.readInputStorage(cacheKey);
    if (!fromStorage) {
      return null;
    }

    this.memoryCache.set(cacheKey, fromStorage);
    return this.cloneResult(fromStorage);
  }

  getByRowId(rowId: string): BillingPipelineLookupResult | null {
    const normalizedRowId = String(rowId ?? '').trim();
    if (!normalizedRowId) {
      return null;
    }

    const fromMemory = this.memoryRowCache.get(normalizedRowId);
    if (fromMemory) {
      return this.cloneResult(fromMemory);
    }

    const fromStorage = this.readRowStorage(normalizedRowId);
    if (!fromStorage) {
      return null;
    }

    this.memoryRowCache.set(normalizedRowId, fromStorage);
    return this.cloneResult(fromStorage);
  }

  set(input: BillingPipelineLookupInput, result: BillingPipelineLookupResult, rowId?: string): void {
    const cacheKey = this.buildCacheKey(input);
    const normalized = this.normalizeResult(result);
    this.memoryCache.set(cacheKey, normalized);
    this.writeInputStorage(cacheKey, normalized);

    const normalizedRowId = String(rowId ?? '').trim();
    if (normalizedRowId) {
      this.memoryRowCache.set(normalizedRowId, normalized);
      this.writeRowStorage(normalizedRowId, normalized);
    }
  }

  private warmMemoryFromStorage(): void {
    try {
      for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index);
        if (!key) {
          continue;
        }

        if (key.startsWith(STORAGE_PREFIX)) {
          const result = this.readInputStorage(key);
          if (result) {
            this.memoryCache.set(key, result);
          }
          continue;
        }

        if (key.startsWith(ROW_STORAGE_PREFIX)) {
          const rowId = key.slice(ROW_STORAGE_PREFIX.length);
          const result = this.readRowStorage(rowId);
          if (result) {
            this.memoryRowCache.set(rowId, result);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to warm AI billing cache from localStorage', error);
    }
  }

  private normalizeReport(value: string | undefined | null): string {
    return String(value ?? '')
      .trim()
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n');
  }

  private normalizeResult(result: BillingPipelineLookupResult): BillingPipelineLookupResult {
    return {
      serviceCode: String(result.serviceCode ?? '').trim(),
      serviceName: String(result.serviceName ?? '').trim(),
      price: Number(result.price),
      icd9Codes: Array.isArray(result.icd9Codes) ? result.icd9Codes.map(String) : [],
      drgCodes: Array.isArray(result.drgCodes) ? result.drgCodes.map(String) : [],
    };
  }

  private cloneResult(result: BillingPipelineLookupResult): BillingPipelineLookupResult {
    return {
      serviceCode: result.serviceCode,
      serviceName: String(result.serviceName ?? '').trim(),
      price: result.price,
      icd9Codes: result.icd9Codes.slice(),
      drgCodes: result.drgCodes.slice(),
    };
  }

  private readInputStorage(cacheKey: string): BillingPipelineLookupResult | null {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as CachedBillingPipelineEntry;
      if (!parsed?.serviceCode || !Number.isFinite(Number(parsed.price)) || Number(parsed.price) <= 0) {
        return null;
      }

      return this.normalizeResult(parsed);
    } catch {
      return null;
    }
  }

  private readRowStorage(rowId: string): BillingPipelineLookupResult | null {
    try {
      const raw = localStorage.getItem(`${ROW_STORAGE_PREFIX}${rowId}`);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as CachedBillingPipelineEntry;
      if (!parsed?.serviceCode || !Number.isFinite(Number(parsed.price)) || Number(parsed.price) <= 0) {
        return null;
      }

      return this.normalizeResult(parsed);
    } catch {
      return null;
    }
  }

  private writeInputStorage(cacheKey: string, result: BillingPipelineLookupResult): void {
    try {
      this.pruneInputStorageIfNeeded();
      const entry: CachedBillingPipelineEntry = {
        ...result,
        cachedAt: new Date().toISOString(),
      };
      localStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to cache AI billing lookup', error);
    }
  }

  private writeRowStorage(rowId: string, result: BillingPipelineLookupResult): void {
    try {
      this.pruneRowStorageIfNeeded();
      const entry: CachedBillingPipelineEntry = {
        ...result,
        cachedAt: new Date().toISOString(),
      };
      localStorage.setItem(`${ROW_STORAGE_PREFIX}${rowId}`, JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to cache AI billing lookup by row id', error);
    }
  }

  private pruneInputStorageIfNeeded(): void {
    this.pruneStorageByPrefix(STORAGE_PREFIX, MAX_STORAGE_ENTRIES);
  }

  private pruneRowStorageIfNeeded(): void {
    this.pruneStorageByPrefix(ROW_STORAGE_PREFIX, MAX_ROW_STORAGE_ENTRIES);
  }

  private pruneStorageByPrefix(prefix: string, maxEntries: number): void {
    const keys: Array<{ key: string; cachedAt: string }> = [];

    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith(prefix)) {
        continue;
      }

      try {
        const raw = localStorage.getItem(key);
        if (!raw) {
          continue;
        }
        const parsed = JSON.parse(raw) as CachedBillingPipelineEntry;
        keys.push({ key, cachedAt: parsed?.cachedAt ?? '' });
      } catch {
        localStorage.removeItem(key);
      }
    }

    if (keys.length < maxEntries) {
      return;
    }

    keys
      .sort((left, right) => left.cachedAt.localeCompare(right.cachedAt))
      .slice(0, keys.length - maxEntries + 1)
      .forEach((entry) => localStorage.removeItem(entry.key));
  }

  private hashString(value: string): string {
    let hash = 5381;
    for (let index = 0; index < value.length; index++) {
      hash = ((hash << 5) + hash) + value.charCodeAt(index);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }
}
