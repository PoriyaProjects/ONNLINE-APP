import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

import { environment } from 'src/environments/environment';
import {
  MachineRoomCode,
  MachineRoomsRealtimeResponse,
} from '../models/machine-rt-dashboard.models';

@Injectable({ providedIn: 'root' })
export class MachineRtDashboardService {
  constructor(private http: HttpClient) {}

  getMachineRoomsRealtime(date: string): Observable<MachineRoomsRealtimeResponse> {
    // TODO: connect after deploying WebService methods:
    // GET {environment.url}GetMachineRoomsRealtimeByDate?date=YYYY-MM-DD
    return of({ date, rooms: [] });
  }

  getMachineRoomRealtime(
    date: string,
    roomCode: MachineRoomCode,
  ): Observable<{ roomCode: MachineRoomCode; status: string } | null> {
    // TODO: connect after deploying WebService methods:
    // GET {environment.url}GetMachineRoomRealtimeByCode?date=YYYY-MM-DD&roomCode={roomCode}
    return of(null);
  }

  /** כתובת בסיס ל-API — ישמש כשהשרת יהיה מוכן */
  private apiUrl(path: string): string {
    return `${environment.url}${path}`;
  }
}
