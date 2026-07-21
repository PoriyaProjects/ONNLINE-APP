import { Injectable } from '@angular/core';
import { BillingPipelineLookupInput, BillingPipelineLookupResult } from './billing-pipeline.models';

const STORAGE_PREFIX = 'surgeryAiBilling_v2_';
const MAX_STORAGE_ENTRIES = 200;

interface CachedBillingPipelineEntry extends BillingPipelineLookupResult {
  cachedAt: string;
}

@Injectable({ providedIn: 'root' })
export class SurgeryBillingAiCacheService {
  private readonly memoryCache = new Map<string, BillingPipelineLookupResult>();

  buildCacheKey(input: BillingPipelineLookupInput): string {
    const payload = {
      hosp_report: String(input.hospReport ?? '').trim(),
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

    const fromStorage = this.readStorage(cacheKey);
    if (!fromStorage) {
      return null;
    }

    this.memoryCache.set(cacheKey, fromStorage);
    return this.cloneResult(fromStorage);
  }

  set(input: BillingPipelineLookupInput, result: BillingPipelineLookupResult): void {
    const cacheKey = this.buildCacheKey(input);
    const normalized = this.normalizeResult(result);
    this.memoryCache.set(cacheKey, normalized);
    this.writeStorage(cacheKey, normalized);
  }

  private normalizeResult(result: BillingPipelineLookupResult): BillingPipelineLookupResult {
    return {
      serviceCode: String(result.serviceCode ?? '').trim(),
      price: Number(result.price),
      icd9Codes: Array.isArray(result.icd9Codes) ? result.icd9Codes.map(String) : [],
      drgCodes: Array.isArray(result.drgCodes) ? result.drgCodes.map(String) : [],
    };
  }

  private cloneResult(result: BillingPipelineLookupResult): BillingPipelineLookupResult {
    return {
      serviceCode: result.serviceCode,
      price: result.price,
      icd9Codes: result.icd9Codes.slice(),
      drgCodes: result.drgCodes.slice(),
    };
  }

  private readStorage(cacheKey: string): BillingPipelineLookupResult | null {
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

  private writeStorage(cacheKey: string, result: BillingPipelineLookupResult): void {
    try {
      this.pruneStorageIfNeeded();
      const entry: CachedBillingPipelineEntry = {
        ...result,
        cachedAt: new Date().toISOString(),
      };
      localStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to cache AI billing lookup', error);
    }
  }

  private pruneStorageIfNeeded(): void {
    const keys: Array<{ key: string; cachedAt: string }> = [];

    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith(STORAGE_PREFIX)) {
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

    if (keys.length < MAX_STORAGE_ENTRIES) {
      return;
    }

    keys
      .sort((left, right) => left.cachedAt.localeCompare(right.cachedAt))
      .slice(0, keys.length - MAX_STORAGE_ENTRIES + 1)
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
