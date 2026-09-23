import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { finalize, map, shareReplay, switchMap, tap, timeout } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  BillingPipelineLookupInput,
  BillingPipelineLookupResult,
  Icd9ToDrgResponse,
  TextToIcd9Response,
} from './billing-pipeline.models';
import { SurgeryBillingAiCacheService } from './surgery-billing-ai-cache.service';

const ICD9_TIMEOUT_MS = 65_000;
const DRG_TIMEOUT_MS = 15_000;
/** API 1 (~60s) + API 2 on server; allow headroom for sequential proxy. */
const SERVER_TIMEOUT_MS = 140_000;

type BillingPipelineMode = 'server' | 'proxy' | 'direct';

@Injectable({ providedIn: 'root' })
export class BillingPipelineApiService {
  private readonly directBaseUrl = String(environment.billingPipelineApiUrl ?? '').replace(/\/$/, '');
  private readonly proxyBaseUrl = String(environment.billingPipelineProxyPath ?? '/billing-pipeline').replace(/\/$/, '');
  private readonly mode: BillingPipelineMode = (environment.billingPipelineMode ?? 'proxy') as BillingPipelineMode;
  private readonly inFlight = new Map<string, Observable<BillingPipelineLookupResult>>();

  constructor(
    private http: HttpClient,
    private billingCache: SurgeryBillingAiCacheService,
  ) {}

  resolveServiceCodeAndPrice(input: BillingPipelineLookupInput): Observable<BillingPipelineLookupResult> {
    const cached = this.billingCache.get(input);
    if (cached) {
      return of(cached);
    }

    const cacheKey = this.billingCache.buildCacheKey(input);
    const inflight = this.inFlight.get(cacheKey);
    if (inflight) {
      return inflight;
    }

    const request = this.resolveUncached(input).pipe(
      tap((result) => this.billingCache.set(input, result)),
      finalize(() => this.inFlight.delete(cacheKey)),
      shareReplay(1),
    );

    this.inFlight.set(cacheKey, request);
    return request;
  }

  private resolveUncached(input: BillingPipelineLookupInput): Observable<BillingPipelineLookupResult> {
    if (this.mode === 'server') {
      return this.resolveViaServer(input);
    }

    if (this.mode === 'proxy') {
      return this.resolveViaProxy(input);
    }

    return this.resolveDirect(input);
  }

  private resolveViaServer(input: BillingPipelineLookupInput): Observable<BillingPipelineLookupResult> {
    const icd9Diagnosis = (input.icd9Diagnosis ?? [])
      .map((code) => String(code ?? '').trim())
      .filter(Boolean);

    return this.http.post(environment.url + 'BillingPipelineResolveServiceCode', {
      hosp_report: input.hospReport,
      diagnosis: input.diagnosis ?? '',
      department: input.department,
      surgery_date: input.surgeryDate,
      hospitalization_date: input.hospitalizationDate ?? input.surgeryDate,
      release_date: input.releaseDate ?? input.surgeryDate,
      check_in_type: input.checkInType,
      icd9_diagnosis: icd9Diagnosis,
    }).pipe(
      timeout(SERVER_TIMEOUT_MS),
      map((response) => this.parseServerResponse(response))
    );
  }

  private parseServerResponse(response: any): BillingPipelineLookupResult {
    const data = response?.d ?? response ?? {};
    const serviceCode = String(
      data.serviceCode
      ?? data.ServiceCode
      ?? data.chosen_service_code
      ?? ''
    ).trim();
    const price = Number(
      data.price
      ?? data.Price
      ?? data.service_code_prices?.[serviceCode]
      ?? 0
    );

    if (!serviceCode) {
      throw new Error('Billing pipeline proxy returned no service code');
    }
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error('Billing pipeline proxy returned no price');
    }

    const icd9Codes = data.icd9Codes ?? data.Icd9Codes ?? data.icd9_codes ?? [];
    const drgCodes = data.drgCodes ?? data.DrgCodes ?? data.drg_codes ?? [];
    const serviceName = String(data.serviceName ?? data.ServiceName ?? '').trim();

    return {
      serviceCode,
      serviceName,
      price,
      icd9Codes: Array.isArray(icd9Codes) ? icd9Codes.map(String) : [],
      drgCodes: Array.isArray(drgCodes) ? drgCodes.map(String) : [],
    };
  }

  private resolveViaProxy(input: BillingPipelineLookupInput): Observable<BillingPipelineLookupResult> {
    return this.extractIcd9(input, this.proxyBaseUrl).pipe(
      switchMap((icd9Response) => {
        const drgRequest = this.buildDrgRequest(icd9Response, input);
        if (!drgRequest.icd9_codes.length) {
          return throwError(() => new Error('Billing pipeline returned no ICD-9 codes'));
        }

        return this.http.post<Icd9ToDrgResponse>(`${this.proxyBaseUrl}/api/icd9-to-drg`, drgRequest).pipe(
          timeout(DRG_TIMEOUT_MS),
          map((drgResponse) => this.toLookupResult(drgRequest.icd9_codes, drgResponse))
        );
      })
    );
  }

  private resolveDirect(input: BillingPipelineLookupInput): Observable<BillingPipelineLookupResult> {
    if (!this.directBaseUrl) {
      return throwError(() => new Error('Billing pipeline direct URL is not configured'));
    }

    return this.extractIcd9(input, this.directBaseUrl).pipe(
      switchMap((icd9Response) => {
        const drgRequest = this.buildDrgRequest(icd9Response, input);
        if (!drgRequest.icd9_codes.length) {
          return throwError(() => new Error('Billing pipeline returned no ICD-9 codes'));
        }

        return this.http.post<Icd9ToDrgResponse>(`${this.directBaseUrl}/api/icd9-to-drg`, drgRequest).pipe(
          timeout(DRG_TIMEOUT_MS),
          map((drgResponse) => this.toLookupResult(drgRequest.icd9_codes, drgResponse))
        );
      })
    );
  }

  private extractIcd9(input: BillingPipelineLookupInput, baseUrl: string): Observable<TextToIcd9Response> {
    const body: Record<string, string> = {
      hosp_report: input.hospReport,
      department: input.department,
    };

    if (input.diagnosis?.trim()) {
      body.diagnosis = input.diagnosis.trim();
    }

    return this.http.post<TextToIcd9Response>(`${baseUrl}/api/text-to-icd9`, body).pipe(
      timeout(ICD9_TIMEOUT_MS),
      map((response) => {
        if (response?.error) {
          throw new Error(response.error);
        }
        return response ?? {};
      })
    );
  }

  private buildDrgRequest(
    icd9Response: TextToIcd9Response,
    input: BillingPipelineLookupInput
  ): {
    icd9_codes: string[];
    is_primary_procedure: Record<string, boolean>;
    icd9_diagnosis: string[];
    hospitalization_date: string;
    surgery_date: string;
    release_date: string;
    check_in_type: BillingPipelineLookupInput['checkInType'];
  } {
    const icd9Codes = (icd9Response.icd9_codes ?? [])
      .map((code) => String(code ?? '').trim())
      .filter(Boolean);
    const isPrimary = icd9Response.is_primary_procedure ?? {};
    const normalizedPrimary = icd9Codes.reduce<Record<string, boolean>>((acc, code) => {
      acc[code] = isPrimary[code] === true;
      return acc;
    }, {});

    return {
      icd9_codes: icd9Codes,
      is_primary_procedure: normalizedPrimary,
      icd9_diagnosis: input.icd9Diagnosis ?? [],
      hospitalization_date: input.hospitalizationDate ?? input.surgeryDate,
      surgery_date: input.surgeryDate,
      release_date: input.releaseDate ?? input.surgeryDate,
      check_in_type: input.checkInType,
    };
  }

  private toLookupResult(
    icd9Codes: string[],
    drgResponse: Icd9ToDrgResponse
  ): BillingPipelineLookupResult {
    if (drgResponse?.error) {
      throw new Error(drgResponse.error);
    }

    const serviceCode = String(drgResponse?.chosen_service_code ?? '').trim();
    if (!serviceCode) {
      throw new Error('Billing pipeline returned no service code');
    }

    const price = Number(drgResponse?.service_code_prices?.[serviceCode] ?? 0);
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error('Billing pipeline returned no price for service code');
    }

    return {
      serviceCode,
      price,
      icd9Codes: icd9Codes.slice(),
      drgCodes: Array.isArray(drgResponse?.drg_codes) ? drgResponse.drg_codes.slice() : [],
    };
  }
}
