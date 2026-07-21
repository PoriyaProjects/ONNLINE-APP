import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, switchMap, timeout } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  BillingPipelineLookupInput,
  BillingPipelineLookupResult,
  Icd9ToDrgResponse,
  TextToIcd9Response,
} from './billing-pipeline.models';

const ICD9_TIMEOUT_MS = 65_000;
const DRG_TIMEOUT_MS = 15_000;
const SERVER_TIMEOUT_MS = 70_000;

type BillingPipelineMode = 'server' | 'proxy' | 'direct';

@Injectable({ providedIn: 'root' })
export class BillingPipelineApiService {
  private readonly directBaseUrl = String(environment.billingPipelineApiUrl ?? '').replace(/\/$/, '');
  private readonly proxyBaseUrl = String(environment.billingPipelineProxyPath ?? '/billing-pipeline').replace(/\/$/, '');
  private readonly mode: BillingPipelineMode = (environment.billingPipelineMode ?? 'proxy') as BillingPipelineMode;

  constructor(private http: HttpClient) {}

  resolveServiceCodeAndPrice(input: BillingPipelineLookupInput): Observable<BillingPipelineLookupResult> {
    if (this.mode === 'server') {
      return this.resolveViaServer(input);
    }

    if (this.mode === 'proxy') {
      return this.resolveViaProxy(input);
    }

    return this.resolveDirect(input);
  }

  private resolveViaServer(input: BillingPipelineLookupInput): Observable<BillingPipelineLookupResult> {
    return this.http.post(environment.url + 'BillingPipelineResolveServiceCode', {
      hosp_report: input.hospReport,
      diagnosis: input.diagnosis ?? '',
      department: input.department,
      surgery_date: input.surgeryDate,
      hospitalization_date: input.hospitalizationDate ?? input.surgeryDate,
      release_date: input.releaseDate ?? input.surgeryDate,
      check_in_type: input.checkInType,
      icd9_diagnosis: input.icd9Diagnosis ?? [],
    }).pipe(
      timeout(SERVER_TIMEOUT_MS),
      map((response) => this.parseServerResponse(response))
    );
  }

  private parseServerResponse(response: any): BillingPipelineLookupResult {
    const data = response?.d ?? response ?? {};
    const serviceCode = String(data.serviceCode ?? data.chosen_service_code ?? '').trim();
    const price = Number(data.price ?? data.service_code_prices?.[serviceCode] ?? 0);

    if (!serviceCode) {
      throw new Error('Billing pipeline proxy returned no service code');
    }
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error('Billing pipeline proxy returned no price');
    }

    return {
      serviceCode,
      price,
      icd9Codes: Array.isArray(data.icd9Codes) ? data.icd9Codes : (Array.isArray(data.icd9_codes) ? data.icd9_codes : []),
      drgCodes: Array.isArray(data.drgCodes) ? data.drgCodes : (Array.isArray(data.drg_codes) ? data.drg_codes : []),
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
