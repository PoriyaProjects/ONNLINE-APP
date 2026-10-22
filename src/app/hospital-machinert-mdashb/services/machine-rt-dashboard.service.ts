import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from 'src/environments/environment';
import { sanitizeSoapResponse } from 'src/app/shared/sanitizesoapresponce';
import { parseAsmxPayload } from 'src/app/pci-dashborad-n/utils/pci-asmx.util';
import {
  MachineRoomCode,
  MachineRoomRealtimeState,
  MachineRoomsRealtimeResponse,
} from '../models/machine-rt-dashboard.models';
import { buildCathRoomsFromPicCombined } from './machine-pic-pci.mapper';

@Injectable({ providedIn: 'root' })
export class MachineRtDashboardService {
  private readonly baseUrl = (environment.url || '').replace(/\/?$/, '/');

  constructor(private http: HttpClient) {}

  getMachineRoomsRealtime(date: string): Observable<MachineRoomsRealtimeResponse> {
    const normalizedDate = this.normalizeDate(date);
    const serverUrl = `${this.baseUrl}GetMachineRoomsRealtimeByDate?date=${encodeURIComponent(normalizedDate)}`;
    const picUrl = `${this.baseUrl}GetPicDetailedDataCombined?dparam=0`;

    return forkJoin({
      server: this.http.get(serverUrl, { responseType: 'text' }).pipe(
        map((raw) => this.parseRoomsResponse(raw, normalizedDate)),
        catchError(() => of({ date: normalizedDate, rooms: [] as MachineRoomRealtimeState[] })),
      ),
      pic: this.http.get(picUrl, { responseType: 'text' }).pipe(
        map((raw) => parseAsmxPayload(raw)),
        catchError(() => of(null)),
      ),
    }).pipe(
      map(({ server, pic }) => this.mergePicAndServer(normalizedDate, server, pic)),
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
    return {
      date: response.date || fallbackDate,
      rooms: Array.isArray(response.rooms) ? response.rooms : [],
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

  private mergePicAndServer(
    date: string,
    server: MachineRoomsRealtimeResponse,
    picPayload: unknown,
  ): MachineRoomsRealtimeResponse {
    const lastUpdated = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const cathFromPic = buildCathRoomsFromPicCombined(picPayload, date, lastUpdated);
    const cathMap = new Map(cathFromPic.map((room) => [room.roomCode, room]));

    const serverRooms = server.rooms || [];
    const merged: MachineRoomRealtimeState[] = [];
    const order: MachineRoomCode[] = ['cath-1', 'cath-2', 'gastro', 'angio'];

    order.forEach((code) => {
      const fromPic = cathMap.get(code);
      if (fromPic) {
        merged.push(fromPic);
        return;
      }
      const fromServer = serverRooms.find((r) => r.roomCode === code);
      if (fromServer) {
        merged.push(fromServer);
        return;
      }
      merged.push(this.emptyRoomState(code, date, lastUpdated));
    });

    return { date: server.date || date, rooms: merged };
  }

  private emptyRoomState(
    code: MachineRoomCode,
    date: string,
    lastUpdated: string,
  ): MachineRoomRealtimeState {
    const labels: Record<MachineRoomCode, string> = {
      'cath-1': 'חדר צינתורים 1',
      'cath-2': 'חדר צינתורים 2',
      gastro: 'חדר גסטרו',
      angio: 'חדר אנגיו',
    };
    return {
      roomCode: code,
      roomLabel: labels[code],
      status: 'פנוי',
      lastUpdated,
      completedCount: 0,
      plannedCount: 0,
      inProgress: null,
      completedToday: [],
      plannedToday: [],
    };
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
