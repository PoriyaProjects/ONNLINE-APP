import { Component, OnDestroy, OnInit } from '@angular/core';

import {
  MachineDashboardCategory,
  MachineDashboardRoomSlot,
} from '../models/machine-rt-dashboard-ui.models';
import {
  MachineRoomProcedureItem,
  MachineRoomRealtimeState,
} from '../models/machine-rt-dashboard.models';
import { MachineRtDashboardService } from '../services/machine-rt-dashboard.service';

@Component({
  selector: 'app-machine-rt-dashboard',
  templateUrl: './machine-rt-dashboard.component.html',
  styleUrls: ['./machine-rt-dashboard.component.css'],
})
export class MachineRtDashboardComponent implements OnInit, OnDestroy {
  readonly categories: MachineDashboardCategory[] = [
    {
      id: 'cath',
      label: 'צינתורים',
      rooms: [
        { code: 'cath-1', label: 'חדר צינתורים 1', subtitle: 'לב', apiCode: 'cath-1' },
        { code: 'cath-2', label: 'חדר צינתורים 2', subtitle: 'לב', apiCode: 'cath-2' },
        { code: 'cath-3', label: 'חדר צינתורים 3', subtitle: 'מח', apiCode: 'cath-3' },
      ],
    },
    {
      id: 'imaging',
      label: 'דימות',
      rooms: [
        { code: 'ct-1', label: 'CT 1' },
        { code: 'ct-2', label: 'CT 2' },
        { code: 'mri-1', label: 'MRI' },
        { code: 'xray-1', label: 'רנטגן 1' },
        { code: 'xray-2', label: 'רנטגן 2' },
        { code: 'imaging-angio', label: 'אנגיו', apiCode: 'angio' },
      ],
    },
    {
      id: 'ivf',
      label: 'IVF',
      rooms: [{ code: 'ivf-1', label: 'IVF' }],
    },
    {
      id: 'audiology',
      label: 'אודיולוגיה',
      rooms: [{ code: 'audiology-1', label: 'אודיולוגיה' }],
    },
    {
      id: 'lungs',
      label: 'מכון ריאות',
      rooms: [{ code: 'lungs-1', label: 'מכון ריאות' }],
    },
    {
      id: 'cardiac-rehab',
      label: 'מכון שיקום לב',
      rooms: [{ code: 'cardiac-rehab-1', label: 'מכון שיקום לב' }],
    },
    {
      id: 'day-hospital',
      label: 'אשפוז יום',
      rooms: [{ code: 'day-hospital-1', label: 'אשפוז יום' }],
    },
  ];

  activeCategoryId = 'cath';

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

  get activeCategory(): MachineDashboardCategory {
    return this.categories.find((c) => c.id === this.activeCategoryId) ?? this.categories[0];
  }

  get activeRooms(): MachineDashboardRoomSlot[] {
    return this.activeCategory.rooms;
  }

  get gridColumnsStyle(): string {
    const count = Math.max(this.activeRooms.length, 1);
    return `repeat(${count}, minmax(0, 1fr))`;
  }

  get roomsGridMinWidthPx(): number {
    const minCol = 200;
    return this.activeRooms.length * minCol;
  }

  selectCategory(categoryId: string): void {
    this.activeCategoryId = categoryId;
  }

  isCategoryActive(categoryId: string): boolean {
    return this.activeCategoryId === categoryId;
  }

  trackBySlotCode(_index: number, room: MachineDashboardRoomSlot): string {
    return room.code;
  }

  trackByCase(_index: number, item: MachineRoomProcedureItem): string {
    return item.surgeryId || item.caseNumber || `${_index}`;
  }

  slotHasApi(room: MachineDashboardRoomSlot): boolean {
    return !!room.apiCode;
  }

  roomState(room: MachineDashboardRoomSlot): MachineRoomRealtimeState | undefined {
    if (!room.apiCode) {
      return undefined;
    }
    return this.roomStates.get(room.apiCode);
  }

  roomStatus(room: MachineDashboardRoomSlot): string {
    if (!room.apiCode) {
      return 'ממשק מוכן — נתונים בקרוב';
    }
    if (this.loading && !this.roomState(room)) {
      return 'טוען...';
    }
    return this.roomState(room)?.status || 'פנוי';
  }

  roomLastUpdated(room: MachineDashboardRoomSlot): string | null {
    if (!room.apiCode) {
      return null;
    }
    return this.roomState(room)?.lastUpdated ?? null;
  }

  slotHeading(room: MachineDashboardRoomSlot): string {
    return room.label;
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
        this.loadError = response.error ? this.mapServerError(response.error) : null;
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

  private mapServerError(message: string): string {
    const lower = message.toLowerCase();
    if (
      lower.includes('ouverture de session') ||
      lower.includes('login failed') ||
      lower.includes('cannot open database') ||
      lower.includes('échec de l')
    ) {
      return 'שגיאת התחברות ל-SQL: חשבון IIS (SRV-APPS-PROD) לא מורשה, או ש-ChameleonConnection לא תואם לשאר WebService. ב-WebService יש לחבר MachineRtDashboard ל-connetionStringNAMER (ראה WEBSERVICE PASTE BLOCK).';
    }
    return message;
  }

  private todayIso(): string {
    const today = new Date();
    const month = `${today.getMonth() + 1}`.padStart(2, '0');
    const day = `${today.getDate()}`.padStart(2, '0');
    return `${today.getFullYear()}-${month}-${day}`;
  }
}
