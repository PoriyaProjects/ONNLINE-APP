import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from 'src/environments/environment';
import { sanitizeSoapResponse } from 'src/app/shared/sanitizesoapresponce';
import {
  MachineRoomCode,
  MachineRoomRealtimeState,
  MachineRoomsRealtimeResponse,
} from '../models/machine-rt-dashboard.models';

@Injectable({ providedIn: 'root' })
export class MachineRtDashboardService {
  private readonly baseUrl = (environment.url || '').replace(/\/?$/, '/');

  constructor(private http: HttpClient) {}

  getMachineRoomsRealtime(date: string): Observable<MachineRoomsRealtimeResponse> {
    const normalizedDate = this.normalizeDate(date);
    const url = `${this.baseUrl}GetMachineRoomsRealtimeByDate?date=${encodeURIComponent(normalizedDate)}`;

    return this.http.get(url, { responseType: 'text' }).pipe(
      map((raw) => this.parseRoomsResponse(raw, normalizedDate)),
      catchError(() => of({ date: normalizedDate, rooms: [] })),
    );
  }

  getMachineRoomRealtime(
    date: string,
    roomCode: MachineRoomCode,
  ): Observable<MachineRoomRealtimeState | null> {
    const normalizedDate = this.normalizeDate(date);
    const url = `${this.baseUrl}GetMachineRoomRealtimeByCode?date=${encodeURIComponent(normalizedDate)}&roomCode=${encodeURIComponent(roomCode)}`;

    return this.http.get(url, { responseType: 'text' }).pipe(
      map((raw) => this.parseSingleRoom(raw)),
      catchError(() => of(null)),
    );
  }

  private parseRoomsResponse(raw: string, fallbackDate: string): MachineRoomsRealtimeResponse {
    const parsed = this.unwrapJson(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { date: fallbackDate, rooms: [] };
    }

    const response = parsed as MachineRoomsRealtimeResponse;
    const error =
      typeof response.error === 'string' && response.error.trim().length > 0
        ? response.error.trim()
        : undefined;
    return {
      date: response.date || fallbackDate,
      rooms: Array.isArray(response.rooms) ? response.rooms : [],
      error,
    };
  }

  private parseSingleRoom(raw: string): MachineRoomRealtimeState | null {
    const trimmed = (raw || '').trim();
    if (!trimmed || trimmed === 'null') {
      return null;
    }

    const parsed = this.unwrapJson(trimmed);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return parsed as MachineRoomRealtimeState;
  }

  private unwrapJson(raw: string): unknown {
    let value: unknown = sanitizeSoapResponse(raw);

    if (typeof value === 'string') {
      const inner = value.trim();
      if (!inner || inner === 'null') {
        return null;
      }
      try {
        value = JSON.parse(inner);
      } catch {
        return null;
      }
    }

    if (value && typeof value === 'object' && 'd' in (value as Record<string, unknown>)) {
      const wrapped = (value as { d: unknown }).d;
      if (typeof wrapped === 'string') {
        try {
          return JSON.parse(wrapped);
        } catch {
          return wrapped;
        }
      }
      return wrapped;
    }

    return value;
  }

  private normalizeDate(date: string): string {
    const value = (date || '').trim();
    if (value.length > 0) {
      return value;
    }

    const today = new Date();
    const month = `${today.getMonth() + 1}`.padStart(2, '0');
    const day = `${today.getDate()}`.padStart(2, '0');
    return `${today.getFullYear()}-${month}-${day}`;
  }
}
