import {
    animate,
    state,
    style,
    transition,
    trigger,
} from "@angular/animations";
import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    Input,
    OnInit,
} from "@angular/core";
import { forkJoin, interval, of, Subject } from "rxjs";
import { catchError, shareReplay, startWith, takeUntil } from "rxjs/operators";
import { GoogleChartsService } from "../services/google-charts.service";

import {
    DepartmentColorService,
    PaletteService,
} from "../../shared/charts-config";

interface DepartmentMetricEntry {
    period: string;
    source: string;
    aggregateDays?: number;
    avgMinutes?: number;
}
interface DepartmentData {
    departName: string;
    metrics: DepartmentMetricEntry[];
}

export interface Surgery {
    surgeryId: string;
    patientNumber: string;
    surgeryName: string;
    surgeryCode: string;
    department: string;
    status: "Planned" | "InProgress" | "Completed";
    timeEntrance: string;
    timeExit: string;
    surgeryDate: string;
    SurgeryRoom: string;
    SurgeryDate: string; // 'YYYY-MM-DD'
    TimeEntranceToTheOperatingRoom: string | null; // 'HH:mm' or null
    TimeExitingTheOperatingRoom: string | null; // 'HH:mm' or null
    SurgeryStatus: "Completed" | "InProgress" | "Planned" | string;
    TimeSurgeryToDo: string | number | null;
    // 🆕 חתימות
    AdmissionNo?: number;
    ReadyForSurgery?: number; // 0 | 1
    MissingSignatures?: string | null; // טקסט
    SignatureByRole?: string | null; // JSON string

    // 🆕 אינדיקציות UI
    IsWaitingForSurgery?: boolean;
    NextPatientReadyGreen?: boolean;
    MissingSignaturesText?: string | null;
    AvgDuration?: string | null;
    AvgDauration?: number | null;
    DoctorSurgeon: string | null;
    SurgeryType : string | null;
    CalendarRoomsArea?: string | null;  // "חדר ניתוח אמבולטורי" או "חדר ניתוח כללי"
    SurgeryRoomName?: string | null;  // "חדר ניתוח אמבולטורי - 1" או "חדר ניתוח כללי - 1"
    Urgency?: string | null;
    urgency?: string | null;
    Priority?: string | null;
    priority?: string | null;
    Triage?: string | null;
    triage?: string | null;
    SurgeryID?: string;
    CaseNumber?: string;
    SurgeryName?: string;
    SurgeryCode?: string;
    DepartName?: string;
    roomId?: string;
    surgeryRoom?: string;
    room?: string;
    timeToDo?: string | number;
    duration?: string | number;
    timeSurgeryToDo?: string | number;
    timeEndSurgery?: string | null;
    _displayStart?: Date;
    _displayEnd?: Date;
    _displayStartMs?: number;
    sortKey?: number;
    raw?: Surgery;
    entrance?: Date;
    exit?: Date;
    expectedMin?: number;
    /** true כאשר אין מקור למשך (לוח / ממוצע / דרור) – להצגת "לא הוזן" */
    timeNotEntered?: boolean;
    /** מסומן true כאשר הניתוח הגיע רק מלוח GetSurgeriesBySurgeryRoomCode (בלי רשומת RealTime) */
    fromCalendarOnly?: boolean;
}

export interface RoomData {
    roomId: string;
    date: string | null;
    surgeries: Surgery[];
}

export type LateMeta = {
    isLate: boolean;
    overrunMin: number;
    predictedEnd: Date | null;
    turnoverUsed: number;
    hasOverlapBacklog: boolean;
    backlogCount?: number;
    overlapUntil?: Date | null;
};

export type HeaderProgressOpts = {
    defaultTurnoverMin?: number;
};

export type DisplayPreset = "default" | "all" | "custom" | "minimal";
export type ColorMode = "border" | "background";
export interface DisplaySettings {
    showHeaderBadge: boolean;
    showHeaderIcon: boolean;
    showHeaderProgress: boolean;
    showTurnoverLines: boolean;
    showPlannedSection: boolean;
    showSurgeryName: boolean;
    showSurgeryCode: boolean;
    showDepartment: boolean;
    showTimes: boolean;
    showStatus: boolean;
    colorize: boolean;
    blinkOnUnacked: boolean;
    showLegend: boolean;
    showHeaderMetrics?: boolean;
    showStartChip?: boolean;
    showTurnoverChip?: boolean;
    showEndChip?: boolean;
    showStatusDot?: boolean;
    showUrgencyIcon?: boolean;
    colorMode: ColorMode;
    showLateChip?: boolean;
    showExpandBtn?: boolean;
    showDateControls?: boolean;
    backgroundMode?: boolean;
    showIdleSeconds?: boolean;
    hideIdleWhenNoPlanned?: boolean;
    continueIdleAfter1500WhenPlanned?: boolean;
    showSummaryCard?: boolean;
    showSurgeriesRts?: boolean;
}

export const DEFAULT_SETTINGS: DisplaySettings = {
    showHeaderBadge: true,
    showHeaderIcon: true,
    showHeaderProgress: true,
    showTurnoverLines: true,
    showPlannedSection: true,
    showSurgeryName: true,
    showSurgeryCode: true,
    showDepartment: true,
    showTimes: true,
    showStatus: true,
    colorize: true,
    blinkOnUnacked: true,
    showLegend: true,
    showHeaderMetrics: true,
    showStartChip: true,
    showTurnoverChip: true,
    showEndChip: true,
    showStatusDot: true,
    showUrgencyIcon: true,
    colorMode: "background",
    showExpandBtn: true,
    showDateControls: true,
    backgroundMode: false,
    showIdleSeconds: true,
    hideIdleWhenNoPlanned: true,
    continueIdleAfter1500WhenPlanned: true,
    showSummaryCard: false,
    showSurgeriesRts: true,
};

export const ALL_ON_SETTINGS: DisplaySettings = { ...DEFAULT_SETTINGS };

export const MINIMAL_SETTINGS: DisplaySettings = {
    ...DEFAULT_SETTINGS,
    showExpandBtn: true,
    showDateControls: false,
    backgroundMode: true,
    colorMode: "border",
};

@Component({
    selector: "app-google-charts-time",
    templateUrl: "./google-charts.component.html",
    styleUrls: ["./google-charts.component.css"],
    animations: [
        trigger("slideToggle", [
            state(
                "closed",
                style({
                    height: "0",
                    opacity: 0,
                    overflow: "hidden",
                    padding: "0",
                })
            ),
            state(
                "open",
                style({
                    height: "*",
                    opacity: 1,
                    overflow: "hidden",
                    padding: "*",
                })
            ),
            transition("closed <=> open", animate("300ms ease-in-out")),
        ]),
    ],
})
export class RoomTimeRTmDashboardComponent implements OnInit, AfterViewInit {
    legendMinimized = false;
    private destroy$ = new Subject<void>();
    private ackedRooms = new Set<string>();

    departmentMap = new Map<string, DepartmentData>();
    selectedDepartmentCharts: DepartmentData[] = [];

    selectedDate: string = new Date().toISOString().split("T")[0]; // yyyy-MM-dd

    selectedDateObj: Date | null = this.selectedDate
        ? new Date(this.selectedDate)
        : null;

    roomsData: RoomData[] = [];
    openRoom: string | null = null;
    
    // מיפוי של חדרים לפי CalendarRoomsArea - נשמר ממידע על החדרים עצמם
    private roomCalendarAreaMap = new Map<string, string>(); // roomId -> CalendarRoomsArea

    private _userId: string | null = null;
    @Input()
    get userId(): string | null {
        return this._userId;
    }
    set userId(val: string | null) {
        if (this._userId === val) return;
        this._userId = val;
        this.loadDisplaySettings();
        this.cdr.markForCheck();
    }
    private normalizeSurgery(raw: Surgery | Partial<Surgery> | Record<string, unknown>): Surgery {
        const status = raw?.SurgeryStatus ?? raw?.status ?? "Planned";
        
        
        const result = {
            // שדות “קליינטים”
            surgeryId: raw?.surgeryId ?? raw?.SurgeryID ?? "",
            department: raw?.department ?? raw?.DepartName ?? "",
            surgeryName: raw?.surgeryName ?? raw?.SurgeryName ?? "",
            surgeryCode: raw?.surgeryCode ?? raw?.SurgeryCode ?? "",
            status,
            timeEntrance:
                raw?.timeEntrance ?? raw?.TimeEntranceToTheOperatingRoom ?? "",
            timeExit: raw?.timeExit ?? raw?.TimeExitingTheOperatingRoom ?? "",
            surgeryDate: raw?.surgeryDate ?? raw?.SurgeryDate ?? "",

            // שדות “שרת”
            SurgeryRoom: raw?.SurgeryRoom ?? (raw as Record<string, unknown>)?.SurgeryRoomDetails ?? "",
            SurgeryDate: raw?.SurgeryDate ?? raw?.surgeryDate ?? "",
            TimeEntranceToTheOperatingRoom:
                raw?.TimeEntranceToTheOperatingRoom ?? null,
            TimeExitingTheOperatingRoom:
                raw?.TimeExitingTheOperatingRoom ?? null,
            SurgeryStatus: status,
            TimeSurgeryToDo: raw?.TimeSurgeryToDo ?? null,

            AdmissionNo: raw?.AdmissionNo,
            ReadyForSurgery: raw?.ReadyForSurgery,
            MissingSignatures: raw?.MissingSignatures,
            SignatureByRole: raw?.SignatureByRole,
            IsWaitingForSurgery: raw?.IsWaitingForSurgery,
            NextPatientReadyGreen: raw?.NextPatientReadyGreen,
            MissingSignaturesText: raw?.MissingSignaturesText,
            SurgeryType: raw?.SurgeryType ?? null,  
            DoctorSurgeon: raw?.DoctorSurgeon ?? null,
            AvgDauration: raw?.AvgDauration ?? (raw as Record<string, unknown>)?.DrorDuration ?? null,
            AvgDuration: raw?.AvgDuration ?? null,
            patientNumber: raw?.patientNumber ?? (raw as Record<string, unknown>)?.PatientNumber ?? "",
            CalendarRoomsArea: raw?.CalendarRoomsArea ?? null,  // "חדר ניתוח אמבולטורי" או "חדר ניתוח כללי"
            SurgeryRoomName: raw?.SurgeryRoomName ?? null,  // "חדר ניתוח אמבולטורי - 1" או "חדר ניתוח כללי - 1"
        } as Surgery;
        
        
        return result;
    }

    displayPreset: DisplayPreset = "default";
    settings: DisplaySettings = { ...DEFAULT_SETTINGS };
    showDisplayPanel = false;
    refreshInterval: ReturnType<typeof setInterval> | null = null;
    countdownInterval: ReturnType<typeof setInterval> | null = null;
    private intervalId: ReturnType<typeof setInterval> | null = null;
    nextRefreshIn: number = 300;
    autoRefreshPaused = false;
    lastLoaded: Date | null = null;
    /** true אחרי שהסתיים שלב 2 (לוח הניתוחים) – כדי להציג ניתוחים מתוכננים רק כשהמידע הסופי מוכן */
    calendarEnriched = false;

    /** חדרים שבהם באנר «חסרה חתימה» נסגר ב-X (עד רענון מלא של הדף) */
    private signatureBannerDismissedRoomIds = new Set<string>();
    /** חדרים שבהם פופאפ «המטופל הבא מוכן» נסגר ב-X (עד רענון מלא של הדף) */
    private nextReadyBannerDismissedRoomIds = new Set<string>();

    constructor(
        public googleChartsService: GoogleChartsService,
        private deptColors: DepartmentColorService,
        public palette: PaletteService,
        private cdr: ChangeDetectorRef
    ) {}

    busiestRooms: Array<{
        room: string;
        totalMinutes: number;
        totalHMM: string;
        cases: number;
        hasInProgress: boolean;
        completed: number;
        inProgress: number;
        planned: number;
        latestExit: string | null;
        roomData: RoomData;
    }> = [];

    private settingsKey(uid: string) {
        return `rtmdashb.display.${uid}`;
    }

    initDisplaySettings(): void {
        this.loadDisplaySettings();
    }
    private loadDisplaySettings(): void {
        if (!this.userId) {
            this.displayPreset = "default";
            this.settings = { ...DEFAULT_SETTINGS };
            this.showDisplayPanel = false;
            return;
        }
        const raw = localStorage.getItem(this.settingsKey(this.userId));
        if (!raw) {
            this.displayPreset = "default";
            this.settings = { ...DEFAULT_SETTINGS };
            return;
        }
        try {
            const parsed = JSON.parse(raw);
            const saved = (parsed.settings as Partial<DisplaySettings>) || {};
            this.displayPreset = (parsed.preset as DisplayPreset) || "custom";
            this.settings = { ...DEFAULT_SETTINGS, ...saved };
        } catch {
            this.displayPreset = "default";
            this.settings = { ...DEFAULT_SETTINGS };
        }
    }

    private persistDisplaySettings(): void {
        if (!this.userId) return;
        const payload = {
            preset: this.displayPreset,
            settings: { ...this.settings },
        };
        localStorage.setItem(
            this.settingsKey(this.userId),
            JSON.stringify(payload)
        );
    }

    applyPreset(p: DisplayPreset): void {
        this.displayPreset = p;
        this.settings =
            p === "default"
                ? { ...DEFAULT_SETTINGS }
                : p === "all"
                ? { ...ALL_ON_SETTINGS }
                : p === "minimal"
                ? { ...MINIMAL_SETTINGS }
                : { ...this.settings };
        this.persistDisplaySettings();
        this.cdr.markForCheck();
    }

    onSettingChange(key: keyof DisplaySettings, value: boolean): void {
        this.settings = { ...this.settings, [key]: value };
        this.displayPreset = "custom";
        this.persistDisplaySettings();
        this.cdr.markForCheck();
    }

    toggleSetting(key: keyof DisplaySettings): void {
        const next = { ...this.settings };
        (next as Record<string, unknown>)[key] = !this.settings[key];
        this.settings = next as DisplaySettings;
        this.displayPreset = "custom";
        this.persistDisplaySettings();
    }

    getCardClasses(room: RoomData): (string | null | undefined)[] {
        return [
            this.settings.colorize
                ? this.getRoomStatusClassWithSettings(room)
                : null,
            this.settings.colorize && this.settings.colorMode === "border"
                ? "status-mode-bg"
                : null,
            this.isRoomExpanded(room.roomId) ? "active" : "",
            !this.isRoomExpanded(room.roomId) &&
            !this.allExpanded &&
            this.openRooms.size > 0
                ? "blurred"
                : "",
        ];
    }

    ngOnInit(): void {
        this.userId = (localStorage.getItem("ID") || "").trim() || null;
        this.initDisplaySettings();
        this.lastLoaded = new Date();
        this.legendMinimized =
            localStorage.getItem("legendMinimized") === "true";
        this.deptColors.setPalette(
            this.palette.getDepartmentPalette(),
            this.palette.name
        );

        // טעינה ראשונית + הפעלת מנגנון ריענון יחיד (startAutoRefresh כבר יוצר את ה־setIntervalים הדרושים)
        this.loadRoomsData();
        this.startAutoRefresh();
        const expandedFlag = localStorage.getItem("rooms_allExpanded");
        this.allExpanded = expandedFlag === "true";

        try {
            const raw = localStorage.getItem("rooms_openRooms");
            if (raw) this.openRooms = new Set<string>(JSON.parse(raw));
        } catch {}

        this.googleChartsService.ackAllRooms$
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => this.markAllRoomsAcknowledged());
    }

    ngAfterViewInit(): void {}

    ngOnDestroy(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        this.stopLoadProgressAnimation();
        if (this.loadOverlayHideTimer) {
            clearTimeout(this.loadOverlayHideTimer);
            this.loadOverlayHideTimer = null;
        }
        this.destroy$.next();
        this.destroy$.complete();
    }

    toggleLegend(): void {
        this.legendMinimized = !this.legendMinimized;
        localStorage.setItem("legendMinimized", String(this.legendMinimized));
    }

    isLoading = false;
    /** 0–100: התקדמות ויזואלית על פני 5 שניות בזמן טעינה */
    loadProgressPercent = 0;
    private loadProgressRafId: number | null = null;
    private loadOverlayHideTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly LOAD_PROGRESS_DURATION_MS = 5000;

    private startLoadProgressAnimation(): void {
        this.stopLoadProgressAnimation();
        if (this.loadOverlayHideTimer) {
            clearTimeout(this.loadOverlayHideTimer);
            this.loadOverlayHideTimer = null;
        }
        this.loadProgressPercent = 0;
        const start = performance.now();
        let lastPct = -1;
        const tick = (now: number) => {
            if (!this.isLoading) {
                return;
            }
            const t = Math.min(
                1,
                (now - start) / this.LOAD_PROGRESS_DURATION_MS
            );
            const pct = Math.round(t * 100);
            if (pct !== lastPct) {
                lastPct = pct;
                this.loadProgressPercent = pct;
                this.cdr.markForCheck();
            }
            if (t < 1 && this.isLoading) {
                this.loadProgressRafId = requestAnimationFrame(tick);
            } else {
                this.loadProgressRafId = null;
            }
        };
        this.loadProgressRafId = requestAnimationFrame(tick);
    }

    private stopLoadProgressAnimation(): void {
        if (this.loadProgressRafId != null) {
            cancelAnimationFrame(this.loadProgressRafId);
            this.loadProgressRafId = null;
        }
    }

    /** סיום טעינה: ממלא ל־100%, עיכוב קצר להצגת השלמה, ואז מסתיר */
    private endLoading(): void {
        this.stopLoadProgressAnimation();
        if (this.loadOverlayHideTimer) {
            clearTimeout(this.loadOverlayHideTimer);
            this.loadOverlayHideTimer = null;
        }
        this.loadProgressPercent = 100;
        this.cdr.markForCheck();
        this.loadOverlayHideTimer = setTimeout(() => {
            this.loadOverlayHideTimer = null;
            this.isLoading = false;
            this.loadProgressPercent = 0;
            this.cdr.markForCheck();
        }, 240);
    }

    allExpanded = false;
    openRooms = new Set<string>();
    /** רשימת "ניתוחים שבוצעו" פתוחה (לפי חדר) — כפתור דרופ־דאון בתוך room-body */
    completedSurgeriesListOpenByRoom = new Set<string>();
    /** רשימת "ניתוחים מתוכננים" פתוחה (לפי חדר) — כפתור פופאפ בתוך room-body */
    plannedSurgeriesListOpenByRoom = new Set<string>();

    toggleAll(): void {
        this.allExpanded = !this.allExpanded;
        localStorage.setItem("rooms_allExpanded", String(this.allExpanded));
    }

    private persistOpenRooms(): void {
        localStorage.setItem(
            "rooms_openRooms",
            JSON.stringify([...this.openRooms])
        );
    }

    // isRoomExpanded(roomId: string): boolean {
    //     return this.allExpanded || this.activeRoomId === roomId;
    // }
    isRoomExpanded(roomId: string): boolean {
        return this.allExpanded || this.openRooms.has(roomId);
    }

    // toggleRoom(roomId: string): void {
    //     if (this.allExpanded) return;

    //     this.activeRoomId = this.activeRoomId === roomId ? null : roomId;

    //     if (this.activeRoomId) {
    //         this.acknowledgeRoomEvent(roomId);
    //     }
    // }
    toggleRoom(roomId: string): void {
        if (this.allExpanded) return;

        if (this.openRooms.has(roomId)) {
            this.openRooms.delete(roomId);
            this.completedSurgeriesListOpenByRoom.delete(roomId);
            this.plannedSurgeriesListOpenByRoom.delete(roomId);
        } else {
            this.openRooms.add(roomId);
            this.acknowledgeRoomEvent(roomId);
        }

        this.persistOpenRooms();
        // טריגר ל-Angular שיעדכן *ngIf / classes
        this.openRooms = new Set(this.openRooms);
        this.completedSurgeriesListOpenByRoom = new Set(
            this.completedSurgeriesListOpenByRoom
        );
        this.plannedSurgeriesListOpenByRoom = new Set(
            this.plannedSurgeriesListOpenByRoom
        );
    }

    isCompletedSurgeriesListOpen(roomId: string): boolean {
        return this.completedSurgeriesListOpenByRoom.has(roomId);
    }

    toggleCompletedSurgeriesList(roomId: string, event?: Event): void {
        if (event) {
            event.stopPropagation();
        }
        if (this.completedSurgeriesListOpenByRoom.has(roomId)) {
            this.completedSurgeriesListOpenByRoom.delete(roomId);
        } else {
            this.plannedSurgeriesListOpenByRoom.delete(roomId);
            this.completedSurgeriesListOpenByRoom.add(roomId);
        }
        this.completedSurgeriesListOpenByRoom = new Set(
            this.completedSurgeriesListOpenByRoom
        );
        this.plannedSurgeriesListOpenByRoom = new Set(
            this.plannedSurgeriesListOpenByRoom
        );
    }

    isPlannedSurgeriesListOpen(roomId: string): boolean {
        return this.plannedSurgeriesListOpenByRoom.has(roomId);
    }

    togglePlannedSurgeriesList(roomId: string, event?: Event): void {
        if (event) {
            event.stopPropagation();
        }
        if (this.plannedSurgeriesListOpenByRoom.has(roomId)) {
            this.plannedSurgeriesListOpenByRoom.delete(roomId);
        } else {
            this.completedSurgeriesListOpenByRoom.delete(roomId);
            this.plannedSurgeriesListOpenByRoom.add(roomId);
        }
        this.completedSurgeriesListOpenByRoom = new Set(
            this.completedSurgeriesListOpenByRoom
        );
        this.plannedSurgeriesListOpenByRoom = new Set(
            this.plannedSurgeriesListOpenByRoom
        );
    }

    trackByRoomId(index: number, room: RoomData) {
        return room.roomId;
    }

    private readonly ACK_NS = "ack_"; // storage prefix
    private ackCache = new Map<string, string>();

    private ackStorageKey(roomId: string): string {
        return `${this.ACK_NS}${this.storageDateKey()}:${roomId}`;
    }
    private legacyAckStorageKey(roomId: string): string {
        return `${this.ACK_NS}${roomId}`;
    }
    private storageDateKey(): string {
        const d = this.selectedDate ? new Date(this.selectedDate) : new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    }
    private lsGet(key: string): string | null {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    }
    private lsSet(key: string, val: string): void {
        try {
            localStorage.setItem(key, val);
        } catch {}
    }
    private lsRemove(key: string): void {
        try {
            localStorage.removeItem(key);
        } catch {}
    }

    private lastEventKeyForRoom(roomId: string): string {
        const room = this.roomsData.find((r) => r.roomId === roomId);
        if (!room || !room.surgeries.length) return "empty";
        const last = room.surgeries[room.surgeries.length - 1];
        return `${last.surgeryId}_${last.status}`;
    }

    private acknowledgeRoomEvent(roomId: string): void {
        const key = this.lastEventKeyForRoom(roomId);
        const storeKey = this.ackStorageKey(roomId);

        this.lsSet(storeKey, key);
        this.lsRemove(this.legacyAckStorageKey(roomId));

        this.ackCache.set(roomId, key);
        this.roomsData = [...(this.roomsData ?? [])];
    }

    isBlinking(room: RoomData): boolean {
        return !this.isRoomAcked(room);
    }

    loadRoomsData(): void {
        this.lastLoaded = new Date();
        this.isLoading = true;
        this.startLoadProgressAnimation();
        // לפני טעינה מחדש – עד שהעשרת הלוח תסתיים, לא נציג ניתוחים מתוכננים כדי למנוע "קפיצות" מידע
        this.calendarEnriched = false;

        // שלב 1: טעינת ניתוחים ומיפוי חדרים בלבד (בלי לוח) – כדי שלא ייכשל ויישארו סטטוס + אמבולטורי
        forkJoin({
            surgeries: this.googleChartsService.getSurgeryRooms(this.selectedDate),
            roomsMapping: this.googleChartsService.getRoomsCalendarInfo(this.selectedDate).pipe(
                catchError(() => of(null))
            )
        }).subscribe(
            ({ surgeries: result, roomsMapping }) => {
                if (roomsMapping) {
                    this.updateRoomsCalendarMapping(roomsMapping);
                }

                const rows = result?.surgeries || [];

                const grouped = rows.reduce((acc, row) => {
                    const roomId = row.SurgeryRoom;
                    if (!acc[roomId]) acc[roomId] = [];

                    // מזהה – RealTime יכול להחזיר SurgeryID/CaseNumber או שמות אחרים; AdmissionNo תואם ל־PM_CASE_NUMBER בלוח
                    const rowAny = row as any;
                    const surgeryId = row.SurgeryID ?? rowAny.surgeryID ?? rowAny.SurgeryId ?? "";
                    const caseNum = row.CaseNumber ?? rowAny.caseNumber ?? rowAny.PM_CASE_NUMBER ?? (rowAny.AdmissionNo != null ? String(rowAny.AdmissionNo).padStart(10, "0") : "");

                    // נתוני ליבה מהשרת בלבד – סטטוס ו־CalendarRoomsArea לא משתנים
                    acc[roomId].push({
                        surgeryId: caseNum || surgeryId,
                        patientNumber: row.PatientNumber,
                        surgeryName: row.SurgeryName,
                        surgeryCode: row.SurgeryCode,
                        department: row.DepartName,
                        status: row.SurgeryStatus,
                        timeEntrance: row.TimeEntranceToTheOperatingRoom ?? "",
                        timeExit: row.TimeExitingTheOperatingRoom ?? "",
                        surgeryDate: row.SurgeryDate,
                        urgency: row.Urgency,
                        timeSurgeryToDo: row.TimeSurgeryToDo ?? undefined,

                        SurgeryID: surgeryId,
                        CaseNumber: caseNum,
                        PatientNumber: row.PatientNumber,
                        DepartName: row.DepartName,
                        SurgeryName: row.SurgeryName,
                        SurgeryCode: row.SurgeryCode,
                        SurgeryRoom: row.SurgeryRoom,
                        SurgeryDate: row.SurgeryDate,
                        SurgeryStatus: row.SurgeryStatus,
                        TimeEntranceToTheOperatingRoom: row.TimeEntranceToTheOperatingRoom ?? null,
                        TimeExitingTheOperatingRoom: row.TimeExitingTheOperatingRoom ?? null,
                        TimeSurgeryToDo: row.TimeSurgeryToDo ?? null,

                        IsWaitingForSurgery: row.IsWaitingForSurgery,
                        NextPatientReadyGreen: row.NextPatientReadyGreen,
                        MissingSignaturesText: row.MissingSignaturesText,
                        // הממוצע יכול להגיע בשם AvgDauration (ישן) או AvgDuration (חדש) — חייבים לשמור גם AvgDuration ל-parseAvgDurationFieldToMinutes
                        AvgDuration: rowAny.AvgDuration ?? null,
                        AvgDauration: rowAny.AvgDauration ?? rowAny.AvgDuration ?? null,
                        DoctorSurgeon: row.DoctorSurgeon ?? null,
                        SurgeryType: row.SurgeryType ?? null,
                        CalendarRoomsArea: row.CalendarRoomsArea ?? null,
                        SurgeryRoomName: (row as any).SurgeryRoomName ?? null,
                        timeNotEntered: false,
                        AdmissionNo: rowAny.AdmissionNo,
                    });

                    return acc;
                }, {} as Record<string, Surgery[]>);

                const self = this;

                function two(n: number) {
                    return (n < 10 ? "0" : "") + n;
                }
                function parseMinutes(v: string | number | null | undefined): number | null {
                    if (v === null || v === undefined || v === "") return null;
                    const n =
                        typeof v === "number" ? v : parseInt(String(v), 10);
                    return isFinite(n) && n > 0 ? n : null;
                }
                function addMinutes(d: Date, m: number): Date {
                    return new Date(d.getTime() + m * 60000);
                }

                function schedDate(item: Surgery | Partial<Surgery>, baseDate: string): Date | null {
                    if (!item.timeEntrance) return null;
                    return self.parseClockWithDate(item.timeEntrance, baseDate);
                }

                function sortByPredicted(list: Surgery[], baseDate: string): Surgery[] {
                    if (!list || !list.length) return [];

                    const DAY_MS = 24 * 60 * 60 * 1000;
                    function sortKeyScheduled(s: Surgery | Partial<Surgery>): number {
                        const eClock = s.timeEntrance;
                        const xClock = s.timeExit;
                        if (!eClock) return Number.POSITIVE_INFINITY;
                        const ent = self.parseClockWithDate(eClock, baseDate);
                        const exi = self.parseClockWithDate(
                            xClock && xClock !== "00:00:00" ? xClock : eClock,
                            baseDate
                        );
                        if (!ent || !exi) return Number.POSITIVE_INFINITY;
                        if (exi.getTime() < ent.getTime())
                            return ent.getTime() - DAY_MS;
                        return ent.getTime();
                    }
                    list = list.slice().sort(function (a, b) {
                        return sortKeyScheduled(a) - sortKeyScheduled(b);
                    });

                    const MIN_TURNOVER = 20;
                    let active: Surgery | null = null;
                    for (let i = 0; i < list.length; i++) {
                        const st = String(list[i].status || "").toLowerCase();
                        if (st === "inprogress" && list[i].timeEntrance) {
                            if (!active) active = list[i];
                            else {
                                const aEnt = self.parseClockWithDate(
                                    active.timeEntrance,
                                    baseDate
                                );
                                const bEnt = self.parseClockWithDate(
                                    list[i].timeEntrance,
                                    baseDate
                                );
                                if (
                                    aEnt &&
                                    bEnt &&
                                    bEnt.getTime() >= aEnt.getTime()
                                )
                                    active = list[i];
                            }
                        }
                    }

                    let cursor: Date | null = null;
                    if (active) {
                        const aStart = self.parseClockWithDate(
                            active.timeEntrance,
                            baseDate
                        );
                        let aDur = parseMinutes((active as unknown as Record<string, unknown>).timeSurgeryToDo as string | number | null | undefined ?? active.TimeSurgeryToDo);
                        if (aDur === null) aDur = 60;
                        cursor = aStart ? addMinutes(aStart, aDur) : null;
                    } else {
                        let firstPending: Surgery | null = null;
                        for (let i = 0; i < list.length; i++) {
                            const st = String(
                                list[i].status || ""
                            ).toLowerCase();
                            if (st !== "completed") {
                                firstPending = list[i];
                                break;
                            }
                        }
                        if (firstPending && firstPending.timeEntrance) {
                            const firstSched = self.parseClockWithDate(
                                firstPending.timeEntrance,
                                baseDate
                            );
                            cursor = firstSched
                                ? addMinutes(firstSched, MIN_TURNOVER)
                                : null;
                        }
                    }

                    for (let i = 0; i < list.length; i++) {
                        const it = list[i];
                        const st = String(it.status || "").toLowerCase();
                        const sched = schedDate(it, baseDate);
                        let dur = parseMinutes(it.timeSurgeryToDo);
                        if (dur === null) dur = 60;

                        if (st === "completed") {
                            it._displayStart = sched || null;
                            it._displayEnd = it.timeExit
                                ? self.parseClockWithDate(it.timeExit, baseDate)
                                : null;
                        } else if (active && it === active) {
                            it._displayStart = sched || null;
                            it._displayEnd = cursor;
                        } else {
                            if (!cursor) {
                                it._displayStart = sched || null;
                                it._displayEnd = it._displayStart
                                    ? addMinutes(it._displayStart, dur)
                                    : null;
                            } else {
                                const earliest = addMinutes(
                                    cursor,
                                    MIN_TURNOVER
                                );
                                const start =
                                    sched &&
                                    sched.getTime() > earliest.getTime()
                                        ? sched
                                        : earliest;
                                it._displayStart = start;
                                it._displayEnd = addMinutes(start, dur);
                                cursor = it._displayEnd;
                            }
                        }

                        it._displayStartMs = it._displayStart
                            ? it._displayStart.getTime()
                            : Number.POSITIVE_INFINITY;
                    }

                    list.sort(function (a, b) {
                        if (a._displayStartMs !== b._displayStartMs)
                            return a._displayStartMs - b._displayStartMs;
                        const aSched = schedDate(a, baseDate),
                            bSched = schedDate(b, baseDate);
                        if (
                            aSched &&
                            bSched &&
                            aSched.getTime() !== bSched.getTime()
                        )
                            return aSched.getTime() - bSched.getTime();
                        const aid = String(a.surgeryId || ""),
                            bid = String(b.surgeryId || "");
                        return aid < bid ? -1 : aid > bid ? 1 : 0;
                    });

                    return list;
                }

                this.roomsData = Object.keys(grouped).map((roomId) => {
                    const list = grouped[roomId];
                    const roomDate = list.length
                        ? list[0].surgeryDate || this.selectedDate
                        : this.selectedDate;
                    this.enforceSingleInProgressPerRoomSurgeries(list, roomDate);
                    const sorted = sortByPredicted(list, roomDate);
                    return { roomId, surgeries: sorted, date: roomDate };
                });

                this.endLoading();
                this.cdr.detectChanges();

                // שלב 2 הישן השתמש ב-GetSurgeriesBySurgeryRoomCode – עכשיו נבטל את הקריאה ונחזיר רשימות ריקות
                const dateForCalendar = this.selectedDate || new Date().toISOString().split("T")[0];
                forkJoin({
                    calendarGeneral: of({ d: { SurgeriesCalendarClassList: [] } }),
                    calendarAmbulatory: of({ d: { SurgeriesCalendarClassList: [] } })
                }).subscribe(({ calendarGeneral, calendarAmbulatory }) => {
                    // מיפוי מלוח GetSurgeriesBySurgeryRoomCode – זמני ניתוח מתוכנן (ArrivalTime, EndTime, Duration, AvgDauration/AvgDuration)
                    const calendarByKey: Record<string, { ArrivalTime: string; EndTime: string; Duration?: number; AvgDauration?: string; item?: any }> = {};
                    [calendarGeneral?.d?.SurgeriesCalendarClassList, calendarAmbulatory?.d?.SurgeriesCalendarClassList].forEach((list, listIdx) => {
                        (list || []).forEach((item: any) => {
                            const surgeriesList = item.SurgeriesCalendar_Susgeries ?? item.SurgeriesCalendar_Surgeries;
                            const surgeryId = surgeriesList?.[0]?.SurgeryID;
                            const caseNum = item.SurgeryPatientDetails?.PM_CASE_NUMBER;
                            // זמנים מהלוח (API אמיתי): עדיפות ל־ArrivalDate/EndDate כשמכילים תאריך+שעה (למשל "2026-02-02 07:30" -> "07:30"), אחרת ArrivalTime/EndTime
                            const arrFromDate = item.ArrivalDate && String(item.ArrivalDate).includes(" ") ? String(item.ArrivalDate).trim().split(" ")[1]?.slice(0, 5) : null;
                            const endFromDate = item.EndDate && String(item.EndDate).includes(" ") ? String(item.EndDate).trim().split(" ")[1]?.slice(0, 5) : null;
                            const arrTime = (arrFromDate && arrFromDate !== "00:00") ? arrFromDate : (item.ArrivalTime ?? arrFromDate ?? "");
                            const endTime = (endFromDate && endFromDate !== "00:00") ? endFromDate : (item.EndTime ?? endFromDate ?? "");
                            // Duration יכול להיות number או string (למשל "120" דקות)
                            let duration: number | undefined;
                            if (item.Duration != null && item.Duration !== "") {
                                const d = typeof item.Duration === "number" ? item.Duration : parseInt(String(item.Duration), 10);
                                duration = Number.isFinite(d) && d > 0 ? d : undefined;
                            }
                            // AvgDauration/AvgDuration ברמת האלמנט (SurgeriesCalendarClass) – כמעט תמיד עם ערך, עדיפות ראשונה למשך כשלא הוזן (פורמט "02:49")
                            const avgDurRaw =
                                item.AvgDauration ??
                                item.AvgDuration ??
                                surgeriesList?.[0]?.DrorDuration;
                            const avgDur = (avgDurRaw != null && String(avgDurRaw).trim() !== "") ? String(avgDurRaw).trim() : undefined;
                            const entry = { ArrivalTime: arrTime || "", EndTime: endTime || "", Duration: duration, AvgDauration: avgDur, item: item };
                            const norm = (id: string) => (id ? String(id).replace(/^0+/, "") || id : "");
                            if (surgeryId) {
                                calendarByKey[surgeryId] = entry;
                                const nid = norm(surgeryId);
                                if (nid && nid !== surgeryId) {
                                    calendarByKey[nid] = entry;
                                }
                            }
                            if (caseNum) {
                                calendarByKey[caseNum] = entry;
                                const nid = norm(caseNum);
                                if (nid && nid !== caseNum) {
                                    calendarByKey[nid] = entry;
                                }
                            }
                        });
                    });

                    const keyCount = Object.keys(calendarByKey).length;
                    if (keyCount === 0) {
                        return;
                    }

                    const normId = (id: string | number | null | undefined) => (id != null && id !== "" ? String(id).replace(/^0+/, "") || String(id) : "");
                    // יצירת סט של כל המפתחות שכבר נמצאו ב-roomsData
                    const foundKeys = new Set<string>();
                    for (const room of this.roomsData) {
                        for (const s of room.surgeries) {
                            const sAny = s as any;
                            const sid = String(s.SurgeryID ?? sAny.surgeryID ?? "").trim();
                            const cnum = String(s.CaseNumber ?? sAny.caseNumber ?? "").trim();
                            const admissionStr = sAny.AdmissionNo != null ? String(sAny.AdmissionNo) : "";
                            const admissionPadded = sAny.AdmissionNo != null ? String(sAny.AdmissionNo).padStart(10, "0") : "";
                            const surgeryIdStr = s.surgeryId ?? "";
                            
                            // ניסיון למצוא התאמה עם כל המפתחות האפשריים
                            const cal =
                                calendarByKey[sid] ?? calendarByKey[cnum] ??
                                calendarByKey[normId(sid)] ?? calendarByKey[normId(cnum)] ??
                                calendarByKey[admissionStr] ?? calendarByKey[admissionPadded] ?? calendarByKey[normId(admissionStr)] ??
                                calendarByKey[surgeryIdStr] ?? calendarByKey[normId(surgeryIdStr)];
                            
                            if (cal) {
                                // שמירת המפתחות שנמצאו
                                if (sid) foundKeys.add(sid);
                                if (cnum) foundKeys.add(cnum);
                                if (admissionStr) foundKeys.add(admissionStr);
                                if (admissionPadded) foundKeys.add(admissionPadded);
                                if (surgeryIdStr) foundKeys.add(surgeryIdStr);
                                if (normId(sid)) foundKeys.add(normId(sid));
                                if (normId(cnum)) foundKeys.add(normId(cnum));
                                if (normId(admissionStr)) foundKeys.add(normId(admissionStr));
                                if (normId(surgeryIdStr)) foundKeys.add(normId(surgeryIdStr));
                            } else {
                                continue;
                            }
                            const isPlanned = String(s.status ?? s.SurgeryStatus ?? "").toLowerCase() === "planned";
                            const isInProgress = String(s.status ?? s.SurgeryStatus ?? "").toLowerCase() === "inprogress";
                            // ניתוח מתוכנן או בביצוע: תמיד מלוח (API תכנון). לייב: קודם זמן שהוזן בפועל, אחר כך לוח
                            const hasActualStart = s.TimeEntranceToTheOperatingRoom != null && String(s.TimeEntranceToTheOperatingRoom).trim() !== "" && String(s.TimeEntranceToTheOperatingRoom).replace(/:/g, "") !== "0000";
                            const hasActualEnd = s.TimeExitingTheOperatingRoom != null && String(s.TimeExitingTheOperatingRoom).trim() !== "" && String(s.TimeExitingTheOperatingRoom).replace(/:/g, "") !== "0000";
                            const useCalendarStart = (isPlanned || isInProgress) || !hasActualStart;
                            const useCalendarEnd = (isPlanned || isInProgress) || !hasActualEnd;
                            
                            // עדכון שעת כניסה
                            if (useCalendarStart && cal.ArrivalTime != null && String(cal.ArrivalTime).trim() !== "" && cal.ArrivalTime !== "00:00") {
                                s.timeEntrance = s.TimeEntranceToTheOperatingRoom = cal.ArrivalTime;
                            }
                            
                            // חישוב משך הניתוח: קודם AvgDauration, אחר כך Duration
                            let timeSurgeryToDo: string | number | null = s.TimeSurgeryToDo ?? null;
                            let durationMinutes: number | null = null;

                            // 1) זמן ממוצע מהלוח (AvgDauration, פורמט "HH:mm" למשל "01:58")
                            if (cal.AvgDauration != null && String(cal.AvgDauration).trim() !== "") {
                                const avgMin = this._durationToMinutes(cal.AvgDauration);
                                if (avgMin != null && avgMin > 0) {
                                    timeSurgeryToDo = avgMin;
                                    durationMinutes = avgMin;
                                    // שמירה גם ב-AvgDauration כדי ש-getExpectedDuration תשתמש בזה
                                    s.AvgDauration = avgMin;
                                }
                            }
                            // 2) אם אין – Duration מהלוח (בדקות)
                            if (durationMinutes == null && cal.Duration != null && cal.Duration > 0) {
                                timeSurgeryToDo = cal.Duration;
                                durationMinutes = cal.Duration;
                                // אם אין AvgDauration, נשתמש ב-Duration גם ב-AvgDauration
                                if (!s.AvgDauration) s.AvgDauration = cal.Duration;
                            }
                            // 3) אם אין – ממוצע מהשרת
                            if (timeSurgeryToDo == null && s.AvgDauration != null) {
                                const avgMin = this._durationToMinutes(s.AvgDauration);
                                if (avgMin != null && avgMin > 0) {
                                    timeSurgeryToDo = avgMin;
                                    if (durationMinutes == null) durationMinutes = avgMin;
                                }
                            }
                            // 4) אם אין – דרור/TimeSurgeryToDo מהשרת
                            if (timeSurgeryToDo == null && s.TimeSurgeryToDo != null) {
                                const drorMin = this._durationToMinutes(s.TimeSurgeryToDo);
                                if (drorMin != null && drorMin > 0) {
                                    timeSurgeryToDo = drorMin;
                                    if (durationMinutes == null) durationMinutes = drorMin;
                                }
                            }

                            // שמירת המשך בדקות – ישמש גם לחישובי "חדר פנוי" (כולל +20 דק' הכנת חדר)
                            s.TimeSurgeryToDo = timeSurgeryToDo;
                            (s as Surgery).timeNotEntered = timeSurgeryToDo == null;
                            if (timeSurgeryToDo != null) s.timeSurgeryToDo = timeSurgeryToDo;

                            // חישוב שעת סיום: ArrivalTime + AvgDauration (או Duration)
                            // לניתוח מתוכנן או בביצוע – אם יש שעת התחלה ומשך מתוכנן, מחשבים שעת סיום מתוכננת = ArrivalTime + AvgDauration/Duration
                            if ((isPlanned || isInProgress) && durationMinutes != null && durationMinutes > 0) {
                                const startClock = s.timeEntrance || cal.ArrivalTime || "";
                                const baseDate = room.date || this.selectedDate;
                                if (startClock && baseDate && startClock !== "00:00") {
                                    const startDate = this.parseClockWithDate(startClock, baseDate);
                                    if (startDate) {
                                        const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
                                        const endClock = this.toHHmm(endDate);
                                        s.timeExit = s.TimeExitingTheOperatingRoom = endClock;
                                    }
                                }
                            } else if (useCalendarEnd && cal.EndTime != null && String(cal.EndTime).trim() !== "" && cal.EndTime !== "00:00") {
                                // אם אין משך, משתמשים ב-EndTime מהלוח
                                s.timeExit = s.TimeExitingTheOperatingRoom = cal.EndTime;
                            }
                        }
                    }
                    
                    // הוספת ניתוחים מתוכננים מ-calendarByKey שלא נמצאו ב-roomsData
                    const usedCalendarKeys = new Set<string>();
                    // יצירת מיפוי של calendarItems לפי מפתחות כדי לדעת מאיזה רשימה הם הגיעו
                    const calendarItemsMap = new Map<string, { item: any; calendarArea: string }>();
                    [calendarGeneral?.d?.SurgeriesCalendarClassList, calendarAmbulatory?.d?.SurgeriesCalendarClassList].forEach((list, listIdx) => {
                        const calendarArea = listIdx === 0 ? "חדר ניתוח כללי" : "חדר ניתוח אמבולטורי";
                        (list || []).forEach((item: any) => {
                            const surgeriesList = item.SurgeriesCalendar_Susgeries ?? item.SurgeriesCalendar_Surgeries;
                            const surgeryId = surgeriesList?.[0]?.SurgeryID;
                            const caseNum = item.SurgeryPatientDetails?.PM_CASE_NUMBER;
                            if (surgeryId) calendarItemsMap.set(surgeryId, { item, calendarArea });
                            if (caseNum) calendarItemsMap.set(caseNum, { item, calendarArea });
                            const norm = (id: string) => (id ? String(id).replace(/^0+/, "") || id : "");
                            if (surgeryId) {
                                const nid = norm(surgeryId);
                                if (nid && nid !== surgeryId) calendarItemsMap.set(nid, { item, calendarArea });
                            }
                            if (caseNum) {
                                const nid = norm(caseNum);
                                if (nid && nid !== caseNum) calendarItemsMap.set(nid, { item, calendarArea });
                            }
                        });
                    });
                    
                    for (const [key, calEntry] of Object.entries(calendarByKey)) {
                        if (foundKeys.has(key) || usedCalendarKeys.has(key)) continue;
                        const itemInfo = calendarItemsMap.get(key);
                        if (!itemInfo) continue;
                        const item = itemInfo.item;
                        const calendarArea = itemInfo.calendarArea;
                        
                        const surgeriesList = item.SurgeriesCalendar_Susgeries ?? item.SurgeriesCalendar_Surgeries;
                        const surgeryId = surgeriesList?.[0]?.SurgeryID;
                        const caseNum = item.SurgeryPatientDetails?.PM_CASE_NUMBER;
                        const requestedDept = item.RequestedDepartment;
                        const roomIdFromCalendar: string | null = item.SurgeryRoom || null;
                        
                        // רק ניתוחים בעלי מזהה (SurgeryID או CaseNumber)
                        if (!surgeryId && !caseNum) continue;
                        
                        // 1) נסה לשבץ לפי החדר המדויק מהלוח (SurgeryRoom)
                        let targetRoom: RoomData | null =
                            roomIdFromCalendar
                                ? this.roomsData.find((r) => r.roomId === roomIdFromCalendar) || null
                                : null;
                        
                        // אם החדר לא קיים עדיין ב-roomsData אבל מוכר לנו מהמיפוי (GetSurgeryRooms),
                        // ניצור RoomData חדש עבורו כדי שיופיע בלוח.
                        if (!targetRoom && roomIdFromCalendar) {
                            const mappedArea = this.roomCalendarAreaMap.get(roomIdFromCalendar) || calendarArea;
                            const roomDate = this.selectedDate;
                            targetRoom = {
                                roomId: roomIdFromCalendar,
                                date: roomDate,
                                surgeries: [],
                            };
                            this.roomsData.push(targetRoom);
                            // לעדכון עתידי – נשמור גם את ה-CalendarRoomsArea אם עדיין לא נשמר
                            if (!this.roomCalendarAreaMap.has(roomIdFromCalendar)) {
                                this.roomCalendarAreaMap.set(roomIdFromCalendar, mappedArea);
                            }
                        }
                        
                        // 2) אם אין SurgeryRoom, ננסה לפי CalendarRoomsArea (fallback)
                        if (!targetRoom) {
                            for (const room of this.roomsData) {
                                const roomArea = this.roomCalendarAreaMap.get(room.roomId);
                                if (roomArea === calendarArea) {
                                    targetRoom = room;
                                    break;
                                }
                            }
                        }
                        
                        // 3) אם עדיין לא נמצא – ננסה לפי RequestedDepartment (עוד fallback)
                        if (!targetRoom && requestedDept) {
                            for (const room of this.roomsData) {
                                if (room.surgeries.some(s => s.DepartName === requestedDept || s.department === requestedDept)) {
                                    targetRoom = room;
                                    break;
                                }
                            }
                        }
                        
                        // 4) ואם גם זה לא עבד – fallback גס לפי סוג חדר (לא אידיאלי, אבל עדיף מכלום)
                        if (!targetRoom) {
                            if (calendarArea === "חדר ניתוח כללי") {
                                targetRoom = this.roomsData.find(r => this.isRegularOperatingRoom(r.roomId)) || null;
                            } else {
                                targetRoom =
                                    this.roomsData.find((r) =>
                                        r.surgeries?.some((s) =>
                                            this.isAmbulatoryBySurgeryRoomName(
                                                s.SurgeryRoomName
                                            )
                                        )
                                    ) || null;
                            }
                        }
                        
                        if (targetRoom && calEntry.ArrivalTime && calEntry.ArrivalTime.trim() !== "" && calEntry.ArrivalTime !== "00:00") {
                            // חישוב משך הניתוח קודם - קודם AvgDauration, אחר כך Duration
                            let timeSurgeryToDo: string | number | null = null;
                            let avgDauration: number | null = null;
                            if (calEntry.AvgDauration) {
                                const avgMin = this._durationToMinutes(calEntry.AvgDauration);
                                if (avgMin != null && avgMin > 0) {
                                    timeSurgeryToDo = avgMin;
                                    avgDauration = avgMin;
                                }
                            }
                            if (timeSurgeryToDo == null && calEntry.Duration != null && calEntry.Duration > 0) {
                                timeSurgeryToDo = calEntry.Duration;
                                if (avgDauration == null) avgDauration = calEntry.Duration;
                            }
                            
                            // יצירת ניתוח מתוכנן חדש
                            // מחלקה – מהעדכני ביותר שיש בלוח
                            const departmentFromCalendar: string =
                                requestedDept ??
                                item.SurgeryRequestDepartments?.S_DEPARTMENT ??
                                item.S_DEPARTMENT ??
                                surgeriesList?.[0]?.Depart ??
                                "";

                            const newSurgery: Surgery = {
                                surgeryId: caseNum || surgeryId || key,
                                patientNumber: item.SurgeryPatientDetails?.PatientID || "",
                                surgeryName: surgeriesList?.[0]?.SurgeryName || item.SurgeryType || "ניתוח מתוכנן",
                                surgeryCode: surgeriesList?.[0]?.SurgeryCode || "",
                                department: (departmentFromCalendar || surgeriesList?.[0]?.Department || "").toString(),
                                status: "Planned",
                                SurgeryStatus: "Planned",
                                timeEntrance: calEntry.ArrivalTime,
                                timeExit: calEntry.EndTime || "",
                                surgeryDate: this.selectedDate,
                                SurgeryDate: this.selectedDate,
                                TimeEntranceToTheOperatingRoom: calEntry.ArrivalTime,
                                TimeExitingTheOperatingRoom: calEntry.EndTime || null,
                                SurgeryRoom: targetRoom.roomId,
                                SurgeryID: surgeryId,
                                CaseNumber: caseNum,
                                DepartName: (departmentFromCalendar || surgeriesList?.[0]?.Department || "").toString(),
                                CalendarRoomsArea: calendarArea,
                                DoctorSurgeon: surgeriesList?.[0]?.DoctorSurgeon || null,
                                SurgeryType: item.SurgeryType || null,
                                TimeSurgeryToDo: timeSurgeryToDo,
                                timeSurgeryToDo: timeSurgeryToDo,
                                AvgDauration: avgDauration,
                                timeNotEntered: false,
                                fromCalendarOnly: true,
                            };
                            
                            // חישוב שעת סיום: ArrivalTime + AvgDauration/Duration
                            if (timeSurgeryToDo != null && calEntry.ArrivalTime) {
                                const startDate = this.parseClockWithDate(calEntry.ArrivalTime, targetRoom.date || this.selectedDate);
                                if (startDate) {
                                    const durationMin = typeof timeSurgeryToDo === "number" ? timeSurgeryToDo : parseInt(String(timeSurgeryToDo), 10);
                                    const endDate = new Date(startDate.getTime() + durationMin * 60000);
                                    const endClock = this.toHHmm(endDate);
                                    newSurgery.timeExit = newSurgery.TimeExitingTheOperatingRoom = endClock;
                                }
                            }
                            
                            targetRoom.surgeries.push(newSurgery);
                            usedCalendarKeys.add(key);
                        }
                    }
                    
                    // מיון מחדש של הניתוחים בכל חדר - שימוש בפונקציה המקומית sortByPredicted
                    const self = this;
                    function parseMinutes(v: string | number | null | undefined): number | null {
                        if (v === null || v === undefined || v === "") return null;
                        const n = typeof v === "number" ? v : parseInt(String(v), 10);
                        return isFinite(n) && n > 0 ? n : null;
                    }
                    function addMinutes(d: Date, m: number): Date {
                        return new Date(d.getTime() + m * 60000);
                    }
                    function schedDate(item: Surgery | Partial<Surgery>, baseDate: string): Date | null {
                        if (!item.timeEntrance) return null;
                        return self.parseClockWithDate(item.timeEntrance, baseDate);
                    }
                    function sortByPredicted(list: Surgery[], baseDate: string): Surgery[] {
                        if (!list || !list.length) return [];
                        const DAY_MS = 24 * 60 * 60 * 1000;
                        function sortKeyScheduled(s: Surgery | Partial<Surgery>): number {
                            const eClock = s.timeEntrance;
                            const xClock = s.timeExit;
                            if (!eClock) return Number.POSITIVE_INFINITY;
                            const ent = self.parseClockWithDate(eClock, baseDate);
                            const exi = self.parseClockWithDate(xClock && xClock !== "00:00:00" ? xClock : eClock, baseDate);
                            if (!ent || !exi) return Number.POSITIVE_INFINITY;
                            if (exi.getTime() < ent.getTime()) return ent.getTime() - DAY_MS;
                            return ent.getTime();
                        }
                        list = list.slice().sort(function (a, b) {
                            return sortKeyScheduled(a) - sortKeyScheduled(b);
                        });
                        const MIN_TURNOVER = 20;
                        let active: Surgery | null = null;
                        for (let i = 0; i < list.length; i++) {
                            const st = String(list[i].status || "").toLowerCase();
                            if (st === "inprogress" && list[i].timeEntrance) {
                                if (!active) active = list[i];
                                else {
                                    const aEnt = self.parseClockWithDate(active.timeEntrance, baseDate);
                                    const bEnt = self.parseClockWithDate(list[i].timeEntrance, baseDate);
                                    if (aEnt && bEnt && bEnt.getTime() >= aEnt.getTime()) active = list[i];
                                }
                            }
                        }
                        let cursor: Date | null = null;
                        if (active) {
                            const aStart = self.parseClockWithDate(active.timeEntrance, baseDate);
                            let aDur = parseMinutes((active as unknown as Record<string, unknown>).timeSurgeryToDo as string | number | null | undefined ?? active.TimeSurgeryToDo);
                            if (aDur === null) aDur = 60;
                            cursor = aStart ? addMinutes(aStart, aDur) : null;
                        } else {
                            let firstPending: Surgery | null = null;
                            for (let i = 0; i < list.length; i++) {
                                const st = String(list[i].status || "").toLowerCase();
                                if (st !== "completed") {
                                    firstPending = list[i];
                                    break;
                                }
                            }
                            if (firstPending && firstPending.timeEntrance) {
                                const firstSched = self.parseClockWithDate(firstPending.timeEntrance, baseDate);
                                cursor = firstSched ? addMinutes(firstSched, MIN_TURNOVER) : null;
                            }
                        }
                        for (let i = 0; i < list.length; i++) {
                            const it = list[i];
                            const st = String(it.status || "").toLowerCase();
                            const sched = schedDate(it, baseDate);
                            let dur = parseMinutes(it.timeSurgeryToDo);
                            if (dur === null) dur = 60;
                            if (st === "completed") {
                                it._displayStart = sched || null;
                                it._displayEnd = it.timeExit ? self.parseClockWithDate(it.timeExit, baseDate) : null;
                            } else if (active && it === active) {
                                it._displayStart = sched || null;
                                it._displayEnd = cursor;
                            } else {
                                if (!cursor) {
                                    it._displayStart = sched || null;
                                    it._displayEnd = it._displayStart ? addMinutes(it._displayStart, dur) : null;
                                } else {
                                    const earliest = addMinutes(cursor, MIN_TURNOVER);
                                    const start = sched && sched.getTime() > earliest.getTime() ? sched : earliest;
                                    it._displayStart = start;
                                    it._displayEnd = addMinutes(start, dur);
                                    cursor = it._displayEnd;
                                }
                            }
                            it._displayStartMs = it._displayStart ? it._displayStart.getTime() : Number.POSITIVE_INFINITY;
                        }
                        list.sort(function (a, b) {
                            if (a._displayStartMs !== b._displayStartMs) return a._displayStartMs - b._displayStartMs;
                            const aSched = schedDate(a, baseDate), bSched = schedDate(b, baseDate);
                            if (aSched && bSched && aSched.getTime() !== bSched.getTime()) return aSched.getTime() - bSched.getTime();
                            const aid = String(a.surgeryId || ""), bid = String(b.surgeryId || "");
                            return aid < bid ? -1 : aid > bid ? 1 : 0;
                        });
                        return list;
                    }
                    
                    // דה-דופליקציה של ניתוחים בכל חדר (במקרה שנכנסה גם רשומת RealTime וגם רשומת לוח)
                    for (const room of this.roomsData) {
                        if (!room.surgeries?.length) continue;
                        const byKey = new Map<string, Surgery>();
                        const normId = (v: any) =>
                            v != null && v !== ""
                                ? String(v).replace(/^0+/, "") || String(v)
                                : "";

                        for (const s of room.surgeries) {
                            const keyCandidates: string[] = [];
                            if (s.SurgeryID) keyCandidates.push(normId(s.SurgeryID));
                            if (s.CaseNumber) keyCandidates.push(normId(s.CaseNumber));
                            if ((s as any).AdmissionNo != null)
                                keyCandidates.push(
                                    normId((s as any).AdmissionNo),
                                    normId(String((s as any).AdmissionNo).padStart(10, "0"))
                                );
                            if (s.surgeryId) keyCandidates.push(normId(s.surgeryId));

                            const key =
                                keyCandidates.find((k) => !!k) ||
                                // fallback: אם אין מזהים – נשתמש ב-object identity
                                (Math.random().toString(36).slice(2));

                            const existing = byKey.get(key);
                            if (!existing) {
                                byKey.set(key, s);
                            } else {
                                // אם כבר יש – נעדיף רשומה שאינה fromCalendarOnly (כלומר RealTime)
                                if (existing.fromCalendarOnly && !s.fromCalendarOnly) {
                                    byKey.set(key, s);
                                }
                            }
                        }

                        const roomDate = room.date || this.selectedDate;
                        const merged = Array.from(byKey.values());
                        this.enforceSingleInProgressPerRoomSurgeries(
                            merged,
                            roomDate
                        );
                        room.surgeries = sortByPredicted(merged, roomDate);
                    }
                    // העשרת הלוח הושלמה – עכשיו אפשר להציג את הניתוחים המתוכננים/המשוערים
                    this.calendarEnriched = true;
                    this.cdr.detectChanges();
                });
            },
            (_) => {
                this.endLoading();
            }
        );
    }

    /**
     * עדכון מיפוי החדרים לפי CalendarRoomsArea מהפונקציה GetSurgeryRooms
     */
    private updateRoomsCalendarMapping(response: any): void {
        // ניקוי המיפוי הקודם
        this.roomCalendarAreaMap.clear();
        
        // הנתונים חוזרים בפורמט Response["d"] או response.d
        const data = response.d || response || [];
        
        // עוברים על כל האלמנטים
        if (Array.isArray(data)) {
            data.forEach((item: any) => {
                // בודקים אם יש mSurgeriesRoomsGroup
                if (item.mSurgeriesRoomsGroup && Array.isArray(item.mSurgeriesRoomsGroup)) {
                    item.mSurgeriesRoomsGroup.forEach((group: any) => {
                        const calendarArea = group.CalendarRoomsArea;
                        if (calendarArea && group.Rooms && Array.isArray(group.Rooms)) {
                            // לכל חדר בקבוצה, שומרים את ה-CalendarRoomsArea שלו
                            group.Rooms.forEach((roomId: string) => {
                                if (roomId) {
                                    this.roomCalendarAreaMap.set(roomId, calendarArea);
                                }
                            });
                        }
                    });
                }
            });
        }
    }

    getTurnoverTime(room: RoomData): string {
        if (!room?.surgeries?.length) return "";

        const lastCompleted = [...room.surgeries]
            .reverse()
            .find(
                (s) =>
                    s.status === "Completed" &&
                    (s.timeExit || s.timeExit === "00:00:00")
            );

        if (!lastCompleted) return "";

        const exitTime =
            lastCompleted.timeExit && lastCompleted.timeExit !== "00:00:00"
                ? lastCompleted.timeExit
                : lastCompleted.timeEntrance;

        const exit = this.parseClock(exitTime);
        if (!exit) return "";

        const limit = new Date(exit);
        limit.setHours(15, 0, 0, 0);
        const now = new Date();
        const endTime = now < limit ? now : limit;

        const diffMin = Math.floor(
            (endTime.getTime() - exit.getTime()) / 60000
        );

        if (diffMin > 20) {
            return this.formatHM(diffMin - 20);
        }

        return "";
    }

    getTurnoverMinutes(room: RoomData): number {
        const s = this.getTurnoverSummary(room); // "HH:MM" או """"
        if (!s || s === "") return 0;
        const [h, m] = s.split(":").map((x) => +x);
        if (Number.isNaN(h) || Number.isNaN(m)) return 0;
        return h * 60 + m;
    }

    isTurnoverLong(room: RoomData): boolean {
        return this.getTurnoverMinutes(room) > 20;
    }

    private workingStart(): Date;
    private workingStart(baseDate: string | Date): Date;
    private workingStart(baseDate?: string | Date): Date {
        const d = baseDate ? new Date(baseDate) : new Date();
        d.setHours(7, 30, 0, 0); // 07:30
        return d;
    }

    private workingEnd(): Date;
    private workingEnd(baseDate: string | Date): Date;
    private workingEnd(baseDate?: string | Date): Date {
        const d = baseDate ? new Date(baseDate) : new Date();
        d.setHours(15, 0, 0, 0); // 15:00
        return d;
    }

    /**
     * ניתוח שהושלם ושעת יציאה בפועל לפני תחילת יום העבודה (07:30) — לא רלוונטי למסך המשמרת.
     */
    private isCompletedWithExitBeforeShiftStart(
        s: Surgery,
        room: RoomData
    ): boolean {
        if (!this.isCompletedStatus(s.status ?? s.SurgeryStatus)) {
            return false;
        }
        const exitStr = this.getExitTime(s);
        if (!exitStr || this.isZeroTime(exitStr)) {
            return false;
        }
        const base = room.date || this.selectedDate;
        if (!base) {
            return false;
        }
        const exitAt = this.parseClockWithDate(exitStr, base);
        if (!exitAt) {
            return false;
        }
        const shiftStart = this.workingStart(base);
        return exitAt.getTime() < shiftStart.getTime();
    }

    /** 07:00 ביום הנבחר – תצוגת "חדר פנוי" / משך פנאי לא סופרים זמן לפני השעה הזו */
    private idleMetricsDayStart(baseDate: string | Date): Date {
        const d = new Date(baseDate);
        d.setHours(7, 0, 0, 0);
        return d;
    }

    private clampToIdleMetricsDayStart(
        dt: Date,
        baseDate: string | Date
    ): Date {
        const start = this.idleMetricsDayStart(baseDate);
        return dt.getTime() < start.getTime() ? start : dt;
    }

    private clampToWindow(d: Date, start: Date, end: Date): Date {
        return new Date(
            Math.min(end.getTime(), Math.max(start.getTime(), d.getTime()))
        );
    }

    getTurnoverClass(room: RoomData): string {
        const t = this.getTurnoverTime(room);
        if (!t || t === "") return "";
        const [h, m] = t.split(":").map(Number);
        const minutes = h * 60 + m;

        if (minutes > 120) return "metric-red-strong";
        if (minutes > 60) return "metric-red";
        if (minutes > 45) return "metric-orange";
        if (minutes > 20) return "metric-yellow";
        return "metric-ok";
    }

    getTurnoverTimeClass(room: RoomData): string {
        if (this.isRoomClosedForColoring(room)) return "metric-neutral";

        var s = this.getTurnoverSummary(room); // 'HH:MM' or '"  "'
        var m = (function hmToMin(v: string): number {
            if (!v || v === "") return 0;
            var p = v.split(":");
            if (p.length < 2) return 0;
            var hh = +p[0],
                mm = +p[1];
            return isNaN(hh) || isNaN(mm) ? 0 : hh * 60 + mm;
        })(s);

        if (m >= 90) return "metric-bad"; // red
        if (m > 0) return "metric-warn"; // amber
        return "metric-ok"; // green/ok
    }

    sortByChronologicalStart(a: Surgery | Partial<Surgery>, b: Surgery | Partial<Surgery>, roomDate: string | Date): number {
        var DAY_MS = 24 * 60 * 60 * 1000;

        function clockToDate(clk: string, base: string | Date) {
            return this.parseClockWithDate(clk, base);
        }

        function sortKey(s: Surgery | Partial<Surgery>, baseDate: string | Date): number {
            var eClock =
                s &&
                (s.timeEntrance != null
                    ? s.timeEntrance
                    : s.TimeEntranceToTheOperatingRoom);
            var xClockRaw =
                s &&
                (s.timeExit != null
                    ? s.timeExit
                    : s.TimeExitingTheOperatingRoom);
            var base =
                (s &&
                    (s.surgeryDate != null ? s.surgeryDate : s.SurgeryDate)) ||
                baseDate;
            if (!eClock) return Number.POSITIVE_INFINITY;

            var entrance = this.parseClockWithDate(eClock, base);
            var exit = this.parseClockWithDate(
                xClockRaw && xClockRaw !== "00:00:00" ? xClockRaw : eClock,
                base
            );
            if (!entrance || !exit) return Number.POSITIVE_INFINITY;

            if (exit.getTime() < entrance.getTime())
                return entrance.getTime() - DAY_MS;

            if (xClockRaw) {
                var eParts = String(eClock).split(":"),
                    xParts = String(xClockRaw).split(":");
                if (eParts.length >= 2 && xParts.length >= 2) {
                    var eNum = +eParts[0] * 60 + +eParts[1];
                    var xNum = +xParts[0] * 60 + +xParts[1];
                    if (xNum < eNum) return entrance.getTime() - DAY_MS;
                }
            }
            return entrance.getTime();
        }

        var ka = sortKey.call(this, a, roomDate);
        var kb = sortKey.call(this, b, roomDate);
        return ka - kb;
    }

    sortSurgeriesForDisplay(surgeries: Surgery[], roomDate: string | Date): Surgery[] {
        var DAY_MS = 24 * 60 * 60 * 1000;

        function sortKey(self: RoomTimeRTmDashboardComponent, s: Surgery | Partial<Surgery>, baseDate: string | Date): number {
            var eClock =
                s &&
                (s.timeEntrance != null
                    ? s.timeEntrance
                    : s.TimeEntranceToTheOperatingRoom);
            var xClockRaw =
                s &&
                (s.timeExit != null
                    ? s.timeExit
                    : s.TimeExitingTheOperatingRoom);
            var base =
                (s &&
                    (s.surgeryDate != null ? s.surgeryDate : s.SurgeryDate)) ||
                baseDate;
            if (!eClock) return Number.POSITIVE_INFINITY;

            var entrance = self.parseClockWithDate(eClock, base);
            var exit = self.parseClockWithDate(
                xClockRaw && xClockRaw !== "00:00:00" ? xClockRaw : eClock,
                base
            );
            if (!entrance || !exit) return Number.POSITIVE_INFINITY;

            if (exit.getTime() < entrance.getTime())
                return entrance.getTime() - DAY_MS;

            if (xClockRaw) {
                var ep = String(eClock).split(":"),
                    xp = String(xClockRaw).split(":");
                if (ep.length >= 2 && xp.length >= 2) {
                    var eMin = +ep[0] * 60 + +ep[1];
                    var xMin = +xp[0] * 60 + +xp[1];
                    if (xMin < eMin) return entrance.getTime() - DAY_MS;
                }
            }
            return entrance.getTime();
        }

        var self = this;
        return (surgeries || []).slice().sort(function (a, b) {
            return sortKey(self, a, roomDate) - sortKey(self, b, roomDate);
        });
    }

    getRoomStatusClass(room: RoomData): string {
        if (!room || !room.surgeries?.length) return "grey";

        const isWeekend = this.isWeekend(room.date);

        if (room.surgeries.some((s) => s.status === "InProgress")) {
            return isWeekend ? "green" : "green-blink";
        }

        const lastCompleted = [...room.surgeries]
            .reverse()
            .find(
                (s) =>
                    s.status === "Completed" &&
                    s.timeExit &&
                    s.timeExit !== "00:00:00"
            );
        if (!lastCompleted) return "grey";

        const exitAt = this.parseClockWithDate(
            lastCompleted.timeExit,
            room.date
        );

        if (!exitAt) return "grey";

        const diffMin = Math.max(0, (Date.now() - exitAt.getTime()) / 60000);

        if (isWeekend) {
            if (diffMin > 120) return "red-120-ack";
            if (diffMin > 60) return "red-60-ack";
            if (diffMin > 45) return "red-45-ack";
            return "grey";
        }

        const isAcked = this.isRoomAcked(room);
        if (diffMin > 120) return isAcked ? "red-120-ack" : "red-120";
        if (diffMin > 60) return isAcked ? "red-60-ack" : "red-60";
        if (diffMin > 45) return isAcked ? "red-45-ack" : "red-45";
        return "grey";
    }

    private isWeekend(dateLike?: string | Date): boolean {
        const d = dateLike ? new Date(dateLike) : new Date();
        const day = d.getDay();
        return day === 5 || day === 6;
    }

    getStartDiffClass(room: RoomData): string {
        const val = this.getStartDiff(room);
        if (!val || val === "") return;
        const [h, m] = val.split(":").map(Number);
        const minutes = h * 60 + m;

        if (minutes > 60) return "metric-red";
        if (minutes > 30) return "metric-orange";
        if (minutes > 15) return "metric-yellow";
        return "metric-ok";
    }

    private isRealCase(s?: Surgery): boolean {
        return !!s && (s.status === "Completed" || s.status === "InProgress");
    }

    private toInterval(s: Surgery, baseDate?: string | Date) {
        const eClock = s.timeEntrance;
        const xClock =
            s.timeExit && s.timeExit !== "00:00:00"
                ? s.timeExit
                : s.timeEntrance;

        const entrance = eClock
            ? this.parseClockWithDate(eClock, baseDate ?? s.surgeryDate)
            : null;
        let exit = xClock
            ? this.parseClockWithDate(xClock, baseDate ?? s.surgeryDate)
            : null;

        if (entrance && exit && exit.getTime() < entrance.getTime()) {
            exit = new Date(exit.getTime() + 24 * 60 * 60 * 1000);
        }
        return { entrance, exit: exit ?? entrance };
    }

    private overlapsWindow(
        entrance: Date | null,
        exit: Date | null,
        start: Date,
        end: Date
    ): boolean {
        if (!entrance || !exit) return false;
        return entrance < end && exit > start;
    }

    getTurnoverBetween(prev: Surgery, next: Surgery): string | null {
        if (!this.isRealCase(prev) || !this.isRealCase(next)) return null;

        const baseDate =
            next.surgeryDate ?? prev.surgeryDate ?? this.selectedDate;
        const dayStart = this.workingStart(baseDate);
        const dayEnd = this.workingEnd(baseDate);

        const p = this.toInterval(prev, baseDate);
        const n = this.toInterval(next, baseDate);
        if (!p.entrance || !p.exit || !n.entrance || !n.exit) return null;

        if (!this.overlapsWindow(p.entrance, p.exit, dayStart, dayEnd))
            return null;
        if (!this.overlapsWindow(n.entrance, n.exit, dayStart, dayEnd))
            return null;

        const prevEnd = this.clampToWindow(p.exit, dayStart, dayEnd);
        const nextStart = this.clampToWindow(n.entrance, dayStart, dayEnd);

        const gap = this.minutesBetween(prevEnd, nextStart);
        if (gap <= 20) return null;
        return this.formatHM(gap - 20);
    }

    getTurnoverBetweenClass(prev: Surgery, next: Surgery): string {
        const raw = this.getTurnoverBetween(prev, next);
        if (!raw) return;

        const [h, m] = raw.split(":").map(Number);
        const minutes = h * 60 + m;

        if (minutes > 120) return "metric-red blink";
        if (minutes > 60) return "metric-red";
        if (minutes > 45) return "metric-orange";
        return "metric-yellow";
    }

    private isInProgress(raw: Surgery | Partial<Surgery>): boolean {
        var s = (raw == null ? "" : String(raw)).toLowerCase();
        return (
            s === "inprogress" || s === "in progress" || s.indexOf("בתהל") >= 0
        );
    }

    private getSurgeryIdFromAny(s: Surgery | Partial<Surgery>): string {
        if (!s) return "";
        if (s.surgeryId != null && s.surgeryId !== "")
            return String(s.surgeryId);
        if ((s as Record<string, unknown>).SurgeryID != null && (s as Record<string, unknown>).SurgeryID !== "") {
            return String((s as Record<string, unknown>).SurgeryID);
        }
        return "";
    }

    private entranceMillisForSort(s: Surgery | Partial<Surgery>, roomDate: string | Date): number {
        var eClock =
            s &&
            (s.timeEntrance != null
                ? s.timeEntrance
                : s.TimeEntranceToTheOperatingRoom);
        var base =
            (s && (s.surgeryDate != null ? s.surgeryDate : s.SurgeryDate)) ||
            roomDate;
        var d = eClock ? this.parseClockWithDate(eClock, base) : null;
        return d ? d.getTime() : -Infinity;
    }

    getHeaderInProgressId(room: RoomData): string {
        if (!room || !room.surgeries || !room.surgeries.length) return "";

        var inProg: Surgery[] = [];
        for (var i = 0; i < room.surgeries.length; i++) {
            var s = room.surgeries[i];
            var status = s && s.status != null ? s.status : s && s.status;
            if (this.isInProgressStatus(status)) inProg.push(s);
        }

        if (!inProg.length) return "";

        var picked = inProg
            .slice()
            .sort(
                (a, b) =>
                    this.entranceMillisForSort(
                        b,
                        room.date || this.selectedDate
                    ) -
                    this.entranceMillisForSort(
                        a,
                        room.date || this.selectedDate
                    )
            )[0];

        return this.getSurgeryIdFromAny(picked) || "";
    }

    private parseClock(t: string): Date | null {
        if (!t || typeof t !== "string") return null;
        const parts = t.split(":").map((n) => Number(n));
        if (parts.length < 2 || parts.some(isNaN)) return null;
        const [h, m, s = 0] = parts;
        const d = new Date();
        d.setHours(h, m, s, 0);
        return isNaN(d.getTime()) ? null : d;
    }

    private parseClockWithDate(
        clock: string,
        baseDate?: string | Date
    ): Date | null {
        const t = this.parseClock(clock);
        if (!t) return null;
        if (!baseDate) return t;

        const base = new Date(baseDate);
        base.setHours(t.getHours(), t.getMinutes(), t.getSeconds(), 0);
        return base;
    }

    private formatDiff(ms: number): string {
        if (isNaN(ms)) return "";
        const sign = ms < 0 ? "-" : "";
        const abs = Math.abs(ms);
        const h = Math.floor(abs / 3600000);
        const m = Math.floor((abs % 3600000) / 60000);
        return `${sign}${("0" + h).slice(-2)}:${("0" + m).slice(-2)}`;
    }

    getStartDiff(room: RoomData): string {
        const safeStart = this.parseClock("07:00");
        const safeEnd = this.parseClock("07:30");
        if (!safeStart || !safeEnd) return "";

        if (!room.surgeries || room.surgeries.length === 0) return "";

        const sortedSurgeries = room.surgeries
            .map((s) => ({ ...s, entrance: this.parseClock(s.timeEntrance) }))
            .filter((s) => s.entrance)
            .sort((a, b) => a.entrance!.getTime() - b.entrance!.getTime());

        const firstInSafeZone = sortedSurgeries.find(
            (s) => s.entrance! >= safeStart && s.entrance! <= safeEnd
        );
        if (firstInSafeZone) return "00:00";

        const firstAfterSafeZone = sortedSurgeries.find(
            (s) => s.entrance! > safeEnd
        );

        if (!firstAfterSafeZone) return "";

        const diffMs =
            firstAfterSafeZone.entrance!.getTime() - safeEnd.getTime();
        return this.formatDiff(diffMs);
    }

    getEndDiff(room: RoomData): string {
        const opening = this.parseClock("07:30");
        const closing = this.parseClock("14:40");
        if (!closing || !opening) return "";

        const exits = room.surgeries
            .map((s) => {
                const exitStr =
                    s.timeExit && s.timeExit !== "00:00:00"
                        ? s.timeExit
                        : s.timeEntrance;
                return this.parseClock(exitStr);
            })
            .filter((d): d is Date => !!d && d >= opening)
            .sort((a, b) => a.getTime() - b.getTime());

        if (exits.length === 0) return this.formatDiff(0);

        const lastExit = exits[exits.length - 1];

        if (lastExit >= closing) return this.formatDiff(0);

        const diffMs = closing.getTime() - lastExit.getTime();
        return this.formatDiff(diffMs);
    }

    getEndDiffClass(room: RoomData): string {
        if (this.isRoomClosedForColoring(room)) return "metric-neutral";

        var s = this.getEndDiff(room);
        if (!s || s === "") return "metric-ok";
        var p = s.split(":");
        if (p.length < 2) return "metric-ok";
        var mins = +p[0] * 60 + +p[1];
        if (isNaN(mins)) return "metric-ok";
        if (mins <= 15) return "metric-warn";
        return "metric-ok";
    }

    /**
     * ניתוחים "אקטיביים" להצגה ברשימת "ניתוחים שבוצעו"
     * - כל מה שאינו Planned
     * - רק ניתוחים שאינם אמבולטוריים (כדי שלא יתערבבו בחדרים האמבולטוריים / בקופסת אמבולטורי)
     */
    activeSurgeries(room: RoomData): Surgery[] {
        if (!room?.surgeries?.length) return [];

        return room.surgeries.filter((s) => {
            const status = String(s.status ?? s.SurgeryStatus ?? "").toLowerCase();
            const isPlanned = status === "planned";

            // ניתוחים מתוכננים יוצגו ברשימת "ניתוחים מתוכננים" – לא כאן
            if (isPlanned) return false;

            if (this.surgeryIsAmbulatoryForDisplay(s, room)) return false;

            if (this.isCompletedWithExitBeforeShiftStart(s, room)) return false;

            return true;
        });
    }

    /**
     * ניתוחים מתוכננים להצגה תחת "ניתוחים מתוכננים"
     * - סטטוס Planned (מכל מקור: status או SurgeryStatus)
     * - רק ניתוחים שאינם אמבולטוריים (האמבולטוריים יוצגו בקופסת אמבולטורי / בחדרי אמבולטורי)
     */
    plannedSurgeries(room: RoomData): Surgery[] {
        if (!room?.surgeries?.length) return [];

        return room.surgeries.filter((s) => {
            const statusRaw = s.status ?? s.SurgeryStatus ?? "";
            const status = String(statusRaw).toLowerCase().trim();
            const isPlanned = status === "planned";

            if (!isPlanned) return false;

            if (this.surgeryIsAmbulatoryForDisplay(s, room)) return false;

            return true;
        });
    }

    formatCountdown(sec: number): string {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    }

    manualRefresh(): void {
        this.loadRoomsData();
        this.nextRefreshIn = 300;
        this.lastLoaded = new Date();
    }

    isSignatureBannerDismissed(roomId: string): boolean {
        return this.signatureBannerDismissedRoomIds.has(roomId);
    }

    dismissSignatureBanner(roomId: string, event: Event): void {
        event.stopPropagation();
        event.preventDefault();
        this.signatureBannerDismissedRoomIds.add(roomId);
        this.cdr.markForCheck();
    }

    isNextReadyBannerDismissed(roomId: string): boolean {
        return this.nextReadyBannerDismissedRoomIds.has(roomId);
    }

    dismissNextReadyBanner(roomId: string, event: Event): void {
        event.stopPropagation();
        event.preventDefault();
        this.nextReadyBannerDismissedRoomIds.add(roomId);
        this.nextReadyBannerDismissedRoomIds = new Set(
            this.nextReadyBannerDismissedRoomIds
        );
        this.cdr.markForCheck();
    }

    toggleAutoRefresh(): void {
        this.autoRefreshPaused = !this.autoRefreshPaused;
        if (this.autoRefreshPaused) {
            this.clearIntervals();
        } else {
            this.startAutoRefresh();
        }
    }

    private startAutoRefresh(): void {
        this.clearIntervals();
        this.nextRefreshIn = 300;

        this.refreshInterval = setInterval(() => {
            if (!this.autoRefreshPaused) {
                this.loadRoomsData();
                this.nextRefreshIn = 300;
            }
        }, 5 * 60 * 1000);

        this.countdownInterval = setInterval(() => {
            if (!this.autoRefreshPaused && this.nextRefreshIn > 0) {
                this.nextRefreshIn--;
            }
        }, 1000);
    }

    private clearIntervals(): void {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        if (this.countdownInterval) clearInterval(this.countdownInterval);
    }

    onDateChange(): void {
        if (!this.autoRefreshPaused) {
            this.autoRefreshPaused = true;
            this.clearIntervals();
        }

        this.loadRoomsData();
    }

    private openingOfDay(): Date {
        const d = new Date();
        d.setHours(7, 30, 0, 0);
        return d;
    }

    private closingOfDay(): Date {
        const d = new Date();
        d.setHours(15, 0, 0, 0);
        return d;
    }

    private clampToDay(d: Date): Date {
        const open = this.openingOfDay().getTime();
        const close = this.closingOfDay().getTime();
        return new Date(Math.min(close, Math.max(open, d.getTime())));
    }

    private minutesBetween(a: Date, b: Date): number {
        return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 60000));
    }

    private formatHM(mins: number): string {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${("0" + h).slice(-2)}:${("0" + m).slice(-2)}`;
    }

    statusTranslations: Record<string, string> = {
        Completed: "✔️ הסתיים",
        InProgress: "🟢 ניתוח פעיל",
        Scheduled: "🕓 מתוזמן",
        Cancelled: "❌ בוטל",
        Planned: "📆 מתוכנן",
    };

    translateStatus(status: string): string {
        return this.statusTranslations[status] || status;
    }

    acknowledgeAllRooms(): void {
        this.googleChartsService.triggerAcknowledgeAllRooms();

        for (const r of this.roomsData ?? []) {
            if (!r || !r.roomId) continue;

            const storeKey = this.ackStorageKey(r.roomId);
            const compositeKey = this.currentAckKeyForRoom(r);

            this.lsSet(storeKey, compositeKey);
            this.lsRemove(this.legacyAckStorageKey(r.roomId));
            this.ackCache.set(r.roomId, compositeKey);

            if (this.ackedRooms) this.ackedRooms.add(r.roomId);
        }

        this.roomsData = [...(this.roomsData ?? [])];
    }

    private refreshAckCache(): void {
        this.ackCache.clear();
        for (const r of this.roomsData ?? []) {
            const stored =
                this.lsGet(this.ackStorageKey(r.roomId)) ??
                this.lsGet(this.legacyAckStorageKey(r.roomId));
            if (stored) this.ackCache.set(r.roomId, stored);
        }
    }
    private markAllRoomsAcknowledged(): void {
        for (const r of this.roomsData ?? []) {
            if (r?.roomId) this.ackedRooms.add(r.roomId);
        }
        this.roomsData = [...(this.roomsData ?? [])];
    }

    public isRoomAcked(room: RoomData): boolean {
        if (!room || !room.roomId) return false;

        const baseKey = this.lastEventKeyForRoom(room.roomId);
        const compositeKey = this.currentAckKeyForRoom(room);

        const storedKey =
            this.ackCache.get(room.roomId) ??
            this.lsGet(this.ackStorageKey(room.roomId)) ??
            this.lsGet(this.legacyAckStorageKey(room.roomId));

        if (!storedKey) return false;

        if (storedKey === compositeKey) return true;
        if (storedKey === baseKey) {
            const lateNow = this.predictedLateEndHHmm(room);
            return !lateNow;
        }
        return false;
    }

    acknowledgeRoomLate(room: RoomData): void {
        if (!room || !room.roomId) return;

        const storeKey = this.ackStorageKey(room.roomId);
        const compositeKey = this.currentAckKeyForRoom(room);

        this.lsSet(storeKey, compositeKey);
        this.lsRemove(this.legacyAckStorageKey(room.roomId));
        this.ackCache.set(room.roomId, compositeKey);

        if (this.ackedRooms) this.ackedRooms.add(room.roomId);

        this.roomsData = [...(this.roomsData ?? [])];
    }

    private readonly PLANNED_SET = new Set(["Planned", "Scheduled"]);

    trackBySurgeryId = (_: number, s: Surgery) => s?.surgeryId ?? _;

    private roomNameOverrides: Record<string, string> = {
        "פז01-201": "חדר ניתוח 1",
        "פז01-202": "חדר ניתוח 2",
        "פז01-203": "חדר ניתוח 3",
        "פז01-204": "חדר ניתוח 4",
        "פז01-205": "חדר ניתוח 5",
        "פז01-206": "חדר ניתוח 6",
        "פז01-207": "חדר ניתוח 7",
    };

    /** סדר קבוע של 7 חדרי ניתוח כללי — כותרת דביקה מעל הגריד */
    readonly standardRegularRoomSlotIds: readonly string[] = [
        "פז01-201",
        "פז01-202",
        "פז01-203",
        "פז01-204",
        "פז01-205",
        "פז01-206",
        "פז01-207",
    ];

    trackByRoomSlotId = (_index: number, id: string) => id;

    translateRoomId(id?: string): string {
        if (!id) return "";

        const hit = this.roomNameOverrides[id];
        if (hit) return hit;

        const norm = String(id).trim();
        /** שם חדר אמבולטורי מהשרת — מוצג כמו שהוא, בלי לפרש מספר כמו בחדרים 1–7 */
        if (norm.includes("חדר ניתוח אמבולטורי")) {
            return norm;
        }
        if (norm.includes("פה ולסת")) {
            return norm;
        }
        const firstSeg = norm.split(/[-–—]/)[0];
        let numStr: string | null = null;

        const m1 = firstSeg.match(/(\d{1,2})(?!.*\d)/);
        if (m1) numStr = m1[1];

        if (!numStr) {
            const m2 = norm.match(/\b(0?[1-9]|[1-9]\d)\b/);
            if (m2) numStr = m2[1];
        }

        if (numStr) {
            const n = parseInt(numStr, 10);
            if (!Number.isNaN(n)) return `חדר ניתוח ${n}`;
        }

        return norm;
    }

    /**
     * בדיקה אם החדר הוא אחד מהחדרים הרגילים (1-7)
     * בודק ישירות לפי roomId ולא לפי חילוץ מספר
     */
    isStandardOperatingRoom(roomId: string): boolean {
        if (!roomId) return false;
        // בודק אם roomId נמצא ב-roomNameOverrides (פז01-201 עד פז01-207)
        return roomId in this.roomNameOverrides;
    }

    /**
     * אמבולטורי — רק לפי SurgeryRoomName מהשרת (למשל "חדר ניתוח אמבולטורי - 1")
     */
    private isAmbulatoryBySurgeryRoomName(
        name: string | null | undefined
    ): boolean {
        const t = String(name ?? "").trim();
        if (!t) return false;
        return t.includes("חדר ניתוח אמבולטורי");
    }

    /** פה ולסת — לפי SurgeryRoomName בלבד (למשל "פה ולסת - 1") */
    private isOralMaxillofacialBySurgeryRoomName(
        name: string | null | undefined
    ): boolean {
        const t = String(name ?? "").trim();
        if (!t) return false;
        return t.includes("פה ולסת");
    }

    /**
     * האם ניתוח מוצג באזור אמבולטורי — לפי SurgeryRoomName בלבד
     */
    surgeryIsAmbulatoryForDisplay(s: Surgery, _room: RoomData): boolean {
        return this.isAmbulatoryBySurgeryRoomName(s.SurgeryRoomName);
    }

    /**
     * כרטיס חדר בגריד הכללי: "חדר אמבולטורי" לצורכי UI (הסתרת סטטוס מעל הכרטיס)
     * רק כשכל הניתוחים בקובץ מסומנים כאמבולטוריים לפי SurgeryRoomName
     */
    isAmbulatoryRoom(room: RoomData): boolean {
        if (!room?.surgeries?.length) return false;
        return room.surgeries.every((s) =>
            this.isAmbulatoryBySurgeryRoomName(s.SurgeryRoomName)
        );
    }

    /**
     * בדיקה אם החדר הוא חדר ניתוח רגיל (1-7)
     * חדרים 1-7 תמיד נחשבים רגילים, ללא קשר ל-SurgeryType
     */
    isRegularOperatingRoom(roomId: string): boolean {
        const num = this.getRoomNumberFromId(roomId);
        return num !== null && num >= 1 && num <= 7;
      }
      
    /**
     * קבלת חדרים רגילים (רק חדרים 1-7)
     * מסונן לפי roomId ייחודי וממוין לפי מספר החדר
     */
    private uniqueByRoomId(rooms: RoomData[]): RoomData[] {
        return Array.from(
          new Map(rooms.map(r => [r.roomId, r])).values()
        );
      }
      
      
    /**
     * חדרי ניתוח 1–7 כפי שהתקבלו מהשרת (ללא שורות placeholder).
     * לשימוש בסיכומי סטטיסטיקה — לא לרנדר מסך מלא.
     */
    private get regularRoomsFromData(): RoomData[] {
        return this.uniqueByRoomId(
            this.roomsData.filter((r) => this.isRegularOperatingRoom(r.roomId))
        ).sort(
            (a, b) =>
                this.getRoomNumberFromId(a.roomId)! -
                this.getRoomNumberFromId(b.roomId)!
        );
    }

    /**
     * תמיד 7 כרטיסי חדר (פז01-201…207) — חדר עם נתונים או placeholder ריק,
     * כדי שלא יופיע מסך ריק כשאין ניתוחים.
     */
    get regularRooms(): RoomData[] {
        const byId = new Map(
            this.regularRoomsFromData.map((r) => [r.roomId, r] as const)
        );
        const date =
            this.selectedDate || new Date().toISOString().split("T")[0];
        return this.standardRegularRoomSlotIds.map((roomId) => {
            const existing = byId.get(roomId);
            if (existing) {
                return existing;
            }
            return { roomId, date, surgeries: [] };
        });
    }

    /**
     * פס 07:30 בחדר ריק — רק ביום המסך=היום, לפני תחילת יום עבודה (07:30); אחרי זה מיותר.
     */
    get showEmptyRoomEarlyBand(): boolean {
        const sel = (this.selectedDate || "").trim();
        if (!sel) {
            return false;
        }
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        if (sel !== `${y}-${m}-${d}`) {
            return false;
        }
        return now.getTime() < this.workingStart(sel).getTime();
    }

    /**
     * חילוץ מספר החדר מ-roomId (רק לחדרים 1-7)
     */
    private getRoomNumberFromId(roomId: string): number | null {
        if (!roomId) return null;
        const override = this.roomNameOverrides[roomId];
        if (override) {
            const match = override.match(/חדר ניתוח (\d+)/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num >= 1 && num <= 7) return num;
            }
        }
        return null;
    }
    isAmbulatory(s: Surgery | Partial<Surgery>): boolean {
        return this.isAmbulatoryBySurgeryRoomName(s.SurgeryRoomName);
    }
      
      
      /**
       * ניתוחים אמבולטוריים להצגה — לפי SurgeryRoomName בלבד
       */
      ambulatorySurgeries(room: RoomData) {
        if (!room.surgeries || room.surgeries.length === 0) {
          return [];
        }

        return room.surgeries.filter((s) =>
            this.surgeryIsAmbulatoryForDisplay(s, room)
        );
      }

      /** ניתוחים אמבולטוריים בפועל (לא מתוכננים) — מקביל ל־activeSurgeries */
      ambulatoryActiveSurgeries(room: RoomData): Surgery[] {
          return this.ambulatorySurgeries(room).filter((s) => {
              const st = String(s.status ?? s.SurgeryStatus ?? "")
                  .toLowerCase()
                  .replace(/\s+/g, "");
              if (st === "cancelled" || st === "canceled") return false;
              if (st === "planned") return false;
              if (this.isCompletedWithExitBeforeShiftStart(s, room)) return false;
              return true;
          });
      }

      /** ניתוחים אמבולטוריים מתוכננים — מקביל ל־plannedSurgeries */
      ambulatoryPlannedSurgeries(room: RoomData): Surgery[] {
          return this.ambulatorySurgeries(room).filter((s) => {
              const st = String(s.status ?? s.SurgeryStatus ?? "")
                  .toLowerCase()
                  .replace(/\s+/g, "");
              return st === "planned";
          });
      }

      /** פאנלים לתצוגת חדר אמבולטורי (בפועל / מתוכננים) — קריאה אחת לתבנית */
      ambulatoryRoomPanels(room: RoomData): {
          active: Surgery[];
          planned: Surgery[];
      } {
          return {
              active: this.ambulatoryActiveSurgeries(room),
              planned: this.ambulatoryPlannedSurgeries(room),
          };
      }
      
      
   
      
      regularSurgeries(room: RoomData) {
        if (!room.surgeries?.length) return [];
        return room.surgeries.filter(
            (s) => !this.surgeryIsAmbulatoryForDisplay(s, room)
        );
      }
      
    /**
     * מפתח איחוד לניתוח (מניעת כפילויות כשאותו ניתוח מגיע תחת מזהי חדר שונים)
     */
    private surgeryMergeKeyAmbulatory(s: Surgery): string {
        const norm = (v: unknown) =>
            v != null && v !== ""
                ? String(v).replace(/^0+/, "") || String(v)
                : "";
        const sid = norm((s as unknown as Record<string, unknown>).SurgeryID) || norm(s.surgeryId);
        const cn = norm(s.CaseNumber);
        const admRaw = (s as unknown as Record<string, unknown>).AdmissionNo;
        const adm =
            admRaw != null
                ? norm(
                      String(admRaw).length < 10
                          ? String(admRaw).padStart(10, "0")
                          : String(admRaw)
                  )
                : "";
        const key = sid || cn || adm;
        if (key) return key;
        return `${s.surgeryName ?? ""}|${s.timeEntrance ?? ""}|${s.department ?? ""}`;
    }

    /**
     * חדרים אמבולטוריים להצגה — קיבוץ לפי ערך SurgeryRoomName (כמה שמות = כמה כרטיסים)
     */
    get ambulatoryRooms(): RoomData[] {
        const byName = new Map<string, Surgery[]>();
        const fallbackDate =
            this.selectedDate || new Date().toISOString().split("T")[0];

        for (const r of this.roomsData) {
            for (const s of r.surgeries || []) {
                if (!this.isAmbulatoryBySurgeryRoomName(s.SurgeryRoomName)) {
                    continue;
                }
                const key = String(s.SurgeryRoomName).trim();
                if (!byName.has(key)) {
                    byName.set(key, []);
                }
                byName.get(key)!.push(s);
            }
        }

        const out: RoomData[] = [];
        for (const [name, surgeries] of byName) {
            const dedup = new Map<string, Surgery>();
            for (const s of surgeries) {
                const k = this.surgeryMergeKeyAmbulatory(s);
                const existing = dedup.get(k);
                if (!existing) {
                    dedup.set(k, s);
                } else if (existing.fromCalendarOnly && !s.fromCalendarOnly) {
                    dedup.set(k, s);
                }
            }
            const list = Array.from(dedup.values());
            const roomDate =
                list.find((x) => x.surgeryDate)?.surgeryDate || fallbackDate;
            list.sort((a, b) => {
                const am =
                    a._displayStartMs ??
                    this.entranceMillisForSortSafe(a, roomDate);
                const bm =
                    b._displayStartMs ??
                    this.entranceMillisForSortSafe(b, roomDate);
                if (am !== bm) {
                    return am - bm;
                }
                return String(a.surgeryId ?? "").localeCompare(
                    String(b.surgeryId ?? "")
                );
            });
            out.push({
                roomId: name,
                surgeries: list,
                date: roomDate,
            });
        }

        out.sort((a, b) => a.roomId.localeCompare(b.roomId, "he"));
        return out;
    }
      

    hasActionAfterWorkingStart(room: RoomData): boolean {
        if (!room?.surgeries?.length) return false;
        const ws = this.workingStart(room.date);
        return room.surgeries.some((s) => {
            if (!s?.timeEntrance) return false;
            const entrance = this.parseClockWithDate(s.timeEntrance, room.date);
            if (!entrance || entrance < ws) return false;
            return s.status === "InProgress" || s.status === "Completed";
        });
    }

    private isBeforeToday(dateLike?: string | Date): boolean {
        if (!dateLike) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const d = new Date(dateLike);
        d.setHours(0, 0, 0, 0);
        return d.getTime() < today.getTime();
    }

    shouldShowStartDiff(room: RoomData): boolean {
        const baseDate = room?.date ?? this.selectedDate;
        if (this.isBeforeToday(baseDate)) return true;
        return !this.hasActionAfterWorkingStart(room);
    }

    // private isInProgressStatus(raw: any): boolean {
    //     var s = (raw == null ? "" : String(raw)).toLowerCase().trim();
    //     return (
    //         s === "inprogress" || s === "in progress" || s.indexOf("בתהל") >= 0
    //     );
    // }

    private getSurgeryIdSafe(s: Surgery | Partial<Surgery>): string {
        if (s && s.surgeryId != null && s.surgeryId !== "")
            return String(s.surgeryId);
        var rawId = s ? (s as unknown as Record<string, unknown>).SurgeryID : null;
        return rawId != null && rawId !== "" ? String(rawId) : "—";
    }

    private entranceMillisForSortSafe(s: Surgery | Partial<Surgery>, roomDate: string | Date): number {
        var eClock = s
            ? s.timeEntrance != null
                ? s.timeEntrance
                : (s as unknown as Record<string, unknown>).TimeEntranceToTheOperatingRoom as string | null | undefined
            : null;
        var base = s
            ? s.surgeryDate != null
                ? s.surgeryDate
                : (s as unknown as Record<string, unknown>).SurgeryDate as string | null | undefined
            : null;
        var anchor = base || roomDate;
        var d = eClock ? this.parseClockWithDate(eClock, anchor) : null;
        return d ? d.getTime() : -Infinity;
    }

    getHeaderInProgressLabel(room: RoomData): string {
        if (!room || !room.surgeries || !room.surgeries.length) return "פנוי";

        var inProg: Surgery[] = [];
        for (var i = 0; i < room.surgeries.length; i++) {
            var s = room.surgeries[i];
            if (s && this.isInProgressStatus(s.status)) inProg.push(s);
        }
        if (!inProg.length) return "פנוי";

        var picked = inProg
            .slice()
            .sort(
                (a, b) =>
                    this.entranceMillisForSortSafe(
                        b,
                        room.date || this.selectedDate
                    ) -
                    this.entranceMillisForSortSafe(
                        a,
                        room.date || this.selectedDate
                    )
            )[0];

        return this.getSurgeryIdSafe(picked);
    }

    // פונקציות עזר מחוץ ללופ הראשי (או כמתודות פרטיות)
    private getUrgencyRank(s: Surgery | Partial<Surgery>): number {
        const u = String((s as Record<string, unknown>).Urgency ?? s.Urgency ?? s.urgency ?? "").trim();
        if (u.includes("דחוף")) return 0;
        if (u.includes("ססיה")) return 1;
        return 2;
    }

    getHeaderProgressText(room: RoomData, opts?: HeaderProgressOpts): string {
        if (!room?.surgeries?.length) return "0 מתוך 0";

        const baseDate = room.date || this.selectedDate;
        const shiftStart = this.workingStart(baseDate);
        const shiftEnd = this.workingEnd(baseDate);

        // הגדרות וערכי עזר
        const turnoverMin = Math.max(
            20,
            this.hmToMin(this.getTurnoverSummary(room)) ??
                opts?.defaultTurnoverMin ??
                20
        );
        const isProgress = (s: string) =>
            ["inprogress", "in progress", "in_progress"].includes(
                s.toLowerCase()
            );
        const isCompleted = (s: string) => s.toLowerCase() === "completed";

        // 1. נרמול וסינון נתונים במעבר אחד
        const list = room.surgeries
            .map((s) => {
                const entrance = this.parseClockWithDate(
                    s.timeEntrance ?? s.TimeEntranceToTheOperatingRoom,
                    baseDate
                );
                if (!entrance) return null;

                const xRaw = s.timeExit ?? s.TimeExitingTheOperatingRoom;
                let exit =
                    xRaw && xRaw !== "00:00"
                        ? this.parseClockWithDate(xRaw, baseDate)
                        : null;
                if (exit && exit < entrance)
                    exit = new Date(exit.getTime() + 86400000);

                const status = (
                    s.status ??
                    s.SurgeryStatus ??
                    ""
                ).toLowerCase();
                const expectedMin =
                    Number(s.TimeSurgeryToDo ?? s.TimeSurgeryToDo) ||
                    (exit
                        ? Math.round(
                              (exit.getTime() - entrance.getTime()) / 60000
                          )
                        : 60);

                return {
                    entrance,
                    exit,
                    status,
                    expectedMin,
                    raw: s,
                    sortKey:
                        entrance.getTime() -
                        (exit && exit.getDate() !== entrance.getDate()
                            ? 86400000
                            : 0),
                };
            })
            .filter(Boolean) as Array<Surgery & { entrance: Date; exit: Date; status: string; expectedMin: number; raw: Surgery; sortKey: number }>;

        // 2. מיון (לפי זמן, דחיפות וסטטוס)
        list.sort(
            (a, b) =>
                a.sortKey - b.sortKey ||
                this.getUrgencyRank(a.raw) - this.getUrgencyRank(b.raw)
        );

        // 3. חישוב מונים וסימולציית זמנים (Warn Late)
        let nInShift = 0,
            xInShift = 0,
            xOnDay = 0;
        let cursor = new Date(shiftStart);
        let warnLate = false;

        const dayStart = new Date(baseDate).setHours(0, 0, 0, 0);
        const dayEnd = new Date(baseDate).setHours(23, 59, 59, 999);

        list.forEach((s) => {
            const endForCount = s.exit ?? s.entrance;
            const overlapsDay = s.entrance && endForCount && s.entrance.getTime() < dayEnd && endForCount.getTime() > dayStart;
            const overlapsShift =
                s.entrance && endForCount && s.entrance.getTime() < shiftEnd.getTime() && endForCount.getTime() > shiftStart.getTime();

            if (overlapsDay) xOnDay++;
            if (overlapsShift) {
                xInShift++;
                if (isCompleted(s.status) || isProgress(s.status)) nInShift++;
            }

            // סימולציית "האם נצא מהמשמרת"
            const startPred = new Date(
                Math.max(s.entrance.getTime(), cursor.getTime())
            );
            const endPred = new Date(
                startPred.getTime() + s.expectedMin * 60000
            );
            cursor = new Date(endPred.getTime() + turnoverMin * 60000);

            if (
                s.status === "Planned" &&
                endPred > shiftEnd &&
                !this.isLateExemptByUrgency?.(s.raw)
            ) {
                warnLate = true;
            }
        });

        const outOfShift = Math.max(0, xOnDay - xInShift);
        return `${nInShift} מתוך ${xInShift}${
            outOfShift > 0 ? ` (+${outOfShift}*)` : ""
        }`;
    }

    private isSameLocalDay(a: Date, b: Date): boolean {
        return (
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate()
        );
    }

    isRoomToday(room: RoomData): boolean {
        const base =
            room && room.date
                ? new Date(room.date)
                : new Date(this.selectedDate);
        const now = new Date();
        return this.isSameLocalDay(base, now);
    }

    private urgencyIconRaw(u: string | null | undefined): string {
        var s = (u == null ? "" : String(u)).trim();
        if (!s) return "";
        var low = s.toLowerCase();

        if (s.indexOf("דחוף") >= 0 || low.indexOf("urgent") >= 0) return "🚑"; // or '⚠️'
        if (
            s.indexOf("ססיה") >= 0 ||
            s.indexOf("אשפוז") >= 0 ||
            low.indexOf("inpatient") >= 0
        )
            return "🏥";
        if (s.indexOf("אלקטיב") >= 0 || low.indexOf("elect") >= 0) return "📖";
        if (
            s.indexOf("ללא עדיפות") >= 0 ||
            low.indexOf("no priority") >= 0 ||
            low.indexOf("none") >= 0 ||
            low.indexOf("routine") >= 0
        )
            return "⬇️";
        if (
            s.indexOf("אמבולטורי") >= 0 ||
            low.indexOf("ambulatory") >= 0 ||
            low.indexOf("outpatient") >= 0
        )
            return "🚶";
        return "";
    }

    getUrgencyIconFromSurgery(s: Surgery | Partial<Surgery>): string {
        if (!s) return "";
        var u = s.urgency != null ? s.urgency : s.Urgency;
        return this.urgencyIconRaw(u);
    }

    getHeaderProgressIcon(room: RoomData): string {
        if (!room?.surgeries?.length) return "";

        const anchor = room.date || this.selectedDate;
        const dayStart = this.workingStart(anchor);
        const dayEnd = this.workingEnd(anchor);
        const DAY_MS = 24 * 60 * 60 * 1000;

        const parse = (clk?: string, base?: string | Date): Date | null =>
            clk ? this.parseClockWithDate(clk, base) : null;

        const overlaps = (e: Date, x: Date): boolean =>
            e < dayEnd && x > dayStart;

        const startTs = (s: Surgery | Partial<Surgery>): number => {
            const base = s.surgeryDate || anchor;
            let e = parse(s.timeEntrance, base);
            let x = parse(
                s.timeExit && s.timeExit !== "00:00:00"
                    ? s.timeExit
                    : s.timeEntrance,
                base
            );
            if (!e || !x) return Number.POSITIVE_INFINITY;
            if (x.getTime() < e.getTime()) x = new Date(x.getTime() + DAY_MS);
            return overlaps(e, x) ? e.getTime() : Number.POSITIVE_INFINITY;
        };

        let bestInProg: Surgery | null = null,
            bestTs = -Infinity;
        for (const s of room.surgeries) {
            if (!s || !this.isInProgressStatus(s.status)) continue;
            const ts = startTs(s);
            if (ts !== Number.POSITIVE_INFINITY && ts > bestTs) {
                bestInProg = s;
                bestTs = ts;
            }
        }
        if (bestInProg) return this.getUrgencyIconFromSurgery(bestInProg);

        let next: Surgery | null = null,
            nextTs = Number.POSITIVE_INFINITY;
        for (const t of room.surgeries) {
            if (t && !this.isCompletedStatus(t.status)) {
                const ts2 = startTs(t);
                if (ts2 < nextTs) {
                    next = t;
                    nextTs = ts2;
                }
            }
        }
        if (next) return this.getUrgencyIconFromSurgery(next);

        let last: Surgery | null = null,
            lastTs = -Infinity;
        for (const c of room.surgeries) {
            if (!c || !this.isCompletedStatus(c.status)) continue;
            const ts3 = startTs(c);
            if (ts3 !== Number.POSITIVE_INFINITY && ts3 > lastTs) {
                last = c;
                lastTs = ts3;
            }
        }
        if (last) return this.getUrgencyIconFromSurgery(last);

        return "";
    }

    hasInProgress(room: RoomData): boolean {
        if (!room?.surgeries?.length) return false;
        return room.surgeries.some(
            (s) =>
                s &&
                this.isInProgressStatus(s.status ?? s.SurgeryStatus) &&
                !this.isInProgressStaleByEstimatedEnd(s, room)
        );
    }

    /**
     * ניתוח בביצוע בחדר (כמו ב-activeSurgeries: לא אמבולטורי) — לשבב בכרטיס מכווץ.
     */
    getCurrentInRoomInProgressSurgery(room: RoomData): Surgery | null {
        if (!room?.surgeries?.length) return null;
        const base = room.date || this.selectedDate;
        const matches = room.surgeries.filter((s) => {
            if (!s || this.surgeryIsAmbulatoryForDisplay(s, room)) return false;
            if (!this.isInProgressStatus(s.status ?? s.SurgeryStatus)) {
                return false;
            }
            if (this.isInProgressStaleByEstimatedEnd(s, room)) {
                return false;
            }
            return true;
        });
        if (!matches.length) return null;
        return matches
            .slice()
            .sort(
                (a, b) =>
                    this.entranceMillisForSortSafe(b, base) -
                    this.entranceMillisForSortSafe(a, base)
            )[0];
    }

    getUrgencyTextFromSurgery(s: Surgery | Partial<Surgery>): string {
        if (!s) return "";
        var u = s.urgency != null ? s.urgency : s.Urgency;
        return u != null ? String(u) : "";
    }

    getHeaderProgressTitle(room: RoomData): string {
        if (!room || !room.surgeries || !room.surgeries.length) return "";

        var anchor = room.date || this.selectedDate;
        var dayStart = this.workingStart(anchor);
        var dayEnd = this.workingEnd(anchor);
        var DAY_MS = 24 * 60 * 60 * 1000;

        var chosen: Surgery | null = null;
        var chosenTs = -Infinity;

        function parse(self: RoomTimeRTmDashboardComponent, clk: string, base: string | Date): Date | null {
            return clk ? self.parseClockWithDate(clk, base) : null;
        }
        function overlaps(e: Date, x: Date): boolean {
            return e < dayEnd && x > dayStart;
        }
        function startTs(self: RoomTimeRTmDashboardComponent, s: Surgery | Partial<Surgery>): number {
            var base = s.surgeryDate || anchor;
            var e = parse(self, s.timeEntrance, base);
            var x = parse(
                self,
                s.timeExit && s.timeExit !== "00:00:00"
                    ? s.timeExit
                    : s.timeEntrance,
                base
            );
            if (!e || !x) return Number.POSITIVE_INFINITY;
            if (x.getTime() < e.getTime()) x = new Date(x.getTime() + DAY_MS);
            return overlaps(e, x) ? e.getTime() : Number.POSITIVE_INFINITY;
        }

        for (var i = 0; i < room.surgeries.length; i++) {
            var s1 = room.surgeries[i];
            if (s1.status !== "InProgress") continue;
            var ts1 = startTs(this, s1);
            if (ts1 !== Number.POSITIVE_INFINITY && ts1 > chosenTs) {
                chosen = s1;
                chosenTs = ts1;
            }
        }

        if (!chosen) {
            var next: Surgery | null = null,
                nextTs = Number.POSITIVE_INFINITY;
            for (var j = 0; j < room.surgeries.length; j++) {
                var s2 = room.surgeries[j];
                if (s2.status === "Completed") continue;
                var ts2 = startTs(this, s2);
                if (ts2 < nextTs) {
                    next = s2;
                    nextTs = ts2;
                }
            }
            chosen = next;
        }

        if (!chosen) {
            var last: Surgery | null = null,
                lastTs = -Infinity;
            for (var k = 0; k < room.surgeries.length; k++) {
                var s3 = room.surgeries[k];
                if (s3.status !== "Completed") continue;
                var ts3 = startTs(this, s3);
                if (ts3 !== Number.POSITIVE_INFINITY && ts3 > lastTs) {
                    last = s3;
                    lastTs = ts3;
                }
            }
            chosen = last;
        }

        return chosen ? this.getUrgencyTextFromSurgery(chosen) : "";
    }

    getRoomStatusClassWithSettings(room: RoomData): string {
        const base =
            this.getRoomStatusClass && room
                ? this.getRoomStatusClass(room) || ""
                : "";

        if (!this.settings) return base;

        if (this.settings.colorize === false) return "";

        if (this.settings.blinkOnUnacked === false) {
            return base
                .replace(/\bgreen-blink\b/g, "green")
                .replace(/\bblink\b/g, "");
        }

        return base;
    }

    private hmToMin(s?: string | null): number | null {
        if (!s || s === "") return null;
        var p = s.split(":");
        if (p.length < 2) return null;
        var hh = +p[0],
            mm = +p[1];
        if (isNaN(hh) || isNaN(mm)) return null;
        return hh * 60 + mm;
    }

    computeOverlapBacklog(
        room: RoomData,
        TURNOVER_MIN: number
    ): { hasOverlap: boolean; count: number; until: Date | null } {
        if (!room || !room.surgeries || !room.surgeries.length)
            return { hasOverlap: false, count: 0, until: null };
        if (this.isRoomPastDay(room))
            return { hasOverlap: false, count: 0, until: null };

        var baseDate = room.date || this.selectedDate;

        var active: { row: Surgery; _ent: Date } | null = null;
        for (var i = 0; i < room.surgeries.length; i++) {
            var r: Surgery = room.surgeries[i];
            var st = String(r.SurgeryStatus || r.status || "").toLowerCase();
            if (
                st.indexOf("inprogress") === -1 &&
                st !== "in progress" &&
                st !== "in_progress"
            )
                continue;
            var entClock =
                r.TimeEntranceToTheOperatingRoom != null
                    ? r.TimeEntranceToTheOperatingRoom
                    : r.timeEntrance;
            if (!entClock) continue;
            var ent = new Date(
                String(r.SurgeryDate || baseDate).slice(0, 10) +
                    "T" +
                    String(entClock).slice(0, 5) +
                    ":00"
            );
            if (!active || ent.getTime() >= active._ent.getTime()) {
                active = { row: r, _ent: ent };
            }
        }

        if (!active) return { hasOverlap: false, count: 0, until: null };

        var ttd: string | number | null | undefined =
            active.row.TimeSurgeryToDo != null
                ? active.row.TimeSurgeryToDo
                : active.row.timeSurgeryToDo;
        var dur =
            ttd != null && !isNaN(+ttd) ? Math.max(0, Math.round(+ttd)) : 60;
        var activeEnd = new Date(active._ent.getTime() + dur * 60000);
        var overlapUntil = new Date(activeEnd.getTime() + TURNOVER_MIN * 60000);

        var count = 0;
        for (var j = 0; j < room.surgeries.length; j++) {
            var s: Surgery = room.surgeries[j];
            if (s === active.row) continue;
            var st2 = String(s.SurgeryStatus || s.status || "").toLowerCase();
            if (st2 === "completed") continue;

            var ec =
                s.TimeEntranceToTheOperatingRoom != null
                    ? s.TimeEntranceToTheOperatingRoom
                    : s.timeEntrance;
            if (!ec) continue;
            var ent2 = new Date(
                String(s.SurgeryDate || baseDate).slice(0, 10) +
                    "T" +
                    String(ec).slice(0, 5) +
                    ":00"
            );
            if (ent2.getTime() < overlapUntil.getTime()) count++;
        }

        return { hasOverlap: count > 0, count: count, until: overlapUntil };
    }

    private predictFirstLatePlanned(
        room: RoomData,
        TURNOVER_MIN: number
    ): { predictedEnd: Date } | null {
        if (!room || !room.surgeries || !room.surgeries.length) return null;

        if (this.isRoomPastDay(room)) return null;
        const baseDate = room.date || this.selectedDate;
        const shiftStart = this.workingStart(baseDate);
        const shiftEnd = this.workingEnd(baseDate);
        const DAY_MS = 24 * 60 * 60 * 1000;

        function statusOf(row: Surgery | Partial<Surgery>): string {
            const raw =
                row && (row.status != null ? row.status : row.SurgeryStatus);
            return String(raw == null ? "" : raw).toLowerCase();
        }
        function getEClock(row: Surgery | Partial<Surgery>): string | null {
            return row
                ? row.timeEntrance != null
                    ? row.timeEntrance
                    : row.TimeEntranceToTheOperatingRoom
                : null;
        }
        function getXClock(row: Surgery | Partial<Surgery>): string | null {
            return row
                ? row.timeExit != null
                    ? row.timeExit
                    : row.TimeExitingTheOperatingRoom
                : null;
        }
        function getBase(row: Surgery | Partial<Surgery>): string | Date {
            return (
                (row &&
                    (row.surgeryDate != null
                        ? row.surgeryDate
                        : row.SurgeryDate)) ||
                baseDate
            );
        }
        function isZeroClock(v?: string | null): boolean {
            return v === "00:00" || v === "00:00:00";
        }
        function normalizeUrgencyVal(u: string | number | null | undefined): string {
            var s = (u == null ? "" : String(u)).trim();
            s = s.replace(/\s*-\s*/g, "-").replace(/\s+/g, " ");
            return s;
        }
        function urgencyRankOf(row: Surgery | Partial<Surgery>): number {
            var raw = row && ((row as Record<string, unknown>).Urgency != null ? (row as Record<string, unknown>).Urgency : row.Urgency ?? row.urgency);
            var n = normalizeUrgencyVal(raw as string | number | null | undefined);
            if (n === "דחוף") return 0;
            if (n === "ססיה-אשפוז") return 1;
            return 2;
        }
        function statusRankOf(st: string): number {
            if (st === "completed") return 0;
            if (
                st === "inprogress" ||
                st === "in progress" ||
                st === "in_progress"
            )
                return 1;
            if (st === "planned") return 2;
            return 3;
        }

        const list: {
            entrance: Date | null;
            exit: Date | null;
            expectedMin: number | null;
            status: string;
            exemptLate: boolean;

            sortStartMs: number;
            urgencyRank: number;
            statusRank: number;
            idKey: string;
        }[] = [];

        for (let i = 0; i < room.surgeries.length; i++) {
            const row: Surgery = room.surgeries[i];

            const eClock = getEClock(row);
            if (!eClock) continue;

            const base = getBase(row);
            const xRaw = getXClock(row);

            let entrance = this.parseClockWithDate(eClock, base);
            let exit =
                xRaw && !isZeroClock(xRaw)
                    ? this.parseClockWithDate(xRaw, base)
                    : null;
            if (!entrance) continue;
            if (exit && exit.getTime() < entrance.getTime())
                exit = new Date(exit.getTime() + DAY_MS);

            let expectedMin: number | null = null;
            const ttd =
                row &&
                (row.TimeSurgeryToDo != null
                    ? row.TimeSurgeryToDo
                    : row.timeSurgeryToDo);
            if (ttd != null && !isNaN(+ttd))
                expectedMin = Math.max(0, Math.round(+ttd));
            if (expectedMin == null && exit)
                expectedMin = Math.max(
                    0,
                    Math.round((exit.getTime() - entrance.getTime()) / 60000)
                );

            const status = statusOf(row);
            const exemptLate = this.isLateExemptByUrgency
                ? this.isLateExemptByUrgency(row)
                : false;

            let sortStartMs = entrance.getTime();
            if (exit && entrance && exit.getDate() !== entrance.getDate()) {
                sortStartMs = sortStartMs - DAY_MS;
            }
            const urgRank = urgencyRankOf(row);
            const statRank = statusRankOf(status);
            const idKey =
                row.SurgeryID != null
                    ? String(row.SurgeryID)
                    : (row as unknown as Record<string, unknown>).CaseNumber != null
                    ? String((row as unknown as Record<string, unknown>).CaseNumber)
                    : "";

            list.push({
                entrance,
                exit,
                expectedMin,
                status,
                exemptLate,
                sortStartMs,
                urgencyRank: urgRank,
                statusRank: statRank,
                idKey,
            });
        }

        list.sort(function (a, b) {
            if (a.sortStartMs !== b.sortStartMs)
                return a.sortStartMs - b.sortStartMs;
            if (a.urgencyRank !== b.urgencyRank)
                return a.urgencyRank - b.urgencyRank;
            if (a.statusRank !== b.statusRank)
                return a.statusRank - b.statusRank;
            if (a.idKey !== b.idKey) return a.idKey < b.idKey ? -1 : 1;
            return 0;
        });

        const now = new Date();
        let cursor: Date | null = null; // room-free time including turnover
        let activeIdx = -1;

        for (let i = 0; i < list.length; i++) {
            const it = list[i];
            if (
                (it.status === "inprogress" ||
                    it.status === "in progress" ||
                    it.status === "in_progress") &&
                it.entrance &&
                it.entrance <= now
            ) {
                if (
                    activeIdx === -1 ||
                    list[activeIdx].entrance!.getTime() < it.entrance.getTime()
                ) {
                    activeIdx = i;
                }
            }
        }

        if (activeIdx >= 0) {
            const cur = list[activeIdx];
            const expMinForCur =
                cur.expectedMin != null
                    ? cur.expectedMin
                    : cur.exit && cur.entrance
                    ? Math.max(
                          0,
                          Math.round(
                              (cur.exit.getTime() - cur.entrance.getTime()) /
                                  60000
                          )
                      )
                    : 60;

            const elapsedMin = Math.max(
                0,
                Math.round((now.getTime() - cur.entrance!.getTime()) / 60000)
            );
            const remainingMin = Math.max(0, expMinForCur - elapsedMin);
            const endOfCur =
                remainingMin > 0
                    ? new Date(now.getTime() + remainingMin * 60000)
                    : now;

            cursor = new Date(endOfCur.getTime() + TURNOVER_MIN * 60000);
        }

        for (let j = 0; j < list.length; j++) {
            if (j === activeIdx) continue;
            const item = list[j];

            if (!cursor)
                cursor = item.entrance
                    ? new Date(item.entrance)
                    : new Date(shiftStart);

            const startPred = item.entrance
                ? new Date(Math.max(item.entrance.getTime(), cursor.getTime()))
                : new Date(cursor);

            let durMin: number;
            if (item.exit && item.entrance && item.status === "completed") {
                durMin = Math.max(
                    0,
                    Math.round(
                        (item.exit.getTime() - item.entrance.getTime()) / 60000
                    )
                );
            } else {
                durMin =
                    item.expectedMin != null
                        ? item.expectedMin
                        : item.exit && item.entrance
                        ? Math.max(
                              0,
                              Math.round(
                                  (item.exit.getTime() -
                                      item.entrance.getTime()) /
                                      60000
                              )
                          )
                        : 60;
            }

            const endSurgeryPred = new Date(
                startPred.getTime() + durMin * 60000
            );
            cursor = new Date(endSurgeryPred.getTime() + TURNOVER_MIN * 60000);
            if (
                item.status === "planned" &&
                endSurgeryPred > shiftEnd &&
                !item.exemptLate
            ) {
                return { predictedEnd: endSurgeryPred };
            }
        }

        return null;
    }

    private toHHmm(dt: Date): string {
        const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
        return pad(dt.getHours()) + ":" + pad(dt.getMinutes());
    }

    private predictedLateEndHHmm(room: RoomData): string | null {
        const meta = this.getRoomLateMeta(room);
        return meta && meta.isLate && meta.predictedEnd
            ? this.toHHmm(meta.predictedEnd)
            : null;
    }

    private currentAckKeyForRoom(room: RoomData): string {
        const base = this.lastEventKeyForRoom(room.roomId);
        const late = this.predictedLateEndHHmm(room) || "OK";
        return base + "|" + late;
    }

    private normalizeUrgency(u: string | number | null | undefined): string {
        var s = (u == null ? "" : String(u)).trim();
        s = s.replace(/\s*-\s*/g, "-");
        s = s.replace(/\s+/g, " ");
        s = s.replace(/[.!?，,؛;]+/g, "");
        return s;
    }

    private isLateExemptByUrgency(row: Surgery | Partial<Surgery>): boolean {
        if (!row) return false;
        var raw = (row as Record<string, unknown>).Urgency != null ? (row as Record<string, unknown>).Urgency : row.Urgency ?? row.urgency;
        var n = this.normalizeUrgency(raw as string | number | null | undefined);
        var nNoSpaces = n.replace(/\s+/g, "");
        if (nNoSpaces === "ססיה-אשפוז") return true;
        if (n === "דחוף") return true;
        return false;
    }

    public isRoomPastDay(room: RoomData): boolean {
        if (!room || !room.date) return false;
        var d = new Date(room.date);
        var end = new Date(d);
        end.setHours(23, 59, 59, 999);
        var today = new Date();
        var startToday = new Date(today);
        startToday.setHours(0, 0, 0, 0);
        return end.getTime() < startToday.getTime();
    }

    private isSameDay(a: Date, b: Date): boolean {
        return (
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate()
        );
    }

    public isRoomClosedForColoring(room: RoomData): boolean {
        if (!room || !room.date) return false;
        if (this.isRoomPastDay(room)) return true;
        var d = new Date(room.date);
        var now = new Date();
        if (!this.isSameDay(d, now)) return false;
        var shiftEnd = this.workingEnd(d);
        return now.getTime() >= shiftEnd.getTime();
    }

    onMatDateChange(d: Date | null) {
        if (!d || isNaN(d.getTime())) {
            this.selectedDate = null;
            return;
        }
        const yyyy = d.getFullYear();
        const mm = ("0" + (d.getMonth() + 1)).slice(-2);
        const dd = ("0" + d.getDate()).slice(-2);
        this.selectedDate = `${yyyy}-${mm}-${dd}`;
        this.onDateChange();
    }

    ticker$ = interval(1000).pipe(startWith(0), shareReplay(1));

    getRoomIdleCounter(
        room: RoomData,
        showSeconds = false
    ): { display: string; title: string } | null {
        try {
            if (!this.isRoomToday(room)) return null;
            if (this.hasInProgress(room)) return null;

            const plannedLeft =
                (this.plannedSurgeries && this.plannedSurgeries(room))?.length >
                0;
            if (this.settings?.hideIdleWhenNoPlanned && !plannedLeft)
                return null;
            const nowRaw = this._nowInSelectedDay();
            const now =
                this.settings?.continueIdleAfter1500WhenPlanned && plannedLeft
                    ? nowRaw
                    : this._clampTo1500(nowRaw);
            const dayStart = this._parseOnSelectedDay("07:30");
            const active =
                (this.activeSurgeries && this.activeSurgeries(room)) || [];
            let lastExit: Date | null = null;
            for (const s of active) {
                const status = (s?.status ?? s?.SurgeryStatus) as string;
                const exitStr =
                    s?.timeExit ??
                    s?.TimeExitingTheOperatingRoom ??
                    s?.timeEntrance ??
                    null;
                if (!exitStr) continue;
                const exitAt = this._parseOnSelectedDay(exitStr);
                if (!exitAt || exitAt > now) continue;
                if (status === "Completed") {
                    if (!lastExit || exitAt > lastExit) lastExit = exitAt;
                }
            }

            const gapStart = lastExit
                ? new Date(lastExit.getTime() + 20 * 60 * 1000)
                : dayStart;
            if (now <= gapStart) return null;

            const diffMs = now.getTime() - gapStart.getTime();
            if (diffMs <= 0) return null;

            const display = showSeconds
                ? this._formatHMMSS(diffMs)
                : this._formatHMM(diffMs);
            const title = `זמן פנוי מאז ${this._formatClock(
                gapStart
            )} (כולל 20׳ הכנה)`;
            return { display, title };
        } catch {
            return null;
        }
    }

    private _nowInSelectedDay(): Date {
        const base = this.selectedDateObj
            ? new Date(this.selectedDateObj)
            : new Date();
        const now = new Date();
        base.setHours(
            now.getHours(),
            now.getMinutes(),
            now.getSeconds(),
            now.getMilliseconds()
        );
        return base;
    }
    private _clampTo1500(d: Date): Date {
        const cap = new Date(d);
        cap.setHours(15, 0, 0, 0);
        return d > cap ? cap : d;
    }
    private _parseOnSelectedDay(hhmm?: string | null): Date | null {
        if (!hhmm) return null;
        const [hh, mm] = hhmm.split(":").map((x) => +x);
        if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
        const d = this.selectedDateObj
            ? new Date(this.selectedDateObj)
            : new Date();
        d.setHours(hh, mm, 0, 0);
        return d;
    }
    private _formatHMM(ms: number): string {
        const totalMin = Math.max(0, Math.floor(ms / 60000));
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        return `${h}:${m.toString().padStart(2, "0")}`;
    }
    private _formatHMMSS(ms: number): string {
        const total = Math.max(0, Math.floor(ms / 1000));
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;
        return `${h}:${m.toString().padStart(2, "0")}:${s
            .toString()
            .padStart(2, "0")}`;
    }
    private _formatClock(d: Date): string {
        return `${d.getHours().toString().padStart(2, "0")}:${d
            .getMinutes()
            .toString()
            .padStart(2, "0")}`;
    }

    showSummaryCardDefault = true;
    getSummaryForToday(): Record<string, unknown> | null {
        const surgeries = this._getSurgeriesArray();
        if (!surgeries?.length) return null;

        const selectedDateISO = this.selectedDateObj
            ? this._toISODate(this.selectedDateObj)
            : surgeries[0]?.SurgeryDate ?? this._toISODate(new Date());

        let todays = surgeries.filter(
            (s) => s?.SurgeryDate === selectedDateISO
        );

        // כוללים בסיכום היומי גם ניתוחים רגילים וגם אמבולטוריים
        // (לא מסננים אמבולטוריים - הם חלק מהסיכום הכללי)

        // מסננים ניתוחים מבוטלים – לא נספר אותם בסיכום היומי
        todays = todays.filter((s) => {
            const status = String(
                (s as any).status ?? (s as any).SurgeryStatus ?? ""
            ).toLowerCase();
            return status !== "canceled" && status !== "cancelled";
        });

        // דדופליקציה לפי מזהה ניתוח – רק כשיש מזהה; ניתוחים בלי מזהה נשארים (לא נסננים)
        const seenIds = new Set<string>();
        todays = todays.filter((s) => {
            const id = (
                s?.SurgeryID ??
                s?.surgeryId ??
                (s as unknown as Record<string, unknown>)?.CaseNumber ??
                ""
            )
                .toString()
                .trim();
            if (!id) return true;
            if (seenIds.has(id)) return false;
            seenIds.add(id);
            return true;
        });
        if (!todays.length) return null;

        const completed = todays.filter(
            (s) => (s.SurgeryStatus ?? s.status) === "Completed"
        );
        const inProg = todays.filter(
            (s) => (s.SurgeryStatus ?? s.status) === "InProgress"
        );
        const planned = todays.filter(
            (s) => (s.SurgeryStatus ?? s.status) === "Planned"
        );

        const rooms = Array.from(
            new Set(todays.map((s) => s.SurgeryRoom))
        ).sort();
        const inProgRooms = new Set(inProg.map((s) => s.SurgeryRoom));
        const activeRooms = inProgRooms.size;
        const freeRooms = rooms.length - activeRooms;

        // סכום דקות ניתוחים שבוצעו – אותו לוגיקה כמו _completedMinutes (משך בפועל או TimeSurgeryToDo)
        const sumCompletedMinutes = completed.reduce((acc, s) => {
            return acc + this._completedMinutes(s, selectedDateISO);
        }, 0);

        const avgCaseMinutes = completed.length
            ? Math.round(sumCompletedMinutes / completed.length)
            : 0;

        const byRoom = rooms.map((room) => {
            const rCases = todays.filter((s) => s.SurgeryRoom === room);
            const rCompleted = rCases.filter(
                (s) => (s.SurgeryStatus ?? s.status) === "Completed"
            );
            const rInProg = rCases.filter(
                (s) => (s.SurgeryStatus ?? s.status) === "InProgress"
            );
            const rPlanned = rCases.filter(
                (s) => (s.SurgeryStatus ?? s.status) === "Planned"
            );

            const rMinutes = rCompleted.reduce(
                (acc, s) => acc + this._completedMinutes(s, selectedDateISO),
                0
            );

            const latestExit =
                rCompleted
                    .map((s) => s.TimeExitingTheOperatingRoom ?? s.timeExit)
                    .filter(Boolean)
                    .sort()
                    .slice(-1)[0] || null;

            return {
                room,
                completed: rCompleted.length,
                inProgress: rInProg.length,
                planned: rPlanned.length,
                totalMinutes: rMinutes,
                latestExit,
                cases: rCases.length,
                hasInProgress: rInProg.length > 0,
                roomData: {
                    roomId: room,
                    date: selectedDateISO,
                    surgeries: rCases,
                } as RoomData,
            };
        });

        function formatMinutesToHMM(totalMinutes: number): string {
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return `${hours}:${minutes.toString().padStart(2, "0")}`;
        }

        const busiest =
            byRoom.reduce((best, r) => {
                if (!best) return r;
                if (r.totalMinutes > best.totalMinutes) return r;
                if (r.totalMinutes === best.totalMinutes) {
                    if (r.completed > best.completed) return r;
                    if (
                        r.completed === best.completed &&
                        r.room.localeCompare(best.room) < 0
                    )
                        return r;
                }
                return best;
            }, null as (typeof byRoom[0] | null)) || null;

        if (busiest) {
            (busiest as { totalHMM?: string }).totalHMM = formatMinutesToHMM(busiest.totalMinutes);
        }

        const maxMinutes = byRoom.length
            ? Math.max(...byRoom.map((r) => r.totalMinutes))
            : 0;

        this.busiestRooms = byRoom
            .filter((r) => r.totalMinutes === maxMinutes)
            .map((r) => ({
                ...r,
                totalHMM: formatMinutesToHMM(r.totalMinutes),
            }));

        const inProgressList = inProg
            .slice()
            .sort((a, b) =>
                (
                    a.TimeEntranceToTheOperatingRoom ??
                    a.timeEntrance ??
                    ""
                ).localeCompare(
                    b.TimeEntranceToTheOperatingRoom ?? b.timeEntrance ?? ""
                )
            )

            .map((s) => ({
                room: s.SurgeryRoom ?? s.roomId ?? s.surgeryRoom ?? s.room,
                title: this._pickTitleCompat(s),
                depart: (s.DepartName ?? s.department ?? "").toString().trim(),
                start: s.TimeEntranceToTheOperatingRoom ?? s.timeEntrance ?? "",
                end: s.TimeExitingTheOperatingRoom ?? s.timeExit ?? "",
                plannedMinutes: this._num(
                    s.TimeSurgeryToDo ?? s.timeToDo ?? s.duration
                ),
            }));

        const urgencyLabels = {
            urgent: "דחוף",
            sessionInpatient: "ססיה - אשפוז",
            elective: "אלקטיב",
            ambulatory: "אמבולטורי",
            oralMaxillofacial: "פה ולסת",
            noPriority: "ללא עדיפות",
            unknown: "דחיפות לא מוגדרת",
        };
        const urgencyIcons = {
            urgent: "🚑",
            sessionInpatient: "🏥",
            elective: "📖",
            ambulatory: "🚶",
            oralMaxillofacial: "🦷",
            noPriority: "⬇️",
            unknown: "❔",
        };

        const counts = {
            urgent: 0,
            sessionInpatient: 0,
            elective: 0,
            ambulatory: 0,
            oralMaxillofacial: 0,
            noPriority: 0,
            unknown: 0,
        };
        const lists = {
            urgent: [] as Surgery[],
            sessionInpatient: [] as Surgery[],
            elective: [] as Surgery[],
            ambulatory: [] as Surgery[],
            oralMaxillofacial: [] as Surgery[],
            noPriority: [] as Surgery[],
            unknown: [] as Surgery[],
        };

        for (const s of todays) {
            const key = this._readUrgencyKey(s);
            counts[key] = (counts[key] ?? 0) + 1;
            // יצירת אובייקט מעובד עם השדות הנכונים לפופאפ
            const sRecord = s as unknown as Record<string, unknown>;
            lists[key].push({
                room: s.SurgeryRoom ?? sRecord.roomId ?? sRecord.surgeryRoom ?? sRecord.room ?? '',
                surgeryName: this._pickTitleCompat(s),
                timeEntrance: s.TimeEntranceToTheOperatingRoom ?? s.timeEntrance ?? '',
                department: sRecord.DepartName ?? s.department ?? '',
                urgency: key,
                original: s // שמירת האובייקט המקורי למקרה שצריך
            } as unknown as Surgery);
        }

        return {
            dateISO: selectedDateISO,
            totals: {
                surgeries: todays.length,
                completed: completed.length,
                inProgress: inProg.length,
                planned: planned.length,
            },
            urgency: {
                labels: urgencyLabels,
                icons: urgencyIcons,
                counts,
                lists,
            },
            rooms: {
                total: rooms.length,
                active: activeRooms,
                free: freeRooms,
            },
            time: {
                totalMinutes: sumCompletedMinutes,
                avgMinutes: avgCaseMinutes,
                totalHMM: this._formatHMM_fromMinutes(sumCompletedMinutes),
                avgHMM: this._formatHMM_fromMinutes(avgCaseMinutes),
            },
            busiest: busiest
                ? {
                      room: busiest.room,
                      totalHMM: this._formatHMM_fromMinutes(busiest.totalMinutes),
                      cases: busiest.cases,
                      hasInProgress:
                          byRoom.find((r) => r.room === busiest.room)
                              ?.inProgress > 0,
                  }
                : null,
            byRoom,
            inProgressList,
        };
    }

    getUrgencyKeys(urgency: Record<string, unknown>): string[] {
        return [
            "urgent",
            "sessionInpatient",
            "elective",
            "ambulatory",
            "oralMaxillofacial",
            "noPriority",
            "unknown",
        ];
    }

    private _getSurgeriesArray(): Surgery[] {
        const data = (this as Record<string, unknown>).data as Record<string, unknown> | undefined;
        const top = (this as Record<string, unknown>).surgeries || (data && typeof data === 'object' && 'surgeries' in data ? (data as Record<string, unknown>).surgeries : undefined);
        if (Array.isArray(top) && top.length) return top as Surgery[];
        if (Array.isArray(this.roomsData) && this.roomsData.length) {
            const out: Surgery[] = [];
            for (const r of this.roomsData) {
                if (!r?.surgeries) continue;
                for (const s of r.surgeries) {
                    out.push({
                        ...s,
                        SurgeryRoom: s.SurgeryRoom ?? r.roomId,
                        SurgeryDate:
                            s.SurgeryDate ??
                            s.surgeryDate ??
                            r.date ??
                            this.selectedDate,
                        TimeEntranceToTheOperatingRoom:
                            s.TimeEntranceToTheOperatingRoom ??
                            s.timeEntrance ??
                            null,
                        TimeExitingTheOperatingRoom:
                            s.TimeExitingTheOperatingRoom ?? s.timeExit ?? null,
                        SurgeryStatus: s.SurgeryStatus ?? s.status ?? "",
                    });
                }
            }
            return out;
        }
        return [];
    }

    private _num(v: string | number | null | undefined): number {
        const n = parseInt(String(v ?? ''), 10);
        return Number.isFinite(n) ? n : NaN;
    }
    private _toISODate(d: Date): string {
        const y = d.getFullYear();
        const m = (d.getMonth() + 1).toString().padStart(2, "0");
        const day = d.getDate().toString().padStart(2, "0");
        return `${y}-${m}-${day}`;
    }

    private _timeToDate(dateISO: string, hhmm?: string | null): Date | null {
        if (!hhmm) return null;
        const [h, m] = hhmm.split(":").map((x) => +x);
        if (Number.isNaN(h) || Number.isNaN(m)) return null;
        const d = new Date(dateISO + "T00:00:00");
        d.setHours(h, m, 0, 0);
        return d;
    }
    private _diffMinutesSafe(
        dateISO: string,
        start?: string | null,
        end?: string | null
    ): number | null {
        const s = this._timeToDate(dateISO, start);
        const e = this._timeToDate(dateISO, end);
        if (!s || !e) return null;
        return Math.max(0, Math.round((e.getTime() - s.getTime()) / 60000));
    }

    private _pickTitleCompat(s: Surgery | Partial<Surgery>): string {
        const name = ((s as Record<string, unknown>).SurgeryName ?? s.SurgeryName ?? s.surgeryName ?? "").toString().trim();
        const code = ((s as Record<string, unknown>).SurgeryCode ?? s.SurgeryCode ?? s.surgeryCode ?? "").toString().trim();
        if (name && code) return `${name} (${code})`;
        if (name) return name;
        if (code) return code;
        return "—";
    }

    private _formatHMM_fromMinutes(
        totalMinutes: number | string | null | undefined
    ): string {
        const tNum = this._toNumber(totalMinutes, 0);
        const t = Math.max(0, Math.round(tNum));
        const h = Math.floor(t / 60);
        const m = t % 60;
        return `${h}:${m.toString().padStart(2, "0")}`;
    }

    private _completedMinutes(s: Surgery | Partial<Surgery>, dateISO: string): number {
        const start = this._get<string>(
            s as Record<string, unknown>,
            "TimeEntranceToTheOperatingRoom",
            "timeEntrance"
        );
        const end = this._get<string>(
            s as Record<string, unknown>,
            "TimeExitingTheOperatingRoom",
            "timeExit"
        );

        const diff = this._diffMinutesSafe(dateISO, start, end);
        if (diff != null && Number.isFinite(diff)) {
            return diff >= 0 ? diff : diff + 24 * 60;
        }

        const declared = this._toNumber(
            this._get(s as Record<string, unknown>, "TimeSurgeryToDo", "timeToDo", "duration"),
            NaN
        );
        return Number.isFinite(declared) ? declared : 0;
    }

    private _get<T = unknown>(obj: Record<string, unknown>, ...keys: string[]): T | null {
        for (const k of keys) {
            const v = obj?.[k];
            if (v !== undefined && v !== null && v !== "") return v as T;
        }
        return null;
    }

    private _toNumber(v: string | number | null | undefined, fallback = 0): number {
        if (typeof v === "number") return v;
        if (typeof v === "string") {
            const n = Number(v.trim());
            return Number.isFinite(n) ? n : fallback;
        }
        return fallback;
    }

    summaryDrilldownUrgency:
        | "urgent"
        | "sessionInpatient"
        | "elective"
        | "ambulatory"
        | "oralMaxillofacial"
        | "noPriority"
        | "unknown"
        | null = null;

    private _readUrgencyKey(
        s: Surgery | Partial<Surgery>
    ):
        | "urgent"
        | "sessionInpatient"
        | "elective"
        | "ambulatory"
        | "oralMaxillofacial"
        | "noPriority"
        | "unknown" {
        /** סיכום יומי: דחיפות לפי SurgeryRoomName — אמבולטורי / פה ולסת, ואז שדות Urgency */
        if (this.isAmbulatoryBySurgeryRoomName(s.SurgeryRoomName)) {
            return "ambulatory";
        }
        if (this.isOralMaxillofacialBySurgeryRoomName(s.SurgeryRoomName)) {
            return "oralMaxillofacial";
        }

        // ניתוחים בחדר כללי – מסווגים לפי Urgency/SurgeryType. "אמבולטורי" בחדר כללי נספר כאלקטיב (לא כאמבולטורי)
        const rawUrgency = (s as Record<string, unknown>).Urgency ?? s?.Urgency ?? s?.urgency ?? (s as Record<string, unknown>).Priority ?? s?.Priority ?? s?.priority ?? (s as Record<string, unknown>).Triage ?? s?.Triage ?? s?.triage ?? "";
        const rawType = (s as Record<string, unknown>).SurgeryType ?? s?.SurgeryType ?? "";
        const normUrgency = this._normalizeUrgency((rawUrgency ?? "").toString().trim());
        const normType = this._normalizeUrgency((rawType ?? "").toString().trim());
        if (normUrgency === "ambulatory" || normType === "ambulatory") return "elective";
        if (normUrgency !== "unknown") return normUrgency;
        if (normType !== "unknown") return normType;

        return "unknown";
    }

    private _normalizeUrgency(
        u: string | number | null | undefined
    ):
        | "urgent"
        | "sessionInpatient"
        | "elective"
        | "ambulatory"
        | "oralMaxillofacial"
        | "noPriority"
        | "unknown" {
        const s = (u ?? "").toString().trim().toLowerCase();
        if (!s) return "unknown";

        if (s.includes("דחוף")) return "urgent";
        if (s.includes("ססיה")) return "sessionInpatient";
        if (s.includes("אלקט")) return "elective";
        if (s.includes("אמבול")) return "ambulatory";
        if (s.includes("ללא עדיפ")) return "noPriority";

        if (s.includes("emerg")) return "urgent";
        if (s.includes("session") || s.includes("inpatient"))
            return "sessionInpatient";
        if (s.includes("elective")) return "elective";
        if (s.includes("ambul")) return "ambulatory";
        if (
            s.includes("no prior") ||
            s.includes("no-prior") ||
            s.includes("no priority")
        )
            return "noPriority";

        return "unknown";
    }
    getRoomShortStatus(room: RoomData): "פנוי" | "בניתוח" {
        return !this.hasInProgress(room) ? "פנוי" : "בניתוח";
    }
    // הוסף לתוך RoomTimeRTmDashboardComponent

    getRoomDepartment(room: RoomData): string | null {
        if (!room?.surgeries?.length) return null;

        // קח את המחלקה מהניתוח הראשון הפעיל
        const activeSurgeries = this.activeSurgeries(room);
        if (activeSurgeries.length > 0) {
            const dept =
                activeSurgeries[0].department || activeSurgeries[0].department;
            return dept?.trim() || null;
        }

        // אם אין פעילים, קח מהראשון שכל זה
        const firstSurgery = room.surgeries[0];
        const dept = firstSurgery?.department || firstSurgery?.department;
        return dept?.trim() || null;
    }

    /**
     * סטטוס החדר: ניתוח פעיל / הסתיים / פנוי
     */
    getRoomStatusInfo(room: RoomData): {
        label: string;
        cssClass: string;
    } | null {
        if (!room?.surgeries?.length) {
            return {
                label: "פנוי",
                cssClass: "status-free",
            };
        }

        if (this.isAllSurgeriesCompleted(room)) {
            return {
                label: "תמו הניתוחים להיום",
                cssClass: "status-all-done",
            };
        }

        // בדוק אם יש ניתוח פעיל
        if (this.hasInProgress(room)) {
            return {
                label: "✅ ניתוח פעיל",
                cssClass: "status-completed",
            };
        }

        // בדוק אם יש ניתוח שהסתיים זה עתה
        const lastCompleted = [...room.surgeries]
            .reverse()
            .find((s) => s.status === "Completed");

        if (lastCompleted) {
            return {
                label: "🔴 ניתוח הסתיים",
                cssClass: "status-active",
            };
        }

        return {
            label: "📋 מתוכנן",
            cssClass: "status-planned",
        };
    }
    getRoomProgressInfo(room: RoomData): {
        completed: number;
        total: number;
        label: string;
    } | null {
        if (!room?.surgeries?.length) {
            return null;
        }

        // כאן אנחנו רוצים: "כמה ניתוחים הסתיימו מתוך כמה ניתוחים היום בחדר",
        // לפי לוח הניתוחים – כלומר כולל מתוכננים / בביצוע / הושלמו, אבל בלי מבוטלים.
        const relevant = room.surgeries.filter((s) => {
            const status = String(
                s.status ?? s.SurgeryStatus ?? ""
            ).toLowerCase();
            if (status === "canceled" || status === "cancelled") return false;
            if (this.isCompletedWithExitBeforeShiftStart(s, room)) return false;
            return true;
        });

        if (!relevant.length) {
            return null;
        }

        // ניתוחים שנספרים כ"בוצעו" – גם Completed וגם InProgress
        const completed = relevant.filter((s) => {
            const status = String(
                s.status ?? s.SurgeryStatus ?? ""
            ).toLowerCase();
            return status === "completed" ||
                status === "inprogress" ||
                status === "in progress";
        }).length;

        const total = relevant.length;

        return {
            completed,
            total,
            label: completed === total ? "הושלמו הכל" : "בוצעו",
        };
    }

    private buildTimeline(room: RoomData): { start: Date; end: Date }[] {
        const baseDate = room.date || this.selectedDate;

        return (room.surgeries || [])
            .map((s) => {
                const entStr = this.getEntranceTime(s);
                const exitStr = this.getExitTime(s);

                let start: Date | null = null;
                let end: Date | null = null;

                if (entStr && !this.isZeroTime(entStr)) {
                    start = this.parseClockWithDate(entStr, baseDate);
                }

                if (exitStr && !this.isZeroTime(exitStr)) {
                    end = this.parseClockWithDate(exitStr, baseDate);
                }

                if (start && end && end.getTime() < start.getTime()) {
                    end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
                }

                if (start && !end) {
                    const dur = this.getExpectedDuration(s);
                    if (dur > 0) {
                        end = new Date(start.getTime() + dur * 60000);
                    }
                }

                return start && end ? { start, end } : null;
            })
            .filter((x): x is { start: Date; end: Date } => x !== null)
            .sort((a, b) => a.start.getTime() - b.start.getTime());
    }

    /**
     * סיום ניתוח אחרון בציר אחיד ל"זמן אבוד לחדר": בוצע (יציאה בפועל), בתהליך
     * (משך משוער או עכשיו אם חרג מהמשוער), ואז מתוכננים משורשרים אחרי סיום+20.
     */
    private computeUnifiedRoomLastSurgeryEndForLostTime(room: RoomData): Date {
        const SETUP_TIME = 20;
        const baseDate = room.date || this.selectedDate;
        const dayStart = this.workingStart(baseDate);
        const dayEnd = this.workingEnd(baseDate);
        const now = new Date();
        const nowClamped = now < dayEnd ? now : dayEnd;

        const ambulatoryOnlyRoom =
            (room.surgeries?.length ?? 0) > 0 &&
            room.surgeries!.every((s) =>
                this.surgeryIsAmbulatoryForDisplay(s, room)
            );
        const plannedSurgeries = room.surgeries.filter((s) => {
            const st = String(s.status ?? s.SurgeryStatus ?? "")
                .toLowerCase()
                .replace(/\s+/g, "");
            if (st !== "planned") return false;
            if (ambulatoryOnlyRoom) return true;
            return !this.surgeryIsAmbulatoryForDisplay(s, room);
        });

        const completedAndInProgress = room.surgeries.filter(
            (s) =>
                s.SurgeryStatus === "Completed" ||
                s.SurgeryStatus === "InProgress"
        );

        const sorted = [...completedAndInProgress].sort((a, b) => {
            const aEnt = this.parseClockWithDate(
                this.getEntranceTime(a),
                baseDate
            );
            const bEnt = this.parseClockWithDate(
                this.getEntranceTime(b),
                baseDate
            );
            if (!aEnt) return 1;
            if (!bEnt) return -1;
            return aEnt.getTime() - bEnt.getTime();
        });

        let cursor: Date | null = dayStart;
        let lastSurgeryEnd: Date | null = null;

        for (const s of sorted) {
            const entStr = this.getEntranceTime(s);
            const exitStr = this.getExitTime(s);
            const status = s.SurgeryStatus;

            if (!entStr || this.isZeroTime(entStr)) continue;

            const entrance = this.parseClockWithDate(entStr, baseDate);
            if (!entrance) continue;

            const expectedMin = this.getExpectedDuration(s);
            let surgeryEnd: Date;

            if (exitStr && !this.isZeroTime(exitStr) && status === "Completed") {
                const exit = this.parseClockWithDate(exitStr, baseDate);
                if (exit) {
                    surgeryEnd = exit;
                    if (surgeryEnd.getTime() < entrance.getTime()) {
                        surgeryEnd = new Date(
                            surgeryEnd.getTime() + 24 * 60 * 60 * 1000
                        );
                    }
                } else {
                    surgeryEnd = new Date(
                        entrance.getTime() + expectedMin * 60000
                    );
                }
            } else if (status === "Completed") {
                surgeryEnd = new Date(
                    entrance.getTime() + expectedMin * 60000
                );
            } else {
                const plannedEnd = new Date(
                    entrance.getTime() + expectedMin * 60000
                );
                surgeryEnd =
                    nowClamped.getTime() > plannedEnd.getTime()
                        ? nowClamped
                        : plannedEnd;
            }

            lastSurgeryEnd = surgeryEnd;
            cursor = new Date(surgeryEnd.getTime() + SETUP_TIME * 60000);
        }

        let currentTime: Date =
            cursor && cursor.getTime() > dayStart.getTime() ? cursor : dayStart;

        for (const s of plannedSurgeries) {
            const expectedMin = this.getExpectedDuration(s);
            const entStr = this.getEntranceTime(s);
            let startTime: Date;

            if (entStr && !this.isZeroTime(entStr)) {
                const entrance = this.parseClockWithDate(entStr, baseDate);
                if (entrance) {
                    startTime =
                        entrance.getTime() > currentTime.getTime()
                            ? entrance
                            : currentTime;
                } else {
                    startTime = currentTime;
                }
            } else {
                startTime = currentTime;
            }

            const surgeryEnd = new Date(
                startTime.getTime() + expectedMin * 60000
            );
            lastSurgeryEnd = surgeryEnd;
            currentTime = new Date(surgeryEnd.getTime() + SETUP_TIME * 60000);
        }

        return lastSurgeryEnd ?? dayStart;
    }

    /**
     * חישוב חדר פנוי/גלישה בהתאם לדרישות:
     * - בשלב התחלתי: משך ממוצע לכל ניתוח + 20 דק' בין ניתוח
     * - עיכובים/חסכונות ב-SETUP TIME או במשך הניתוח משנים את הזמן הפנוי/גלישה
     */
    private calculateFreeTimeAndOverrun(room: RoomData): {
        freeFromDate: Date | null;
        freeFromText: string;
        overrunText: string;
        totalSavingsMin: number; // חסכונות מצטברים (חיובי = חסכון)
        totalDelaysMin: number; // עיכובים מצטברים (חיובי = עיכוב)
    } {
        const SETUP_TIME = 20; // זמן הכנת חדר בין ניתוחים
        const baseDate = room.date || this.selectedDate;
        const dayStart = this.workingStart(baseDate);
        const dayEnd = this.workingEnd(baseDate);
        const now = new Date();
        const nowClamped = now < dayEnd ? now : dayEnd;

        let totalSavingsMin = 0; // חסכונות (חיובי = חסכון זמן)
        let totalDelaysMin = 0; // עיכובים (חיובי = עיכוב זמן)

        // 1. חישוב בסיסי: סכום של (ממוצע + 20) לכל ניתוח מתוכנן
        const ambulatoryOnlyRoom =
            (room.surgeries?.length ?? 0) > 0 &&
            room.surgeries!.every((s) =>
                this.surgeryIsAmbulatoryForDisplay(s, room)
            );
        const plannedSurgeries = room.surgeries.filter((s) => {
            const st = String(s.status ?? s.SurgeryStatus ?? "")
                .toLowerCase()
                .replace(/\s+/g, "");
            if (st !== "planned") return false;
            if (ambulatoryOnlyRoom) return true;
            return !this.surgeryIsAmbulatoryForDisplay(s, room);
        });

        const plannedForOverrunChain = room.surgeries
            .filter((s) => {
                const st = String(s.status ?? s.SurgeryStatus ?? "")
                    .toLowerCase()
                    .replace(/\s+/g, "");
                return st === "planned";
            })
            .sort((a, b) => {
                const aEnt = this.parseClockWithDate(
                    this.getEntranceTime(a) || "",
                    baseDate
                );
                const bEnt = this.parseClockWithDate(
                    this.getEntranceTime(b) || "",
                    baseDate
                );
                const am = aEnt?.getTime() ?? a.sortKey ?? 0;
                const bm = bEnt?.getTime() ?? b.sortKey ?? 0;
                if (am !== bm) return am - bm;
                return (a.sortKey ?? 0) - (b.sortKey ?? 0);
            });

        let plannedTotalMin = 0;
        for (const s of plannedSurgeries) {
            const expectedMin = this.getExpectedDuration(s);
            plannedTotalMin += expectedMin + SETUP_TIME;
        }

        // 2. חישוב בפועל: סכום של (משך בפועל + SETUP בפועל) לכל ניתוח שבוצע/בתהליך
        const completedAndInProgress = room.surgeries.filter((s) => {
            const st = String(s.status ?? s.SurgeryStatus ?? "")
                .toLowerCase()
                .replace(/\s+/g, "");
            return st === "completed" || st === "inprogress";
        });

        // מיון לפי זמן כניסה
        const sorted = [...completedAndInProgress].sort((a, b) => {
            const aEnt = this.parseClockWithDate(
                this.getEntranceTime(a),
                baseDate
            );
            const bEnt = this.parseClockWithDate(
                this.getEntranceTime(b),
                baseDate
            );
            if (!aEnt) return 1;
            if (!bEnt) return -1;
            return aEnt.getTime() - bEnt.getTime();
        });

        let cursor: Date | null = dayStart;
        let actualTotalMin = 0;

        for (const s of sorted) {
            const entStr = this.getEntranceTime(s);
            const exitStr = this.getExitTime(s);
            const statusNorm = String(s.status ?? s.SurgeryStatus ?? "")
                .toLowerCase()
                .replace(/\s+/g, "");
            const isCompleted = statusNorm === "completed";

            if (!entStr || this.isZeroTime(entStr)) continue;

            const entrance = this.parseClockWithDate(entStr, baseDate);
            if (!entrance) continue;

            // משך מתוכנן (ממוצע)
            const expectedMin = this.getExpectedDuration(s);
            const plannedSurgeryMin = expectedMin + SETUP_TIME;

            // משך בפועל
            let actualSurgeryMin = 0;
            let actualSetupMin = 0;
            let surgeryEnd: Date;

            if (exitStr && !this.isZeroTime(exitStr) && isCompleted) {
                // ניתוח שהסתיים - יש זמן יציאה
                const exit = this.parseClockWithDate(exitStr, baseDate);
                if (exit) {
                    surgeryEnd = exit;
                    actualSurgeryMin = Math.max(
                        0,
                        Math.floor(
                            (exit.getTime() - entrance.getTime()) / 60000
                        )
                    );
                } else {
                    surgeryEnd = new Date(
                        entrance.getTime() + expectedMin * 60000
                    );
                    actualSurgeryMin = expectedMin;
                }
            } else {
                // ניתוח בתהליך — לצורך תור הניתוחים הבאים: סיום צפוי = max(עכשיו, משוער),
                // כמו ב-getPlannedScheduleRow (אחרת גלישה צפויה לא מוצגת כשעוברים את המשוער)
                const estimatedEnd = new Date(
                    entrance.getTime() + expectedMin * 60000
                );
                surgeryEnd = new Date(
                    Math.max(
                        nowClamped.getTime(),
                        estimatedEnd.getTime()
                    )
                );
                actualSurgeryMin = Math.max(
                    0,
                    Math.floor(
                        (nowClamped.getTime() - entrance.getTime()) / 60000
                    )
                );
            }

            // חישוב SETUP בפועל (זמן בין סיום ניתוח קודם לכניסה נוכחית)
            if (cursor && entrance.getTime() > cursor.getTime()) {
                actualSetupMin = Math.max(
                    0,
                    Math.floor(
                        (entrance.getTime() - cursor.getTime()) / 60000
                    )
                );
            } else {
                actualSetupMin = SETUP_TIME; // אם אין ניתוח קודם, משתמשים ב-20 דק'
            }

            const actualTotal = actualSurgeryMin + actualSetupMin;
            actualTotalMin += actualTotal;

            // חישוב הפרש: מתוכנן - בפועל
            const delta = plannedSurgeryMin - actualTotal;
            if (delta > 0) {
                // חסכון
                totalSavingsMin += delta;
            } else if (delta < 0) {
                // עיכוב
                totalDelaysMin += -delta;
            }

            // עדכון cursor לסיום הניתוח + SETUP
            cursor = new Date(surgeryEnd.getTime() + SETUP_TIME * 60000);
        }

        // 3. חישוב זמן פנוי/גלישה סופי
        let freeFromText = "--:--";
        let overrunText = "--:--";

        let freeFromDate = this.computeUnifiedRoomLastSurgeryEndForLostTime(
            room
        );

        let currentTime: Date = cursor ?? dayStart;

        let lastPredictedSurgeryEnd: Date | null = null;

        for (const s of plannedForOverrunChain) {
            const expectedMin = this.getExpectedDuration(s);
            const startTime = currentTime;
            const surgeryEnd = new Date(
                startTime.getTime() + expectedMin * 60000
            );
            lastPredictedSurgeryEnd = surgeryEnd;
            currentTime = new Date(surgeryEnd.getTime() + SETUP_TIME * 60000);
        }

        let predictedEndTime: Date | null = lastPredictedSurgeryEnd;

        const inProg = room.surgeries.find((s) => {
            const st = String(s.status ?? s.SurgeryStatus ?? "")
                .toLowerCase()
                .replace(/\s+/g, "");
            return st === "inprogress";
        });

        if (!predictedEndTime && inProg) {
            const entStr = this.getEntranceTime(inProg);
            if (entStr && !this.isZeroTime(entStr)) {
                const entrance = this.parseClockWithDate(entStr, baseDate);
                if (entrance) {
                    const expectedMin = this.getExpectedDuration(inProg);
                    const estimatedEnd = new Date(
                        entrance.getTime() + expectedMin * 60000
                    );
                    predictedEndTime = new Date(
                        Math.max(
                            nowClamped.getTime(),
                            estimatedEnd.getTime()
                        )
                    );
                }
            }
        }

        if (!predictedEndTime && sorted.length > 0 && cursor) {
            predictedEndTime = new Date(
                cursor.getTime() - SETUP_TIME * 60000
            );
        }

        if (
            predictedEndTime &&
            predictedEndTime.getTime() > dayEnd.getTime()
        ) {
            const overrunMin = Math.floor(
                (predictedEndTime.getTime() - dayEnd.getTime()) / 60000
            );
            overrunText = this.formatHM(overrunMin);
        } else {
            overrunText = "--:--";
        }

        freeFromDate = this.clampToIdleMetricsDayStart(freeFromDate, baseDate);

        const lostMin = Math.max(
            0,
            Math.floor((dayEnd.getTime() - freeFromDate.getTime()) / 60000)
        );

        freeFromText =
            lostMin > 0 ? this.formatHM(lostMin) : "--:--";

        return {
            freeFromDate,
            freeFromText,
            overrunText: overrunText === "--:--" ? "--:--" : overrunText,
            totalSavingsMin,
            totalDelaysMin,
        };
    }

    private sortSurgeriesForTimeline(room: RoomData): Surgery[] {
        const arr = [...(room.surgeries ?? [])].filter((s) => {
            const st = String(s.status ?? s.SurgeryStatus ?? "").toLowerCase();
            return st !== "cancelled" && st !== "canceled";
        });
        arr.sort((a, b) => {
            const am = a._displayStartMs;
            const bm = b._displayStartMs;
            if (am != null && bm != null && am !== bm) return am - bm;
            if (am != null && bm == null) return -1;
            if (am == null && bm != null) return 1;
            const ask = a.sortKey;
            const bsk = b.sortKey;
            if (ask != null && bsk != null && ask !== bsk) return ask - bsk;
            if (a._displayStart && b._displayStart) {
                return a._displayStart.getTime() - b._displayStart.getTime();
            }
            return 0;
        });
        return arr;
    }

    /**
     * סיום ניתוח אחרון בציר זמן משוער (אותה לוגיקה כמו חישוב זמן אבוד)
     */
    private computeTimelineMaxEndForSortedList(
        list: Surgery[],
        baseDate: string
    ): Date | null {
        const day0730 = this.parseClockWithDate("07:30", baseDate);
        if (!day0730 || !list.length) return null;

        const TURNOVER = 20;
        let prevEnd: Date | null = null;
        let maxEnd: Date | null = null;

        for (const s of list) {
            const entRtm = s.TimeEntranceToTheOperatingRoom;
            const extRtm = s.TimeExitingTheOperatingRoom;
            const hasEnt =
                entRtm != null &&
                String(entRtm).trim() !== "" &&
                !this.isZeroTime(String(entRtm));
            const hasExt =
                extRtm != null &&
                String(extRtm).trim() !== "" &&
                !this.isZeroTime(String(extRtm));
            const durMin = Math.max(0, this.getExpectedDuration(s) || 0);

            let start: Date;
            let end: Date;

            if (hasEnt && hasExt) {
                const s1 = this.parseClockWithDate(String(entRtm), baseDate);
                const e1 = this.parseClockWithDate(String(extRtm), baseDate);
                if (!s1 || !e1) {
                    start =
                        prevEnd === null
                            ? day0730
                            : new Date(prevEnd.getTime() + TURNOVER * 60000);
                    end = new Date(start.getTime() + durMin * 60000);
                } else {
                    start = s1;
                    end = e1;
                    if (end.getTime() < start.getTime()) {
                        end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
                    }
                }
            } else if (hasEnt) {
                const s1 = this.parseClockWithDate(String(entRtm), baseDate);
                if (!s1) {
                    start =
                        prevEnd === null
                            ? day0730
                            : new Date(prevEnd.getTime() + TURNOVER * 60000);
                    end = new Date(start.getTime() + durMin * 60000);
                } else {
                    start = s1;
                    end = new Date(start.getTime() + durMin * 60000);
                }
            } else {
                start =
                    prevEnd === null
                        ? day0730
                        : new Date(prevEnd.getTime() + TURNOVER * 60000);
                end = new Date(start.getTime() + durMin * 60000);
            }

            prevEnd = end;
            if (!maxEnd || end.getTime() > maxEnd.getTime()) {
                maxEnd = end;
            }
        }

        return maxEnd;
    }

    /**
     * חדרי ניתוח כלליים (1–7): כמה צפויים לגלוש / לסיים לפני 15:00 מתוך הסה״כ
     */
    getRegularRoomsOverrunEarlySummary(): {
        overrun: number;
        early: number;
        total: number;
    } {
        const rooms = this.regularRoomsFromData;
        const wd = this.workingEnd(this.selectedDate);
        let overrun = 0;
        let early = 0;

        for (const room of rooms) {
            const list = this.sortSurgeriesForTimeline(room);
            if (!list.length) {
                early++;
                continue;
            }
            const maxEnd = this.computeTimelineMaxEndForSortedList(
                list,
                room.date || this.selectedDate
            );
            if (!maxEnd) continue;
            if (maxEnd.getTime() > wd.getTime()) {
                overrun++;
            } else if (maxEnd.getTime() < wd.getTime()) {
                early++;
            }
        }

        return { overrun, early, total: rooms.length };
    }

    /**
     * עיכוב מצטבר מ־07:30: פער עד ניתוח ראשון בפועל, פערים בין ניתוחים מעל 20 דק׳,
     * או כל הזמן מ־07:30 עד עכשיו אם אין כניסה תקפה לאף ניתוח.
     */
    private computeTotalDelayMinutesFromDayStart(room: RoomData): number {
        const SETUP = 20;

        const baseDate = room.date || this.selectedDate;
        const dayStart = this.parseClockWithDate("07:30", baseDate);
        const now = new Date();

        if (!dayStart) return 0;

        const timeline = this.buildTimeline(room);
        const data = timeline.filter(
            (t) => t.start.getTime() <= now.getTime()
        );

        if (!data.length) {
            return Math.max(
                0,
                Math.floor((now.getTime() - dayStart.getTime()) / 60000)
            );
        }

        let total = 0;

        const first = data[0];
        if (first.start.getTime() > dayStart.getTime()) {
            total += Math.floor(
                (first.start.getTime() - dayStart.getTime()) / 60000
            );
        }

        for (let i = 1; i < data.length; i++) {
            const prev = data[i - 1];
            const curr = data[i];

            const gap = Math.floor(
                (curr.start.getTime() - prev.end.getTime()) / 60000
            );

            if (gap > SETUP) {
                total += gap - SETUP;
            }
        }

        const last = data[data.length - 1];

        if (now.getTime() > last.end.getTime()) {
            total += Math.floor(
                (now.getTime() - last.end.getTime()) / 60000
            );
        }

        return Math.max(0, total);
    }

    getRoomDetailsPanel(room: RoomData): {
        totalDelayHMM: string; // משך עיכובים מצטבר מתחילת יום (7:30)
        overrunText: string; // משך גלישה צפוי
        freeFromText: string; // חדר פנוי החל מ
        idleTimeText: string; // זמן שעבר מסיום הניתוח הקודם
        freeFromDate?: Date | null; // תאריך/שעה שהחדר פנוי
    } {
        const totalDelayMin = this.computeTotalDelayMinutesFromDayStart(room);
        const totalDelayHMM =
            totalDelayMin === 0 ? "--:--" : this.formatHM(totalDelayMin);

        // 2) חישוב חדר פנוי/גלישה בהתאם לדרישות
        const calc = this.calculateFreeTimeAndOverrun(room);
        const freeFromText = calc.freeFromText;
        const overrunText = calc.overrunText;
        const freeFromDate = calc.freeFromDate;

        // 3) זמן שעבר מסיום הניתוח הקודם
        let idleTimeText = "--:--";
        const lastCompletedSurgery = this.findLastCompletedSurgery(room);
        if (lastCompletedSurgery) {
            const lastEndTime = this.getLastSurgeryEndTime(
                lastCompletedSurgery,
                new Date(room.date)
            );
            if (lastEndTime) {
                const now = new Date();
                const dayEnd = this.workingEnd(room.date);
                const nowClamped = now < dayEnd ? now : dayEnd;

                const idleStart = this.clampToIdleMetricsDayStart(
                    lastEndTime,
                    room.date
                );
                const elapsedMin = Math.max(
                    0,
                    Math.floor(
                        (nowClamped.getTime() - idleStart.getTime()) / 60000
                    )
                );

                if (elapsedMin > 0) {
                    idleTimeText = this.formatHM(elapsedMin);
                }
            }
        }

        return { totalDelayHMM, overrunText, freeFromText, idleTimeText, freeFromDate };
    }

    // private getRoomFreeFrom(room: RoomData): Date | null {
    //     if (!room) return null;

    //     // אם אין ניתוח פעיל → פנוי עכשיו (אבל נציג את השעה הנוכחית ב"יום הנבחר")
    //     if (!this.hasInProgress(room)) {
    //         return this._nowInSelectedDay();
    //     }

    //     // אם יש פעיל → ננסה לנבא לפי active + TimeSurgeryToDo (+ 20 דק' הכנה)
    //     const baseDate = room.date || this.selectedDate;
    //     const now = this._nowInSelectedDay();

    //     let active: any = null;
    //     for (const s of room.surgeries || []) {
    //         if (
    //             this.isInProgressStatus(
    //                 (s as any).status ?? (s as any).SurgeryStatus
    //             )
    //         ) {
    //             const ent = this.parseClockWithDate(
    //                 (s as any).timeEntrance ??
    //                     (s as any).TimeEntranceToTheOperatingRoom,
    //                 baseDate
    //             );
    //             if (
    //                 !active ||
    //                 (ent &&
    //                     active._ent &&
    //                     ent.getTime() > active._ent.getTime())
    //             ) {
    //                 active = { row: s, _ent: ent };
    //             }
    //         }
    //     }
    //     if (!active || !active._ent) return null;

    //     const plannedMinRaw =
    //         (active.row as any).timeSurgeryToDo ??
    //         (active.row as any).TimeSurgeryToDo;
    //     const plannedMin =
    //         Number.isFinite(+plannedMinRaw) && +plannedMinRaw > 0
    //             ? Math.round(+plannedMinRaw)
    //             : 60;

    //     const end = new Date(active._ent.getTime() + plannedMin * 60000);
    //     const free = new Date(end.getTime() + 20 * 60000);

    //     // אם החישוב יצא בעבר, לפחות "עכשיו"
    //     return free < now ? now : free;
    // }

    /**
     * חילוץ זמן הסיום של הניתוח (תומך במספר שדות)
     */

    /**
     * המרת שעה:דקה לדקות
     */
    private hmToMinutes(hm: string | null): number | null {
        if (!hm || !hm.includes(":")) return null;
        const [h, m] = hm.split(":").map((x) => +x);
        return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
    }

    /**
     * בדיקה אם סטטוס הוא "בתהליך"
     */
    private isInProgressStatus(status: string | null | undefined): boolean {
        const s = (status ?? "").toString().toLowerCase().trim();
        return s === "inprogress" || s === "in progress" || s.includes("בתהל");
    }

    /**
     * בחדר ניתוח אחד לא יכולים להיות שני ניתוחים במצב "בביצוע" בו־זמנית.
     * כשה-API מחזיר יותר מרשומת InProgress אחת, משאירים את הניתוח שכניסתו הקרובה ביותר ל"עכשיו"
     * (בין אלה שכבר התחילו), ומתקנים את השאר — כדי שלא יוצגו שני "בביצוע" באותו כרטיס חדר.
     */
    private enforceSingleInProgressPerRoomSurgeries(
        surgeries: Surgery[],
        baseDate: string | null | undefined
    ): void {
        if (!surgeries?.length || !baseDate) return;

        const now = new Date();
        const inProg: Surgery[] = [];
        for (const s of surgeries) {
            if (this.isInProgressStatus(s.status ?? s.SurgeryStatus)) {
                inProg.push(s);
            }
        }
        if (inProg.length <= 1) return;

        const scored = inProg.map((s) => {
            const entStr = this.getEntranceTime(s);
            const ent =
                entStr && !this.isZeroTime(entStr)
                    ? this.parseClockWithDate(entStr, baseDate)
                    : null;
            return {
                s,
                entMs: ent ? ent.getTime() : Number.NEGATIVE_INFINITY,
            };
        });

        const startedNotAfterNow = scored.filter(
            (x) =>
                x.entMs !== Number.NEGATIVE_INFINITY &&
                x.entMs <= now.getTime()
        );

        if (!startedNotAfterNow.length) {
            for (const x of scored) {
                x.s.status = "Planned";
                x.s.SurgeryStatus = "Planned";
            }
            return;
        }

        const winner = startedNotAfterNow.reduce((a, b) =>
            a.entMs >= b.entMs ? a : b
        );
        const winnerSurgery = winner.s;

        for (const x of scored) {
            if (x.s === winnerSurgery) continue;
            const s = x.s;
            const exitStr = this.getExitTime(s);
            if (exitStr && !this.isZeroTime(exitStr)) {
                s.status = "Completed";
                s.SurgeryStatus = "Completed";
            } else if (
                x.entMs !== Number.NEGATIVE_INFINITY &&
                x.entMs < winner.entMs
            ) {
                s.status = "Completed";
                s.SurgeryStatus = "Completed";
            } else {
                s.status = "Planned";
                s.SurgeryStatus = "Planned";
            }
        }
    }

    /**
     * בדיקה אם סטטוס הוא "הושלם"
     */
    private isCompletedStatus(status: string | null | undefined): boolean {
        const s = (status ?? "").toString().toLowerCase().trim();
        return (
            s === "completed" ||
            s === "סגור" ||
            s.includes("הושל") ||
            s.includes("בוצע")
        );
    }

    /**
     * חילוץ שעת סיום ניתוח (תומך בשתי כינויות)
     */
    private getExitTime(surgery: Surgery | Partial<Surgery>): string | null {
        return surgery?.timeExit ?? surgery?.TimeExitingTheOperatingRoom ?? null;
    }

    /**
     * חילוץ שעת כניסה ניתוח (תומך בשתי כינויות)
     */
    private getEntranceTime(surgery: Surgery | Partial<Surgery>): string | null {
        return (
            surgery?.timeEntrance ??
            surgery?.TimeEntranceToTheOperatingRoom ??
            null
        );
    }

    /**
     * בדיקה אם שעה היא ריקה/אפס
     */
    private isZeroTime(t: string | null): boolean {
        if (!t) return true;
        const s = String(t).trim();
        return s === "00:00" || s === "00:00:00" || s === "00:00:00.0000000";
    }

    // getTurnoverSummary(room: RoomData): string {
    //     if (!room?.surgeries?.length || !room.date) return "";
    //     const overrunAfter1500 = this.calcOverrunAfter1500(room, room.date);

    //     if (overrunAfter1500 > 0) {
    //         return this.formatHM(overrunAfter1500); // גלישה בלבד
    //     }
    //     const baseDate = room.date;
    //     const dayStart = this.workingStart(baseDate);
    //     const dayEnd = this.workingEnd(baseDate);
    //     const now = new Date();
    //     const nowClamped = now < dayEnd ? now : dayEnd;

    //     const intervals = this.buildCompletedIntervals(
    //         room,
    //         baseDate,
    //         dayStart,
    //         dayEnd
    //     );
    //     if (!intervals.length) return "";

    //     const parseDurMin = (v: any): number | null => {
    //         if (v == null) return null;
    //         if (typeof v === "number" && isFinite(v))
    //             return Math.max(0, Math.round(v));
    //         const s = String(v).trim();
    //         if (!s) return null;
    //         if (s.includes(":")) {
    //             const [hh, mm] = s.split(":").map((x) => parseInt(x, 10));
    //             return Number.isFinite(hh) && Number.isFinite(mm)
    //                 ? Math.max(0, hh * 60 + mm)
    //                 : null;
    //         }
    //         const n = Number(s);
    //         return Number.isFinite(n) ? Math.max(0, Math.round(n)) : null;
    //     };

    //     const getPlannedMin = (s: any): number | null => {
    //         const avg = parseDurMin(s.AvgDauration);
    //         if (avg != null) return avg + 20;
    //         const t = parseDurMin(s.TimeSurgeryToDo);
    //         return t != null ? t + 20 : null;
    //     };

    //     const byStart = new Map<number, any>();
    //     for (const s of room.surgeries as any[]) {
    //         const startStr = this.getEntranceTime(s);
    //         if (!startStr) continue;
    //         const start = this.parseClockWithDate(startStr, baseDate);
    //         if (!start) continue;
    //         byStart.set(start.getTime(), s);
    //     }

    //     let freeMin = 0;
    //     let overrunMin = 0;

    //     for (const it of intervals) {
    //         const s = byStart.get(it.start.getTime());
    //         if (!s) continue;

    //         const plannedMin = getPlannedMin(s);
    //         if (plannedMin == null) continue;

    //         const actualEnd = this.isInProgressStatus(it.status)
    //             ? nowClamped
    //             : it.end;

    //         const actualMin = Math.max(
    //             0,
    //             Math.floor((actualEnd.getTime() - it.start.getTime()) / 60000)
    //         );

    //         const delta = plannedMin - actualMin; // + => פנוי, - => גלישה
    //         if (delta > 0) freeMin += delta;
    //         else if (delta < 0) overrunMin += -delta;
    //     }

    //     if (!freeMin && !overrunMin) return "";
    //     return `${this.formatHM(freeMin)} `;
    // }

    /**
     * בנייה של רשימת ניתוחים שהושלמו בתוך משמרה
     */
    private buildCompletedIntervals(
        room: RoomData,
        baseDate: string | Date,
        dayStart: Date,
        dayEnd: Date
    ): Array<{ start: Date; end: Date; status: string }> {
        return room.surgeries
            .map((s: Surgery) => {
                const status = (
                    s.status ??
                    s.SurgeryStatus ??
                    ""
                ).toLowerCase();
                const isCompleted = this.isCompletedStatus(status);
                const isInProgress = this.isInProgressStatus(status);

                if (!isCompleted && !isInProgress) return null;

                const startStr = this.getEntranceTime(s);
                const endStr = this.getExitTime(s);
                if (!startStr) return null;

                let start = this.parseClockWithDate(startStr, baseDate);
                let end =
                    endStr && !this.isZeroTime(endStr)
                        ? this.parseClockWithDate(endStr, baseDate)
                        : start;

                if (!start || !end) return null;

                // ✅ טיפול בחציית חצות
                if (end.getTime() < start.getTime()) {
                    end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
                }

                // ✅ בדיקה אם בתוך משמרה
                if (start >= dayEnd || end <= dayStart) return null;

                return { start, end, status };
            })
            .filter((i): i is NonNullable<typeof i> => !!i)
            .sort((a, b) => a.start.getTime() - b.start.getTime());
    }

    /**
     * בדיקה אם הניתוח הושלם (עבור רשימת intervals)
     */
    private isCompleted(interval: { status: string }): boolean {
        return this.isCompletedStatus(interval.status);
    }

    // ============================================
    // 4️⃣ שיפור getRoomLateMeta (חישוב עיכוב צפוי)
    // ============================================

    /**
     * חישוב כללי של עיכוב צפוי וחפיפת עומס
     */
    getRoomLateMeta(room: RoomData): LateMeta | null {
        if (!room) return null;

        if (this.isRoomPastDay(room)) {
            const summary = this.getTurnoverSummary(room);
            const turnoverUsed = Math.max(20, this.hmToMinutes(summary) ?? 20);
            return {
                isLate: false,
                predictedEnd: null,
                overrunMin: 0,
                turnoverUsed: turnoverUsed,
                hasOverlapBacklog: false,
                backlogCount: 0,
                overlapUntil: null,
            };
        }

        const baseDate = room.date || this.selectedDate;
        const shiftEnd = this.workingEnd(baseDate);
        const shiftStart = this.workingStart(baseDate);

        // ✅ בנייה ונרמול רשימת ניתוחים
        const surgeryList = this.buildSurgeryListForLateMeta(room, baseDate);
        if (!surgeryList.length) {
            return {
                isLate: false,
                predictedEnd: null,
                overrunMin: 0,
                turnoverUsed: 20,
                hasOverlapBacklog: false,
            };
        }

        // ✅ חישוב סיום צפוי
        const predictedEnd = this.simulateSurgeryEnd(
            surgeryList,
            shiftStart,
            shiftEnd
        );

        const isLate =
            predictedEnd && predictedEnd.getTime() > shiftEnd.getTime();
        const overrunMin = isLate
            ? Math.max(
                  0,
                  Math.round(
                      (predictedEnd!.getTime() - shiftEnd.getTime()) / 60000
                  )
              )
            : 0;

        const turnoverUsed = Math.max(
            20,
            this.hmToMinutes(this.getTurnoverSummary(room)) ?? 20
        );
        const overlap = this.computeOverlapBacklog(room, turnoverUsed);

        return {
            isLate,
            predictedEnd: predictedEnd ?? null,
            overrunMin,
            turnoverUsed,
            hasOverlapBacklog: overlap.hasOverlap,
            backlogCount: overlap.count,
            overlapUntil: overlap.until,
        };
    }

    /**
     * בנייה של רשימת ניתוחים לחישוב עיכוב - כולל Planned ללא התחלה
     */
    private buildSurgeryListForLateMeta(
        room: RoomData,
        baseDate: string | Date
    ): Array<{
        entrance: Date | null;
        expectedMin: number;
        status: string;
    }> {
        const list: Array<{
            entrance: Date | null;
            expectedMin: number;
            status: string;
        }> = [];

        // הוסף ניתוחים עם התחלה ידועה
        for (const s of room.surgeries) {
            const startStr = this.getEntranceTime(s);
            if (!startStr || this.isZeroTime(startStr)) continue;

            const entrance = this.parseClockWithDate(startStr, baseDate);
            if (!entrance) continue;

            const expectedMin = this.getExpectedDuration(s);

            list.push({
                entrance,
                expectedMin,
                status: (s.status ?? s.SurgeryStatus ?? "").toLowerCase(),
            });
        }

        // הוסף ניתוחים Planned שאין להם התחלה - יתחילו אחרי הקודמים
        for (const s of room.surgeries) {
            const startStr = this.getEntranceTime(s);
            if (startStr && !this.isZeroTime(startStr)) continue; // דלג אם יש התחלה

            const status = (s.status ?? s.SurgeryStatus ?? "").toLowerCase();
            if (
                this.isCompletedStatus(status) ||
                this.isInProgressStatus(status)
            )
                continue; // דלג אם לא Planned

            const expectedMin = this.getExpectedDuration(s);
            list.push({
                entrance: null, // סימן שזה Planned ללא התחלה
                expectedMin,
                status: status,
            });
        }

        return list.sort((a, b) => {
            if (!a.entrance) return 1;
            if (!b.entrance) return -1;
            return a.entrance.getTime() - b.entrance.getTime();
        });
    }

    /**
     * משך ממוצע בדקות: קודם AvgDuration מהשרת, אחרת AvgDauration (אותו מידע במיפוי הישן).
     * רק אם שניהם ריקים — getExpectedDuration יורד ל-TimeSurgeryToDo.
     */
    private parseAvgDurationFieldToMinutes(surgery: Surgery): number | null {
        const avgDurationRaw: string | number | null =
            (surgery as any).AvgDuration ?? (surgery as any).AvgDauration ?? null;
        if (avgDurationRaw == null || String(avgDurationRaw).trim() === "") {
            return null;
        }
        let avgDuration: number | null = null;
        if (typeof avgDurationRaw === "string" && avgDurationRaw.includes(":")) {
            const [h, m] = avgDurationRaw.split(":");
            const hNum = parseInt(h, 10);
            const mNum = parseInt(m, 10);
            if (!Number.isNaN(hNum) && !Number.isNaN(mNum)) {
                avgDuration = hNum * 60 + mNum;
            }
        } else if (!Number.isNaN(+avgDurationRaw)) {
            avgDuration = +avgDurationRaw;
        }
        if (avgDuration != null && !Number.isNaN(+avgDuration)) {
            const val = Math.max(0, Math.round(+avgDuration));
            if (val >= 5 && val <= 480) return val;
        }
        return null;
    }

    /**
     * קבל את משך הניתוח החזוי
     * 1. קודם AvgDuration (משך ממוצע מהשרת)
     * 2. אם אין מידע — TimeSurgeryToDo (זמן מתכונן בדקות)
     * 3. אחרת חישוב מזמני כניסה/יציאה בפועל
     * כאשר timeNotEntered – מחזיר 0 (תצוגה: "לא הוזן" דרך getExpectedDurationDisplay)
     */
    private getExpectedDuration(surgery: Surgery, room?: RoomData): number {
        if ((surgery as Surgery).timeNotEntered) return 0;
        // 1️⃣ רק שדה AvgDuration
        const fromAvg = this.parseAvgDurationFieldToMinutes(surgery);
        if (fromAvg != null) return fromAvg;

        // 2️⃣ זמן מתכונן (דקות)
        const drorTime = surgery?.TimeSurgeryToDo;
        if (drorTime != null && !Number.isNaN(+drorTime)) {
            const val = Math.max(0, Math.round(+drorTime));
            if (val >= 5 && val <= 480) return val;
        }

        // 3️⃣ חישוב ממשי רק אם שני הזמנים תקינים (לא 00:00 / לא null)
        const entStr = surgery?.TimeEntranceToTheOperatingRoom;
        const exitStr = surgery?.TimeExitingTheOperatingRoom;

        if (
            entStr &&
            !this.isZeroTime(entStr) &&
            exitStr &&
            !this.isZeroTime(exitStr)
        ) {
            const entrance = this.parseClock(entStr);
            const exit = this.parseClock(exitStr);

            if (entrance && exit) {
                let diff = exit.getTime() - entrance.getTime();
                if (diff < 0) diff += 24 * 60 * 60 * 1000;
                const minutes = Math.round(diff / 60000);
                if (minutes >= 5 && minutes <= 480) return minutes;
            }
        }

        return 60;
    }

    /**
     * ה-API משאיר InProgress אך שעת סיום משוערת או שעת יציאה בפועל כבר עברו — לא נחשב «בביצוע» בתצוגה.
     */
    private isInProgressStaleByEstimatedEnd(s: Surgery, room: RoomData): boolean {
        if (!this.isInProgressStatus(s.status ?? s.SurgeryStatus)) {
            return false;
        }
        const base = room.date || this.selectedDate;
        if (!base) {
            return false;
        }
        const now = new Date();

        const exitStr = this.getExitTime(s);
        if (exitStr && !this.isZeroTime(exitStr)) {
            const exitAt = this.parseClockWithDate(exitStr, base);
            if (exitAt && now.getTime() >= exitAt.getTime()) {
                return true;
            }
        }

        const entStr = this.getEntranceTime(s);
        if (!entStr || this.isZeroTime(entStr)) {
            return false;
        }
        const entrance = this.parseClockWithDate(entStr, base);
        if (!entrance) {
            return false;
        }

        const durMin = this.getExpectedDuration(s, room);
        if (durMin <= 0) {
            return false;
        }
        const expectedEnd = new Date(entrance.getTime() + durMin * 60000);
        const GRACE_MS = 8 * 60000;
        return now.getTime() > expectedEnd.getTime() + GRACE_MS;
    }

    /** מפתח סטטוס לתצוגה (מתקן InProgress מיושן ל-Completed) */
    displaySurgeryStatusKey(s: Surgery, room: RoomData): string {
        const raw = String(s.status ?? s.SurgeryStatus ?? "Planned").trim();
        if (this.isInProgressStaleByEstimatedEnd(s, room)) {
            return "Completed";
        }
        return raw;
    }

    /**
     * סימולציית סיום ניתוחים בשורה - כולל Planned ללא התחלה
     */
    private simulateSurgeryEnd(
        surgeryList: Array<{
            entrance: Date | null;
            expectedMin: number;
            status: string;
        }>,
        shiftStart: Date,
        shiftEnd: Date
    ): Date | null {
        const TURNOVER_MIN = 20;
        let cursor: Date | null = null;
        let hasActiveBefore1430 = false;

        for (const item of surgeryList) {
            // אם entrance הוא null, זה Planned ללא התחלה - משנים לתור אחרי הקודם
            const start = item.entrance
                ? cursor
                    ? new Date(
                          Math.max(
                              item.entrance.getTime(),
                              cursor.getTime() + TURNOVER_MIN * 60000
                          )
                      )
                    : item.entrance
                : cursor
                ? new Date(cursor.getTime() + TURNOVER_MIN * 60000)
                : shiftStart;

            const end = new Date(start.getTime() + item.expectedMin * 60000);

            if (item.entrance && end.getTime() > shiftEnd.getTime()) {
                hasActiveBefore1430 =
                    item.entrance.getTime() <
                    new Date(shiftStart).setHours(14, 30, 0, 0);
                if (hasActiveBefore1430) {
                    return end;
                }
            }

            cursor = end;
        }

        return cursor;
    }
    getRoomDurationInfo(room: RoomData): {
        icon: string;
        text: string;
        time: string;
        color: string;
        isIdleOver20Min: boolean;
        isIdleOver40Min?: boolean;
    } | null {
        if (!room?.surgeries?.length || !room.date) return null;

        const now = new Date();
        const dayEnd = this.workingEnd(room.date);
        const nowClamped = now < dayEnd ? now : dayEnd;

        // ✅ בדיקה 1: יש ניתוח בתהליך?
        const activeSurgery = this.getActiveSurgery(room);
        if (activeSurgery) {
            return this.getActiveDurationInfo(activeSurgery, room.date, now);
        }

        // ✅ בדיקה 2: אם כל הניתוחים בתהליך או מתוכננים ללא זמנים
        if (this.hasNoTimeEntriesAtAll(room)) {
            return {
                icon: "❓",
                text: "לא הוזנו זמנים",
                time: "--:--",
                color: "gray",
                isIdleOver20Min: false,
                isIdleOver40Min: false,
            };
        }

        // ✅ בדיקה 3: חדר פנוי - חישוב זמן פנאי
        return this.getIdleDurationInfo(room, nowClamped);
    }

    /**
     * בדיקה אם כל הניתוחים בחדר ללא זמנים הוזנים
     */
    private hasNoTimeEntriesAtAll(room: RoomData): boolean {
        return room.surgeries.every((s: Surgery) => {
            const entrance = this.getEntranceTime(s);
            const exit = this.getExitTime(s);

            // אם שניהם חסרים או שניהם 00:00 - אין זמנים
            return (
                (!entrance || this.isZeroTime(entrance)) &&
                (!exit || this.isZeroTime(exit))
            );
        });
    }

    /**
     * זמן הפעילות של הניתוח הנוכחי
     */
    private getActiveDurationInfo(
        surgery: Surgery | Partial<Surgery>,
        baseDate: string | Date,
        now: Date
    ): {
        icon: string;
        text: string;
        time: string;
        color: string;
        isIdleOver20Min: boolean;
        isIdleOver40Min: boolean;
    } | null {
        const startStr = this.getEntranceTime(surgery);

        // ✅ אם אין שעת כניסה או היא 00:00 - טרם הוזן זמן
        if (!startStr || this.isZeroTime(startStr)) {
            return {
                icon: "📝",
                text: "ניתוח בביצוע (טרם הוזן זמן)",
                time: "--:--",
                color: "orange",
                isIdleOver20Min: false,
                isIdleOver40Min: false,
            };
        }

        const startTime = this.parseClockWithDate(startStr, baseDate);
        if (!startTime) return null;

        const elapsedMin = Math.max(
            0,
            Math.floor((now.getTime() - startTime.getTime()) / 60000)
        );
        const hm = this.formatHM(elapsedMin);

        return {
            icon: "⏱️",
            text: `חדר פעיל ${hm}`,
            time: hm,
            color: "inherit",
            isIdleOver20Min: false,
            isIdleOver40Min: elapsedMin > 40,
        };
    }

    /**
     * זמן ההמתנה/פנאי כשאין ניתוח פעיל
     * חישוב: מסוף הניתוח הקודם ועד עכשיו
     */
    private getIdleDurationInfo(
        room: RoomData,
        nowClamped: Date
    ): {
        icon: string;
        text: string;
        time: string;
        color: string;
        isIdleOver20Min: boolean;
        isIdleOver40Min: boolean;
    } | null {
        const lastCompletedSurgery = this.findLastCompletedSurgery(room);
        if (!lastCompletedSurgery) return null;

        const lastEndTime = this.getLastSurgeryEndTime(
            lastCompletedSurgery,
            new Date(room.date)
        );
        if (!lastEndTime) return null;

        // ✅ בדוק אם יש ניתוח שהתחיל אחרי הסיום
        if (this.hasSubsequentSurgery(room, lastEndTime)) {
            return null;
        }

        const idleStart = this.clampToIdleMetricsDayStart(
            lastEndTime,
            room.date
        );

        // ✅ חישוב זמן פנאי מסיום הניתוח (לא לפני 07:00 ביום הנבחר)
        const idleMin = Math.max(
            0,
            Math.floor((nowClamped.getTime() - idleStart.getTime()) / 60000)
        );

        // אם חלפו פחות מ-1 דקה, לא הצג (החדר זה עתה שוחרר)
        if (idleMin < 1) return null;

        const hm = this.formatHM(idleMin);
        const isOverdue = idleMin > 20;

        return {
            icon: isOverdue ? "⚠️" : "😴",
            text: `חדר פנוי ${hm}
            `,
            time: hm,
            color: isOverdue ? "red" : "inherit",
            isIdleOver20Min: isOverdue,
            isIdleOver40Min: idleMin > 40,
        };
    }

    /**
     * מציאת הניתוח האחרון שהושלם
     */
    private findLastCompletedSurgery(room: RoomData): Surgery | null {
        room.surgeries = room.surgeries.map(this.normalizeSurgery);

        return (
            [...(room.surgeries ?? [])]
                .filter(Boolean)
                .reverse()
                .find((s: Surgery) => {
                    const status = String(
                        s.SurgeryStatus ?? s.status ?? ""
                    ).trim();
                    const endStr = String(
                        s.TimeExitingTheOperatingRoom ??
                            this.getExitTime(s) ??
                            ""
                    ).trim();

                    return (
                        status === "Completed" && endStr && endStr !== "00:00"
                    );
                }) ?? null
        );
    }

    /**
     * חילוץ זמן הסיום של הניתוח (תומך במספר שדות)
     */
    private getLastSurgeryEndTime(surgery: Surgery, date: Date): Date | null {
        const endStr =
            surgery.timeEndSurgery ??
            this.getExitTime(surgery);

        if (!endStr || this.isZeroTime(endStr)) return null;

        return this.parseClockWithDate(endStr, date);
    }

    /**
     * בדיקה אם יש ניתוח שהתחיל אחרי סיום נתוח מסוים
     */
    private hasSubsequentSurgery(
        room: RoomData,
        referenceEndTime: Date
    ): boolean {
        return room.surgeries.some((s: Surgery) => {
            const startStr = this.getEntranceTime(s);
            if (!startStr || this.isZeroTime(startStr)) return false;

            const start = this.parseClockWithDate(startStr, room.date);
            return start && start.getTime() > referenceEndTime.getTime();
        });
    }

    /**
     * מציאת הניתוח הפעיל ביותר עדכני
     */
    private getActiveSurgery(room: RoomData): Surgery | null {
        let active: Surgery | null = null;
        let latestTime = -Infinity;

        for (const s of room.surgeries || []) {
            if (!this.isInProgressStatus(s.status ?? s.SurgeryStatus)) continue;

            const ent = this.getEntranceTime(s);
            if (!ent) continue;

            const time = this.parseClockWithDate(ent, room.date);
            if (time && time.getTime() > latestTime) {
                active = s;
                latestTime = time.getTime();
            }
        }

        return active;
    }

    private isRtmTimeEmpty(s: Surgery | null | undefined): boolean {
        const v = s?.TimeEntranceToTheOperatingRoom;
        if (v == null || String(v).trim() === "") return true;
        return this.isZeroTime(String(v));
    }

    private isRtmExitEmpty(s: Surgery | null | undefined): boolean {
        const v = s?.TimeExitingTheOperatingRoom;
        if (v == null || String(v).trim() === "") return true;
        return this.isZeroTime(String(v));
    }

    /** שני שדות RTM ריקים / 00:00 — אין נתוני זמן אמת מהחדר */
    private hasNoRtmEntranceExit(s: Surgery): boolean {
        return this.isRtmTimeEmpty(s) && this.isRtmExitEmpty(s);
    }

    private surgeryIdentityKey(x: Surgery): string {
        const a = x.surgeryId ?? (x as any).SurgeryID ?? (x as any).CaseNumber;
        return a != null && String(a).trim() !== "" ? String(a) : "";
    }

    private isSameSurgeryInRoom(a: Surgery, b: Surgery): boolean {
        if (a === b) return true;
        const ka = this.surgeryIdentityKey(a);
        const kb = this.surgeryIdentityKey(b);
        return ka !== "" && kb !== "" && ka === kb;
    }

    private findRoomForSurgery(surgery: Surgery): RoomData | null {
        for (const r of this.roomsData ?? []) {
            if (r?.surgeries?.some((x) => this.isSameSurgeryInRoom(x, surgery))) {
                return r;
            }
        }
        return null;
    }

    private getRoomOfSurgery(surgery: Surgery): RoomData | null {
        return this.findRoomForSurgery(surgery);
    }

    /** מתוכננים בלבד, בסדר רשימת החדר */
    private orderedPlannedSurgeries(room: RoomData): Surgery[] {
        return (room.surgeries ?? []).filter((s) => {
            const st = String(s.status ?? s.SurgeryStatus ?? "")
                .toLowerCase()
                .replace(/\s+/g, "");
            return st === "planned";
        });
    }

    /** דקות ללו״ז: קודם AvgDuration; אם אין — TimeSurgeryToDo */
    private getAvgDurationMinutesForSchedule(s: Surgery): number | null {
        const fromAvg = this.parseAvgDurationFieldToMinutes(s);
        if (fromAvg != null) return fromAvg;
        const drorTime = s?.TimeSurgeryToDo;
        if (drorTime != null && !Number.isNaN(+drorTime)) {
            const val = Math.max(0, Math.round(+drorTime));
            if (val >= 5 && val <= 480) return val;
        }
        return null;
    }

    private plannedScheduleDurationLabel(s: Surgery): string {
        const m = this.getAvgDurationMinutesForSchedule(s);
        return m != null && m > 0 ? this.formatHM(m) : "לא הוזן";
    }

    private readonly PLANNED_PREP_MS = 20 * 60 * 1000;

    /** סדר אחיד: הושלמו (לפי כניסה → יציאה) → בתהליך → מתוכננים (לפי כניסה) */
    private buildRoomTimeline(room: RoomData): Surgery[] {
        const roomDate = room.date || this.selectedDate;
        const surgeries = (room.surgeries || []).filter((s) => {
            const st = String(s.status ?? s.SurgeryStatus ?? "").toLowerCase();
            return st !== "cancelled" && st !== "canceled";
        });

        const completed = surgeries
            .filter((s) => {
                const st = String(s.status ?? s.SurgeryStatus ?? "")
                    .toLowerCase()
                    .replace(/\s+/g, "");
                return st === "completed";
            })
            .sort((a, b) => {
                const aEnt = this.parseClockWithDate(
                    this.getEntranceTime(a) || "",
                    roomDate
                );
                const bEnt = this.parseClockWithDate(
                    this.getEntranceTime(b) || "",
                    roomDate
                );
                const aExit = this.parseClockWithDate(
                    this.getExitTime(a) || "",
                    roomDate
                );
                const bExit = this.parseClockWithDate(
                    this.getExitTime(b) || "",
                    roomDate
                );
                const am = aEnt?.getTime() ?? aExit?.getTime() ?? 0;
                const bm = bEnt?.getTime() ?? bExit?.getTime() ?? 0;
                if (am !== bm) return am - bm;
                return (aExit?.getTime() ?? 0) - (bExit?.getTime() ?? 0);
            });

        const inProgress = surgeries
            .filter((s) => {
                const st = String(s.status ?? s.SurgeryStatus ?? "").toLowerCase();
                return st.includes("progress");
            })
            .sort((a, b) => {
                const aEnt = this.parseClockWithDate(
                    this.getEntranceTime(a) || "",
                    roomDate
                );
                const bEnt = this.parseClockWithDate(
                    this.getEntranceTime(b) || "",
                    roomDate
                );
                return (aEnt?.getTime() ?? 0) - (bEnt?.getTime() ?? 0);
            });

        const planned = surgeries
            .filter((s) => {
                const st = String(s.status ?? s.SurgeryStatus ?? "")
                    .toLowerCase()
                    .replace(/\s+/g, "");
                return st === "planned";
            })
            .sort((a, b) => {
                const aEnt = this.parseClockWithDate(
                    this.getEntranceTime(a) || "",
                    roomDate
                );
                const bEnt = this.parseClockWithDate(
                    this.getEntranceTime(b) || "",
                    roomDate
                );
                const am = aEnt?.getTime() ?? a.sortKey ?? 0;
                const bm = bEnt?.getTime() ?? b.sortKey ?? 0;
                if (am !== bm) return am - bm;
                return (a.sortKey ?? 0) - (b.sortKey ?? 0);
            });

        return [...completed, ...inProgress, ...planned];
    }

    /**
     * שורת לו"ז משוער לניתוח מתוכנן ללא RTM וללא זמני כניסה/יציאה ממוזגים
     * — ציר אחד: הושלם / בתהליך / מתוכנן, כל אחד אחרי הקודם + 20 דק׳
     */
    private getPlannedScheduleRow(surgery: Surgery): {
        start: Date;
        end: Date | null;
        durationLabel: string;
    } | null {
        const room = this.getRoomOfSurgery(surgery);
        if (!room) return null;

        const list = this.buildRoomTimeline(room);
        const idx = list.findIndex((s) => this.isSameSurgeryInRoom(s, surgery));
        if (idx === -1) return null;

        const baseDate =
            surgery.SurgeryDate || room.date || this.selectedDate;

        const prev = idx > 0 ? list[idx - 1] : null;

        let prevEnd: Date | null = null;

        if (prev) {
            const status = String(
                prev.SurgeryStatus || prev.status || ""
            ).toLowerCase();

            const entStr = this.getEntranceTime(prev);
            const exitStr = this.getExitTime(prev);

            const ent =
                entStr && !this.isZeroTime(entStr)
                    ? this.parseClockWithDate(entStr, baseDate)
                    : null;

            const exit =
                exitStr && !this.isZeroTime(exitStr)
                    ? this.parseClockWithDate(exitStr, baseDate)
                    : null;

            if (status.replace(/\s+/g, "") === "completed" && exit) {
                prevEnd = exit;
                if (ent && prevEnd.getTime() < ent.getTime()) {
                    prevEnd = new Date(
                        prevEnd.getTime() + 24 * 60 * 60 * 1000
                    );
                }
            } else if (status.includes("progress") && ent) {
                const dur = this.getExpectedDuration(prev);
                const estimatedEnd = new Date(ent.getTime() + dur * 60000);
                const now = new Date();
                prevEnd = now > estimatedEnd ? now : estimatedEnd;
            } else {
                const prevRow = this.getPlannedScheduleRow(prev);
                prevEnd = prevRow?.end || null;
            }
        }

        let start: Date;
        const dayStart = this.parseClockWithDate("07:30", baseDate);
        if (!dayStart) return null;

        if (!prevEnd) {
            start = dayStart;
        } else {
            start = new Date(prevEnd.getTime() + 20 * 60000);
        }

        const durMin = this.getExpectedDuration(surgery);
        const end =
            durMin > 0
                ? new Date(start.getTime() + durMin * 60000)
                : null;

        return {
            start,
            end,
            durationLabel: this.getExpectedDurationDisplay(surgery),
        };
    }

    isFirstPlannedSurgery(surgery: Surgery): boolean {
        const room = this.findRoomForSurgery(surgery);
        if (!room) return true;
        const list = this.orderedPlannedSurgeries(room);
        const idx = list.findIndex((x) => this.isSameSurgeryInRoom(x, surgery));
        return idx <= 0;
    }

    /** סיום משוער של הניתוח המתוכנן הקודם (התחלה + משך, בלי 20 דק׳ הכנה) */
    getPreviousEstimatedEnd(surgery: Surgery): Date | null {
        const room = this.findRoomForSurgery(surgery);
        if (!room) return null;
        const list = this.orderedPlannedSurgeries(room);
        const idx = list.findIndex((x) => this.isSameSurgeryInRoom(x, surgery));
        if (idx <= 0) return null;
        const baseDate = room.date || this.selectedDate;
        const dayStart = this.parseClockWithDate("07:30", baseDate);
        if (!dayStart) return null;
        let prevEnd: Date | null = null;
        for (let i = 0; i < idx; i++) {
            const s = list[i];
            const durMin = this.getAvgDurationMinutesForSchedule(s);
            let start: Date;
            if (i === 0) {
                start = dayStart;
            } else {
                start = prevEnd
                    ? new Date(prevEnd.getTime() + this.PLANNED_PREP_MS)
                    : dayStart;
            }
            prevEnd =
                durMin != null && durMin > 0
                    ? new Date(start.getTime() + durMin * 60000)
                    : null;
        }
        return prevEnd;
    }

    /**
     * זמן סיום משמש לחישוב גלישה מעל 15:00 — אותה לוגיקה של סיום כמו ב־formatSurgeryTimes.
     */
    private getSurgeryDisplayEndDate(surgery: Surgery): Date | null {
        const entrance = this.getEntranceTime(surgery);
        const exit = this.getExitTime(surgery);
        const hasEntrance = !!entrance && !this.isZeroTime(entrance);
        const hasExit = !!exit && !this.isZeroTime(exit);
        const baseDate = surgery.SurgeryDate || this.selectedDate;

        const status = (surgery.status ?? surgery.SurgeryStatus ?? "").toLowerCase();
        const isPlanned =
            String(surgery.status ?? surgery.SurgeryStatus ?? "")
                .toLowerCase()
                .replace(/\s+/g, "") === "planned";

        if (
            isPlanned &&
            this.hasNoRtmEntranceExit(surgery) &&
            !hasEntrance &&
            !hasExit
        ) {
            const row = this.getPlannedScheduleRow(surgery);
            return row?.end ?? null;
        }

        if (hasExit) {
            return this.parseClockWithDate(exit!, baseDate);
        }

        if (!hasEntrance) {
            return null;
        }

        const expectedMin = this.getExpectedDuration(surgery);
        if (!Number.isFinite(expectedMin) || expectedMin <= 0) return null;
        return this.calculateEstimatedEndTime(entrance!, expectedMin);
    }

    /** תוספת HTML לשורת גלישה אחרי 15:00 (יום עבודה), או מחרוזת ריקה */
    private formatSurgeryOverrunSuffixHtml(surgery: Surgery): string {
        const end = this.getSurgeryDisplayEndDate(surgery);
        if (!end) return "";
        const baseDate = surgery.SurgeryDate || this.selectedDate;
        const dayEnd = this.workingEnd(baseDate);
        if (end.getTime() <= dayEnd.getTime()) return "";
        const min = Math.floor((end.getTime() - dayEnd.getTime()) / 60000);
        if (min <= 0) return "";
        return `<br><span class="surgery-overrun">גלישה ${this.formatHM(min)}</span>`;
    }

    formatSurgeryTimes(surgery: Surgery): string {
        return (
            this._formatSurgeryTimesCore(surgery) +
            this.formatSurgeryOverrunSuffixHtml(surgery)
        );
    }

    private _formatSurgeryTimesCore(surgery: Surgery): string {
        const entrance = this.getEntranceTime(surgery);
        const exit = this.getExitTime(surgery);

        const entranceDisplay = this.formatTimeForDisplay(entrance);
        const exitDisplay = this.formatTimeForDisplay(exit);

        const hasEntrance = !!entrance && !this.isZeroTime(entrance);
        const hasExit = !!exit && !this.isZeroTime(exit);
        const durationDisplay = this.getExpectedDurationDisplay(surgery);

        const status = (surgery.status ?? surgery.SurgeryStatus ?? "").toLowerCase();

        const isPlanned =
            String(surgery.status ?? surgery.SurgeryStatus ?? "")
                .toLowerCase()
                .replace(/\s+/g, "") === "planned";

        if (
            isPlanned &&
            this.hasNoRtmEntranceExit(surgery) &&
            !hasEntrance &&
            !hasExit
        ) {
            const row = this.getPlannedScheduleRow(surgery);
            if (row) {
                const startStr = this._formatClock(row.start);
                const endStr = row.end ? this._formatClock(row.end) : "--:--";
                return `${startStr} → ${endStr}<br>(משוער, ${row.durationLabel})`;
            }
        }

        if (hasExit) {
            if (
                status === "planned" ||
                status === "inprogress" ||
                status === "in progress"
            ) {
                return `${entranceDisplay} → ${exitDisplay}<br>(משוער, ${durationDisplay})`;
            }
            if (status === "completed" && hasEntrance) {
                const entranceDate = this.parseClockWithDate(
                    entrance!,
                    surgery.SurgeryDate || this.selectedDate
                );
                const exitDate = this.parseClockWithDate(
                    exit!,
                    surgery.SurgeryDate || this.selectedDate
                );
                if (entranceDate && exitDate) {
                    const actualMinutes = Math.floor(
                        (exitDate.getTime() - entranceDate.getTime()) / 60000
                    );
                    const actualDuration = this.formatHM(actualMinutes);
                    return `${entranceDisplay} → ${exitDisplay}<br>(בפועל: ${actualDuration})`;
                }
            }
            return `${entranceDisplay} → ${exitDisplay}`;
        }

        if (!hasEntrance) {
            return `${entranceDisplay} → ${exitDisplay}<br>(משוער, ${durationDisplay})`;
        }

        const expectedMin = this.getExpectedDuration(surgery);
        const estimatedExit =
            Number.isFinite(expectedMin) && expectedMin > 0
                ? this.calculateEstimatedEndTime(entrance!, expectedMin)
                : null;

        const estimatedExitDisplay = estimatedExit
            ? this._formatClock(estimatedExit)
            : "--:--";
        return `${entranceDisplay} → ${estimatedExitDisplay}<br>(משוער, ${durationDisplay})`;
    }

    /** זמני ניתוח בשורה אחת (לטבלה), בלי תגי HTML */
    formatSurgeryTimesOneLine(surgery: Surgery): string {
        const raw = this.formatSurgeryTimes(surgery);
        return raw
            .replace(/<br\s*\/?>/gi, " · ")
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    // private formatTimeForDisplay(time: string | null): string {
    //     if (!time || this.isZeroTime(time)) {
    //         return "טרם הוזן";
    //     }
    //     return time;
    // }

    /**
     * חישוב זמן סיום משוער בהתאם לזמן כניסה ומשך משוער
     */
    private calculateEstimatedEndTime(
        entranceStr: string | null,
        expectedMin: number
    ): Date | null {
        if (!entranceStr || this.isZeroTime(entranceStr)) return null;

        const entrance = this.parseClock(entranceStr);
        if (!entrance) return null;

        return new Date(entrance.getTime() + expectedMin * 60000);
    }

    /**
     * עיצוב זמן יחיד לתצוגה
     * - אם חסר או 00:00 → "טרם הוזן"
     * - אחרת → הזמן כפי שהוא
     */
    private formatTimeForDisplay(time: string | null): string {
        if (!time || this.isZeroTime(time)) {
            return "טרם הוזן";
        }
        return time;
    }
    /**
     * עיצוב זמן יחיד לתצוגה
     * - אם חסר או 00:00 → "טרם הוזן"
     * - אחרת → הזמן כפי שהוא
     */

    statusHebrew: Record<string, string> = {
        Completed: "הושלם",
        InProgress: "בביצוע",
        Planned: "מתוכנן",
    };

    // הוסף בקומפוננטה

    getIdleMinutes(room: RoomData): number {
        if (this.hasInProgress(room)) return 0;

        // את זה כבר יש לך בפאנל: d.freeFromText / freeFromDate.
        // נשתמש ב"מאז מתי החדר פנוי" מתוך ה-room details.
        const d = this.getRoomDetailsPanel(room);
        const freeFrom: Date | null = d?.freeFromDate ?? null; // <-- אם אין לך freeFromDate, תוסיף שם

        if (!freeFrom) return 0;

        const now = new Date();
        return Math.max(
            0,
            Math.floor((now.getTime() - freeFrom.getTime()) / 60000)
        );
    }

    getIdleBorderClass(room: RoomData): string {
        const m = this.getIdleMinutes(room);
        if (m >= 40) return "idle-40";
        if (m >= 20) return "idle-20";
        return "";
    }

    toMinutes(hhmm: string): number {
        if (!hhmm) return 0;
        const [h, m] = hhmm.split(":").map(Number);
        return h * 60 + m;
    }

    /** המרת משך (מספר דקות או מחרוזת HH:mm) לדקות; מחזיר null אם לא תקין */
    private _durationToMinutes(v: string | number | null | undefined): number | null {
        if (v == null || v === "") return null;
        if (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 6000) return Math.round(v);
        const s = String(v).trim();
        if (s.includes(":")) {
            const min = this.toMinutes(s);
            return min > 0 && min <= 6000 ? min : null;
        }
        const n = parseInt(s, 10);
        return Number.isFinite(n) && n > 0 && n <= 6000 ? n : null;
    }

    /** תצוגת משך: דקות בפורמט HH:mm, או "לא הוזן" אם אין מקור (לוח / ממוצע / דרור) */
    getExpectedDurationDisplay(surgery: Surgery | Partial<Surgery>): string {
        if ((surgery as Surgery).timeNotEntered) return "לא הוזן";
        const min = this.getExpectedDuration(surgery as Surgery);
        return min > 0 ? this.formatHM(min) : "לא הוזן";
    }

    // component.ts

    hasDuration(s: Surgery | Partial<Surgery>): boolean {
        const v = s?.TimeSurgeryToDo ?? s?.timeSurgeryToDo;
        const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
        return Number.isFinite(n) && n > 0;
    }

    // uses the already computed _displayEnd from sortByPredicted (loadRoomsData)
    getEstimatedEnd(s: Surgery | Partial<Surgery>, room: RoomData): string | null {
        const end: Date | null = s?._displayEnd ?? null;
        if (!end || isNaN(end.getTime())) return null;
        return this.toHHmm(end);
    }
    private getRemainingWorkOverrunText(room: RoomData): string {
        if (!room?.surgeries?.length) return "--:--";
        if (this.isRoomPastDay(room) || this.isRoomClosedForColoring(room))
            return "--:--";

        const baseDate = room.date || this.selectedDate;
        const shiftEnd = this.workingEnd(baseDate); // 15:00
        const TURNOVER_MIN = 20;

        const nowRaw = new Date();
        // לעבוד על "עכשיו" בתוך יום נבחר (כמו אצלך)
        const now = this.isRoomToday(room) ? nowRaw : this._nowInSelectedDay();

        // לוקחים רק ניתוחים של היום, שלא הושלמו (כולל InProgress + Planned)
        const list = room.surgeries
            .filter((s) => {
                const d = s.surgeryDate ?? s.SurgeryDate ?? baseDate;
                return String(d).slice(0, 10) === String(baseDate).slice(0, 10);
            })
            .map((s) => this._normForRemainder(s, baseDate))
            .filter((x) => x && x.entrance && x.status !== "completed")
            .sort((a, b) => a.entrance!.getTime() - b.entrance!.getTime());

        if (!list.length) return "--:--";

        // מצביע זמן שממנו מתחילים לתזמן "מהעכשיו"
        let cursor = now;

        // אם יש ניתוח פעיל עכשיו -> מסיימים אותו לפי remaining, ואז מוסיפים 20 דק'
        const active = this._pickActiveNow(room, now, baseDate);
        if (active) {
            const endOfActive = active.predictedEnd ?? now;
            cursor = new Date(endOfActive.getTime() + TURNOVER_MIN * 60000);
        }

        // מתזמנים את כל המתוכננים שלאחר מכן: start=max(entrance,cursor), end=start+dur, cursor=end+20
        let lastEnd: Date | null = active?.predictedEnd ?? null;

        for (const it of list) {
            // מדלגים על הפעיל שכבר חישבנו
            if (active && it.idKey === active.idKey) continue;

            const start = new Date(
                Math.max(it.entrance!.getTime(), cursor.getTime())
            );
            const end = new Date(start.getTime() + it.durationMin * 60000);

            lastEnd = end;
            cursor = new Date(end.getTime() + TURNOVER_MIN * 60000);
        }

        if (!lastEnd) return "--:--";

        const overrunMin = Math.max(
            0,
            Math.round((lastEnd.getTime() - shiftEnd.getTime()) / 60000)
        );
        const remainMin = Math.max(
            0,
            Math.round((lastEnd.getTime() - now.getTime()) / 60000)
        );

        const endHHmm = this._formatClock(lastEnd);
        const overrunHMM =
            overrunMin > 0 ? this._formatHMM_fromMinutes(overrunMin) : "00:00";
        const remainHMM =
            remainMin > 0 ? this._formatHMM_fromMinutes(remainMin) : "00:00";

        // פורמט קצר: "מסיים ב-16:10 | גלישה 01:10 | נשאר 02:05"
        return `מסיים ב-${endHHmm} | גלישה ${overrunHMM} | נשאר ${remainHMM}`;
    }

    private _normForRemainder(
        s: Surgery | Partial<Surgery>,
        baseDate: string
    ): {
        idKey: string;
        status: "completed" | "inprogress" | "planned" | "other";
        entrance: Date | null;
        durationMin: number;
    } | null {
        const statusRaw = String(s.status ?? s.SurgeryStatus ?? "")
            .toLowerCase()
            .trim();
        const status =
            statusRaw === "completed"
                ? "completed"
                : statusRaw === "inprogress" ||
                  statusRaw === "in progress" ||
                  statusRaw === "in_progress" ||
                  statusRaw.includes("בתהל")
                ? "inprogress"
                : statusRaw === "planned" || statusRaw === "scheduled"
                ? "planned"
                : "other";

        const eClock = s.timeEntrance ?? s.TimeEntranceToTheOperatingRoom;
        if (!eClock) return null;
        const entrance = this.parseClockWithDate(
            eClock,
            s.surgeryDate ?? s.SurgeryDate ?? baseDate
        );
        if (!entrance) return null;

        // משך משוער: קודם TimeSurgeryToDo (מתוכנן), אחרת diff אם יש exit, אחרת 60
        let dur = 60;
        const ttd = s.TimeSurgeryToDo ?? s.timeSurgeryToDo;
        if (ttd != null && !isNaN(+ttd) && +ttd > 0) dur = Math.round(+ttd);
        else {
            const xClock = s.timeExit ?? s.TimeExitingTheOperatingRoom;
            if (xClock && xClock !== "00:00:00") {
                const exit = this.parseClockWithDate(
                    xClock,
                    s.surgeryDate ?? s.SurgeryDate ?? baseDate
                );
                if (exit) {
                    const ms = exit.getTime() - entrance.getTime();
                    const mins = Math.round(ms / 60000);
                    if (mins > 0) dur = mins;
                }
            }
        }

        const sRecord = s as unknown as Record<string, unknown>;
        const idKey = String(s.surgeryId ?? sRecord.SurgeryID ?? sRecord.CaseNumber ?? "");
        return { idKey, status, entrance, durationMin: dur };
    }

    private _pickActiveNow(
        room: RoomData,
        now: Date,
        baseDate: string
    ): { idKey: string; predictedEnd: Date | null } | null {
        const TURNOVER_MIN = 20;

        // בוחר ניתוח InProgress האחרון שהתחיל לפני עכשיו
        let best: Surgery | null = null;
        let bestTs = -Infinity;

        for (const s of room.surgeries) {
            const st = String(s.status ?? s.SurgeryStatus ?? "").toLowerCase();
            const isInProg =
                st === "inprogress" ||
                st === "in progress" ||
                st === "in_progress" ||
                st.includes("בתהל");
            if (!isInProg) continue;

            const eClock = s.timeEntrance ?? s.TimeEntranceToTheOperatingRoom;
            if (!eClock) continue;

            const ent = this.parseClockWithDate(
                eClock,
                s.surgeryDate ?? s.SurgeryDate ?? baseDate
            );
            if (!ent || ent > now) continue;

            if (ent.getTime() > bestTs) {
                best = s;
                bestTs = ent.getTime();
            }
        }

        if (!best) return null;

        const ent = this.parseClockWithDate(
            best.timeEntrance ?? best.TimeEntranceToTheOperatingRoom,
            best.surgeryDate ?? best.SurgeryDate ?? baseDate
        );
        if (!ent) return null;

        // remaining = plannedDur - elapsed
        let dur = 60;
        const ttd = best.TimeSurgeryToDo ?? best.timeSurgeryToDo;
        if (ttd != null && !isNaN(+ttd) && +ttd > 0) dur = Math.round(+ttd);

        const elapsed = Math.max(
            0,
            Math.round((now.getTime() - ent.getTime()) / 60000)
        );
        const remaining = Math.max(0, dur - elapsed);

        const end = new Date(now.getTime() + remaining * 60000);
        const bestRecord = best as unknown as Record<string, unknown>;
        const idKey = String(
            best.surgeryId ?? bestRecord.SurgeryID ?? bestRecord.CaseNumber ?? ""
        );

        return { idKey, predictedEnd: end };
    }
    isIdleOver40(room: RoomData): boolean {
        if (!room || this.hasInProgress(room)) return false;

        const last = this.findLastCompletedSurgery(room);
        if (!last) return false;

        const end = this.getLastSurgeryEndTime(last, new Date(room.date));
        if (!end) return false;

        const now = this._nowInSelectedDay();
        const diffMin = Math.floor((now.getTime() - end.getTime()) / 60000);
        return diffMin >= 40;
    }

    isAllSurgeriesCompleted(room: RoomData): boolean {
        if (!room?.surgeries?.length) return false;
        return room.surgeries.every((s) => {
            const st = String(s?.status ?? s?.SurgeryStatus ?? "").toLowerCase();
            return st === "completed";
        });
    }
    nextPlannedSurgery(room: RoomData) {
        return room.surgeries?.find((s) => s.IsWaitingForSurgery);
    }
    showSummary: boolean = false;

    toggleSummary() {
        this.showSummary = !this.showSummary;
    }
    // private calcOverrunAfter1500(
    //     room: RoomData,
    //     baseDate: string | Date
    // ): number {
    //     const cutoff = this.parseClockWithDate("15:00", baseDate);
    //     if (!cutoff) return 0;

    //     const surgeries = (room.surgeries ?? [])
    //         .map((s) => {
    //             const startStr = this.getEntranceTime(s);
    //             if (!startStr) return null;

    //             const start = this.parseClockWithDate(startStr, baseDate);
    //             if (!start) return null;

    //             const status = (
    //                 s.status ??
    //                 s.SurgeryStatus ??
    //                 ""
    //             ).toLowerCase();

    //             // endActual (אם יש)
    //             const endStr = this.getExitTime(s);
    //             const endActual =
    //                 endStr && !this.isZeroTime(endStr)
    //                     ? this.parseClockWithDate(endStr, baseDate)
    //                     : null;

    //             // endPredict (למתוכנן/אין יציאה): start + (AvgDuration+20)
    //             const avg = Number(s.AvgDauration ?? s.TimeSurgeryToDo ?? 0);
    //             const plannedMin = isFinite(avg) && avg > 0 ? avg + 20 : 20;
    //             const endPredict = new Date(
    //                 start.getTime() + plannedMin * 60000
    //             );

    //             // קבע end לפי סטטוס
    //             let end = endActual ?? endPredict;
    //             if (this.isInProgressStatus(status)) end = new Date(); // עד עכשיו

    //             // חציית חצות
    //             if (end.getTime() < start.getTime())
    //                 end = new Date(end.getTime() + 86400000);

    //             return { start, end };
    //         })
    //         .filter((x): x is { start: Date; end: Date } => !!x)
    //         .sort((a, b) => a.start.getTime() - b.start.getTime());

    //     if (!surgeries.length) return 0;

    //     const lastEnd = surgeries[surgeries.length - 1].end;
    //     return Math.max(
    //         0,
    //         Math.floor((lastEnd.getTime() - cutoff.getTime()) / 60000)
    //     );
    // }

    private calcOverrunAfter1500(
        room: RoomData,
        baseDate: string | Date
    ): number {
        const cutoff = this.parseClockWithDate("15:00", baseDate);
        if (!cutoff) return 0;

        const now = new Date();

        const getPlannedMin = (s: Surgery | Partial<Surgery>): number => {
            const expectedMin = this.getExpectedDuration(s as Surgery); // משך ממוצע
            return Math.max(0, expectedMin) + 20; // ממוצע + SETUP TIME
        };

        // חישוב דיוק יותר של עיכובים בפועל
        const calcActualDeltaMin = (s: Surgery | Partial<Surgery>): number => {
            const plannedMin = getPlannedMin(s);
            const entrStr = this.getEntranceTime(s);
            const exitStr = this.getExitTime(s);

            if (!entrStr || this.isZeroTime(entrStr)) return 0;

            const entrance = this.parseClockWithDate(entrStr, baseDate);
            if (!entrance) return 0;

            let actualMin = 0;
            if (exitStr && !this.isZeroTime(exitStr)) {
                const exit = this.parseClockWithDate(exitStr, baseDate);
                if (exit) {
                    let diff = exit.getTime() - entrance.getTime();
                    if (diff < 0) diff += 24 * 60 * 60 * 1000; // חצות
                    actualMin = Math.round(diff / 60000);
                }
            } else {
                const status = String(
                    s.status ?? s.SurgeryStatus ?? ""
                ).toLowerCase();
                if (this.isInProgressStatus(status)) {
                    actualMin = Math.round(
                        (now.getTime() - entrance.getTime()) / 60000
                    );
                } else {
                    actualMin = plannedMin; // fallback לממוצע
                }
            }

            // הפרש: + = חסכון, - = עיכוב
            return plannedMin - actualMin;
        };

        // 1) קבע "ציר זמן" שמתחיל מהעכשיו, אבל לא לפני סוף הניתוח האחרון עם התחלה ידועה
        let timelineEnd = now;
        let cumulativeDelta = 0; // צבירה של עיכובים/חסכונות

        for (const s of room.surgeries ?? []) {
            const startStr = this.getEntranceTime(s);
            if (!startStr) continue;

            const start = this.parseClockWithDate(startStr, baseDate);
            if (!start) continue;

            const status = String(
                s.status ?? s.SurgeryStatus ?? ""
            ).toLowerCase();

            const endStr = this.getExitTime(s);
            const endActual =
                endStr && !this.isZeroTime(endStr)
                    ? this.parseClockWithDate(endStr, baseDate)
                    : null;

            let end: Date;
            if (this.isInProgressStatus(status)) {
                end = now; // עד עכשיו
            } else if (endActual) {
                end = endActual;
            } else {
                end = new Date(start.getTime() + getPlannedMin(s) * 60000); // fallback משוער אם אין יציאה
            }

            // הוסף את הפרש הניתוח הזה לצבירה
            const deltaForThisSurgery = calcActualDeltaMin(s);
            cumulativeDelta += deltaForThisSurgery;

            if (end.getTime() < start.getTime())
                end = new Date(end.getTime() + 86400000); // חצות
            if (end.getTime() > timelineEnd.getTime()) timelineEnd = end;
        }

        if (timelineEnd.getTime() < now.getTime()) timelineEnd = now;

        // 2) הוסף את כל הניתוחים המתוכננים שאין להם התחלה (נכנסים בתור אחרי "עכשיו")
        const plannedQueue = (room.surgeries ?? []).filter((s: Surgery) => {
            const status = String(
                s.status ?? s.SurgeryStatus ?? ""
            ).toLowerCase();
            const hasStart = !!this.getEntranceTime(s);
            return (
                !hasStart &&
                !this.isCompletedStatus(status) &&
                !this.isInProgressStatus(status)
            );
        });

        for (const s of plannedQueue) {
            timelineEnd = new Date(
                timelineEnd.getTime() + getPlannedMin(s) * 60000
            );
        }

        // שקלול עיכובים/חסכונות מהעבר בחישוב הגלישה הסופית
        // + עיכוב = יותר גלישה
        // - חסכון = פחות גלישה
        const timelineEndAdjusted = new Date(
            timelineEnd.getTime() + Math.max(0, cumulativeDelta) * 60000
        );

        // דרישת לקוח: גלישה = כל דקה מעבר ל-15:00 (כולל מתוכננים, כולל עיכובים בעבר)
        return Math.max(
            0,
            Math.floor(
                (timelineEndAdjusted.getTime() - cutoff.getTime()) / 60000
            )
        );
    }

    getTurnoverSummary(room: RoomData): string {
        if (!room?.surgeries?.length || !room.date) return "";

        const baseDate = room.date;
        const dayStart = this.workingStart(baseDate); // 07:30
        const dayEnd = this.workingEnd(baseDate); // 15:00
        const now = new Date();
        const nowClamped = now < dayEnd ? now : dayEnd;

        const SETUP_TIME = 20; // 20 דקות בין ניתוחים

        // איסוף כל הניתוחים עם זמן כניסה
        const surgeriesWithTime: Array<{ start: Date; end: Date | null; status: string }> = [];
        for (const s of room.surgeries) {
            const startStr = this.getEntranceTime(s);
            if (!startStr || this.isZeroTime(startStr)) continue;
            const start = this.parseClockWithDate(startStr, baseDate);
            if (!start) continue;

            let end: Date | null = null;
            const exitStr = this.getExitTime(s);
            if (exitStr && !this.isZeroTime(exitStr)) {
                end = this.parseClockWithDate(exitStr, baseDate);
            } else if (this.isInProgressStatus(s.status || s.SurgeryStatus || "")) {
                end = nowClamped;
            }

            surgeriesWithTime.push({
                start: start < dayStart ? dayStart : start,
                end: end ? (end > dayEnd ? dayEnd : end) : null,
                status: s.status || s.SurgeryStatus || ""
            });
        }

        if (surgeriesWithTime.length === 0) return "";

        // מיון לפי זמן התחלה
        surgeriesWithTime.sort((a, b) => a.start.getTime() - b.start.getTime());

        // חישוב עיכוב מצטבר = כל זמן פנוי מעבר ל-20 דקות בין ניתוחים (07:30-15:00)
        let totalDelayMin = 0;
        let currentTime = dayStart.getTime();

        for (let i = 0; i < surgeriesWithTime.length; i++) {
            const surgery = surgeriesWithTime[i];
            const surgeryStart = surgery.start.getTime();

            // זמן פנוי לפני הניתוח (אם יש)
            if (surgeryStart > currentTime) {
                const idleBefore = Math.floor((surgeryStart - currentTime) / 60000);
                // עיכוב = זמן פנוי מעבר ל-20 דקות (20 דקות זה תקין)
                const delayBefore = Math.max(0, idleBefore - SETUP_TIME);
                totalDelayMin += delayBefore;
            }

            // עדכון הזמן הנוכחי לסיום הניתוח + 20 דקות הכנה
            if (surgery.end) {
                currentTime = surgery.end.getTime() + SETUP_TIME * 60000;
            } else {
                // ניתוח ללא סיום - משתמשים בזמן נוכחי
                currentTime = nowClamped.getTime() + SETUP_TIME * 60000;
            }
        }

        // זמן פנוי אחרי הניתוח האחרון עד סוף היום - זה לא עיכוב, זה זמן פנוי תקין
        // (לא מוסיפים אותו לעיכוב)

        const delayMin = totalDelayMin;

        if (delayMin > 0) {
            return this.formatHM(delayMin);
        }
        if (surgeriesWithTime.length > 0) {
            return "00:00";
        }
        return "";
    }
}
