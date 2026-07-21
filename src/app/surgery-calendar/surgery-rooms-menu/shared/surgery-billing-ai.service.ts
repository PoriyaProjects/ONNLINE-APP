import { Injectable } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Observable } from 'rxjs';
import { BillingPipelineApiService } from './billing-pipeline-api.service';
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
    private datePipe: DatePipe
  ) {}

  lookupFromSurgery(surgery: any, fallbackDate?: Date | string | null): Observable<BillingPipelineLookupResult> {
    return this.billingPipelineApi.resolveServiceCodeAndPrice(
      this.buildLookupInput(surgery, fallbackDate)
    );
  }

  canLookupSurgery(surgery: any): boolean {
    return this.buildHospitalReport(surgery).trim().length > 0;
  }

  buildLookupInput(surgery: any, fallbackDate?: Date | string | null): BillingPipelineLookupInput {
    const surgeryDate = this.resolveSurgeryDate(surgery, fallbackDate);
    return {
      hospReport: this.buildHospitalReport(surgery),
      diagnosis: this.resolveDiagnosis(surgery),
      department: this.mapDepartment(surgery),
      surgeryDate,
      hospitalizationDate: surgeryDate,
      releaseDate: this.resolveReleaseDate(surgery, surgeryDate),
      checkInType: this.resolveCheckInType(surgery),
      icd9Diagnosis: this.resolveIcd9DiagnosisCodes(surgery),
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

  private resolveIcd9DiagnosisCodes(surgery: any): string[] {
    const raw = [
      surgery?.ICD9Anamniza,
      surgery?.ICD9Diagnosis,
      surgery?.DiagnosisCode,
      surgery?.SurgeryPatientDetails?.ICD9Anamniza,
    ];

    const codes = raw
      .flatMap((value) => String(value ?? '').split(/[,;\s]+/))
      .map((value) => value.trim())
      .filter((value) => /^\d{3}(\.\d+)?$/.test(value));

    return Array.from(new Set(codes));
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

  private resolveSurgeryDate(surgery: any, fallbackDate?: Date | string | null): string {
    const fromArrival = this.toDateOnly(surgery?.ArrivalDate);
    if (fromArrival) {
      return fromArrival;
    }

    const fromStart = this.toDateOnly(surgery?.start);
    if (fromStart) {
      return fromStart;
    }

    const fromFallback = this.toDateOnly(fallbackDate);
    if (fromFallback) {
      return fromFallback;
    }

    return this.datePipe.transform(new Date(), 'yyyy-MM-dd') ?? '1970-01-01';
  }

  private resolveReleaseDate(surgery: any, surgeryDate: string): string {
    const explicit = this.toDateOnly(surgery?.ReleaseDate ?? surgery?.DischargeDate);
    if (explicit) {
      return explicit;
    }

    const base = new Date(`${surgeryDate}T00:00:00`);
    base.setDate(base.getDate() + 3);
    return this.datePipe.transform(base, 'yyyy-MM-dd') ?? surgeryDate;
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
