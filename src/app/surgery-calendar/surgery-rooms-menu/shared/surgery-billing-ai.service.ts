import { Injectable } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { BillingPipelineApiService } from './billing-pipeline-api.service';
import { SurgeryBillingAiCacheService } from './surgery-billing-ai-cache.service';
import {
  BillingPipelineCheckInType,
  BillingPipelineDepartment,
  BillingPipelineLookupInput,
  BillingPipelineLookupResult,
} from './billing-pipeline.models';

@Injectable({ providedIn: 'root' })
export class SurgeryBillingAiService {
  constructor(
    private billingPipelineApi: BillingPipelineApiService,
    private billingAiCache: SurgeryBillingAiCacheService,
    private datePipe: DatePipe
  ) {}

  lookupFromSurgery(surgery: any, fallbackDate?: Date | string | null): Observable<BillingPipelineLookupResult> {
    const input = this.buildLookupInput(surgery, fallbackDate);
    const cached = this.billingAiCache.get(input);
    if (cached) {
      return of(cached);
    }

    return this.billingPipelineApi.resolveServiceCodeAndPrice(input).pipe(
      tap((result) => this.billingAiCache.set(input, result))
    );
  }

  getCachedForSurgery(surgery: any, fallbackDate?: Date | string | null): BillingPipelineLookupResult | null {
    return this.billingAiCache.get(this.buildLookupInput(surgery, fallbackDate));
  }

  canLookupSurgery(surgery: any): boolean {
    return this.buildHospitalReport(surgery).trim().length > 0
      && !!this.resolveArrivalDate(surgery);
  }

  buildLookupInput(surgery: any, _fallbackDate?: Date | string | null): BillingPipelineLookupInput {
    const arrivalDate = this.resolveArrivalDate(surgery) ?? '';
    const hospReport = this.buildHospitalReport(surgery);
    return {
      hospReport,
      diagnosis: this.resolveDiagnosis(surgery),
      department: this.mapDepartment(surgery),
      surgeryDate: arrivalDate,
      hospitalizationDate: arrivalDate,
      releaseDate: this.resolveReleaseDate(surgery, arrivalDate),
      checkInType: this.resolveCheckInType(surgery),
      icd9Diagnosis: this.resolveIcd9DiagnosisCodes(surgery, hospReport),
    };
  }

  buildHospitalReport(surgery: any): string {
    const lines: string[] = [];

    (surgery?.SurgeriesCalendar_Susgeries ?? []).forEach((procedure: any) => {
      const label = this.resolveProcedureLabel(procedure);
      if (!label) {
        return;
      }

      const side = String(procedure?.Side ?? '').trim();
      const code = String(procedure?.Surgery_Code ?? procedure?.SurgeryCode ?? '').trim();
      const details = [
        side ? `צד: ${side}` : '',
        code ? `קוד ניתוח: ${code}` : '',
      ].filter(Boolean).join(', ');

      lines.push(details ? `בוצע ${label} (${details})` : `בוצע ${label}`);
    });

    if (lines.length > 0) {
      return lines.join('\n');
    }

    const services = surgery?.SurgeriesCalendar_Service ?? [];
    services.forEach((service: any) => {
      const label = String(service?.Service_Name ?? service?.S_SERVICE_VAL ?? '').trim();
      if (label) {
        lines.push(`שירות: ${label}`);
      }
    });

    if (lines.length > 0) {
      return lines.join('\n');
    }

    const fallback = String(
      surgery?.SurgeryServicesName?.S_SERVICE_VAL
      ?? surgery?.S_SERVICE_VAL
      ?? surgery?.Surgery_Name
      ?? surgery?.SurgeryName
      ?? ''
    ).trim();

    return fallback ? `בוצע ${fallback}` : '';
  }

  private resolveProcedureLabel(procedure: any): string {
    return String(
      procedure?.Surgery_Name
      ?? procedure?.SurgeryName
      ?? procedure?.Service_Name
      ?? procedure?.S_SERVICE_VAL
      ?? ''
    ).trim();
  }

  private resolveDiagnosis(surgery: any): string {
    const candidates = [
      surgery?.Diagnosis,
      surgery?.PM_DIAGNOSIS,
      surgery?.SurgeryPatientDetails?.Diagnosis,
      surgery?.SurgeryPatientDetails?.PM_DIAGNOSIS,
      surgery?.ICD9Anamniza,
      surgery?.ICD9Diagnosis,
    ];

    for (const candidate of candidates) {
      const value = String(candidate ?? '').trim();
      if (value) {
        return value;
      }
    }

    return '';
  }

  private resolveIcd9DiagnosisCodes(surgery: any, hospReport = ''): string[] {
    const codes = new Set<string>();

    const addCode = (value: any) => {
      const normalized = this.normalizeIcd9Code(value);
      if (normalized) {
        codes.add(normalized);
      }
    };

    [
      surgery?.ICD9Anamniza,
      surgery?.ICD9Diagnosis,
      surgery?.DiagnosisCode,
      surgery?.SurgeryPatientDetails?.ICD9Anamniza,
    ].forEach((value) => {
      String(value ?? '').split(/[,;\s]+/).forEach((part) => addCode(part));
    });

    (surgery?.SurgeriesCalendar_Susgeries ?? []).forEach((procedure: any) => {
      addCode(procedure?.Surgery_Code ?? procedure?.SurgeryCode);
    });

    this.extractSurgeryCodesFromReport(hospReport).forEach((code) => addCode(code));

    return Array.from(codes);
  }

  private extractSurgeryCodesFromReport(report: string): string[] {
    const codes: string[] = [];
    const pattern = /קוד ניתוח:\s*([\d.]+)/g;
    let match: RegExpExecArray | null = pattern.exec(String(report ?? ''));

    while (match) {
      codes.push(match[1]);
      match = pattern.exec(String(report ?? ''));
    }

    return codes;
  }

  private normalizeIcd9Code(value: any): string | null {
    const code = String(value ?? '').trim();
    if (!code) {
      return null;
    }

    return /^\d{2,3}(\.\d{1,2})?$/.test(code) ? code : null;
  }

  private mapDepartment(surgery: any): BillingPipelineDepartment {
    const department = String(surgery?.SurgeryRequestDepartments?.S_DEPARTMENT ?? '').trim();
    const normalized = department.toLowerCase();

    if (/אורתופ|שבר|ברך|מפרק|עמוד שדרה|orthop/i.test(department) || normalized.includes('orthop')) {
      return 'orthopedic';
    }

    if (/לב|כלי דם|צנתור|קרדיו|cardio/i.test(department) || normalized.includes('cardio')) {
      return 'cardiology';
    }

    return 'other';
  }

  private resolveCheckInType(surgery: any): BillingPipelineCheckInType {
    const urgency = String(surgery?.Urgency ?? surgery?.SurgeryType ?? '');
    return urgency.includes('דחוף') ? 'emergency' : 'elective';
  }

  private resolveArrivalDate(surgery: any): string | null {
    return this.toDateOnly(surgery?.ArrivalDate);
  }

  private resolveReleaseDate(surgery: any, arrivalDate: string): string {
    const explicit = this.toDateOnly(surgery?.ReleaseDate ?? surgery?.DischargeDate);
    if (explicit) {
      return explicit;
    }

    return arrivalDate;
  }

  private toDateOnly(value: any): string | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return this.datePipe.transform(value, 'yyyy-MM-dd');
    }

    const raw = String(value).trim();
    if (!raw) {
      return null;
    }

    const datePart = raw.split(/[ T]/)[0];
    return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : null;
  }
}
