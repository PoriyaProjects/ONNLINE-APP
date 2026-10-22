import { Component, OnDestroy, OnInit } from '@angular/core';

import {
  MachineRoomProcedureItem,
  MachineRoomRealtimeState,
  MachineRoomSlot,
} from '../models/machine-rt-dashboard.models';
import { MachineRtDashboardService } from '../services/machine-rt-dashboard.service';

@Component({
  selector: 'app-machine-rt-dashboard',
  templateUrl: './machine-rt-dashboard.component.html',
  styleUrls: ['./machine-rt-dashboard.component.css'],
})
export class MachineRtDashboardComponent implements OnInit, OnDestroy {
  readonly machineRooms: MachineRoomSlot[] = [
    { code: 'cath-1', label: 'חדר צינתורים 1' },
    { code: 'cath-2', label: 'חדר צינתורים 2' },
    { code: 'gastro', label: 'חדר גסטרו' },
    { code: 'angio', label: 'חדר אנגיו' },
  ];

  loading = true;
  loadError: string | null = null;
  viewDate = this.todayIso();
  roomStates = new Map<string, MachineRoomRealtimeState>();

  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private machineRtDashboard: MachineRtDashboardService) {}

  ngOnInit(): void {
    this.loadRooms();
    this.refreshTimer = setInterval(() => this.loadRooms(true), 120000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  trackByRoomCode(_index: number, room: MachineRoomSlot): string {
    return room.code;
  }

  trackByCase(_index: number, item: MachineRoomProcedureItem): string {
    return item.surgeryId || item.caseNumber || `${_index}`;
  }

  roomState(room: MachineRoomSlot): MachineRoomRealtimeState | undefined {
    return this.roomStates.get(room.code);
  }

  roomStatus(room: MachineRoomSlot): string {
    if (this.loading && !this.roomState(room)) {
      return 'טוען...';
    }
    return this.roomState(room)?.status || 'פנוי';
  }

  roomLastUpdated(room: MachineRoomSlot): string | null {
    return this.roomState(room)?.lastUpdated ?? null;
  }

  procedureTitle(item: MachineRoomProcedureItem | null | undefined): string {
    if (!item) {
      return '—';
    }
    const name = (item.surgeryName || '').trim();
    if (name.length > 0) {
      return name;
    }
    return 'פרוצדורה';
  }

  procedureCase(item: MachineRoomProcedureItem | null | undefined): string {
    const caseNo = (item?.caseNumber || '').trim();
    return caseNo.length > 0 ? caseNo : '—';
  }

  procedureSurgeon(item: MachineRoomProcedureItem | null | undefined): string {
    const name = (item?.surgeonName || '').trim();
    return name.length > 0 ? name : '—';
  }

  procedureDepartment(item: MachineRoomProcedureItem | null | undefined): string | null {
    const dept = (item?.department || '').trim();
    return dept.length > 0 ? dept : null;
  }

  formatClockHm(value: string | null | undefined): string | null {
    const raw = (value || '').trim();
    if (!raw || raw === '00:00:00' || raw === '00:00') {
      return null;
    }
    const match = raw.match(/^(\d{1,2}):(\d{2})/);
    if (!match) {
      return raw;
    }
    const hours = match[1].padStart(2, '0');
    const minutes = match[2];
    return `${hours}:${minutes}`;
  }

  /** זמנים בפועל / מתוכננים לתצוגה בשורה אחת (HH:MM) */
  procedureTimesActual(item: MachineRoomProcedureItem | null | undefined): string | null {
    if (!item) {
      return null;
    }
    const parts: string[] = [];
    const entry = this.formatClockHm(item.roomEntryTime);
    const cut = this.formatClockHm(item.procedureStartTime);
    const end = this.formatClockHm(item.procedureEndTime);
    const exit = this.formatClockHm(item.roomExitTime);
    if (entry) {
      parts.push(`כניסה ${entry}`);
    }
    if (cut) {
      parts.push(`חיתוך ${cut}`);
    }
    if (end) {
      parts.push(`סיום ${end}`);
    }
    if (exit) {
      parts.push(`יציאה ${exit}`);
    }
    return parts.length > 0 ? parts.join(' · ') : null;
  }

  procedureTimesPlanned(item: MachineRoomProcedureItem | null | undefined): string | null {
    if (!item) {
      return null;
    }
    const start = this.formatClockHm(item.plannedStartTime);
    const end = this.formatClockHm(item.plannedEndTime);
    if (start && end) {
      return `${start} – ${end}`;
    }
    if (start) {
      return start;
    }
    if (end) {
      return end;
    }
    return null;
  }

  private loadRooms(silent = false): void {
    if (!silent) {
      this.loading = true;
      this.loadError = null;
    }

    this.machineRtDashboard.getMachineRoomsRealtime(this.viewDate).subscribe({
      next: (response) => {
        this.viewDate = response.date || this.viewDate;
        this.roomStates.clear();
        (response.rooms || []).forEach((room) => {
          this.roomStates.set(room.roomCode, room);
        });
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.loadError = 'לא ניתן לטעון נתוני זמן אמת מהשרת';
      },
    });
  }

  private todayIso(): string {
    const today = new Date();
    const month = `${today.getMonth() + 1}`.padStart(2, '0');
    const day = `${today.getDate()}`.padStart(2, '0');
    return `${today.getFullYear()}-${month}-${day}`;
  }
}
