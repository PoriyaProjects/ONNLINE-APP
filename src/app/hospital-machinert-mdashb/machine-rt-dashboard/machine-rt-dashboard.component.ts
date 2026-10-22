import { Component, OnDestroy, OnInit } from '@angular/core';

import {
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

  roomStatus(room: MachineRoomSlot): string {
    return this.roomStates.get(room.code)?.status || 'טוען...';
  }

  roomLastUpdated(room: MachineRoomSlot): string | null {
    return this.roomStates.get(room.code)?.lastUpdated ?? null;
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
