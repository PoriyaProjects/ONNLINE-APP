import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { getDepartmentsForSection } from '../models/rehabilitation-dashboard.models';
import {
  DayRehabAvgTreatmentsPerPatientDto,
  DayRehabDischargesWithRecommendationDto,
  DayRehabPatientsByDirectionDto,
  DayRehabPatientsByPayerDto,
  DayRehabTreatmentsBySectorDto,
  DayRehabTreatmentsDailyCumulativeDto,
  DayRehabTreatmentsIndividualGroupDto,
  DayRehabTreatmentsPerPositionDto,
  RehabDayApiBlockCode,
} from '../models/rehabilitation-day-rehab.models';
import { postRehabAsmx, parseRehabAsmxListResponse } from '../utils/rehabilitation-asmx-request.util';
import { RehabilitationApiCacheService } from './rehabilitation-api-cache.service';

const BLOCK_METHODS: Record<RehabDayApiBlockCode, string> = {
  '2.1': 'GetDayRehabPatientsByPayer',
  '2.2': 'GetDayRehabPatientsByDirection',
  '2.3': 'GetDayRehabDischargesWithRecommendation',
  '2.4': 'GetDayRehabTreatmentsDailyCumulative',
  '2.5': 'GetDayRehabTreatmentsBySector',
  '2.6': 'GetDayRehabTreatmentsPerPosition',
  '2.7': 'GetDayRehabAvgTreatmentsPerPatient',
  '2.8': 'GetDayRehabTreatmentsIndividualGroup',
};

const VALID_DAY_DEPARTMENTS = new Set(getDepartmentsForSection('day-rehab'));

@Injectable({ providedIn: 'root' })
export class RehabilitationDayRehabApiService {
  constructor(
    private http: HttpClient,
    private cache: RehabilitationApiCacheService,
  ) {}

  getRows(
    blockCode: RehabDayApiBlockCode,
    fromDate: string,
    toDate: string,
  ): Observable<unknown[]> {
    const method = BLOCK_METHODS[blockCode];
    return this.cache.getCachedOrFetch(
      method,
      fromDate,
      toDate,
      () => postRehabAsmx(this.http, method, fromDate, toDate).pipe(
        map((response) => this.normalizeList(blockCode, response)),
        catchError((err) => {
          console.error(`[RehabilitationDayRehabApi] ${method} failed`, err);
          return throwError(() => err);
        }),
      ),
    ).pipe(map((result) => result.value));
  }

  invalidateCache(blockCode: RehabDayApiBlockCode, fromDate: string, toDate: string): void {
    this.cache.invalidate(BLOCK_METHODS[blockCode], fromDate, toDate);
  }

  peekCache(blockCode: RehabDayApiBlockCode, fromDate: string, toDate: string): unknown[] | null {
    return this.cache.get(BLOCK_METHODS[blockCode], fromDate, toDate);
  }

  private normalizeList(blockCode: RehabDayApiBlockCode, raw: unknown): unknown[] {
    return parseRehabAsmxListResponse(raw)
      .map((row) => this.normalizeRow(blockCode, row))
      .filter((row): row is Record<string, unknown> => row != null);
  }

  private normalizeRow(blockCode: RehabDayApiBlockCode, raw: unknown): unknown | null {
    const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const departmentName = String(row.DepartmentName ?? row.departmentName ?? '').trim();
    if (!departmentName || !VALID_DAY_DEPARTMENTS.has(departmentName)) {
      return null;
    }
    const date = this.normalizeDate(row.Date ?? row.date);

    switch (blockCode) {
      case '2.1':
        return {
          date,
          payerName: String(row.PayerName ?? row.payerName ?? '').trim(),
          patientCount: Number(row.PatientCount ?? row.patientCount ?? 0),
          departmentName,
        } as DayRehabPatientsByPayerDto;
      case '2.2':
        return {
          date,
          direction: String(row.Direction ?? row.direction ?? '').trim(),
          funderName: String(row.FunderName ?? row.funderName ?? '').trim(),
          patientCount: Number(row.PatientCount ?? row.patientCount ?? 0),
          departmentName,
        } as DayRehabPatientsByDirectionDto;
      case '2.3':
        return {
          date,
          dischargeCount: Number(row.DischargeCount ?? row.dischargeCount ?? 0),
          treatedHere: Number(row.TreatedHere ?? row.treatedHere ?? 0),
          notTreatedHere: Number(row.NotTreatedHere ?? row.notTreatedHere ?? 0),
          departmentName,
        } as DayRehabDischargesWithRecommendationDto;
      case '2.4':
        return {
          date,
          dailyCount: Number(row.DailyCount ?? row.dailyCount ?? 0),
          cumulativeCount: Number(row.CumulativeCount ?? row.cumulativeCount ?? 0),
          departmentName,
        } as DayRehabTreatmentsDailyCumulativeDto;
      case '2.5':
        return {
          date,
          sectorName: String(row.SectorName ?? row.sectorName ?? '').trim(),
          treatmentCount: Number(row.TreatmentCount ?? row.treatmentCount ?? 0),
          departmentName,
        } as DayRehabTreatmentsBySectorDto;
      case '2.6':
        return {
          date,
          sectorName: String(row.SectorName ?? row.sectorName ?? '').trim(),
          treatmentsPerPosition: Number(row.TreatmentsPerPosition ?? row.treatmentsPerPosition ?? 0),
          departmentName,
        } as DayRehabTreatmentsPerPositionDto;
      case '2.7':
        return {
          date,
          avgTreatments: Number(row.AvgTreatments ?? row.avgTreatments ?? 0),
          patientCount: Number(row.PatientCount ?? row.patientCount ?? 0),
          departmentName,
        } as DayRehabAvgTreatmentsPerPatientDto;
      case '2.8':
        return {
          date,
          treatmentType: String(row.TreatmentType ?? row.treatmentType ?? '').trim(),
          treatmentCount: Number(row.TreatmentCount ?? row.treatmentCount ?? 0),
          departmentName,
        } as DayRehabTreatmentsIndividualGroupDto;
      default:
        return null;
    }
  }

  private normalizeDate(value: unknown): string {
    if (value == null) {
      return '';
    }
    if (typeof value === 'string') {
      const dotnetMatch = /\/Date\((\d+)\)\//.exec(value);
      if (dotnetMatch) {
        return new Date(Number(dotnetMatch[1])).toISOString().slice(0, 10);
      }
      if (value.length >= 10) {
        return value.slice(0, 10);
      }
      return value;
    }
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }
    return String(value);
  }
}
