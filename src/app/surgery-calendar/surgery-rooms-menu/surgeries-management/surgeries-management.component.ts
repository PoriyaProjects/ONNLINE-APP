import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ViewChild,
  ViewChildren,
  QueryList,
  TemplateRef,
  OnInit,
  ElementRef,
  HostBinding,
  Inject,
  OnDestroy
} from '@angular/core';
import {
  isSameDay,
  isSameMonth,
} from 'date-fns';
import { forkJoin, from, Observable, of, Subject, Subscription, EMPTY } from 'rxjs';
import {
  CalendarEvent,
  CalendarEventTimesChangedEvent,
  CalendarView,
} from 'angular-calendar';
import {
  NgbModal
} from "@ng-bootstrap/ng-bootstrap";
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { DatePipe } from '@angular/common';
import { ConfirmationDialogService } from '../../../confirmation-dialog/confirmation-dialog.service';
import { HttpClient } from '@angular/common/http';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { registerLocaleData } from '@angular/common';
import localeHe from '@angular/common/locales/he';
import { environment } from 'src/environments/environment';
import { ManageSingleSurgeryComponent } from './manage-single-surgery/manage-single-surgery.component';
import { applySurgeriesManagementDialogSize, SURGERY_DIALOG_PANEL_CLASS, SURGERY_ROOM_FILTER_MENU_CLASS, SURGERY_SHARE_PDF_DIALOG_PANEL_CLASS, SURGERY_SUMMARY_DIALOG_PANEL_CLASS, SURGERY_WAITING_REC_DIALOG_PANEL_CLASS } from '../shared/surgeries-dialog-sizing';

const SURGERY_DEPT_PLAN_RETURN_DIALOG_PANEL_CLASS = 'surgery-dept-plan-return-dialog-panel';
const SURGERY_DEPT_PLAN_RETURN_REPORT_DIALOG_PANEL_CLASS = 'surgery-dept-plan-return-report-dialog-panel';
import { DepartmentPlanReturnApiService } from '../shared/department-plan-return-api.service';
import { DepartmentPlanReturnUserDirectoryService } from '../shared/department-plan-return-user-directory.service';
import { PDF_HOSPITAL_HEADER_IMAGE_SRC } from '../shared/pdf-hospital-header-image';
import {
  DEPARTMENT_PLAN_TREATMENT_STATUS_LABELS,
  DEPARTMENT_PLAN_TREATMENT_STATUS_OPTIONS,
  buildDepartmentFinalPlanEmailSubject,
  buildPlanReturnEmailSubject,
  stripDepartmentQuotes,
  normalizeDepartmentForServer,
  recordHasCoordinatorAttention,
  recordQualifiesForBoardReturnIndicator,
  countPlanReturnArrangementComments,
  indexPlanReturnCommentsByCase,
  resolveSurgeryArrangementComment,
  hydratePlanReturnRecordAuthorship,
  firstNonEmptyText,
  normalizePlanReturnCaseNumber,
  recordIsSoftDeleted,
  surgeryRowIsSoftDeleted,
  formatDeletedTooltip,
  formatCreatedTooltip,
  resolveRecordCreatedBy,
  resolveRecordCreatedTimestamp,
  resolveAdUserDisplayName,
  recordCreatedByTechnicalTestUser,
  departmentsMatchForPlanReturn,
  DepartmentPlanReturnRecord,
  DepartmentPlanReturnReportRow,
  DepartmentPlanReturnPayload,
  DepartmentPlanReturnSurgeryRow,
  DepartmentPlanTreatmentStatus,
  flattenPlanReturnReportRows,
} from '../shared/department-plan-return.models';
import {
  VirtualRoomWaitingApiError,
  VirtualRoomWaitingApiService,
} from '../shared/virtual-room-waiting-api.service';
import { PlannedWaitingSlot } from '../shared/virtual-room-waiting.models';
import {
  buildScheduledCompositeKey,
  planWaitingRecommendations,
  getWaitingOperatingDepartment,
  getWaitingRowDurationMinutes,
  RoomBoardColumn,
} from '../shared/virtual-room-slot-planner';
import * as XLSX from 'xlsx';
import { SurgeryBillingAiService } from '../shared/surgery-billing-ai.service';
import { WaitingRecommendationDialogComponent } from '../dialogs/waiting-recommendation-dialog.component';
import { catchError, concatMap, finalize, map, mergeMap, startWith, switchMap, tap } from 'rxjs/operators';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatMenuTrigger } from '@angular/material/menu';
import * as ExcelJS from 'exceljs';
import * as FileSaver from 'file-saver';
const colors: any = {
  red: '#ad2121',
  blue: '#1e90ff',
  yellow: '#e3bc08',
};
export interface Action {
  Row_ID: string,
  ActionDesc: string,
  selected: boolean
}
registerLocaleData(localeHe);

interface SurgeryPriceMeta {
  grossPrice: number;
  isEstimated: boolean;
  isAiRecommended?: boolean;
  serviceCode?: string;
  drgCodes?: string[];
  icd9Codes?: string[];
}

@Component({
  selector: 'app-surgeries-management',
  templateUrl: './surgeries-management.component.html',
  styleUrls: ['../styles/components/surgeries-management.css']
})
export class SurgeriesManagementComponent implements OnInit, AfterViewInit, OnDestroy {
  @HostBinding('class.surgeries-management-dialog-root') readonly surgeriesDialogRoot = true;
  tempArrOfSurgeryRooms: any = []
  pdfString: string;
  selectable = true;
  removable = true;
  separatorKeysCodes: number[] = [ENTER, COMMA];
  @ViewChild('actionInput') public actionInput: ElementRef;
  horizontalPosition: MatSnackBarHorizontalPosition = 'start';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';
  @ViewChild('modalContent', { static: true }) modalContent: TemplateRef<any>;
  @ViewChildren('roomCalendarScroll') roomCalendarScrolls: QueryList<ElementRef<HTMLElement>>;

  view: CalendarView = CalendarView.Month;

  CalendarView = CalendarView;

  viewDate: Date;
  locale: string = 'he';
  dayViewStartHour = 0;
  /** 24-hour clock: 7 = 07:00 AM */
  dayViewScrollToHour = 7;
  dayViewEndHour = 24;
  dayViewEndMinute = 59;
  hourSegmentHeight = 34;
  hourSegments = 2;
  readonly expectedRoomCount = 7;
  _actionsList = [];
  specificRooms = [];
  filteredSpecificRooms = [];
  modalData: {
    action: string;
    event: CalendarEvent;
  };

  refresh: Subject<any> = new Subject();
  events: CalendarEvent[] = [];
  activeDayIsOpen: boolean = true;
  patientSearch: FormGroup;
  date = new Date();
  UserName = localStorage.getItem("loginUserName").toLowerCase();
  loader: boolean = true;
  backgroundRefreshing: boolean = false;
  boardRefreshing: boolean = false;
  surgerySurf: boolean = false;
  loadingDataServer: boolean;
  loadingRoomPrices: boolean = false;
  loadingPhysicalRoomPrices: boolean = false;
  IfPlannedSurgeries: string = "original"
  isPhysicalRoom: boolean = false;
  showWaitingRecommendations = false;
  loadingWaitingRecommendations = false;
  /** Per-room department filter: roomName → department label */
  private roomDepartmentFilters = new Map<string, string>();
  private planReturnIndicatorsByRoom = new Map<string, number>();
  private planReturnIndicatorsByRoomDept = new Map<string, number>();
  private planReturnIndicatorRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  readonly estimatedPriceTooltip = 'לא הוזן בזימון קוד שירות — לכן מוצג מחיר משוער';
  readonly aiRecommendedPriceTooltip = 'קוד שירות והמחיר הומלצו ע"י AI לפי שם הניתוח והפרוצדורות';
  readonly roomFilterMenuClass = SURGERY_ROOM_FILTER_MENU_CLASS;
  private intervalId: any;
  roomPriceSummariesFromServer: any[] = [];
  private rawRoomPriceSummariesFromServer: any[] = [];
  private physicalRoomPriceSummariesFromServer: any[] = [];
  private departmentBenchmarkSummariesFromServer: any[] = [];
  private surgeryPriceByRowId = new Map<string, SurgeryPriceMeta>();
  private aiPriceLoadingRowIds = new Set<string>();
  private aiPriceResolvedRowIds = new Set<string>();
  private aiPriceFailedRowIds = new Set<string>();
  private aiPriceLookupSub: Subscription | null = null;
  private cachedPriceData: any = null;
  private surgeryByRowId = new Map<string, any>();
  private scrollRetryTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingScrollToDefaultHour = false;


  constructor(
    private modal: NgbModal,
    public datePipe: DatePipe,
    private confirmationDialogService: ConfirmationDialogService,
    private http: HttpClient,
    public dialog: MatDialog,
    private _snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<SurgeriesManagementComponent>,
    private cdr: ChangeDetectorRef,
    private virtualRoomWaitingApi: VirtualRoomWaitingApiService,
    private surgeryBillingAiService: SurgeryBillingAiService,
    private departmentPlanReturnApi: DepartmentPlanReturnApiService,
    private departmentPlanReturnUserDirectory: DepartmentPlanReturnUserDirectoryService,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
  }

  ngOnInit(): void {
    applySurgeriesManagementDialogSize(this.dialogRef);
    this.departmentPlanReturnUserDirectory.loadDirectory().subscribe();

    if (this.UserName != null) {
      this.pendingScrollToDefaultHour = true;
      ////debugger
      this.viewDate = this.data.room.Start;
      this.isPhysicalRoom = this.data?.room?.type === 'פז';
      // let day = this.datePipe.transform(this.viewDate, 'dd');
      this.specificRooms = this.data.room.Rooms;
      this.getPatientsQueues();
      // Start the interval when the component initializes
      // this.intervalId = setInterval(() => {
      //   this.getPatientsQueues();
      // }, 120000); // 60000ms = 1 minute
    }
    this.setView(CalendarView.Day);
  }

  setView(view: CalendarView) {
    this.view = view;
  }

  ngAfterViewInit(): void {
    applySurgeriesManagementDialogSize(this.dialogRef);
    this.roomCalendarScrolls.changes.subscribe(() => {
      if (this.pendingScrollToDefaultHour) {
        this.scheduleScrollToDefaultHour();
      }
    });
  }

  ngOnDestroy(): void {
    // Clear the interval when the component is destroyed
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (this.scrollRetryTimeout) {
      clearTimeout(this.scrollRetryTimeout);
    }
    this.aiPriceLookupSub?.unsubscribe();
  }

  dayClicked({ date, events }: { date: Date; events: CalendarEvent[] }, event): void {
    if (isSameMonth(date, this.viewDate)) {
      if (
        (isSameDay(this.viewDate, date) && this.activeDayIsOpen === true || events.length === 0)
      ) {
        this.activeDayIsOpen = false;
        this.handleEvent('NewEvent', event);
      } else {
        this.activeDayIsOpen = true;
      }
      this.viewDate = date;
    }
  }

  surgeriesRefreshDataInServer() {
    this.loadingDataServer = true;
    this.http.post(environment.url + 'SurgeriesRefreshDataInServer', {}).subscribe(res => {
      if (!res['d']) alert("תקלה בטעינת נתונים");
      this.loadingDataServer = false;
      this.ngOnInit();
    });
  }

  eventTimesChanged({
    event,
    newStart,
  }: CalendarEventTimesChangedEvent): void {
    this.events = this.events.map((iEvent) => {
      if (iEvent === event) {
        return {
          ...event,
          start: newStart,
        };
      }
      return iEvent;
    });
  }

  handleEvent(action: string, event: CalendarEvent): void {
    const rawEvent = event as any;
    if (this.isSetupTimeEvent(rawEvent)) {
      return;
    }
    if (rawEvent?.isWaitingRecommendation) {
      this.openWaitingRecommendationDetails(rawEvent);
      return;
    }

    const surgery = this.resolveSurgeryEvent(event);
    if (!surgery) {
      return;
    }

    surgery['RoomsList'] = this.data.roomsList;
    const dialogRef = this.dialog.open(ManageSingleSurgeryComponent, {
      data: {
        event: surgery,
        action: action,
        timeOpened: this.date,
        aiPriceLoading: this.isEventAiPriceLoading(surgery),
      },
      width: '95vw',
      height: '95vh',
      maxWidth: '95vw',
      maxHeight: '95vh',
      disableClose: true,
      panelClass: SURGERY_DIALOG_PANEL_CLASS
    });
    dialogRef.afterClosed().subscribe(() => {
      this.getPatientsQueues({ background: true });
    });
  }

  private isSetupTimeEvent(event: any): boolean {
    return !event?.Row_ID && !event?.SurgeryPatientDetails;
  }

  private rebuildSurgeryIndex(): void {
    this.surgeryByRowId.clear();
    const rooms = [...this.filteredSpecificRooms, ...this.specificRooms];
    rooms.forEach((room) => {
      (room.Surgeries ?? []).forEach((surgery) => {
        if (surgery?.Row_ID != null) {
          this.surgeryByRowId.set(String(surgery.Row_ID), surgery);
        }
      });
    });
  }

  private normalizeSurgeryForDialog(surgery: any): any | null {
    if (!surgery || this.isSetupTimeEvent(surgery)) {
      return null;
    }

    if (!surgery.ArrivalTime && surgery.start) {
      surgery.ArrivalTime = this.datePipe.transform(surgery.start, 'HH:mm');
    }

    if (!surgery.ArrivalTime) {
      return null;
    }

    return surgery;
  }

  private findSurgeryByStart(start: Date): any | null {
    if (!start) {
      return null;
    }

    const targetTime = new Date(start).getTime();
    for (const room of this.filteredSpecificRooms) {
      const match = (room.Surgeries ?? []).find((surgery) => {
        return surgery?.Row_ID && surgery?.start && new Date(surgery.start).getTime() === targetTime;
      });
      if (match) {
        return match;
      }
    }

    return null;
  }

  private resolveSurgeryEvent(event: any): any | null {
    if (!event || this.isSetupTimeEvent(event) || event?.isWaitingRecommendation) {
      return null;
    }

    if (this.surgeryByRowId.size === 0) {
      this.rebuildSurgeryIndex();
    }

    let resolved = event;
    if (event.Row_ID) {
      const indexed = this.surgeryByRowId.get(String(event.Row_ID));
      if (indexed) {
        resolved = indexed;
      } else {
        for (const room of this.filteredSpecificRooms) {
          const match = (room.Surgeries ?? []).find(
            (surgery) => String(surgery.Row_ID) === String(event.Row_ID)
          );
          if (match) {
            resolved = match;
            break;
          }
        }
      }
    } else if (event.start) {
      const byStart = this.findSurgeryByStart(event.start);
      if (byStart) {
        resolved = byStart;
      }
    }

    return this.normalizeSurgeryForDialog(resolved);
  }

  showSummaryReport(room) {
    room['newSurgeries'] = (room.Surgeries ?? []).filter(
      (x) =>
        !this.isSesiaSurgeryType(x) &&
        !this.isUrgentSurgery(x) &&
        x.Row_ID != null &&
        x.SurgeryPatientDetails != null
    );
    this.dialog.open(SummaryDialogComponent, {
      data: { room },
      panelClass: SURGERY_SUMMARY_DIALOG_PANEL_CLASS,
      autoFocus: false,
      width: 'min(94vw, 960px)',
      maxWidth: '96vw',
      height: 'min(88vh, 720px)',
      maxHeight: '92vh',
    });
  }

  openDepartmentPlanReturnDialog(department: string | string[], roomCode: string): void {
    const dialogRef = this.dialog.open(DepartmentPlanReturnDialogComponent, {
      data: {
        mode: 'send',
        department,
        roomCode,
        planDate: this.datePipe.transform(this.viewDate, 'yyyy-MM-dd'),
        calendarRoomsArea: this.getPlanReturnCalendarRoomsArea(roomCode),
        boardSurgeries: this.collectBoardSurgeriesForPlanReturn(department, roomCode),
        onIndicatorsChange: () => this.refreshPlanReturnIndicators(true),
      },
      panelClass: SURGERY_DEPT_PLAN_RETURN_DIALOG_PANEL_CLASS,
      autoFocus: false,
      width: '90vw',
      maxWidth: '90vw',
      height: '94vh',
      maxHeight: '94vh',
      direction: 'rtl',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result?.share) {
        return;
      }

      const shareDialogRef = this.dialog.open(ShareSurgeriesPDFDialog, {
        panelClass: SURGERY_SHARE_PDF_DIALOG_PANEL_CLASS,
        autoFocus: false,
        width: 'min(94vw, 520px)',
        maxWidth: '96vw',
        maxHeight: '90vh',
      });

      shareDialogRef.componentInstance.reportArray = result.html;
      shareDialogRef.componentInstance.department = normalizeDepartmentForServer(department);
      shareDialogRef.componentInstance.arrivalDate = this.datePipe.transform(this.viewDate, 'yyyy-MM-dd');
      shareDialogRef.componentInstance.calendarRoomsArea = this.getPlanReturnCalendarRoomsArea(roomCode);
      shareDialogRef.componentInstance.shareMode = 'department-plan-return';
      shareDialogRef.componentInstance.returnMeta = {
        returnId: result.returnId,
        roomCode,
        generalComment: result.generalComment,
        emailBody: result.emailBody,
      };
    });
  }

  openDepartmentPlanReturnReportDialog(initialTreatmentStatus: 'all' | DepartmentPlanTreatmentStatus = 'all'): void {
    const departments = this.collectAllDepartments();
    this.dialog.open(DepartmentPlanReturnReportDialogComponent, {
      data: {
        departments,
        defaultDate: this.datePipe.transform(this.viewDate, 'yyyy-MM-dd'),
        initialTreatmentStatus,
        openRoomPanel: (roomCode: string, department?: string) => {
          const room = (this.specificRooms ?? []).find((entry: any) =>
            this.normalizeBoardRoomName(entry?.roomName) === this.normalizeBoardRoomName(roomCode)
          );
          const dept = department || room?.uniqueDepartments?.[0];
          if (room && dept) {
            this.openArrangementCommentDialog(dept, roomCode);
          }
        },
      },
      panelClass: SURGERY_DEPT_PLAN_RETURN_REPORT_DIALOG_PANEL_CLASS,
      autoFocus: false,
      width: '98vw',
      maxWidth: '1400px',
      height: '94vh',
      maxHeight: '94vh',
      direction: 'rtl',
    }).afterClosed().subscribe(() => this.refreshPlanReturnIndicators(true));
  }

  openArrangementCommentDialog(department: string, roomCode: string, menuTrigger?: MatMenuTrigger): void {
    this.closeRoomMenu(menuTrigger);

    const dialogRef = this.dialog.open(DepartmentPlanReturnDialogComponent, {
      data: {
        mode: 'unified',
        department,
        roomCode,
        planDate: this.datePipe.transform(this.viewDate, 'yyyy-MM-dd'),
        calendarRoomsArea: this.getPlanReturnCalendarRoomsArea(roomCode),
        boardSurgeries: this.collectBoardSurgeriesForPlanReturn(department, roomCode),
        onIndicatorsChange: () => this.refreshPlanReturnIndicators(true),
      },
      panelClass: SURGERY_DEPT_PLAN_RETURN_DIALOG_PANEL_CLASS,
      autoFocus: false,
      width: '90vw',
      maxWidth: '90vw',
      height: '94vh',
      maxHeight: '94vh',
      direction: 'rtl',
    });

    dialogRef.afterClosed().subscribe((result) => {
      this.refreshPlanReturnIndicators(true);
      if (!result?.share) {
        return;
      }

      const departmentParam = normalizeDepartmentForServer(department);
      const shareDialogRef = this.dialog.open(ShareSurgeriesPDFDialog, {
        panelClass: SURGERY_SHARE_PDF_DIALOG_PANEL_CLASS,
        autoFocus: false,
        width: 'min(94vw, 520px)',
        maxWidth: '96vw',
        maxHeight: '90vh',
      });

      shareDialogRef.componentInstance.reportArray = result.html;
      shareDialogRef.componentInstance.department = departmentParam;
      shareDialogRef.componentInstance.arrivalDate = this.datePipe.transform(this.viewDate, 'yyyy-MM-dd');
      shareDialogRef.componentInstance.calendarRoomsArea = this.getPlanReturnCalendarRoomsArea(roomCode);
      shareDialogRef.componentInstance.shareMode = 'department-plan-return';
      shareDialogRef.componentInstance.returnMeta = {
        returnId: result.returnId,
        roomCode,
        generalComment: result.generalComment,
        emailBody: result.emailBody,
      };
    });
  }

  collectBoardSurgeriesForPlanReturn(
    department: string | string[],
    roomCode: string,
  ): DepartmentPlanReturnSurgeryRow[] {
    const room = (this.specificRooms ?? []).find((entry: any) =>
      this.normalizeBoardRoomName(entry?.roomName) === this.normalizeBoardRoomName(roomCode)
    );
    if (!room) {
      return [];
    }

    const scheduled = (room.Surgeries ?? []).filter((surgery: any) =>
      surgery?.Row_ID && surgery?.SurgeryPatientDetails && surgery?.SurgeryStatus !== 'Canceled'
    );
    const filtered = this.departmentPlanReturnApi.filterBoardSurgeriesByDepartment(scheduled, department);
    return this.departmentPlanReturnApi.mapBoardSurgeriesToRows(filtered, roomCode);
  }

  refreshPlanReturnIndicators(immediate = false): void {
    if (this.planReturnIndicatorRefreshTimer) {
      clearTimeout(this.planReturnIndicatorRefreshTimer);
      this.planReturnIndicatorRefreshTimer = null;
    }

    if (immediate) {
      this.fetchPlanReturnIndicators();
      return;
    }

    this.planReturnIndicatorRefreshTimer = setTimeout(() => {
      this.planReturnIndicatorRefreshTimer = null;
      this.fetchPlanReturnIndicators();
    }, 350);
  }

  private fetchPlanReturnIndicators(): void {
    const planDate = this.datePipe.transform(this.viewDate, 'yyyy-MM-dd');
    const calendarRoomsArea = this.getPlanReturnCalendarRoomsArea() || this.getCalendarRoomsAreaForApi();
    if (!planDate) {
      return;
    }

    const pairs = this.collectRoomDepartmentPairs();
    const roomCodes = this.collectPlanReturnIndicatorRoomAliases();
    this.departmentPlanReturnApi.loadBoardReturnIndicators(planDate, calendarRoomsArea, pairs, roomCodes).subscribe((records) => {
      this.applyPlanReturnIndicators(records);
      this.cdr.detectChanges();
    });
  }

  private resolveBoardSurgeryCaseNumber(surgery: any): string {
    return normalizePlanReturnCaseNumber(
      surgery?.SurgeryPatientDetails?.PM_CASE_NUMBER
      || surgery?.SurgeryPatientDetails?.PM_CASE_NBR
      || surgery?.CaseNumber
      || surgery?.casenumber,
    );
  }

  private collectPlanReturnIndicatorRoomAliases(): string[] {
    const aliases = new Set<string>();
    (this.specificRooms ?? []).forEach((room: any) => {
      this.expandPlanReturnIndicatorRoomAliases(aliases, this.normalizeBoardRoomName(room?.roomName));
    });
    return Array.from(aliases);
  }

  private expandPlanReturnIndicatorRoomAliases(target: Set<string>, roomCode: string): void {
    const normalized = this.normalizeBoardRoomName(roomCode);
    if (!normalized) {
      return;
    }
    target.add(normalized);
    const canonical = this.canonicalizeSurgeryRoomCode(normalized);
    if (canonical) {
      target.add(canonical);
    }
    if (/ור/.test(normalized)) {
      target.add(this.mapVirtualRoomCodeToPhysical(normalized));
    }
    if (/פז/.test(normalized)) {
      target.add(this.mapPhysicalRoomCodeToVirtual(normalized));
    }
  }

  private planReturnRoomCodesMatch(boardRoomCode: string, recordRoomCode: string): boolean {
    const boardAliases = new Set<string>();
    const recordAliases = new Set<string>();
    this.expandPlanReturnIndicatorRoomAliases(boardAliases, boardRoomCode);
    this.expandPlanReturnIndicatorRoomAliases(recordAliases, recordRoomCode);
    for (const alias of recordAliases) {
      if (boardAliases.has(alias)) {
        return true;
      }
    }
    return false;
  }

  private resolvePlanReturnIndicatorBoardRoomKey(recordRoomCode: string): string | null {
    const boardRooms = this.specificRooms ?? [];
    for (const room of boardRooms) {
      const displayName = this.normalizeBoardRoomName(room?.roomName);
      if (!displayName) {
        continue;
      }
      if (this.planReturnRoomCodesMatch(displayName, recordRoomCode)) {
        return displayName;
      }
    }
    return null;
  }

  private applyPlanReturnIndicators(records: DepartmentPlanReturnRecord[]): void {
    this.planReturnIndicatorsByRoom.clear();
    this.planReturnIndicatorsByRoomDept.clear();

    const commentsByCase = indexPlanReturnCommentsByCase(records);

    (this.specificRooms ?? []).forEach((room: any) => {
      const roomName = this.normalizeBoardRoomName(room?.roomName);
      if (!roomName) {
        return;
      }

      const surgeries = (room.Surgeries ?? []).filter((surgery: any) =>
        surgery?.Row_ID && surgery?.SurgeryPatientDetails && surgery?.SurgeryStatus !== 'Canceled'
      );

      surgeries.forEach((surgery: any) => {
        const caseNumber = this.resolveBoardSurgeryCaseNumber(surgery);
        const commentEntry = caseNumber ? commentsByCase.get(caseNumber) : undefined;
        if (!commentEntry) {
          return;
        }

        this.planReturnIndicatorsByRoom.set(
          roomName,
          (this.planReturnIndicatorsByRoom.get(roomName) || 0) + 1,
        );

        const department = String(surgery?.SurgeryRequestDepartments?.S_DEPARTMENT || '').trim();
        if (!department || !departmentsMatchForPlanReturn(commentEntry.department, department)) {
          return;
        }

        const roomDeptKey = `${roomName}::${normalizeDepartmentForServer(department)}`;
        this.planReturnIndicatorsByRoomDept.set(
          roomDeptKey,
          (this.planReturnIndicatorsByRoomDept.get(roomDeptKey) || 0) + 1,
        );
      });
    });

    records.forEach((record) => {
      if (recordIsSoftDeleted(record)) {
        return;
      }
      const generalComment = (record.generalComment || '').trim();
      if (!generalComment) {
        return;
      }

      const boardRoomKey = this.resolvePlanReturnIndicatorBoardRoomKey(record.roomCode);
      if (!boardRoomKey) {
        return;
      }

      this.planReturnIndicatorsByRoom.set(
        boardRoomKey,
        (this.planReturnIndicatorsByRoom.get(boardRoomKey) || 0) + 1,
      );

      const department = stripDepartmentQuotes(record.departmentDisplay || record.department);
      if (!department) {
        return;
      }
      const roomDeptKey = `${boardRoomKey}::${normalizeDepartmentForServer(department)}`;
      this.planReturnIndicatorsByRoomDept.set(
        roomDeptKey,
        (this.planReturnIndicatorsByRoomDept.get(roomDeptKey) || 0) + 1,
      );
    });

    this.cdr.markForCheck();
  }

  private collectRoomDepartmentPairs(): Array<{ roomCode: string; department: string }> {
    const pairs: Array<{ roomCode: string; department: string }> = [];
    (this.specificRooms ?? []).forEach((room: any) => {
      const roomCode = this.normalizeBoardRoomName(room?.roomName);
      if (!roomCode) {
        return;
      }
      (room?.uniqueDepartments ?? []).forEach((department: string) => {
        const label = String(department || '').trim();
        if (!label) {
          return;
        }
        pairs.push({
          roomCode,
          department: normalizeDepartmentForServer(label),
        });
      });
    });
    return pairs;
  }

  hasRoomPlanReturnNotice(room: any): boolean {
    return this.getRoomPlanReturnNoticeCount(room) > 0;
  }

  getRoomPlanReturnNoticeCount(room: any): number {
    const roomName = this.normalizeBoardRoomName(room?.roomName);
    if (!roomName) {
      return 0;
    }
    let total = 0;
    this.planReturnIndicatorsByRoom.forEach((count, roomKey) => {
      if (this.planReturnRoomCodesMatch(roomKey, roomName)) {
        total += count;
      }
    });
    return total;
  }

  getRoomPlanReturnNoticeTooltip(room: any): string {
    const count = this.getRoomPlanReturnNoticeCount(room);
    if (count <= 0) {
      return '';
    }
    return `יש ${count} הערות על הסידור בחדר זה ביום זה`;
  }

  hasDepartmentPlanReturnNotice(room: any, department: string): boolean {
    return this.getDepartmentPlanReturnNoticeCount(room, department) > 0;
  }

  getDepartmentPlanReturnNoticeCount(room: any, department: string): number {
    const roomName = this.normalizeBoardRoomName(room?.roomName);
    const departmentLabel = String(department || '').trim();
    if (!roomName || !departmentLabel) {
      return 0;
    }

    let total = 0;
    this.planReturnIndicatorsByRoomDept.forEach((count, key) => {
      const separator = key.indexOf('::');
      if (separator < 0) {
        return;
      }
      const roomKey = key.slice(0, separator);
      const deptKey = key.slice(separator + 2);
      if (this.planReturnRoomCodesMatch(roomKey, roomName) && departmentsMatchForPlanReturn(deptKey, departmentLabel)) {
        total += count;
      }
    });
    return total;
  }

  getDepartmentPlanReturnArrangementTooltip(room: any, department: string): string {
    const base = `הערה על הסידור — ${department}`;
    const count = this.getDepartmentPlanReturnNoticeCount(room, department);
    if (count <= 0) {
      return base;
    }
    return `${base} · יש ${count} הערות על הסידור למחלקה זו`;
  }

  private collectAllDepartments(): string[] {
    const departments = new Set<string>();
    (this.specificRooms ?? []).forEach((room: any) => {
      (room?.uniqueDepartments ?? []).forEach((depart: string) => {
        if (depart) {
          departments.add(depart);
        }
      });
    });
    return [...departments].sort((a, b) => a.localeCompare(b, 'he'));
  }

  refreshSurgeriesBoard(): void {
    this.getPatientsQueues({ scrollToDefaultHour: true, keepBoardVisible: true });
  }

  closeDialog() {
    this.dialogRef.close();
  }

  closeOpenDayViewDay() {
    this.getPatientsQueues({ scrollToDefaultHour: true, keepBoardVisible: true });
  }

  filterDepartment(departmentName: string, room?: any): void {
    const roomName = room?.roomName;
    if (!roomName) {
      return;
    }

    if (departmentName === 'undo') {
      this.roomDepartmentFilters.delete(roomName);
      this.openSnackBar(`מוצגים כל הניתוחים בחדר ${roomName}`);
    } else {
      this.roomDepartmentFilters.set(roomName, departmentName);
      this.openSnackBar(`מוצגים ניתוחי מחלקת ${departmentName} בחדר ${roomName} בלבד`);
    }

    this.applyRoomDepartmentFilters();
    this.reapplyViewModeAfterLoad(this.IfPlannedSurgeries, true);
    this.reapplyCachedSurgeryPrices();
    this.rebuildSurgeryIndex();
    if (this.showWaitingRecommendations && !this.isPhysicalRoom) {
      this.refreshWaitingRecommendations(true);
    }
  }

  hasRoomDepartmentFilter(room: any): boolean {
    const roomName = room?.roomName;
    return !!roomName && this.roomDepartmentFilters.has(roomName);
  }

  getRoomDepartmentFilter(room: any): string | null {
    const roomName = room?.roomName;
    if (!roomName) {
      return null;
    }
    return this.roomDepartmentFilters.get(roomName) ?? null;
  }

  private applyRoomDepartmentFilters(): void {
    this.filteredSpecificRooms = this.deepClone(this.specificRooms);
    this.filteredSpecificRooms.forEach((element) => {
      const departmentName = this.roomDepartmentFilters.get(element?.roomName);
      if (!departmentName || !element?.Surgeries) {
        return;
      }
      element.Surgeries = element.Surgeries.filter(
        (surgery) => surgery?.SurgeryRequestDepartments?.S_DEPARTMENT === departmentName
      );
    });
  }

  getRoomButtonTooltip(room: any): string {
    const filterHint = 'לחץ לפתיחת תפריט סינון — הצגת ניתוחים לפי מחלקה בחדר זה בלבד';
    const activeFilter = this.getRoomDepartmentFilter(room);
    const filterLine = activeFilter
      ? `\n\nסינון פעיל: מוצגת מחלקת ${activeFilter} בחדר זה בלבד`
      : '';
    const returnNotice = this.getRoomPlanReturnNoticeTooltip(room);
    const returnLine = returnNotice ? `\n\n${returnNotice}` : '';
    if (room?.surgerySurf) {
      return `${filterHint}${filterLine}${returnLine}\n\nחדר ירוק: הניתוח האחרון (ללא ססיה/דחוף) מסתיים אחרי 15:00 — ניצול טוב של היום`;
    }
    return `${filterHint}${filterLine}${returnLine}\n\nחדר כחול: לוח זמנים בטווח התקין`;
  }

  onRoomMenuOpened(room: any): void {
    this.refreshPlanReturnIndicators(true);
    const roomName = room?.roomName ?? 'החדר';
    this._snackBar.open(
      `סינון ניתוחים ב${roomName}: בחר מחלקה מהרשימה להצגת הניתוחים שלה בלבד`,
      'הבנתי',
      {
        duration: 4500,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: 'surgery-filter-snackbar'
      }
    );
  }

  closeRoomMenu(menuTrigger?: MatMenuTrigger): void {
    menuTrigger?.closeMenu();
  }

  isEventEstimatedPrice(event: any): boolean {
    if (this.isEventAiRecommendedPrice(event)) {
      return false;
    }
    if (this.isEstimatedPriceFlag(event?.IsEstimatedPrice)) {
      return true;
    }
    const fromMap = this.surgeryPriceByRowId.get(String(event?.Row_ID));
    return fromMap?.isEstimated === true && !fromMap?.isAiRecommended;
  }

  isEventAiRecommendedPrice(event: any): boolean {
    if (this.isAiRecommendedPriceFlag(event?.IsAiRecommendedPrice)) {
      return true;
    }
    const fromMap = this.surgeryPriceByRowId.get(String(event?.Row_ID));
    return fromMap?.isAiRecommended === true;
  }

  getEventServiceCode(event: any): string | null {
    const fromEvent = String(event?.AiRecommendedServiceCode ?? event?.ServiceCode ?? '').trim();
    if (fromEvent) {
      return fromEvent;
    }
    const fromMap = this.surgeryPriceByRowId.get(String(event?.Row_ID));
    return fromMap?.serviceCode ?? null;
  }

  getEventPriceLabel(event: any): string {
    if (this.isEventAiRecommendedPrice(event)) {
      return 'מחירון (הומלץ ע"י AI)';
    }
    if (this.isEventEstimatedPrice(event)) {
      return 'מחירון (משוער)';
    }
    return 'מחירון';
  }

  getEventPriceTooltip(event: any): string {
    if (this.isEventAiRecommendedPrice(event)) {
      const serviceCode = this.getEventServiceCode(event);
      return serviceCode
        ? `${this.aiRecommendedPriceTooltip}\nקוד שירות: ${serviceCode}`
        : this.aiRecommendedPriceTooltip;
    }
    if (this.isEventEstimatedPrice(event)) {
      return this.estimatedPriceTooltip;
    }
    return '';
  }

  get isBoardLoading(): boolean {
    return this.loader && !this.backgroundRefreshing;
  }

  get isBoardRefreshing(): boolean {
    return this.boardRefreshing || this.backgroundRefreshing;
  }

  private hasBoardData(): boolean {
    return (this.filteredSpecificRooms?.length ?? 0) > 0;
  }

  private clearPriceDataForReload(): void {
    this.surgeryPriceByRowId.clear();
    this.roomPriceSummariesFromServer = [];
    this.rawRoomPriceSummariesFromServer = [];
    this.physicalRoomPriceSummariesFromServer = [];
    this.departmentBenchmarkSummariesFromServer = [];
    this.loadingPhysicalRoomPrices = false;
    this.aiPriceLoadingRowIds.clear();
    this.aiPriceResolvedRowIds.clear();
    this.aiPriceFailedRowIds.clear();
    this.aiPriceLookupSub?.unsubscribe();
    this.aiPriceLookupSub = null;
    this.cachedPriceData = null;
  }

  isEventPriceLoading(event: any): boolean {
    return this.isEventServerPriceLoading(event) || this.isEventAiPriceLoading(event);
  }

  isEventServerPriceLoading(event: any): boolean {
    if (!event?.SurgeryPatientDetails || event?.SurgeryStatus === 'Canceled') {
      return false;
    }
    if (this.isEventAiPriceLoading(event)) {
      return false;
    }
    if (this.surgeryHasCatalogPrice(event)) {
      return false;
    }
    return this.loadingRoomPrices;
  }

  isEventAiPriceLoading(event: any): boolean {
    if (this.surgeryHasCatalogPrice(event)) {
      return false;
    }
    return this.aiPriceLoadingRowIds.has(String(event?.Row_ID));
  }

  getEventPriceLoadingLabel(event: any): string {
    if (this.isEventAiPriceLoading(event)) {
      return 'נטען המלצת מחיר מ-AI';
    }
    return 'מחירון';
  }

  isEventPriceLoadingRowAi(event: any): boolean {
    return this.isEventAiPriceLoading(event);
  }

  private prepareBoardForReload(): void {
    this.clearPriceDataForReload();

    const roomNames = (this.data?.room?.Rooms ?? []).map((room) => this.normalizeBoardRoomName(room));
    if (roomNames.length > 0) {
      this.specificRooms = roomNames.slice();
      this.filteredSpecificRooms = roomNames.map((roomName) => ({
        roomName,
        Surgeries: [],
        uniqueDepartments: []
      }));
      return;
    }

    this.filteredSpecificRooms.forEach((room) => {
      room.Surgeries = [];
    });
    this.specificRooms.forEach((room) => {
      if (room && typeof room === 'object') {
        room.Surgeries = [];
      }
    });
  }

  getEventStartTime(event: any): string {
    return event?.ArrivalDate?.split(' ')?.[1] ?? this.datePipe.transform(event?.start, 'HH:mm') ?? '';
  }

  getEventHoverDetails(event: any): string {
    if (event?.isWaitingRecommendation && event?.SurgeryPatientDetails) {
      return this.buildWaitingRecommendationHoverDetails(event);
    }
    if (!event || event.SurgeryPatientDetails == null) {
      return this.buildSetupHoverDetails(event);
    }

    const department = event.SurgeryRequestDepartments?.S_DEPARTMENT || '—';
    const firstName = event.SurgeryPatientDetails?.PM_FIRST_NAME || '';
    const lastName = event.SurgeryPatientDetails?.PM_LAST_NAME || '';
    const caseNumber = event.SurgeryPatientDetails?.PM_CASE_NUMBER || '—';
    const urgency = event.Urgency || '—';
    const start = this.getEventStartTime(event);
    const end = event.EndTime || '—';
    const lines = [
      `מחלקה: ${department}`,
      `שם: ${`${firstName} ${lastName}`.trim() || '—'}`,
      `תיק: ${caseNumber}`,
      `דחיפות: ${urgency}`,
    ];

    const grossPrice = this.getSurgeryGrossPrice(event);
    if (grossPrice != null) {
      lines.push(`${this.getEventPriceLabel(event)}: ${this.formatGrossPrice(grossPrice)} ₪`);
      const tooltip = this.getEventPriceTooltip(event);
      if (tooltip) {
        lines.push(tooltip);
      }
      const serviceCode = this.getEventServiceCode(event);
      if (this.isEventAiRecommendedPrice(event) && serviceCode) {
        lines.push(`קוד שירות מומלץ: ${serviceCode}`);
      }
    }

    lines.push(`שעות: ${start} – ${end}`);

    if (event.WithAnesthesia === 'False') {
      lines.push('ללא הרדמה');
    }

    return lines.join('\n');
  }

  private buildSetupHoverDetails(event: any): string {
    const start = this.getEventStartTime(event);
    const end = event?.EndTime
      || (event?.end ? this.datePipe.transform(event.end, 'HH:mm') : '')
      || '—';

    return [
      'בלוק הכנה',
      'הכנה: 20 דק׳',
      'זמן הכנה של 20 דקות לפני הניתוח',
      `שעות: ${start} – ${end}`,
    ].join('\n');
  }

  getPatientsQueues(options: { background?: boolean; scrollToDefaultHour?: boolean; keepBoardVisible?: boolean } = {}): void {
    this.requestScrollToDefaultHour();

    const background = options.background === true;
    const keepBoardVisible = options.keepBoardVisible === true
      || (options.keepBoardVisible !== false && this.hasBoardData() && !background);
    const savedMode = this.IfPlannedSurgeries;
    const savedRoomFilters = new Map(this.roomDepartmentFilters);
    const fullDate = this.datePipe.transform(this.viewDate, 'yyyy-MM-dd');

    if (background) {
      if (this.backgroundRefreshing) {
        return;
      }
      this.backgroundRefreshing = true;
      this.loadingRoomPrices = true;
      this.clearPriceDataForReload();
    } else if (keepBoardVisible) {
      if (this.boardRefreshing) {
        return;
      }
      this.boardRefreshing = true;
      this.loadingRoomPrices = true;
      this.clearPriceDataForReload();
      this.tempArrOfSurgeryRooms = [];
    } else {
      this.refresh = new Subject();
      this.loader = true;
      this.loadingRoomPrices = true;
      this.events = [];
      this.tempArrOfSurgeryRooms = [];
      this.prepareBoardForReload();
    }

    this.http.post(
      environment.url + 'GetSurgeriesBySurgeryRoomCode',
      this.buildSurgeryCalendarApiPayload(fullDate)
    ).subscribe({
      next: (Response) => {
        this.processSurgeriesCalendarResponse(Response['d'], {
          silent: background
        });
        this.roomDepartmentFilters = savedRoomFilters;
        this.applyRoomDepartmentFilters();
        this.departmentPlanReturnApi.clearIndicatorDetailsCache();
        this.refreshPlanReturnIndicators(true);
        this.reapplyViewModeAfterLoad(savedMode, background);
        if (this.showWaitingRecommendations && !this.isPhysicalRoom) {
          this.refreshWaitingRecommendations(true);
        }
        if (background) {
          this.backgroundRefreshing = false;
        } else if (keepBoardVisible) {
          this.boardRefreshing = false;
        } else {
          this.loader = false;
        }
        this.loadingRoomPrices = true;
        this.loadSurgeryRoomPrices(fullDate, { background });
        this.finalizeScrollToDefaultHour();
        this.cdr.detectChanges();
      },
      error: () => {
        if (background) {
          this.backgroundRefreshing = false;
        } else if (keepBoardVisible) {
          this.boardRefreshing = false;
        } else {
          this.loader = false;
          this.loadingRoomPrices = false;
        }
        this.finalizeScrollToDefaultHour();
        this.cdr.detectChanges();
      }
    });
  }

  private reapplyViewModeAfterLoad(mode: string, silent: boolean): void {
    if (mode === 'planned') {
      this.sortSurgeriesOfEachRoomInDay(silent, true);
      return;
    }

    if (mode === 'original' && this.isPhysicalRoom) {
      this.sortSurgeriesOfEachRoomInDay(silent);
      return;
    }

    if (mode === 'dror') {
      this.plannedFromDrorSystem(silent);
      return;
    }

    this.recalculateAllRoomsSurfing();
    this.rebuildSurgeryIndex();
    this.refreshCalendarView();
  }

  private requestScrollToDefaultHour(): void {
    this.pendingScrollToDefaultHour = true;
  }

  private finalizeScrollToDefaultHour(): void {
    this.requestScrollToDefaultHour();
    this.scheduleScrollToDefaultHour();
  }

  private refreshCalendarView(): void {
    this.refresh.next();
    this.finalizeScrollToDefaultHour();
  }

  private processSurgeriesCalendarResponse(
    tempArr: any,
    options: { silent?: boolean } = {}
  ): void {
    const silent = options.silent === true;
    const colors = {
      Completed: '#0ef12f',
      InProgress: '#e8abf1',
      Planned: '#abeff1',
      Canceled: '#f10e0e'
    };

    this.tempArrOfSurgeryRooms = [];
    const roomSources = (this.specificRooms?.length ?? 0) > 0
      ? this.specificRooms
      : (this.data?.room?.Rooms ?? []);

    roomSources.forEach((x) => {
      const roomName = this.normalizeBoardRoomName(x);
      if (!roomName) {
        return;
      }
      this.tempArrOfSurgeryRooms.push({
        roomName,
        Surgeries: []
      });
    });

    this.IfPlannedSurgeries = 'original';
    (tempArr?.SurgeriesCalendarClassList ?? []).forEach((element) => {
      const base = new Date(element.ArrivalDate.split(' ')[0] + 'T' + element.ArrivalTime);
      if (!element.AvgDauration || element.AvgDauration.trim() === '') {
        const totalMinutes = Number(element.Duration);

        if (!Number.isFinite(totalMinutes)) {
          console.error('Invalid Duration:', element.Duration);
        } else {
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;

          element.AvgDauration =
            String(hours).padStart(2, '0') + ':' +
            String(minutes).padStart(2, '0');
        }
      }
      const [h, m] = element.AvgDauration.split(':').map(Number);
      base.setMinutes(base.getMinutes() + h * 60 + m);
      element.EndTime = base.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      element.start = new Date(element.ArrivalDate);
      element.end = new Date(base);
      element.title = this.buildEventTitle(element);
      element.cssClass = 'event-css-' + element.SurgeryStatus + ' surgery-cal-event';
      let eventColor = colors[element.SurgeryStatus];
      if (element.Urgency.includes('ססיה')) {
        eventColor = '#FFA100';
        element.cssClass += ' event-css-sesia';
      }
      if (element.Urgency.includes('דחוף')) {
        eventColor = '#F1F305';
        element.cssClass += ' event-css-urgent';
      }
      element.color = {
        primary: '#000000', secondary: eventColor
      };
      element.draggable = true;
      let index = this.tempArrOfSurgeryRooms.find(
        (ele) => this.normalizeBoardRoomName(ele.roomName) === this.normalizeBoardRoomName(element.SurgeryRoom)
      );
      if (index) {
        if (element.SurgeryRoom != '') {
          index['Surgeries'] = tempArr['SurgeriesCalendarClassList'].filter((x) => x.SurgeryRoom == element.SurgeryRoom);
          index = this.checkSurfingSurgeryDays(index);
        }
      }
      this.events.push(element);
    });

    this.specificRooms = this.tempArrOfSurgeryRooms;
    this.specificRooms.forEach((x, index) => {
      const tempArrayOfDepartments = [];
      if (x.Surgeries != undefined) {
        x.Surgeries.forEach((element) => {
          const department = element.SurgeryRequestDepartments?.S_DEPARTMENT;
          if (department && !tempArrayOfDepartments.includes(department)) {
            tempArrayOfDepartments.push(department);
          }
        });
      }
      this.specificRooms[index]['uniqueDepartments'] = tempArrayOfDepartments;
    });
    this.recalculateAllRoomsSurfing(this.specificRooms);
    this.filteredSpecificRooms = this.deepClone(this.specificRooms);
  }

  private scheduleScrollToDefaultHour(): void {
    if (!this.pendingScrollToDefaultHour) {
      return;
    }

    if (this.scrollRetryTimeout) {
      clearTimeout(this.scrollRetryTimeout);
    }

    let attempts = 0;
    const maxAttempts = 30;
    const tryScroll = () => {
      attempts++;
      const applied = this.scrollCalendarsToHour(this.dayViewScrollToHour);
      if (applied) {
        this.pendingScrollToDefaultHour = false;
        return;
      }
      if (attempts < maxAttempts) {
        this.scrollRetryTimeout = setTimeout(tryScroll, 120);
      } else {
        this.scrollRetryTimeout = setTimeout(() => {
          if (this.pendingScrollToDefaultHour) {
            this.scrollCalendarsToHour(this.dayViewScrollToHour);
            this.pendingScrollToDefaultHour = false;
          }
        }, 350);
      }
    };

    tryScroll();
    requestAnimationFrame(tryScroll);
  }

  private scrollCalendarsToHour(hour: number): boolean {
    const hourRowHeight = this.hourSegments * this.hourSegmentHeight;
    const hourIndex = Math.max(0, hour - this.dayViewStartHour);
    const fallbackScrollTop = hourIndex * hourRowHeight;
    let allApplied = (this.roomCalendarScrolls?.length ?? 0) > 0;

    this.roomCalendarScrolls?.forEach((ref) => {
      const container = ref?.nativeElement;
      if (!container) {
        allApplied = false;
        return;
      }

      if (container.scrollHeight <= container.clientHeight + 2) {
        allApplied = false;
        return;
      }

      let targetScrollTop = fallbackScrollTop;
      const dayColumn = container.querySelector('.cal-day-column');
      const hourRows = dayColumn?.querySelectorAll('.cal-hour');
      const hourElement = hourRows?.[hourIndex] as HTMLElement | undefined;

      if (hourElement) {
        targetScrollTop = this.getScrollTopForElement(container, hourElement);
      } else {
        const matchedRow = this.findHourRowByTime(container, hour);
        if (matchedRow) {
          targetScrollTop = this.getScrollTopForElement(container, matchedRow);
        }
      }

      container.scrollTop = Math.max(0, targetScrollTop);

      if (Math.abs(container.scrollTop - targetScrollTop) > 10) {
        allApplied = false;
      }
    });

    return allApplied;
  }

  private getScrollTopForElement(container: HTMLElement, element: HTMLElement): number {
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    return elementRect.top - containerRect.top + container.scrollTop;
  }

  private findHourRowByTime(container: HTMLElement, targetHour: number): HTMLElement | null {
    const timeLabels = container.querySelectorAll('.cal-day-column .cal-time');
    for (const label of Array.from(timeLabels)) {
      const parsedHour = this.parseHourFromCalendarLabel((label.textContent ?? '').trim());
      if (parsedHour === targetHour) {
        return label.closest('.cal-hour') as HTMLElement | null;
      }
    }
    return null;
  }

  private parseHourFromCalendarLabel(text: string): number | null {
    const match = text.match(/^(\d{1,2})(?::(\d{2}))?/);
    if (!match) {
      return null;
    }
    const hour = Number(match[1]);
    return Number.isFinite(hour) && hour >= 0 && hour <= 23 ? hour : null;
  }

  private normalizeBoardRoomName(value: any): string {
    if (typeof value === 'string') {
      return value.trim();
    }
    return String(value?.SurgeryRoom ?? value?.roomName ?? '').trim();
  }

  private getCalendarRoomsAreaForApi(): string {
    return String(this.data?.room?.CalendarRoomsArea ?? '').trim();
  }

  /** DB key for department plan return — matches SaveDepartmentPlanReturn / GetDepartmentPlanReturn. */
  private getPlanReturnCalendarRoomsArea(roomCode?: string): string {
    const normalizedRoomCode = roomCode ? this.normalizeBoardRoomName(roomCode) : '';
    const roomCodes = normalizedRoomCode
      ? [normalizedRoomCode]
      : this.getRoomCodesList();
    const fromRoomCodes = this.deriveRoomGroupDescFromRoomCodes(roomCodes);
    if (fromRoomCodes) {
      return fromRoomCodes;
    }

    const fromVirtual = this.mapVirtualRoomGroupDescToPhysical(this.getRoomGroupDescForApi());
    if (fromVirtual) {
      return fromVirtual;
    }

    const fromPhysical = this.derivePhysicalRoomGroupDesc();
    if (fromPhysical) {
      return fromPhysical;
    }

    return this.getCalendarRoomsAreaForApi();
  }

  private deriveRoomGroupDescFromRoomCodes(roomCodes: string[]): string | null {
    const firstCode = String(roomCodes[0] ?? '').trim();
    if (!firstCode) {
      return null;
    }

    if (firstCode.startsWith('ור01')) {
      return 'וירטואלי כללי';
    }
    if (firstCode.startsWith('ור03')) {
      return 'וירטואלי חדר לידה';
    }
    if (firstCode.startsWith('ור04')) {
      return 'וירטואלי כללי ססיה';
    }
    if (firstCode.startsWith('ור05')) {
      return 'וירטואלי אמבולטורי';
    }
    if (firstCode.startsWith('ור06')) {
      return 'וירטואלי ניתוח ליד';
    }
    if (firstCode.startsWith('פז01')) {
      return 'חדר ניתוח כללי';
    }
    if (firstCode.startsWith('פז02') || firstCode.startsWith('פז03')) {
      return 'חדר לידה';
    }
    if (firstCode.startsWith('פז04') && /40[12]/.test(firstCode)) {
      return 'פה ולסת';
    }
    if (firstCode.startsWith('פז04')) {
      return 'חדר ניתוח כללי ססיה';
    }
    if (firstCode.startsWith('פז05')) {
      return 'חדר ניתוח אמבולטורי';
    }
    if (firstCode.startsWith('פז06')) {
      return 'ניתוח ליד מיטת החולה';
    }

    return null;
  }

  private readonly departmentAliasGroups: Record<string, string[]> = {
    'פה ולסת': ['560', 'חנ-פהלסת', 'חנ פהלסת', 'מחלקת פה ולסת', 'oral', 'maxillofacial'],
    'נשים': ['543', 'גינקולוגיה', 'גינקולוג', 'יולדות', 'מחלקת נשים', 'מרפאה נשים', 'women', 'gynecology'],
  };

  private getRoomGroupDescForApi(): string {
    const room = this.data?.room;
    const fromCalendar = this.deriveRoomGroupDesc(room);
    if (this.isSpecializedRoomGroupDesc(fromCalendar)) {
      return fromCalendar;
    }

    const fromRoomCodes = this.deriveRoomGroupDescFromRoomCodes(this.getRoomCodesList());
    if (fromRoomCodes) {
      return fromRoomCodes;
    }

    const fromServer = String(room?.RoomGroupDesc ?? room?.RoomGroup ?? '').trim();
    if (fromServer) {
      return fromServer;
    }

    return fromCalendar;
  }

  private isSpecializedRoomGroupDesc(desc: string): boolean {
    const value = String(desc ?? '').trim();
    if (!value) {
      return false;
    }

    const specialized = [
      'פה ולסת',
      'נשים',
      'חדר לידה',
      'חדר ניתוח אמבולטורי',
      'חדר ניתוח כללי ססיה',
      'ניתוח ליד מיטת החולה',
      'וירטואלי חדר לידה',
      'וירטואלי אמבולטורי',
      'וירטואלי כללי ססיה',
      'וירטואלי ניתוח ליד',
    ];

    return specialized.some((item) => value === item || value.includes(item));
  }

  private deriveRoomGroupDesc(room: any): string {
    const calendarArea = String(room?.CalendarRoomsArea ?? '').trim();
    const roomDes = String(room?.RoomDes ?? room?.type ?? '').trim();

    if (roomDes === 'ור') {
      if (/פה\s*ולסת/i.test(calendarArea)) {
        return 'פה ולסת';
      }
      if (/נשים|גינקולוג|יולדות/i.test(calendarArea)) {
        return 'נשים';
      }
      if (/ססיה/i.test(calendarArea)) {
        return 'וירטואלי כללי ססיה';
      }
      if (/אמבולטורי/i.test(calendarArea)) {
        return 'וירטואלי אמבולטורי';
      }
      if (/לידה/i.test(calendarArea)) {
        return 'וירטואלי חדר לידה';
      }
      if (/ליד/i.test(calendarArea)) {
        return 'וירטואלי ניתוח ליד';
      }
      if (/כללי/i.test(calendarArea)) {
        return 'וירטואלי כללי';
      }
      if (calendarArea.startsWith('וירטואלי')) {
        return calendarArea;
      }
      return 'וירטואלי כללי';
    }

    // Physical groups use CalendarRoomsArea as RoomGroupDesc in SurgeriesRoomDesc,
    // except dental rooms which are keyed as "פה ולסת" in the price catalog.
    if (/נשים|גינקולוג|יולדות/i.test(calendarArea)) {
      return 'נשים';
    }
    if (/פה\s*ולסת/i.test(calendarArea)) {
      return 'פה ולסת';
    }
    return calendarArea;
  }

  private getRoomCodesList(): string[] {
    const codes = new Set<string>();

    const rooms = this.data?.room?.Rooms;
    if (Array.isArray(rooms)) {
      rooms.forEach((room) => {
        const code = typeof room === 'string'
          ? room.trim()
          : String(room?.SurgeryRoom ?? room?.roomName ?? '').trim();
        if (code) {
          codes.add(code);
        }
      });
    }

    const surgeryRooms = this.data?.room?.SurgeryRooms;
    if (Array.isArray(surgeryRooms)) {
      surgeryRooms.forEach((room) => {
        const code = String(room?.SurgeryRoom ?? room?.roomName ?? room ?? '').trim();
        if (code) {
          codes.add(code);
        }
      });
    }

    [...this.filteredSpecificRooms, ...this.specificRooms].forEach((room) => {
      const code = this.normalizeBoardRoomName(room?.roomName ?? room);
      if (code) {
        codes.add(code);
      }
    });

    return Array.from(codes);
  }

  private buildSurgeryCalendarApiPayload(fullDate: string): Record<string, string> {
    return {
      _fullDate: fullDate,
      _surRoomCode: this.getCalendarRoomsAreaForApi()
    };
  }

  private buildRoomPricesApiPayload(fullDate: string, roomGroupDesc?: string): Record<string, string> {
    return {
      _fullDate: fullDate,
      _surRoomCode: roomGroupDesc ?? this.getRoomGroupDescForApi()
    };
  }

  private getDepartmentBenchmarkReferenceDate(fullDate?: string | null): string | null {
    const viewDateStr = fullDate ?? this.datePipe.transform(this.viewDate, 'yyyy-MM-dd');
    if (!viewDateStr) {
      return viewDateStr;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const viewDateOnly = new Date(`${viewDateStr}T00:00:00`);
    viewDateOnly.setHours(0, 0, 0, 0);

    if (viewDateOnly > today) {
      return this.datePipe.transform(today, 'yyyy-MM-dd');
    }

    return viewDateStr;
  }

  private isFutureViewDate(fullDate?: string | null): boolean {
    const viewDateStr = fullDate ?? this.datePipe.transform(this.viewDate, 'yyyy-MM-dd');
    if (!viewDateStr) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const viewDateOnly = new Date(`${viewDateStr}T00:00:00`);
    viewDateOnly.setHours(0, 0, 0, 0);
    return viewDateOnly > today;
  }

  private getRoomGroupDescCandidates(): string[] {
    const candidates = [
      this.getRoomGroupDescForApi(),
      this.deriveRoomGroupDescFromRoomCodes(this.getRoomCodesList()),
      this.deriveRoomGroupDesc(this.data?.room),
      this.getCalendarRoomsAreaForApi()
    ]
      .map((value) => String(value ?? '').trim())
      .filter((value) => !!value);

    return Array.from(new Set(candidates));
  }

  private isPriceDataEmpty(priceData: any): boolean {
    const prices = Array.isArray(priceData?.SurgeryPrices) ? priceData.SurgeryPrices : [];
    const procedurePrices = Array.isArray(priceData?.SurgeryProcedurePrices) ? priceData.SurgeryProcedurePrices : [];
    const summaries = Array.isArray(priceData?.RoomPriceSummaries) ? priceData.RoomPriceSummaries : [];
    return prices.length === 0 && procedurePrices.length === 0 && summaries.length === 0;
  }

  private normalizeRoomKey(value: any): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private getRoomMatchKeys(room: any): string[] {
    const keys = new Set<string>();
    const roomName = this.normalizeRoomKey(room?.roomName);
    if (roomName) {
      keys.add(roomName);
    }

    const canonicalRoomName = this.canonicalizeSurgeryRoomCode(room?.roomName);
    if (canonicalRoomName) {
      keys.add(this.normalizeRoomKey(canonicalRoomName));
    }

    (room?.Surgeries ?? []).forEach((surgery: any) => {
      const surgeryRoom = this.normalizeRoomKey(surgery?.SurgeryRoom);
      const surgeryRoomName = this.normalizeRoomKey(surgery?.SurgeryRoomName);
      const canonicalSurgeryRoom = this.canonicalizeSurgeryRoomCode(surgery?.SurgeryRoom);
      if (surgeryRoom) {
        keys.add(surgeryRoom);
      }
      if (surgeryRoomName) {
        keys.add(surgeryRoomName);
      }
      if (canonicalSurgeryRoom) {
        keys.add(this.normalizeRoomKey(canonicalSurgeryRoom));
      }
    });

    return Array.from(keys);
  }

  private roomSummaryMatches(summary: any, room: any): boolean {
    const roomKeys = this.getRoomMatchKeys(room);
    if (roomKeys.length === 0) {
      return false;
    }

    const summaryKeys = [
      summary?.SurgeryRoom,
      summary?.SurgeryRoomName,
      summary?.RoomName,
      this.getRoomSummaryCanonicalKey(summary)
    ]
      .map((value) => this.normalizeRoomKey(value))
      .filter((value) => !!value);

    return summaryKeys.some((summaryKey) =>
      roomKeys.some((roomKey) =>
        summaryKey === roomKey
        || summaryKey.includes(roomKey)
        || roomKey.includes(summaryKey)
      )
    );
  }

  private findRoomPriceSummary(room: any): any | null {
    if (!room || !Array.isArray(this.rawRoomPriceSummariesFromServer)) {
      return null;
    }

    const boardMatch = this.roomPriceSummariesFromServer.find((item) => this.roomSummaryMatches(item, room));
    if (boardMatch) {
      return boardMatch;
    }

    return this.rawRoomPriceSummariesFromServer.find((item) => this.roomSummaryMatches(item, room)) ?? null;
  }

  private getPriceCacheKey(fullDate: string): string {
    const calendarArea = this.getCalendarRoomsAreaForApi();
    const groupDesc = this.getRoomGroupDescForApi();
    const roomCodes = this.getRoomCodesList().join('|');
    return `surgeryRoomPrices_v6_${calendarArea}_${groupDesc}_${roomCodes}_${fullDate}`;
  }

  private getCachedPriceData(cacheKey: string): any | null {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      const hasPrices = Array.isArray(parsed?.SurgeryPrices) && parsed.SurgeryPrices.length > 0;
      const hasSummaries = Array.isArray(parsed?.RoomPriceSummaries) && parsed.RoomPriceSummaries.length > 0;
      return hasPrices || hasSummaries ? parsed : null;
    } catch {
      return null;
    }
  }

  private savePriceCache(cacheKey: string, priceData: any): void {
    const hasPrices = Array.isArray(priceData?.SurgeryPrices) && priceData.SurgeryPrices.length > 0;
    const hasSummaries = Array.isArray(priceData?.RoomPriceSummaries) && priceData.RoomPriceSummaries.length > 0;
    if (!hasPrices && !hasSummaries) {
      return;
    }

    try {
      localStorage.setItem(cacheKey, JSON.stringify(priceData));
    } catch (error) {
      console.warn('Failed to cache surgery room prices', error);
    }
  }

  private loadSurgeryRoomPrices(fullDate: string, options: { background?: boolean } = {}): void {
    const cacheKey = this.getPriceCacheKey(fullDate);
    const cached = this.getCachedPriceData(cacheKey);
    if (cached) {
      this.applySurgeryPricesFromServer(cached);
      this.completeRoomPricesLoad(fullDate);
      return;
    }

    if (!options.background) {
      this.loadingRoomPrices = true;
    }

    if (!this.isPhysicalRoom) {
      this.loadVirtualAndPhysicalRoomPrices(fullDate, cacheKey);
      return;
    }

    this.http.post(
      environment.url + 'GetSurgeriesRoomPricesBySurgeryRoomCode',
      this.buildRoomPricesApiPayload(fullDate)
    ).subscribe({
      next: (Response) => {
        const priceData = Response['d'];
        if (!this.isPriceDataEmpty(priceData)) {
          this.finishRoomPricesLoad(cacheKey, priceData);
          return;
        }

        this.loadSurgeryRoomPricesFallback(fullDate, cacheKey);
      },
      error: (error) => {
        console.error('Failed to load surgery room prices', error);
        this.loadSurgeryRoomPricesFallback(fullDate, cacheKey);
      }
    });
  }

  private loadVirtualAndPhysicalRoomPrices(fullDate: string, cacheKey: string): void {
    const virtualGroup = this.getRoomGroupDescForApi();
    const physicalGroups = this.getPhysicalRoomGroupDescCandidates();
    const benchmarkDate = this.getDepartmentBenchmarkReferenceDate(fullDate) ?? fullDate;

    const virtualRequest = this.http.post(
      environment.url + 'GetSurgeriesRoomPricesBySurgeryRoomCode',
      this.buildRoomPricesApiPayload(fullDate, virtualGroup)
    );

    const physicalRequest = physicalGroups.length > 0
      ? forkJoin(
        physicalGroups.map((roomGroupDesc) => this.http.post(
          environment.url + 'GetSurgeriesRoomPricesBySurgeryRoomCode',
          this.buildRoomPricesApiPayload(benchmarkDate, roomGroupDesc)
        ))
      ).pipe(
        map((responses) => {
          const mergedSummaries: any[] = [];
          responses.forEach((response) => {
            const summaries = response['d']?.RoomPriceSummaries;
            if (Array.isArray(summaries)) {
              mergedSummaries.push(...summaries);
            }
          });
          return { d: { RoomPriceSummaries: mergedSummaries, SurgeryPrices: [] } };
        })
      )
      : of({ d: { RoomPriceSummaries: [], SurgeryPrices: [] } });

    forkJoin([virtualRequest, physicalRequest]).subscribe({
      next: ([virtualResponse, physicalResponse]) => {
        const virtualData: any = virtualResponse['d'] ?? {};
        const physicalData: any = physicalResponse['d'] ?? {};

        this.physicalRoomPriceSummariesFromServer = Array.isArray(physicalData.RoomPriceSummaries)
          ? physicalData.RoomPriceSummaries
          : [];

        if (!this.isPriceDataEmpty(virtualData)) {
          this.finishRoomPricesLoad(cacheKey, virtualData);
          return;
        }

        if (!this.isPriceDataEmpty(physicalData)) {
          this.finishRoomPricesLoad(cacheKey, physicalData);
          return;
        }

        this.loadSurgeryRoomPricesFallback(fullDate, cacheKey);
      },
      error: (error) => {
        console.error('Failed to load virtual and physical surgery room prices', error);
        this.loadSurgeryRoomPricesFallback(fullDate, cacheKey);
      }
    });
  }

  private finishRoomPricesLoad(cacheKey: string, priceData: any): void {
    if (!this.isPriceDataEmpty(priceData)) {
      this.savePriceCache(cacheKey, priceData);
    }
    this.applySurgeryPricesFromServer(priceData);
    this.completeRoomPricesLoad(this.datePipe.transform(this.viewDate, 'yyyy-MM-dd'));
  }

  private completeRoomPricesLoad(fullDate: string | null): void {
    this.loadingRoomPrices = false;
    this.maybeStartAiBillingLookups();
    this.cdr.detectChanges();

    if (this.isPhysicalRoom) {
      if (this.isFutureViewDate(fullDate)) {
        this.loadDepartmentBenchmarkSummaries(fullDate);
        return;
      }

      this.loadingPhysicalRoomPrices = false;
      return;
    }

    if (this.physicalRoomPriceSummariesFromServer.length > 0) {
      this.loadingPhysicalRoomPrices = false;
      return;
    }

    this.loadingPhysicalRoomPrices = true;
    this.fetchPhysicalRoomPriceSummaries(fullDate).subscribe({
      next: (summaries) => {
        this.physicalRoomPriceSummariesFromServer = summaries;
        this.loadingPhysicalRoomPrices = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Failed to load physical room price summaries', error);
        this.physicalRoomPriceSummariesFromServer = [];
        this.loadingPhysicalRoomPrices = false;
        this.cdr.detectChanges();
      }
    });
  }

  private loadSurgeryRoomPricesFallback(fullDate: string, cacheKey: string): void {
    const candidates = this.getRoomGroupDescCandidates().slice(1);
    const physicalGroupDesc = !this.isPhysicalRoom ? this.derivePhysicalRoomGroupDesc() : null;
    if (physicalGroupDesc && !candidates.includes(physicalGroupDesc)) {
      candidates.push(physicalGroupDesc);
    }

    if (candidates.length === 0) {
      this.finishRoomPricesLoad(cacheKey, { SurgeryPrices: [], RoomPriceSummaries: [] });
      return;
    }

    const benchmarkDate = this.getDepartmentBenchmarkReferenceDate(fullDate) ?? fullDate;
    const requests = candidates.map((roomGroupDesc) =>
      this.http.post(
        environment.url + 'GetSurgeriesRoomPricesBySurgeryRoomCode',
        this.buildRoomPricesApiPayload(
          physicalGroupDesc && roomGroupDesc === physicalGroupDesc ? benchmarkDate : fullDate,
          roomGroupDesc
        )
      )
    );

    forkJoin(requests).subscribe({
      next: (responses) => {
        const merged = {
          SurgeryPrices: [] as any[],
          SurgeryProcedurePrices: [] as any[],
          RoomPriceSummaries: [] as any[]
        };

        responses.forEach((response, index) => {
          const data = response['d'];
          if (!data || this.isPriceDataEmpty(data)) {
            return;
          }

          const roomGroupDesc = candidates[index];
          if (physicalGroupDesc && roomGroupDesc === physicalGroupDesc) {
            this.physicalRoomPriceSummariesFromServer = Array.isArray(data.RoomPriceSummaries)
              ? data.RoomPriceSummaries
              : [];
            return;
          }

          if (Array.isArray(data.SurgeryPrices)) {
            merged.SurgeryPrices.push(...data.SurgeryPrices);
          }
          if (Array.isArray(data.SurgeryProcedurePrices)) {
            merged.SurgeryProcedurePrices.push(...data.SurgeryProcedurePrices);
          }
          if (Array.isArray(data.RoomPriceSummaries)) {
            merged.RoomPriceSummaries.push(...data.RoomPriceSummaries);
          }
        });

        this.finishRoomPricesLoad(cacheKey, merged);
      },
      error: (error) => {
        console.error('Failed to load per-room surgery prices fallback', error);
        this.finishRoomPricesLoad(cacheKey, { SurgeryPrices: [], RoomPriceSummaries: [] });
      }
    });
  }

  private reapplyCachedSurgeryPrices(refreshView = false): void {
    if (!this.cachedPriceData) {
      return;
    }
    this.applySurgeryPricesFromServer(this.cachedPriceData);
    if (refreshView) {
      this.refreshCalendarView();
    } else {
      this.cdr.detectChanges();
    }
  }

  private ingestSurgeryPriceItems(items: any[] | null | undefined): void {
    if (!Array.isArray(items)) {
      return;
    }

    items.forEach((item) => {
      const grossPrice = this.parsePriceValue(item?.GrossPrice);
      if (grossPrice == null || item?.Row_ID == null) {
        return;
      }
      this.surgeryPriceByRowId.set(String(item.Row_ID), {
        grossPrice,
        isEstimated: this.isEstimatedPriceFlag(item.IsEstimated)
      });
    });
  }

  private maybeStartAiBillingLookups(): void {
    if (this.loadingRoomPrices) {
      return;
    }
    this.resolveMissingSurgeryPricesWithAi();
  }

  private resolveMissingSurgeryPricesWithAi(): void {
    if (!environment.billingPipelineMode) {
      return;
    }

    const pending = this.collectBoardSurgeries().filter((surgery) => this.needsAiBillingLookup(surgery));
    if (pending.length === 0) {
      return;
    }

    const needsApi: any[] = [];
    pending.forEach((surgery) => {
      if (this.surgeryHasCatalogPrice(surgery)) {
        return;
      }

      const rowId = String(surgery?.Row_ID ?? '');
      const staged = this.surgeryBillingAiService.extractStagedResultFromSurgery(surgery);
      if (staged) {
        this.aiPriceResolvedRowIds.add(rowId);
        this.applyAiRecommendedPrice(surgery, staged);
        this.syncSurgeryPriceToBoard(surgery);
        return;
      }

      const cached = this.surgeryBillingAiService.getCachedForSurgery(surgery, this.viewDate);
      if (cached) {
        this.aiPriceResolvedRowIds.add(rowId);
        this.applyAiRecommendedPrice(surgery, cached);
        this.syncSurgeryPriceToBoard(surgery);
        return;
      }
      needsApi.push(surgery);
    });

    if (needsApi.length === 0) {
      this.cdr.detectChanges();
      return;
    }

    this.aiPriceLookupSub?.unsubscribe();
    needsApi.forEach((surgery) => {
      this.aiPriceLoadingRowIds.add(String(surgery.Row_ID));
    });
    this.cdr.detectChanges();

    this.aiPriceLookupSub = from(needsApi).pipe(
      concatMap((surgery) => {
        if (this.surgeryHasCatalogPrice(surgery)) {
          this.aiPriceLoadingRowIds.delete(String(surgery.Row_ID));
          return EMPTY;
        }

        return this.surgeryBillingAiService.lookupFromSurgery(surgery, this.viewDate).pipe(
          tap((result) => {
            this.aiPriceResolvedRowIds.add(String(surgery.Row_ID));
            this.applyAiRecommendedPrice(surgery, result);
            this.syncSurgeryPriceToBoard(surgery);
            this.aiPriceLoadingRowIds.delete(String(surgery.Row_ID));
            this.cdr.detectChanges();
          }),
          catchError((error) => {
            console.warn('AI billing lookup failed', surgery?.Row_ID, error);
            this.aiPriceFailedRowIds.add(String(surgery.Row_ID));
            return EMPTY;
          }),
          finalize(() => {
            this.aiPriceLoadingRowIds.delete(String(surgery.Row_ID));
            this.cdr.detectChanges();
          })
        );
      })
    ).subscribe();
  }

  private collectBoardSurgeries(): any[] {
    const byId = new Map<string, any>();
    const add = (surgery: any) => {
      if (surgery?.Row_ID) {
        byId.set(String(surgery.Row_ID), surgery);
      }
    };

    this.events.forEach(add);
    [...this.specificRooms, ...this.filteredSpecificRooms].forEach((room) => {
      (room?.Surgeries ?? []).forEach(add);
    });

    return Array.from(byId.values());
  }

  private needsAiBillingLookup(surgery: any): boolean {
    const rowId = String(surgery?.Row_ID ?? '');
    if (!rowId || !surgery?.SurgeryPatientDetails || surgery?.SurgeryStatus === 'Canceled') {
      return false;
    }
    if (
      this.aiPriceResolvedRowIds.has(rowId)
      || this.aiPriceFailedRowIds.has(rowId)
      || this.aiPriceLoadingRowIds.has(rowId)
    ) {
      return false;
    }
    if (this.surgeryHasCatalogPrice(surgery)) {
      return false;
    }

    const priceMeta = this.surgeryPriceByRowId.get(rowId);
    if (priceMeta?.isAiRecommended && priceMeta.grossPrice != null) {
      return false;
    }

    if (this.surgeryBillingAiService.extractStagedResultFromSurgery(surgery)) {
      return false;
    }

    if (this.surgeryBillingAiService.getCachedForSurgery(surgery, this.viewDate)) {
      return false;
    }

    return this.surgeryBillingAiService.canLookupSurgery(surgery);
  }

  private surgeryHasCatalogPrice(surgery: any): boolean {
    if (this.surgeryBillingAiService.surgeryHasCatalogPrice(surgery)) {
      return true;
    }

    const rowIds = new Set<string>();
    if (surgery?.Row_ID) {
      rowIds.add(String(surgery.Row_ID));
    }

    (surgery?.SurgeriesCalendar_Susgeries ?? []).forEach((procedure: any) => {
      if (procedure?.Row_ID) {
        rowIds.add(String(procedure.Row_ID));
      }
    });

    for (const rowId of rowIds) {
      const priceMeta = this.surgeryPriceByRowId.get(rowId);
      if (priceMeta?.grossPrice != null && !priceMeta.isAiRecommended) {
        return true;
      }
    }

    return false;
  }

  private applyAiRecommendedPrice(surgery: any, result: { serviceCode: string; price: number; drgCodes?: string[]; icd9Codes?: string[] }): void {
    const rowId = String(surgery.Row_ID);
    const drgCodes = Array.isArray(result.drgCodes) ? result.drgCodes.map(String) : [];
    const icd9Codes = Array.isArray(result.icd9Codes) ? result.icd9Codes.map(String) : [];
    this.surgeryPriceByRowId.set(rowId, {
      grossPrice: result.price,
      isEstimated: true,
      isAiRecommended: true,
      serviceCode: result.serviceCode,
      drgCodes,
      icd9Codes,
    });

    surgery.GrossPrice = String(result.price);
    surgery.IsEstimatedPrice = true;
    surgery.IsAiRecommendedPrice = true;
    surgery.AiRecommendedServiceCode = result.serviceCode;
    surgery.AiRecommendedDrgCodes = drgCodes;
    surgery.AiRecommendedIcd9Codes = icd9Codes;
  }

  private syncSurgeryPriceToBoard(source: any): void {
    const rowId = String(source?.Row_ID ?? '');
    if (!rowId) {
      return;
    }

    const update = (surgery: any) => {
      if (String(surgery?.Row_ID) !== rowId) {
        return;
      }
      surgery.GrossPrice = source.GrossPrice;
      surgery.IsEstimatedPrice = source.IsEstimatedPrice;
      surgery.IsAiRecommendedPrice = source.IsAiRecommendedPrice;
      surgery.AiRecommendedServiceCode = source.AiRecommendedServiceCode;
      surgery.AiRecommendedDrgCodes = source.AiRecommendedDrgCodes;
      surgery.AiRecommendedIcd9Codes = source.AiRecommendedIcd9Codes;
    };

    this.events.forEach(update);
    [...this.specificRooms, ...this.filteredSpecificRooms].forEach((room) => {
      (room?.Surgeries ?? []).forEach(update);
    });
  }

  private applySurgeryPricesFromServer(priceData: any): void {
    if (!priceData) {
      return;
    }

    this.cachedPriceData = priceData;

    this.surgeryPriceByRowId.clear();
    this.ingestSurgeryPriceItems(priceData?.SurgeryProcedurePrices);
    this.ingestSurgeryPriceItems(priceData?.SurgeryPrices);

    this.rawRoomPriceSummariesFromServer = Array.isArray(priceData.RoomPriceSummaries)
      ? priceData.RoomPriceSummaries
      : [];
    this.roomPriceSummariesFromServer = this.filterSummariesForBoard(this.rawRoomPriceSummariesFromServer);

    const applyPriceToSurgery = (surgery: any) => {
      if (!surgery?.Row_ID) {
        return;
      }

      (surgery.SurgeriesCalendar_Susgeries ?? []).forEach((procedure: any) => {
        if (!procedure?.Row_ID) {
          return;
        }
        const procedurePriceMeta = this.surgeryPriceByRowId.get(String(procedure.Row_ID));
        if (procedurePriceMeta == null) {
          return;
        }
        procedure.GrossPrice = String(procedurePriceMeta.grossPrice);
        procedure.IsEstimatedPrice = procedurePriceMeta.isEstimated;
      });

      const billingPrice = this.computeSurgeryBillingPrice(surgery);
      if (billingPrice != null) {
        surgery.GrossPrice = String(billingPrice.price);
        surgery.IsEstimatedPrice = billingPrice.isEstimated;
      } else {
        const priceMeta = this.surgeryPriceByRowId.get(String(surgery.Row_ID));
        if (priceMeta == null) {
          return;
        }
        surgery.GrossPrice = String(priceMeta.grossPrice);
        surgery.IsEstimatedPrice = priceMeta.isEstimated;
      }
    };

    const updateRoomSurgeries = (rooms: any[]) => {
      rooms.forEach((room) => {
        (room.Surgeries ?? []).forEach((surgery) => applyPriceToSurgery(surgery));
      });
    };

    updateRoomSurgeries(this.specificRooms);
    updateRoomSurgeries(this.filteredSpecificRooms);
    this.events.forEach((event) => applyPriceToSurgery(event));
  }

  plannedFromDrorSystem(silent = false) {
    if (!silent) {
      this.loader = true;
    }
    if (this.IfPlannedSurgeries == "original" || this.IfPlannedSurgeries == "planned") {
      // Check if viewDate is today or in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const viewDateOnly = new Date(this.viewDate);
      viewDateOnly.setHours(0, 0, 0, 0);
      const isCurrentOrPastDate = viewDateOnly <= today;

      this.filteredSpecificRooms.forEach((room, index1) => {
        if (room.Surgeries != undefined) {
          let temp = room.Surgeries.filter(x => x.SurgeryStatus != 'Canceled');
          temp.forEach((surgery, index2) => {
            // For current/past dates with status != 'Planned', don't add setup time
            const useRealTimes = isCurrentOrPastDate && surgery.SurgeryStatus !== 'Planned';

            // Only add setup time for future dates or Planned status
            if (!useRealTimes) {
              // ADDING SETUPTIME TO EACH SURGERY
              let setuptime = {
                title: this.buildSetupTimeTitle(surgery.start),
                cssClass: 'surgery-cal-event surgery-cal-event--setup',
                start: new Date(surgery.start.getTime() - 1200000),
                end: surgery.start
              }
              this.filteredSpecificRooms[index1].Surgeries.splice(index2, 0, setuptime);
            }

            let next = temp[index2 + 1];
            temp[index2].start = new Date(surgery.start.getTime());
            // check if the next surgery isn't defined
            if (next != undefined && next.SurgeryStatus != 'Canceled') {
              const nextUseRealTimes = isCurrentOrPastDate && next.SurgeryStatus !== 'Planned';

              if (nextUseRealTimes) {
                // Keep original server times for next surgery - no modifications needed
              } else {
                let estimated = next.end - next.start;
                if (surgery.SurgeriesCalendar_Susgeries.length > 0) surgery.end = new Date(surgery.start.getTime() + (parseInt(surgery.SurgeriesCalendar_Susgeries[0].Duration) * 60000));
                let current_end_time = surgery.end;
                // change the start time of the next surgery to begin after the end of the current surgery
                next.start = new Date(current_end_time.getTime() + 1200000);
                // change the end time of the next surgery to suit the new start time of the next surgery
                next.end = new Date(next.start.getTime() + estimated);
              }
            }
          });
        }
      });
      this.IfPlannedSurgeries = "dror";
      this.rebuildSurgeryIndex();
      this.reapplyCachedSurgeryPrices(false);
      this.refreshCalendarView();
    }
    if (!silent) {
      this.loader = false;
    }
  }

  sortSurgeriesOfEachRoomInDay(silent = false, force = false) {
    if (!silent) {
      this.loader = true;
    }
    //////debugger
    if (force || this.IfPlannedSurgeries == "original" || this.IfPlannedSurgeries == "dror") {
      // Check if viewDate is today or in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const viewDateOnly = new Date(this.viewDate);
      viewDateOnly.setHours(0, 0, 0, 0);
      const isCurrentOrPastDate = viewDateOnly <= today;

      this.filteredSpecificRooms.forEach((room, index1) => {
        if (room.Surgeries != undefined) {
          let temp = room.Surgeries.filter(x => x.SurgeryStatus != 'Canceled');
          temp.forEach((surgery, index2) => {
            // For current/past dates with status != 'Planned', use real times from server
            // Skip setup time and 07:30 AM forced start time
            const useRealTimes = isCurrentOrPastDate && surgery.SurgeryStatus !== 'Planned';

            if (index2 == 0) {
              if (useRealTimes) {
                // Keep the original server times - don't modify start/end times
                // Just update the title to reflect the existing times
                temp[index2].ArrivalDate = this.datePipe.transform(temp[index2].start, 'yyyy-MM-dd HH:mm');
                temp[index2].ArrivalTime = this.datePipe.transform(temp[index2].start, 'HH:mm');
                temp[index2].EndDate = this.datePipe.transform(temp[index2].end, 'yyyy-MM-dd HH:mm');
                temp[index2].EndTime = this.datePipe.transform(temp[index2].end, 'HH:mm');
                temp[index2].title = this.buildEventTitle(
                  temp[index2],
                  temp[index2].ArrivalDate.split(' ')[1],
                  temp[index2].EndDate.split(' ')[1]
                );
              } else {
                // Original behavior for future dates or Planned status: start at 07:30
                let mDate = new Date(temp[index2].start.getTime());
                temp[index2].start = new Date(this.datePipe.transform(mDate, 'yyyy-MM-dd 07:30'));
                /*
                20*60
                */
                const firstDurationMinutes = this.getPlannedDurationMinutes(temp[index2]);
                temp[index2].end = new Date(this.datePipe.transform(
                  temp[index2].start.getTime() + firstDurationMinutes * 60 * 1000,
                  'yyyy-MM-dd HH:mm'
                ));
                //  / ////debugger
                temp[index2].ArrivalDate = this.datePipe.transform(temp[index2].start, 'yyyy-MM-dd HH:mm');
                temp[index2].ArrivalTime = this.datePipe.transform(temp[index2].start, 'HH:mm');
                temp[index2].EndDate = this.datePipe.transform(temp[index2].end, 'yyyy-MM-dd HH:mm');
                temp[index2].EndTime = this.datePipe.transform(temp[index2].end, 'HH:mm');
                temp[index2].title = this.buildEventTitle(
                  temp[index2],
                  temp[index2].ArrivalDate.split(' ')[1],
                  temp[index2].EndDate.split(' ')[1]
                );
              }
            }

            // Only add setup time for future dates or Planned status
            if (!useRealTimes) {
              // ADDING SETUPTIME TO EACH SURGERY
              let setuptime = {
                title: this.buildSetupTimeTitle(surgery.start),
                cssClass: 'surgery-cal-event surgery-cal-event--setup',
                start: new Date(surgery.start.getTime() - 1200000),
                end: surgery.start
              }
              this.filteredSpecificRooms[index1].Surgeries.splice(index2, 0, setuptime);
            }

            let next = temp[index2 + 1];
            temp[index2].start = new Date(surgery.start.getTime());
            // check if the next surgery isn't defined
            if (next != undefined && next.SurgeryStatus != 'Canceled') {
              const nextUseRealTimes = isCurrentOrPastDate && next.SurgeryStatus !== 'Planned';

              if (nextUseRealTimes) {
                // Keep original server times for next surgery
                next.ArrivalDate = this.datePipe.transform(next.start, 'yyyy-MM-dd HH:mm');
                next.ArrivalTime = this.datePipe.transform(next.start, 'HH:mm');
                next.EndDate = this.datePipe.transform(next.end, 'yyyy-MM-dd HH:mm');
                next.EndTime = this.datePipe.transform(next.end, 'HH:mm');
                next.title = this.buildEventTitle(
                  next,
                  next.ArrivalDate.split(' ')[1],
                  next.EndDate.split(' ')[1]
                );
              } else {
                // Original behavior: calculate next start time based on current end time + setup time
                let current_end_time = surgery.end;
                // change the start time of the next surgery to begin after the end of the current surgery
                next.start = new Date(current_end_time.getTime() + 1200000);
                // change the end time of the next surgery to suit the new start time of the next surgery
                const nextDurationMinutes = this.getPlannedDurationMinutes(next);
                next.end = new Date(next.start.getTime() + nextDurationMinutes * 60 * 1000);
                /*
                next.EndDate  = next.EndTime = 
                next.ArrivalDate = next.ArrivalTime = 
                */
                next.ArrivalDate = this.datePipe.transform(next.start, 'yyyy-MM-dd HH:mm');
                next.ArrivalTime = this.datePipe.transform(next.start, 'HH:mm');
                next.EndDate = this.datePipe.transform(next.end, 'yyyy-MM-dd HH:mm');
                next.EndTime = this.datePipe.transform(next.end, 'HH:mm');
                next.title = this.buildEventTitle(
                  next,
                  next.ArrivalDate.split(' ')[1],
                  next.EndDate.split(' ')[1]
                );
              }
              //////debugger
            }
          });
        }
      });
      this.IfPlannedSurgeries = "planned";
      this.recalculateAllRoomsSurfing();
      this.syncSurfingFlagsToSpecificRooms();
      this.rebuildSurgeryIndex();
      this.reapplyCachedSurgeryPrices(false);
      this.refreshCalendarView();
      if (this.showWaitingRecommendations && !this.isPhysicalRoom) {
        this.refreshWaitingRecommendations(true);
      }
    }
    if (!silent) {
      this.loader = false;
    }
  }

  private getPlannedDurationMinutes(surgery: any): number {
    const avgDurationMinutes = this.parseAvgDurationMinutes(surgery?.AvgDauration);
    if (avgDurationMinutes !== null) {
      return avgDurationMinutes;
    }

    const durationMinutes = Number(surgery?.Duration);
    if (Number.isFinite(durationMinutes)) {
      return durationMinutes;
    }

    return 0;
  }

  private parseAvgDurationMinutes(avgDuration: any): number | null {
    if (typeof avgDuration !== 'string') {
      return null;
    }

    const trimmed = avgDuration.trim();
    if (!trimmed) {
      return null;
    }

    const parts = trimmed.split(':').map((part) => Number(part));
    if (parts.length < 2 || parts.some((part) => !Number.isFinite(part))) {
      return null;
    }

    return parts[0] * 60 + parts[1];
  }

  checkSurfingSurgeryDays(room) {
    return this.recalculateRoomSurfing(room);
  }

  private isEligibleForSurfingIndicator(surgery: any): boolean {
    return !!surgery?.Row_ID
      && surgery.SurgeryPatientDetails != null
      && surgery.SurgeryStatus !== 'Canceled'
      && !this.isSesiaSurgeryType(surgery)
      && !this.isUrgentSurgery(surgery);
  }

  private getSurgeryEndTime(surgery: any): string {
    if (surgery?.EndTime) {
      return surgery.EndTime;
    }
    if (surgery?.end) {
      return this.datePipe.transform(surgery.end, 'HH:mm') ?? '—';
    }
    const fromEndDate = surgery?.EndDate?.split?.(' ')?.[1];
    return fromEndDate || '—';
  }

  private getLatestEligibleSurfingEndMinutes(room: any): number | null {
    let latestEndMinutes: number | null = null;

    (room?.Surgeries ?? []).forEach((surgery) => {
      if (!this.isEligibleForSurfingIndicator(surgery)) {
        return;
      }

      const endMinutes = this.parseClockToMinutes(this.getSurgeryEndTime(surgery));
      if (endMinutes == null) {
        return;
      }

      if (latestEndMinutes == null || endMinutes > latestEndMinutes) {
        latestEndMinutes = endMinutes;
      }
    });

    return latestEndMinutes;
  }

  private recalculateRoomSurfing(room: any): any {
    if (!room) {
      return room;
    }

    const latestEndMinutes = this.getLatestEligibleSurfingEndMinutes(room);
    room.surgerySurf = latestEndMinutes != null && latestEndMinutes > 15 * 60;
    return room;
  }

  private recalculateAllRoomsSurfing(rooms: any[] = this.filteredSpecificRooms): void {
    (rooms ?? []).forEach((room) => this.recalculateRoomSurfing(room));
  }

  private syncSurfingFlagsToSpecificRooms(): void {
    const surfingByRoomName = new Map<string, boolean>();
    (this.filteredSpecificRooms ?? []).forEach((room) => {
      const roomName = this.normalizeBoardRoomName(room?.roomName);
      if (roomName) {
        surfingByRoomName.set(roomName, !!room?.surgerySurf);
      }
    });

    (this.specificRooms ?? []).forEach((room) => {
      const roomName = this.normalizeBoardRoomName(room?.roomName ?? room);
      if (!roomName || !surfingByRoomName.has(roomName)) {
        return;
      }
      if (room && typeof room === 'object') {
        room.surgerySurf = surfingByRoomName.get(roomName);
      }
    });
  }

  daysInMonth(month, year) {
    return new Date(year, month, 0).getDate();
  }

  openSnackBar(message) {
    this._snackBar.open(message, 'X', {
      duration: 3000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }

  getSurgeryGrossPrice(surgery: any): number | null {
    if (!surgery?.Row_ID && !surgery?.SurgeryPatientDetails) {
      return null;
    }

    const billingPrice = this.computeSurgeryBillingPrice(surgery);
    if (billingPrice?.price != null) {
      return billingPrice.price;
    }

    const fromField = this.parsePriceValue(surgery?.GrossPrice);
    if (fromField != null) {
      return fromField;
    }

    const fromMap = this.surgeryPriceByRowId.get(String(surgery?.Row_ID));
    return fromMap?.grossPrice ?? null;
  }

  /**
   * One billed service per surgery slot: the highest catalog price among procedures.
   * Falls back to the calendar event GrossPrice when procedure prices are unavailable.
   */
  private computeSurgeryBillingPrice(surgery: any): { price: number | null; isEstimated: boolean } | null {
    const procedures = surgery?.SurgeriesCalendar_Susgeries;
    if (!Array.isArray(procedures) || procedures.length === 0) {
      return null;
    }

    let maxPrice: number | null = null;
    let isEstimated = false;

    procedures.forEach((procedure: any) => {
      const fromProcedure = this.parsePriceValue(procedure?.GrossPrice);
      const fromMap = procedure?.Row_ID
        ? this.surgeryPriceByRowId.get(String(procedure.Row_ID))?.grossPrice ?? null
        : null;
      const catalogPrice = fromProcedure ?? fromMap;
      if (catalogPrice == null) {
        return;
      }

      const procedureEstimated = this.isEstimatedPriceFlag(procedure?.IsEstimatedPrice)
        || this.isEstimatedPriceFlag(
          procedure?.Row_ID
            ? this.surgeryPriceByRowId.get(String(procedure.Row_ID))?.isEstimated
            : false
        );

      if (maxPrice == null || catalogPrice > maxPrice) {
        maxPrice = catalogPrice;
        isEstimated = procedureEstimated;
      } else if (catalogPrice === maxPrice && procedureEstimated) {
        isEstimated = true;
      }
    });

    if (maxPrice == null) {
      return null;
    }

    return { price: maxPrice, isEstimated };
  }

  formatGrossPrice(value: number): string {
    return Math.round(value).toLocaleString('he-IL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  private isEstimatedPriceFlag(value: any): boolean {
    return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
  }

  private isAiRecommendedPriceFlag(value: any): boolean {
    return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
  }

  buildEventTitle(element: any, startTime?: string, endTime?: string): string {
    if (element.SurgeryPatientDetails == null) {
      const setupTime = element.ArrivalDate?.split(' ')[1] ?? this.datePipe.transform(element.start, 'HH:mm');
      return this.buildSetupTimeTitle(element.start, setupTime);
    }

    const start = startTime ?? element.ArrivalDate.split(' ')[1];
    const end = endTime ?? element.EndTime;
    const grossPrice = this.getSurgeryGrossPrice(element);
    const isAiRecommended = this.isEventAiRecommendedPrice(element);
    const isEstimated = this.isEventEstimatedPrice(element);
    const priceLabel = this.getEventPriceLabel(element);
    const priceRow = grossPrice != null
      ? `<div class="surgery-event__row surgery-event__row--price${isAiRecommended ? ' surgery-event__row--price-ai' : isEstimated ? ' surgery-event__row--price-estimated' : ''}"><span>${priceLabel}</span><strong>${this.formatGrossPrice(grossPrice)} ₪</strong></div>`
      : '';
    const anesthesiaDivider = element.WithAnesthesia == 'False'
      ? '<div class="surgery-event__divider"></div>'
      : '';

    return `${anesthesiaDivider}<div class="surgery-event" dir="rtl">
      <div class="surgery-event__row"><span>מחלקה</span><strong>${element.SurgeryRequestDepartments.S_DEPARTMENT}</strong></div>
      <div class="surgery-event__row surgery-event__row--name"><span>שם</span><strong>${element.SurgeryPatientDetails.PM_FIRST_NAME} ${element.SurgeryPatientDetails.PM_LAST_NAME}</strong><em>${element.SurgeryPatientDetails.PM_CASE_NUMBER}</em></div>
      <div class="surgery-event__row"><span>דחיפות</span><strong>${element.Urgency}</strong></div>
      ${priceRow}
      <div class="surgery-event__row surgery-event__row--time"><span>שעות</span><strong>${start} – ${end}</strong></div>
    </div>`;
  }

  private buildSetupTimeTitle(startDate: Date, displayTime?: string): string {
    const time = displayTime ?? this.datePipe.transform(startDate, 'HH:mm') ?? '';
    return `<div class="surgery-event surgery-event--setup" dir="rtl">
      <div class="surgery-event__row"><span>הכנה</span><strong>20 דק׳</strong></div>
      <div class="surgery-event__row surgery-event__row--time"><span>משעה</span><strong>${time}</strong></div>
    </div>`;
  }

  private parsePriceValue(value: any): number | null {
    const price = parseFloat(value);
    return Number.isFinite(price) && price > 0 ? price : null;
  }

  private getRoomDepartments(room: any): string[] {
    const departments = (room?.uniqueDepartments ?? []).filter((department) => !!department);
    if (departments.length > 0) {
      return departments;
    }

    const fromSurgeries = new Set<string>();
    (room?.Surgeries ?? []).forEach((surgery) => {
      const department = surgery.SurgeryRequestDepartments?.S_DEPARTMENT;
      if (department) {
        fromSurgeries.add(department);
      }
    });

    return Array.from(fromSurgeries);
  }

  private canonicalizeSurgeryRoomCode(value: any): string {
    const code = String(value ?? '')
      .replace(/[\u200E\u200F\u202A-\u202E]/g, '')
      .trim();
    if (!code) {
      return '';
    }

    const numberMatch = code.match(/(\d+-\d+)/);
    if (!numberMatch) {
      return code.replace(/\s+/g, '');
    }

    const number = numberMatch[1];
    if (/ור/.test(code)) {
      return this.mapVirtualRoomCodeToPhysical(code);
    }
    if (/פז/.test(code)) {
      return `פז${number}`;
    }

    return code.replace(/\s+/g, '');
  }

  private getRoomSummaryCanonicalKey(summary: any): string {
    const keys = [summary?.SurgeryRoom, summary?.SurgeryRoomName, summary?.RoomName];
    for (const key of keys) {
      const canonical = this.canonicalizeSurgeryRoomCode(String(key ?? '').trim());
      if (canonical) {
        return canonical.toLowerCase();
      }
    }

    return '';
  }

  private findRoomPriceSummaryByCanonicalCode(roomCode: string, sources: any[][]): any | null {
    const target = this.canonicalizeSurgeryRoomCode(roomCode).toLowerCase();
    if (!target) {
      return null;
    }

    const targetSuffix = this.normalizeRoomCodeSuffix(target);

    for (const source of sources) {
      if (!Array.isArray(source)) {
        continue;
      }

      const exactMatch = source.find((summary) => this.getRoomSummaryCanonicalKey(summary) === target);
      if (exactMatch) {
        return exactMatch;
      }

      const suffixMatch = source.find((summary) => {
        const summarySuffix = this.normalizeRoomCodeSuffix(this.getRoomSummaryCanonicalKey(summary));
        return !!summarySuffix && (
          summarySuffix === targetSuffix
          || summarySuffix.endsWith(targetSuffix)
          || targetSuffix.endsWith(summarySuffix)
        );
      });
      if (suffixMatch) {
        return suffixMatch;
      }
    }

    return null;
  }

  private mapVirtualRoomCodeToPhysical(roomCode: string): string {
    const code = String(roomCode ?? '').trim();
    if (!/ור/.test(code)) {
      return code;
    }

    // ור01-101 → פז01-201, ור01-104 → פז01-204 (not פז01-104)
    const pairedMatch = code.match(/ור\s*(\d+)-1(\d+)/);
    if (pairedMatch) {
      return `פז${pairedMatch[1]}-2${pairedMatch[2]}`;
    }

    const numberMatch = code.match(/(\d+-\d+)/);
    if (numberMatch) {
      const physicalNumber = numberMatch[1].replace(/^(\d+)-1(\d+)$/, '$1-2$2');
      return `פז${physicalNumber}`;
    }

    const fallback = code.startsWith('ור') ? code.slice(2).trim() : code;
    return fallback ? `פז${fallback}` : code;
  }

  private mapPhysicalRoomCodeToVirtual(roomCode: string): string {
    const code = String(roomCode ?? '').trim();
    if (!/פז/.test(code)) {
      return code;
    }

    const pairedMatch = code.match(/פז\s*(\d+)-2(\d+)/);
    if (pairedMatch) {
      return `ור${pairedMatch[1]}-1${pairedMatch[2]}`;
    }

    const numberMatch = code.match(/(\d+-\d+)/);
    if (numberMatch) {
      const virtualNumber = numberMatch[1].replace(/^(\d+)-2(\d+)$/, '$1-1$2');
      return `ור${virtualNumber}`;
    }

    const fallback = code.startsWith('פז') ? code.slice(2).trim() : code;
    return fallback ? `ור${fallback}` : code;
  }

  private mapVirtualRoomGroupDescToPhysical(roomGroupDesc: string): string | null {
    const normalized = String(roomGroupDesc ?? '').trim();
    const mapping: Record<string, string> = {
      'וירטואלי כללי': 'חדר ניתוח כללי',
      'וירטואלי חדר לידה': 'חדר לידה',
      'וירטואלי כללי ססיה': 'חדר ניתוח כללי ססיה',
      'וירטואלי אמבולטורי': 'חדר ניתוח אמבולטורי',
      'וירטואלי ניתוח ליד': 'ניתוח ליד מיטת החולה',
      'פה ולסת': 'פה ולסת',
      'נשים': 'נשים',
    };

    if (mapping[normalized]) {
      return mapping[normalized];
    }

    if (normalized.startsWith('וירטואלי')) {
      return mapping[normalized] ?? null;
    }

    return null;
  }

  private getPhysicalRoomCodeForAverage(room: any): string {
    return this.canonicalizeSurgeryRoomCode(this.normalizeBoardRoomName(room?.roomName));
  }

  private derivePhysicalRoomGroupDesc(): string | null {
    if (!this.isPhysicalRoom) {
      const fromVirtualGroup = this.mapVirtualRoomGroupDescToPhysical(this.getRoomGroupDescForApi());
      if (fromVirtualGroup) {
        return fromVirtualGroup;
      }
    }

    const physicalCodes = this.getRoomCodesList()
      .map((code) => this.mapVirtualRoomCodeToPhysical(code))
      .filter((code) => code.startsWith('פז'));

    if (physicalCodes.length > 0) {
      return this.deriveRoomGroupDescFromRoomCodes(physicalCodes);
    }

    const calendarArea = this.getCalendarRoomsAreaForApi();
    if (/פה\s*ולסת/i.test(calendarArea)) {
      return 'פה ולסת';
    }
    if (/נשים|גינקולוג|יולדות/i.test(calendarArea)) {
      return 'נשים';
    }
    if (/ססיה/i.test(calendarArea)) {
      return 'חדר ניתוח כללי ססיה';
    }
    if (/אמבולטורי/i.test(calendarArea)) {
      return 'חדר ניתוח אמבולטורי';
    }
    if (/לידה/i.test(calendarArea)) {
      return 'חדר לידה';
    }
    if (/ליד/i.test(calendarArea)) {
      return 'ניתוח ליד מיטת החולה';
    }
    if (/כללי/i.test(calendarArea) || calendarArea.startsWith('וירטואלי')) {
      return 'חדר ניתוח כללי';
    }

    return calendarArea || null;
  }

  private getPhysicalRoomGroupDescCandidates(): string[] {
    const candidates: string[] = [];
    const add = (value: string | null | undefined) => {
      const normalized = String(value ?? '').trim();
      if (normalized && !candidates.includes(normalized)) {
        candidates.push(normalized);
      }
    };

    add(this.mapVirtualRoomGroupDescToPhysical(this.getRoomGroupDescForApi()));
    add(this.derivePhysicalRoomGroupDesc());

    const calendarArea = this.getCalendarRoomsAreaForApi();
    if (/פה\s*ולסת/i.test(calendarArea)) {
      add('פה ולסת');
    }
    if (/נשים|גינקולוג|יולדות/i.test(calendarArea)) {
      add('נשים');
      add('חדר לידה');
    }

    add(this.deriveRoomGroupDescFromRoomCodes(
      this.getRoomCodesList().map((code) => this.mapVirtualRoomCodeToPhysical(code))
    ));

    return candidates;
  }

  private loadDepartmentBenchmarkSummaries(fullDate: string | null): void {
    const benchmarkDate = this.getDepartmentBenchmarkReferenceDate(fullDate);
    const roomGroupDescs = Array.from(new Set([
      this.getRoomGroupDescForApi(),
      ...this.getPhysicalRoomGroupDescCandidates(),
    ].filter((value) => !!value)));

    if (!benchmarkDate || roomGroupDescs.length === 0) {
      this.departmentBenchmarkSummariesFromServer = [];
      this.loadingPhysicalRoomPrices = false;
      this.cdr.detectChanges();
      return;
    }

    this.loadingPhysicalRoomPrices = true;
    forkJoin(
      roomGroupDescs.map((roomGroupDesc) => this.http.post(
        environment.url + 'GetSurgeriesRoomPricesBySurgeryRoomCode',
        this.buildRoomPricesApiPayload(benchmarkDate, roomGroupDesc)
      ))
    ).subscribe({
      next: (responses) => {
        const merged: any[] = [];
        responses.forEach((response) => {
          const summaries = response['d']?.RoomPriceSummaries;
          if (Array.isArray(summaries)) {
            merged.push(...summaries);
          }
        });
        this.departmentBenchmarkSummariesFromServer = merged;
        this.loadingPhysicalRoomPrices = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Failed to load department benchmark summaries', error);
        this.departmentBenchmarkSummariesFromServer = [];
        this.loadingPhysicalRoomPrices = false;
        this.cdr.detectChanges();
      }
    });
  }

  private fetchPhysicalRoomPriceSummaries(fullDate: string | null): Observable<any[]> {
    if (!fullDate || this.isPhysicalRoom) {
      return of([]);
    }

    const physicalGroups = this.getPhysicalRoomGroupDescCandidates();
    if (physicalGroups.length === 0) {
      return of([]);
    }

    const benchmarkDate = this.getDepartmentBenchmarkReferenceDate(fullDate) ?? fullDate;

    return forkJoin(
      physicalGroups.map((roomGroupDesc) => this.http.post(
        environment.url + 'GetSurgeriesRoomPricesBySurgeryRoomCode',
        this.buildRoomPricesApiPayload(benchmarkDate, roomGroupDesc)
      ))
    ).pipe(
      map((responses) => {
        const merged: any[] = [];
        responses.forEach((response) => {
          const summaries = response['d']?.RoomPriceSummaries;
          if (Array.isArray(summaries)) {
            merged.push(...summaries);
          }
        });
        return merged;
      }),
      catchError((error) => {
        console.error('Failed to load physical room price summaries', error);
        return of([]);
      })
    );
  }

  private buildPhysicalRoomProxy(room: any): { roomName: string; Surgeries: any[] } {
    const physicalRoomName = this.getPhysicalRoomCodeForAverage(room);
    return {
      roomName: physicalRoomName,
      Surgeries: (room?.Surgeries ?? []).map((surgery) => ({
        ...surgery,
        SurgeryRoom: this.mapVirtualRoomCodeToPhysical(this.normalizeBoardRoomName(surgery?.SurgeryRoom))
      }))
    };
  }

  private normalizeRoomCodeSuffix(value: any): string {
    const digits = String(value ?? '').replace(/\D/g, '');
    return digits.replace(/^0+/, '') || digits;
  }

  private findPhysicalRoomSummaryByRoomSuffix(physicalRoomCode: string): any | null {
    const targetSuffix = this.normalizeRoomCodeSuffix(physicalRoomCode);
    if (!targetSuffix || !Array.isArray(this.physicalRoomPriceSummariesFromServer)) {
      return null;
    }

    return this.physicalRoomPriceSummariesFromServer.find((summary) => {
      const summaryKeys = [
        summary?.SurgeryRoom,
        summary?.SurgeryRoomName,
        summary?.RoomName
      ]
        .map((value) => this.normalizeRoomCodeSuffix(value))
        .filter((value) => !!value);

      return summaryKeys.some((summarySuffix) =>
        summarySuffix === targetSuffix
        || summarySuffix.endsWith(targetSuffix)
        || targetSuffix.endsWith(summarySuffix)
      );
    }) ?? null;
  }

  private findPhysicalRoomSummaryForAverage(room: any): any | null {
    const physicalRoom = this.buildPhysicalRoomProxy(room);
    const sources = this.isPhysicalRoom
      ? [this.roomPriceSummariesFromServer, this.rawRoomPriceSummariesFromServer]
      : [this.physicalRoomPriceSummariesFromServer];

    for (const source of sources) {
      if (!Array.isArray(source)) {
        continue;
      }

      const match = source.find((summary) => this.roomSummaryMatches(summary, physicalRoom));
      if (match) {
        return match;
      }
    }

    const byCode = this.findPhysicalRoomPriceSummaryByCode(physicalRoom.roomName);
    if (byCode) {
      return byCode;
    }

    if (this.isPhysicalRoom) {
      return null;
    }

    return this.findPhysicalRoomSummaryByBoardIndex(room)
      ?? this.findPhysicalRoomSummaryByRoomSuffix(physicalRoom.roomName);
  }

  private findPhysicalRoomSummaryByBoardIndex(room: any): any | null {
    const boardRooms = [...this.filteredSpecificRooms, ...this.specificRooms];
    const roomName = this.normalizeBoardRoomName(room?.roomName);
    const roomIndex = boardRooms.findIndex((boardRoom) =>
      this.normalizeBoardRoomName(boardRoom?.roomName ?? boardRoom) === roomName
    );

    if (roomIndex < 0 || !Array.isArray(this.physicalRoomPriceSummariesFromServer)) {
      return null;
    }

    return this.physicalRoomPriceSummariesFromServer[roomIndex] ?? null;
  }

  private findPhysicalRoomPriceSummaryByCode(roomCode: string): any | null {
    const roomKey = this.normalizeRoomKey(roomCode);
    if (!roomKey) {
      return null;
    }

    const sources = this.isPhysicalRoom
      ? [this.rawRoomPriceSummariesFromServer, this.roomPriceSummariesFromServer]
      : [this.physicalRoomPriceSummariesFromServer];

    for (const source of sources) {
      if (!Array.isArray(source)) {
        continue;
      }

      const match = source.find((summary) => {
        const summaryKeys = [
          summary?.SurgeryRoom,
          summary?.SurgeryRoomName,
          summary?.RoomName
        ]
          .map((value) => this.normalizeRoomKey(value))
          .filter((value) => !!value);

        return summaryKeys.some((summaryKey) =>
          summaryKey === roomKey
          || summaryKey.includes(roomKey)
          || roomKey.includes(summaryKey)
        );
      });

      if (match) {
        return match;
      }
    }

    return null;
  }

  private normalizeDepartmentKey(value: any): string {
    return String(value ?? '')
      .replace(/[\u200E\u200F\u202A-\u202E]/g, '')
      .trim()
      .replace(/^מחלקת?\s+/u, '')
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  private expandDepartmentMatchKeys(key: string): string[] {
    const normalized = this.normalizeDepartmentKey(key);
    if (!normalized) {
      return [];
    }

    const expanded = new Set<string>([normalized]);
    Object.entries(this.departmentAliasGroups).forEach(([canonical, aliases]) => {
      const canonicalKey = this.normalizeDepartmentKey(canonical);
      const aliasKeys = [canonicalKey, ...aliases.map((alias) => this.normalizeDepartmentKey(alias))]
        .filter((aliasKey) => !!aliasKey);

      const matchesGroup = aliasKeys.some((aliasKey) =>
        normalized === aliasKey || normalized.includes(aliasKey) || aliasKey.includes(normalized)
      );
      if (matchesGroup) {
        aliasKeys.forEach((aliasKey) => expanded.add(aliasKey));
      }
    });

    return Array.from(expanded);
  }

  private getInferredDepartmentKeysFromCalendar(): string[] {
    const calendarArea = this.getCalendarRoomsAreaForApi();
    const keys = new Set<string>();

    if (/פה\s*ולסת/i.test(calendarArea)) {
      this.expandDepartmentMatchKeys('פה ולסת').forEach((key) => keys.add(key));
    }
    if (/נשים|גינקולוג|יולדות/i.test(calendarArea)) {
      this.expandDepartmentMatchKeys('נשים').forEach((key) => keys.add(key));
    }

    return Array.from(keys);
  }

  private getRoomDepartmentMatchKeys(room: any): string[] {
    const keys = new Set<string>();

    this.getRoomDepartments(room).forEach((department) => {
      this.expandDepartmentMatchKeys(department).forEach((key) => keys.add(key));
    });

    (room?.Surgeries ?? []).forEach((surgery) => {
      const department = surgery?.SurgeryRequestDepartments ?? {};
      [
        department.S_DEPARTMENT,
        department.S_DEPARTMENT_NAME,
        department.S_DEPARTMENT_SHORT_DESC,
      ].forEach((value) => {
        this.expandDepartmentMatchKeys(String(value ?? '')).forEach((key) => keys.add(key));
      });
    });

    if (this.getRoomDepartments(room).length === 1) {
      this.getInferredDepartmentKeysFromCalendar().forEach((key) => keys.add(key));
    }

    return Array.from(keys);
  }

  private departmentKeysMatch(left: string, right: string): boolean {
    if (!left || !right) {
      return false;
    }

    if (left === right || left.includes(right) || right.includes(left)) {
      return true;
    }

    const leftExpanded = this.expandDepartmentMatchKeys(left);
    const rightExpanded = this.expandDepartmentMatchKeys(right);
    return leftExpanded.some((leftKey) =>
      rightExpanded.some((rightKey) =>
        leftKey === rightKey || leftKey.includes(rightKey) || rightKey.includes(leftKey)
      )
    );
  }

  private summaryMatchesRoomDepartment(summary: any, room: any): boolean {
    if (this.getRoomDepartments(room).length !== 1) {
      return true;
    }

    const roomDepartmentKeys = this.getRoomDepartmentMatchKeys(room);
    if (roomDepartmentKeys.length === 0) {
      return true;
    }

    const deptCnt = Number(summary?.DeptCnt ?? summary?.DepartmentCount ?? 0);
    if (deptCnt === 1) {
      return true;
    }

    const summaryDepartmentKeys = this.getSummaryDepartmentMatchKeys(summary);

    if (summaryDepartmentKeys.length === 0) {
      return true;
    }

    return summaryDepartmentKeys.some((summaryKey) =>
      roomDepartmentKeys.some((roomDepartmentKey) => this.departmentKeysMatch(roomDepartmentKey, summaryKey))
    );
  }

  private parseDepartmentDayAverageFromSummary(summary: any, room: any): number | null {
    if (!summary || !this.summaryMatchesRoomDepartment(summary, room)) {
      return null;
    }

    return this.parsePriceValue(summary?.DepartmentDayAverage);
  }

  private getSummaryDepartmentMatchKeys(summary: any): string[] {
    const values = [
      summary?.DepartmentCode,
      summary?.Department,
      summary?.RequestedDepartmentDetails,
      summary?.DepartmentName,
      summary?.S_DEPARTMENT,
    ];

    const keys: string[] = [];
    values.forEach((value) => {
      this.expandDepartmentMatchKeys(String(value ?? '')).forEach((key) => {
        if (key) {
          keys.push(key);
        }
      });
    });

    return keys;
  }

  private findDepartmentDayAverageByDepartmentOnly(room: any, sources: any[][]): number | null {
    const roomDepartmentKeys = this.getRoomDepartmentMatchKeys(room);
    if (roomDepartmentKeys.length === 0) {
      return null;
    }

    for (const source of sources) {
      if (!Array.isArray(source)) {
        continue;
      }

      for (const summary of source) {
        const departmentDailyAverage = this.parsePriceValue(summary?.DepartmentDayAverage);
        if (departmentDailyAverage == null) {
          continue;
        }

        const deptCnt = Number(summary?.DeptCnt ?? summary?.DepartmentCount ?? 0);
        if (deptCnt === 1) {
          return departmentDailyAverage;
        }

        const summaryDepartmentKeys = this.getSummaryDepartmentMatchKeys(summary);
        if (summaryDepartmentKeys.length === 0) {
          continue;
        }

        const matchesDepartment = roomDepartmentKeys.some((roomKey) =>
          summaryDepartmentKeys.some((summaryKey) => this.departmentKeysMatch(roomKey, summaryKey))
        );
        if (matchesDepartment) {
          return departmentDailyAverage;
        }
      }
    }

    return null;
  }

  private getDepartmentSixMonthDailyAverage(room: any): number | null {
    if (this.isPhysicalRoom) {
      const canonicalRoomCode = this.canonicalizeSurgeryRoomCode(this.normalizeBoardRoomName(room?.roomName));
      const sourceSets = this.isFutureViewDate()
        ? [this.departmentBenchmarkSummariesFromServer]
        : [this.roomPriceSummariesFromServer, this.rawRoomPriceSummariesFromServer];
      const summary = this.findRoomPriceSummaryByCanonicalCode(
        canonicalRoomCode,
        sourceSets
      ) ?? this.findRoomPriceSummary(room);
      const fromRoomSummary = this.parseDepartmentDayAverageFromSummary(summary, room);
      if (fromRoomSummary != null) {
        return fromRoomSummary;
      }

      return this.findDepartmentDayAverageByDepartmentOnly(room, sourceSets);
    }

    const physicalRoomCode = this.mapVirtualRoomCodeToPhysical(this.normalizeBoardRoomName(room?.roomName));
    const physicalSources = [this.physicalRoomPriceSummariesFromServer];
    const physicalSummary = this.findRoomPriceSummaryByCanonicalCode(
      physicalRoomCode,
      physicalSources
    )
      ?? this.findPhysicalRoomSummaryForAverage(room)
      ?? this.findPhysicalRoomSummaryByBoardIndex(room);

    const fromPhysicalRoomSummary = this.parseDepartmentDayAverageFromSummary(physicalSummary, room);
    if (fromPhysicalRoomSummary != null) {
      return fromPhysicalRoomSummary;
    }

    return this.findDepartmentDayAverageByDepartmentOnly(room, physicalSources);
  }

  private filterSummariesForBoard(summaries: any[]): any[] {
    const boardRooms = [...this.filteredSpecificRooms, ...this.specificRooms];
    if (boardRooms.length === 0) {
      return summaries;
    }

    return summaries.filter((summary) =>
      boardRooms.some((room) => this.roomSummaryMatches(summary, room))
    );
  }

  private normalizeSurgeryLabel(value: any): string {
    return String(value ?? '')
      .replace(/[\u200E\u200F\u202A-\u202E]/g, '')
      .trim()
      .replace(/\s*[-–—−]\s*/g, '-')
      .replace(/\s+/g, '');
  }

  private isSesiaLabel(value: string): boolean {
    const normalized = this.normalizeSurgeryLabel(value);
    return normalized.length > 0 && normalized.includes('ססיה');
  }

  private isSesiaSurgeryType(surgery: any): boolean {
    const type = String(surgery?.SurgeryType ?? '');
    const urgency = String(surgery?.Urgency ?? '');
    const cssClass = String(surgery?.cssClass ?? '');
    if (this.isSesiaLabel(type) || this.isSesiaLabel(urgency) || cssClass.includes('event-css-sesia')) {
      return true;
    }

    return (surgery?.SurgeriesCalendar_Susgeries ?? []).some((procedure: any) => {
      const procedureType = String(procedure?.SurgeryType ?? procedure?.ServiceType ?? '');
      return this.isSesiaLabel(procedureType);
    });
  }

  private normalizeUrgencyLabel(value: any): string {
    return String(value ?? '')
      .replace(/[\u200E\u200F\u202A-\u202E]/g, '')
      .trim()
      .replace(/\s*[-–—−]\s*/g, '-')
      .replace(/\s+/g, ' ');
  }

  private isUrgentLabel(value: string): boolean {
    const label = this.normalizeUrgencyLabel(value);
    if (!label) {
      return false;
    }

    if (label === 'לא דחוף' || label.startsWith('לא דחוף')) {
      return false;
    }

    return label === 'דחוף' || label.includes('דחוף');
  }

  private isUrgentSurgery(surgery: any): boolean {
    const urgency = String(surgery?.Urgency ?? '');
    const type = this.normalizeSurgeryLabel(String(surgery?.SurgeryType ?? ''));
    return this.isUrgentLabel(urgency) || type === 'דחוף';
  }

  private parseClockToMinutes(value: any): number | null {
    if (value == null) {
      return null;
    }

    const trimmed = String(value).trim();
    if (!trimmed || trimmed === '—') {
      return null;
    }

    const parts = trimmed.split(':').map((part) => Number(part));
    if (parts.length < 2 || parts.some((part) => !Number.isFinite(part))) {
      return null;
    }

    return parts[0] * 60 + parts[1];
  }

  private getSurgeryStartTime(surgery: any): string {
    if (surgery?.ArrivalTime) {
      return surgery.ArrivalTime;
    }
    if (surgery?.start) {
      return this.datePipe.transform(surgery.start, 'HH:mm') ?? '—';
    }
    const fromArrival = surgery?.ArrivalDate?.split?.(' ')?.[1];
    return fromArrival || '—';
  }

  private isSurgeryStartAfter1500(surgery: any): boolean {
    const startMinutes = this.parseClockToMinutes(this.getSurgeryStartTime(surgery));
    return startMinutes != null && startMinutes > 15 * 60;
  }

  private getScheduledSurgeries(room: any): any[] {
    return (room?.Surgeries ?? []).filter(
      (surgery) =>
        surgery?.Row_ID &&
        surgery.SurgeryPatientDetails != null &&
        surgery.SurgeryStatus !== 'Canceled'
    );
  }

  private isExcludedFromDailyRoomIncome(surgery: any): boolean {
    return this.isSesiaSurgeryType(surgery)
      || this.isUrgentSurgery(surgery)
      || this.isSurgeryStartAfter1500(surgery);
  }

  private getDailyIncomeExcludedSurgeries(room: any): any[] {
    return this.getScheduledSurgeries(room).filter((surgery) => this.isExcludedFromDailyRoomIncome(surgery));
  }

  private getBillableSurgeries(room: any): any[] {
    return this.getScheduledSurgeries(room).filter((surgery) => !this.isExcludedFromDailyRoomIncome(surgery));
  }

  private sumSurgeryGrossPrices(surgeries: any[]): number {
    const prices = surgeries
      .map((surgery) => this.getSurgeryGrossPrice(surgery))
      .filter((price): price is number => price != null);

    return prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) : 0;
  }

  private resolveDailyRoomIncomeTotal(room: any, serverTotal: number | null): number | null {
    const scheduled = this.getScheduledSurgeries(room);
    if (scheduled.length === 0) {
      return null;
    }

    const excluded = this.getDailyIncomeExcludedSurgeries(room);
    const billable = this.getBillableSurgeries(room);
    if (billable.length === 0) {
      return null;
    }

    const billableTotal = this.sumSurgeryGrossPrices(billable);
    const excludedTotal = this.sumSurgeryGrossPrices(excluded);
    const pricedBillableCount = billable.filter((surgery) => this.getSurgeryGrossPrice(surgery) != null).length;
    const allBillablePriced = pricedBillableCount === billable.length && pricedBillableCount > 0;

    if (allBillablePriced) {
      return billableTotal;
    }

    if (pricedBillableCount > 0) {
      return billableTotal;
    }

    if (!this.canUseServerRoomGrossTotal(room) || serverTotal == null) {
      return null;
    }

    if (excluded.length > 0) {
      const pricedExcludedCount = excluded.filter((surgery) => this.getSurgeryGrossPrice(surgery) != null).length;
      if (pricedExcludedCount > 0) {
        return Math.max(0, serverTotal - excludedTotal);
      }
      return null;
    }

    return serverTotal;
  }

  private canUseServerRoomGrossTotal(room: any): boolean {
    if (!this.isPhysicalRoom) {
      return false;
    }

    const roomName = this.normalizeBoardRoomName(room?.roomName);
    if (!roomName) {
      return false;
    }

    const surgeryRoomCodes = new Set(
      this.getScheduledSurgeries(room)
        .map((surgery) => this.normalizeBoardRoomName(surgery?.SurgeryRoom))
        .filter((code) => !!code)
    );

    if (surgeryRoomCodes.size !== 1) {
      return false;
    }

    const soleCode = Array.from(surgeryRoomCodes)[0];
    return soleCode === roomName;
  }

  shouldShowDepartmentDailyAverage(room: any, priceSummary: { departmentDailyAverage?: string }): boolean {
    if (this.getRoomDepartments(room).length !== 1) {
      return false;
    }

    if (this.isPhysicalRoom) {
      return !!priceSummary?.departmentDailyAverage
        || (this.isFutureViewDate() && this.loadingPhysicalRoomPrices);
    }

    return !!room && (!!priceSummary?.departmentDailyAverage || this.loadingPhysicalRoomPrices);
  }

  getRoomPriceSummary(room: any): { total: string; departmentDailyAverage?: string } | null {
    if (!room) {
      return null;
    }

    const serverSummary = this.findRoomPriceSummary(room);
    const serverTotal = this.parsePriceValue(serverSummary?.RoomGrossPriceTotal);
    const total = this.resolveDailyRoomIncomeTotal(room, serverTotal);

    if (total == null) {
      return null;
    }

    const summary: { total: string; departmentDailyAverage?: string } = {
      total: this.formatGrossPrice(total)
    };

    if (this.getRoomDepartments(room).length === 1) {
      const departmentDailyAverage = this.getDepartmentSixMonthDailyAverage(room);
      if (departmentDailyAverage != null) {
        summary.departmentDailyAverage = this.formatGrossPrice(departmentDailyAverage);
      }
    }

    return summary;
  }

  deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    const cloneObj = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloneObj[key] = this.deepClone(obj[key]);
      }
    }

    return cloneObj;
  }

  getPlannedSurgeriesData(department, room) {
    //debugger
    if (Array.isArray(department)) {
      // it's an array
      department = department.map(x => `'${x}'`).join(',');
    } else {
      department = `'${department}'`;
    }
    let fullDate = this.datePipe.transform(this.viewDate, 'yyyy-MM-dd');
    this.http.post(environment.url + 'GetSurgeriesPlannedExcel', {
      Department: department,
      _surRoomCode: room,
      date: fullDate
    }).subscribe(res => {
      if (res['d'].length > 0) this.planningExcelFile(res['d'], department);
    })
  }

  sentDepartmentFinalSurgeryPlan(department, room) {
    //debugger

    if (Array.isArray(department)) {
      // it's an array
      department = department.map(x => `'${x}'`).join(',');
    } else {
      department = `'${department}'`;
    }
    const departmentDisplay = stripDepartmentQuotes(department);
    let fullDate = this.datePipe.transform(this.viewDate, 'yyyy-MM-dd');
    const calendarArea = this.data.room.CalendarRoomsArea;
    const emailSubject = buildDepartmentFinalPlanEmailSubject(departmentDisplay, fullDate, calendarArea);
    this.http.post(environment.url + 'GetSurgeriesPlannedExcel', {
      Department: department,
      _surRoomCode: room,
      date: fullDate
    }).subscribe(res => {
      if (res['d'].length > 0) {
        let data = res['d'];

        //debugger
        this.pdfString = `
        <!doctype html>
        <html lang="he">
          <head>
            <meta charset="utf-8"/>
              <title>${emailSubject}</title>
            <style>
              body{margin:0;padding:12px;font-family:Arial,Helvetica,sans-serif;}
              p,mat-label,span{font-weight:bold;font-size:18px;}
              .pdf-header{text-align:center;margin-bottom:16px;}
              .pdf-header__image{width:100%;display:block;margin:0 auto;}
              .pdf-title{margin:14px 0 0;font-size:20px;font-weight:700;line-height:1.65;text-align:center;}
              .pdf-title__line{display:block;margin:4px 0;}
              .col-2{width:16.66667%;justify-content:center;}
              .row{display:flex;margin-top:10px;}
              td{border:1px solid black;}
            </style>
          </head>
          <body dir="rtl">
            <div class="d-none-desktop" dir="rtl">
              <div class="pdf-header">
                  <img class="pdf-header__image" src="${PDF_HOSPITAL_HEADER_IMAGE_SRC}" alt="" />
                  <div class="pdf-title">
                    <span class="pdf-title__line">${emailSubject}</span>
                    <span class="pdf-title__line">חדר: ${room}</span>
                  </div>
              </div>
              <div class="col-12" style="width:100%;text-align:center;float:right;">
                <p>תאריך: ${fullDate}</p>
                <hr>
                <div class="row">
                  <table class="table">  <thead>  <tr>
                  <th>#</th>  
                  <th>מספר מקרה</th>
                  <th>חדר</th>
                  <th>שם מלא, ת.ז</th>
                  <th>גיל</th>
                  <th>תיאור פרוצדורה</th>
                  <th>תנוחת השכבה</th>
                  <th>בידוד</th>
                  <th>בנק הדם</th>
                  <th>שם מנתח</th>
                  <th>הערות</th>
                  <th>מכשירים נוספים</th>
                  <th>סוג הרדמה</th>
                  <th>נדרש שיקוף</th>
                  <th>מחלקת אשפוז</th>
                  <th>משך משוער</th>
                  </tr>
              </thead>
              <tbody> `;
        for (let i = 0; i < data.length; i++) {
          this.pdfString += `<tr>
                                <td> ${i + 1} </td>
                                <td> ${data[i].casenumber} </td>
                                <td> ${data[i].room} </td>
                                <td> ${data[i].id} </td>
                                <td> ${data[i].age} </td>
                                <td> ${data[i].s_name} </td>
                                <td> ${data[i].position} </td>
                                <td> ${data[i].isolation} </td>
                                <td> ${data[i].blood} </td>
                                <td> ${data[i].doctor} </td>
                                <td> ${data[i].note} </td>
                                <td> ${data[i].tools} </td>
                                <td> ${data[i].anesthesia} </td>
                                <td> ${data[i].dimot} </td>
                                <td> ${data[i].hospitalization} </td>
                                <td> ${data[i].duration} </td>
                             </tr>`;
        }

        this.pdfString += `
              </tbody>
            </table>
                </div>
              </div>
            </div>
          </body>
        </html>`;

        this.openShareDialog(this.pdfString, department);
      }
    });
  }

  async planningExcelFile(json, department) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('תוכנית ניתוחים', {
      views: [{ rightToLeft: true }]
    });

    // Add merged header row on top
    const columnCount = 15; // Adjust based on number of columns
    const titleCellRange = `A1:P1`;
    worksheet.mergeCells(titleCellRange);
    worksheet.getCell('A1').value = `תוכנית ניתוחים - מחלקה ${department}`;
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('A1').font = { size: 16, bold: true, name: 'Arial' };

    // Define headers (row 2)
    worksheet.addRow([
      'מספר מקרה', 'חדר', 'שם מלא, ת.ז', 'גיל', 'תיאור פרוצדורה',
      'תנוחת השכבה', 'בידוד', 'בנק הדם', 'שם מנתח', 'הערות',
      'מכשירים נוספים', 'סוג הרדמה', 'נדרש שיקוף', 'מחלקת אשפוז', 'משך משוער'
    ]);

    // Style header row (row 2)
    const headerRow = worksheet.getRow(2);
    headerRow.font = { bold: true, size: 18 };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add data rows (starting from row 3)
    json.forEach(item => {
      worksheet.addRow([
        item.casenumber, item.room, item.id, item.age, item.s_name,
        item.position, item.isolation, item.blood, item.doctor, item.note,
        item.tools, item.anesthesia, item.dimot, item.hospitalization, item.duration
      ]);
    });
    // Style all data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 2) return; // Skip merged title and header
      row.eachCell(cell => {
        cell.font = { size: 16 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Save the file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    FileSaver.saveAs(blob, `תוכנית ניתוחים מחלקה ${department}.xlsx`);
  }

  openShareDialog(pdf: string, department: string) {
    const dialogRef = this.dialog.open(ShareSurgeriesPDFDialog, {
      panelClass: SURGERY_SHARE_PDF_DIALOG_PANEL_CLASS,
      autoFocus: false,
      width: 'min(94vw, 520px)',
      maxWidth: '96vw',
      maxHeight: '90vh',
    });
    dialogRef.componentInstance.reportArray = pdf;
    dialogRef.componentInstance.department = department;
    dialogRef.componentInstance.arrivalDate = this.datePipe.transform(this.data.room.Start, 'yyyy-MM-dd');
    dialogRef.componentInstance.calendarRoomsArea = this.data.room.CalendarRoomsArea;
  }

  toggleWaitingRecommendations(): void {
    if (this.isPhysicalRoom) {
      return;
    }

    if (this.showWaitingRecommendations) {
      this.showWaitingRecommendations = false;
      this.removeWaitingRecommendationsFromBoard();
      this.refreshCalendarView();
      this.cdr.detectChanges();
      return;
    }

    this.refreshWaitingRecommendations(false);
  }

  private refreshWaitingRecommendations(silent: boolean): void {
    if (this.isPhysicalRoom || this.loadingWaitingRecommendations) {
      return;
    }

    const runLoad = () => {
      this.loadingWaitingRecommendations = true;
      const fullDate = this.datePipe.transform(this.viewDate, 'yyyy-MM-dd');

      this.virtualRoomWaitingApi.getWaitingCandidates({
        fullDate,
        calendarRoomsArea: this.getCalendarRoomsAreaForApi(),
        roomGroupDesc: this.getRoomGroupDescForApi(),
        roomCodes: this.getRoomCodesList(),
      }).subscribe({
        next: (rows) => {
          const scheduledKeys = this.buildScheduledCompositeKeys();
          const plannerRooms = this.buildPlannerRoomColumns();
          const slots = planWaitingRecommendations(plannerRooms, rows, scheduledKeys);

          this.removeWaitingRecommendationsFromBoard();
          this.applyWaitingRecommendationsToBoard(slots);
          this.showWaitingRecommendations = slots.length > 0;

          if (rows.length === 0) {
            if (!silent) {
              this.openSnackBar('לא נמצאו ממתיני ניתוח רלוונטיים מהמתנה ליום זה');
            }
          } else if (slots.length === 0) {
            if (!silent) {
              this.openSnackBar('לא נמצאו חלונות פנויים לממתינים אלקטיביים בחדרים המתאימים');
            }
          } else if (!silent) {
            this.openSnackBar(`הוצגו ${slots.length} המלצות מהמתנה על הלוח (לשיבוץ ב-SAP)`);
          }

          this.loadingWaitingRecommendations = false;
          this.refreshCalendarView();
          this.cdr.detectChanges();
        },
        error: (error: VirtualRoomWaitingApiError | unknown) => {
          this.loadingWaitingRecommendations = false;
          this.showWaitingRecommendations = false;
          this.removeWaitingRecommendationsFromBoard();
          this.refreshCalendarView();
          this.cdr.detectChanges();

          if (!silent) {
            if (
              error instanceof VirtualRoomWaitingApiError &&
              error.kind === 'missing_web_method'
            ) {
              this.openSnackBar(
                'שגיאת שרת: חסר WebMethod GetNappWaitingForVirtualRoomScheduling — יש לפרוס לפי BACKEND_PROMPT_GetNappWaitingForVirtualRoomScheduling.md'
              );
            } else {
              this.openSnackBar('שגיאה בטעינת ממתינים מהמתנה — נסה שוב או פנה לתמיכה');
            }
          }
        },
      });
    };

    if (this.IfPlannedSurgeries !== 'planned') {
      this.sortSurgeriesOfEachRoomInDay(true, true);
      setTimeout(runLoad, 0);
      return;
    }

    runLoad();
  }

  private buildPlannerRoomColumns(): RoomBoardColumn[] {
    return (this.filteredSpecificRooms ?? []).map((room) => {
      const fullRoom = (this.specificRooms ?? []).find(
        (entry) => this.normalizeBoardRoomName(entry?.roomName) === this.normalizeBoardRoomName(room?.roomName)
      );

      return {
        roomName: room?.roomName,
        uniqueDepartments: fullRoom?.uniqueDepartments ?? room?.uniqueDepartments ?? [],
        departmentFilter: this.roomDepartmentFilters.get(room?.roomName) ?? null,
        Surgeries: fullRoom?.Surgeries ?? room?.Surgeries ?? [],
      };
    });
  }

  private buildScheduledCompositeKeys(): Set<string> {
    const keys = new Set<string>();

    this.specificRooms.forEach((room) => {
      this.getScheduledSurgeries(room).forEach((surgery) => {
        const caseNumber = surgery?.SurgeryPatientDetails?.PM_CASE_NUMBER;
        const requestId = surgery?.RequestID ?? surgery?.SurgeryRequestDepartments?.SD_ROW_ID;
        const key = buildScheduledCompositeKey(caseNumber, requestId);
        if (key) {
          keys.add(key);
        }
      });
    });

    return keys;
  }

  private removeWaitingRecommendationsFromBoard(): void {
    [this.filteredSpecificRooms, this.specificRooms].forEach((rooms) => {
      (rooms ?? []).forEach((room) => {
        if (room?.Surgeries) {
          room.Surgeries = room.Surgeries.filter((event) => !event?.isWaitingRecommendation);
        }
      });
    });
  }

  private applyWaitingRecommendationsToBoard(slots: PlannedWaitingSlot[]): void {
    slots.forEach((slot) => {
      const room = this.filteredSpecificRooms.find(
        (entry) => this.normalizeBoardRoomName(entry?.roomName) === this.normalizeBoardRoomName(slot.roomName)
      );
      if (!room) {
        return;
      }

      const events = this.buildWaitingRecommendationEvents(slot);
      room.Surgeries = [...(room.Surgeries ?? []), ...events];
    });

    this.syncWaitingRecommendationsToSpecificRooms();
  }

  private syncWaitingRecommendationsToSpecificRooms(): void {
    const byRoom = new Map<string, any[]>();

    (this.filteredSpecificRooms ?? []).forEach((room) => {
      const roomName = this.normalizeBoardRoomName(room?.roomName);
      if (!roomName) {
        return;
      }
      const waiting = (room.Surgeries ?? []).filter((event) => event?.isWaitingRecommendation);
      byRoom.set(roomName, waiting);
    });

    (this.specificRooms ?? []).forEach((room) => {
      const roomName = this.normalizeBoardRoomName(room?.roomName ?? room);
      if (!roomName || !byRoom.has(roomName)) {
        return;
      }
      const base = (room.Surgeries ?? []).filter((event) => !event?.isWaitingRecommendation);
      room.Surgeries = [...base, ...byRoom.get(roomName)];
    });
  }

  private buildWaitingRecommendationEvents(slot: PlannedWaitingSlot): any[] {
    const candidate = slot.candidate;
    const datePrefix = this.datePipe.transform(this.viewDate, 'yyyy-MM-dd');
    const setupStart = this.dateFromDayMinutes(slot.setupStartMinutes);
    const surgeryStart = this.dateFromDayMinutes(slot.surgeryStartMinutes);
    const surgeryEnd = this.dateFromDayMinutes(slot.surgeryEndMinutes);
    const arrivalTime = this.minutesToClock(slot.surgeryStartMinutes);
    const endTime = this.minutesToClock(slot.surgeryEndMinutes);
    const procedureSummary = this.buildWaitingProcedureSummary(candidate);
    const patientFirstName = String(candidate.PatientFirstName ?? '').trim();
    const patientLastName = String(candidate.PatientLastName ?? '').trim();
    const waitingPatientName = `${patientFirstName} ${patientLastName}`.trim();
    const waitingDoctorName = this.getWaitingDoctorName(candidate);
    const waitingOperatingDepartment = getWaitingOperatingDepartment(candidate);
    const waitingDepartCode = String(candidate.Depart ?? '').trim();
    const matchedDepartment = slot.matchedDepartment || waitingOperatingDepartment || slot.department;
    const waitingDays = candidate.WaitingDays;
    const waitingDurationMinutes = getWaitingRowDurationMinutes(candidate);
    const waitingProcedures = Array.isArray(candidate.Procedures) ? candidate.Procedures : [];

    const surgeryEvent = {
      isWaitingRecommendation: true,
      RequestID: candidate.RequestID,
      waitingRequestDate: candidate.RequestDate,
      waitingFromDate: candidate.WaitingFromDate,
      waitingDays,
      waitingDurationMinutes,
      waitingDoctorName: waitingDoctorName || null,
      waitingOperatingDepartment: waitingOperatingDepartment || null,
      waitingDepartCode: waitingDepartCode || null,
      waitingPatientName: waitingPatientName || null,
      waitingMatchedDepartment: matchedDepartment,
      waitingRoomSurgeries: slot.roomDepartmentSurgeries ?? [],
      recommendedRoomName: slot.roomName,
      waitingReasons: slot.reasons,
      waitingProceduresSummary: procedureSummary,
      waitingProcedures,
      waitingCandidate: candidate,
      waitingPatientNumber: String(candidate.PatientNumber ?? '').trim() || null,
      waitingServiceNumber: String(candidate.ServiceNumber ?? '').trim() || null,
      waitingServiceDescription: String(candidate.ServiceDescription ?? '').trim() || null,
      waitingRequestDepart: String(candidate.RequestDepart ?? candidate.Department ?? '').trim() || null,
      SurgeryRoom: slot.roomName,
      SurgeryStatus: 'Planned',
      Urgency: 'לא דחוף',
      SurgeryType: candidate.SurgeryType ?? 'אלקטיבי',
      ArrivalDate: `${datePrefix} ${arrivalTime}`,
      ArrivalTime: arrivalTime,
      EndDate: `${datePrefix} ${endTime}`,
      EndTime: endTime,
      start: surgeryStart,
      end: surgeryEnd,
      draggable: false,
      cssClass: 'surgery-cal-event surgery-cal-event--waiting-recommendation event-css-Planned',
      color: { primary: '#000000', secondary: '#fed7aa' },
      SurgeryPatientDetails: {
        PM_CASE_NUMBER: candidate.CaseNumber,
        PM_FIRST_NAME: patientFirstName,
        PM_LAST_NAME: patientLastName,
        PM_PATIENT_ID: candidate.PatientId ?? candidate.PatientNumber ?? '',
      },
      SurgeryRequestDepartments: { S_DEPARTMENT: matchedDepartment },
      title: this.buildWaitingRecommendationTitle(candidate, slot, procedureSummary, {
        waitingPatientName,
        waitingDoctorName,
        waitingOperatingDepartment,
        waitingDepartCode,
        matchedDepartment,
      }),
    };

    const setupEvent = {
      isWaitingRecommendation: true,
      title: this.buildSetupTimeTitle(setupStart),
      cssClass: 'surgery-cal-event surgery-cal-event--setup',
      start: setupStart,
      end: surgeryStart,
      draggable: false,
      color: { primary: '#000000', secondary: '#e0f2f1' },
    };

    return [setupEvent, surgeryEvent];
  }

  private buildWaitingProcedureSummary(candidate: any): string {
    const procedures = candidate?.Procedures;
    if (Array.isArray(procedures) && procedures.length > 0) {
      const labels = procedures
        .map((row: any) => {
          const code = row?.Surgery_Code ?? row?.SurgeryCode ?? row?.SurgeryID ?? '';
          const name = row?.Surgery_Name ?? row?.SurgeryName ?? row?.S_SERVICE_VAL ?? '';
          return [code, name].filter(Boolean).join(' ');
        })
        .filter(Boolean);
      if (labels.length > 0) {
        return labels.join(', ');
      }
    }

    const codes = String(candidate?.ProcedureCodes ?? '').trim();
    const names = String(candidate?.ProcedureNames ?? '').trim();
    if (codes && names) {
      return `${codes} — ${names}`;
    }
    if (codes || names) {
      return codes || names;
    }

    const depart = getWaitingOperatingDepartment(candidate);
    return depart || 'פרוצדורות לא זמינות ב-SAP';
  }

  private getWaitingDoctorName(candidate: any): string {
    return String(
      candidate?.DoctorSurgeon
      ?? candidate?.SurgeonName
      ?? candidate?.DoctorName
      ?? candidate?.RequestDoctor
      ?? candidate?.Surgeon
      ?? ''
    ).trim();
  }

  private buildWaitingRecommendationTitle(
    candidate: any,
    slot: PlannedWaitingSlot,
    procedureSummary: string,
    details?: {
      waitingPatientName?: string;
      waitingDoctorName?: string;
      waitingOperatingDepartment?: string;
      waitingDepartCode?: string;
      matchedDepartment?: string;
    },
  ): string {
    const caseNumber = candidate.CaseNumber ?? '—';
    const patientName = details?.waitingPatientName ?? '';
    const doctorName = details?.waitingDoctorName ?? this.getWaitingDoctorName(candidate);
    const waitingDays = candidate.WaitingDays;
    const durationMinutes = getWaitingRowDurationMinutes(candidate);
    const requestDate = candidate.RequestDate ?? '';
    const start = this.minutesToClock(slot.surgeryStartMinutes);
    const end = this.minutesToClock(slot.surgeryEndMinutes);
    const patientRow = patientName
      ? `<div class="surgery-event__row surgery-event__row--name"><span>שם מנותח</span><strong>${patientName}</strong></div>`
      : '';
    const doctorRow = doctorName
      ? `<div class="surgery-event__row"><span>רופא</span><strong>${doctorName}</strong></div>`
      : '';
    const patientNumber = String(candidate.PatientNumber ?? candidate.PatientId ?? '').trim();
    const patientNumberRow = patientNumber
      ? `<div class="surgery-event__row"><span>מספר מטופל</span><strong>${patientNumber}</strong></div>`
      : '';
    const recommendedRoomRow = slot.roomName
      ? `<div class="surgery-event__row surgery-event__row--room"><span>חדר ניתוח מומלץ</span><strong>${slot.roomName}</strong></div>`
      : '';
    const waitingDaysRow = waitingDays != null
      ? `<div class="surgery-event__row"><span>ימי המתנה</span><strong>${waitingDays}</strong></div>`
      : '';
    const requestDateRow = requestDate
      ? `<div class="surgery-event__row"><span>תאריך בקשה</span><strong>${requestDate}</strong></div>`
      : '';
    const durationRow = durationMinutes
      ? `<div class="surgery-event__row"><span>משך</span><strong>${durationMinutes} דק׳</strong></div>`
      : '';

    return `<div class="surgery-event surgery-event--waiting-rec" dir="rtl">
      <div class="surgery-event__badge">המלצה ל-SAP</div>
      <div class="surgery-event__row surgery-event__row--case"><span>מספר מקרה</span><strong>${caseNumber}</strong></div>
      ${patientRow}
      ${doctorRow}
      ${patientNumberRow}
      ${recommendedRoomRow}
      ${waitingDaysRow}
      ${requestDateRow}
      <div class="surgery-event__row"><span>מזהה בקשה</span><strong>${candidate.RequestID}</strong></div>
      <div class="surgery-event__row"><span>ניתוח</span><strong>${procedureSummary}</strong></div>
      ${durationRow}
      <div class="surgery-event__row surgery-event__row--time"><span>שעות מומלצות</span><strong>${start} – ${end}</strong></div>
    </div>`;
  }

  private buildWaitingRecommendationHoverDetails(event: any): string {
    const lines = [
      'המלצת שיבוץ ל-SAP (לא נשמר ביומן)',
      `מספר מקרה: ${event?.SurgeryPatientDetails?.PM_CASE_NUMBER ?? '—'}`,
      `מזהה בקשה: ${event?.RequestID ?? '—'}`,
    ];

    if (event?.waitingPatientName) {
      lines.push(`שם מנותח: ${event.waitingPatientName}`);
    }
    if (event?.waitingDoctorName) {
      lines.push(`רופא: ${event.waitingDoctorName}`);
    }
    const patientNumber = String(
      event?.waitingPatientNumber
      ?? event?.SurgeryPatientDetails?.PM_PATIENT_ID
      ?? ''
    ).trim();
    if (patientNumber) {
      lines.push(`מספר מטופל: ${patientNumber}`);
    }
    if (event?.waitingDays != null) {
      lines.push(`ימי המתנה: ${event.waitingDays}`);
    }
    if (event?.waitingFromDate) {
      lines.push(`ממתין מאז: ${event.waitingFromDate}`);
    }

    lines.push(
      `חדר ניתוח מומלץ: ${event?.recommendedRoomName ?? event?.SurgeryRoom ?? '—'}`,
      `ניתוח: ${event?.waitingProceduresSummary ?? '—'}`,
    );

    if (event?.waitingDurationMinutes) {
      lines.push(`משך משוער: ${event.waitingDurationMinutes} דק׳`);
    }

    lines.push(
      `שעות מומלצות: ${this.getEventStartTime(event)} – ${event?.EndTime ?? '—'}`,
    );

    if (event?.waitingRequestDate) {
      lines.push(`תאריך בקשה: ${event.waitingRequestDate}`);
    }

    (event?.waitingReasons ?? [])
      .filter((reason: string) => !/^המתנה \d+ ימים$/.test(String(reason ?? '').trim()))
      .forEach((reason: string) => lines.push(reason));
    return lines.join('\n');
  }

  openWaitingRecommendationDetails(event: any): void {
    const dialogRef = this.dialog.open(WaitingRecommendationDialogComponent, {
      data: { event },
      width: 'min(94vw, 760px)',
      maxWidth: '96vw',
      autoFocus: false,
      panelClass: SURGERY_WAITING_REC_DIALOG_PANEL_CLASS,
      direction: 'rtl',
    });
    dialogRef.afterOpened().subscribe(() => {
      dialogRef.addPanelClass(SURGERY_WAITING_REC_DIALOG_PANEL_CLASS);
    });
  }

  private dateFromDayMinutes(minutes: number): Date {
    const date = new Date(this.viewDate);
    date.setHours(0, 0, 0, 0);
    date.setMinutes(minutes);
    return date;
  }

  private minutesToClock(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

}



export interface User {
  FirstName: string;
  LastName: string;
  id: string;
  Email: string;
}

const PLAN_RETURN_DEFAULT_RECIPIENTS: User[] = [
  {
    id: '039383617',
    FirstName: 'ד"ר אמל',
    LastName: 'סילאוי',
    Email: 'AMSILAWY@TZMC.GOV.IL',
  },
];

@Component({
  selector: 'share-pdf-dialog',
  templateUrl: '../dialogs/share-pdf-dialog.html',
  styleUrls: ['../styles/components/share-pdf-dialog.css'],
})
export class ShareSurgeriesPDFDialog {

  horizontalPosition: MatSnackBarHorizontalPosition = 'start';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';

  constructor(
    public dialogRef: MatDialogRef<ShareSurgeriesPDFDialog>,
    @Inject(MAT_DIALOG_DATA) public data: string,
    private _snackBar: MatSnackBar,
    private http: HttpClient,
    private fb: FormBuilder,
    private departmentPlanReturnApi: DepartmentPlanReturnApiService,
  ) { }
  specialForces: User[] = [
  ]
  filteredOptions: Observable<string[]>;
  myControl = new FormControl('', Validators.required);
  users = [];
  removable = true;
  selectable = true;
  user_name = localStorage.getItem("loginUserName").toLowerCase();
  all_users_filter = [];
  reportArray: string;
  department: string;
  calendarRoomsArea: string;
  arrivalDate: string;
  private _shareMode: 'final-plan' | 'department-plan-return' = 'final-plan';
  get shareMode(): 'final-plan' | 'department-plan-return' {
    return this._shareMode;
  }
  set shareMode(mode: 'final-plan' | 'department-plan-return') {
    this._shareMode = mode;
    if (mode === 'department-plan-return') {
      this.applyPlanReturnDefaultRecipients();
    }
  }
  returnMeta: {
    returnId?: string;
    roomCode?: string;
    generalComment?: string;
    emailBody?: string;
  } | null = null;
  disableBtn = false;
  separatorKeysCodes: number[] = [ENTER, COMMA];
  fruits: any[] = [
    { FirstName: 'תפוצת', LastName: 'חדר ניתוח', id: '', Email: 'DL_SurgeryPlaning@tzmc.gov.il' },
    { FirstName: this.user_name, LastName: '', id: '', Email: this.user_name + '@tzmc.gov.il' },
  ];
  @ViewChild('fruitInput') fruitInput: ElementRef<HTMLInputElement>;

  private applyPlanReturnDefaultRecipients(): void {
    PLAN_RETURN_DEFAULT_RECIPIENTS.forEach((recipient) => {
      const email = recipient.Email.toLowerCase();
      const exists = this.fruits.some((fruit) =>
        String(fruit?.Email || '').toLowerCase() === email
      );
      if (!exists) {
        this.fruits.push({ ...recipient });
      }
    });
  }

  ngOnInit() {
    this.filteredOptions = this.myControl.valueChanges.pipe(
      startWith(null),
      map((fruit: string | null) => fruit ? this._filter(fruit) : this.users.slice()));
    this.getUsers();
  }

  close(): void {
    this.dialogRef.close();
  }

  getRecipientLabel(fruit: any): string {
    if (!fruit) {
      return '';
    }
    if (typeof fruit === 'string') {
      return fruit;
    }
    const first = fruit.FirstName ?? '';
    const last = fruit.LastName ?? '';
    return `${first} ${last}`.trim();
  }

  private stripDepartmentQuotes(value: string): string {
    return stripDepartmentQuotes(value);
  }

  getDepartmentLabel(): string {
    return this.stripDepartmentQuotes(this.department);
  }

  getEmailSubjectPreview(): string {
    const departmentLabel = this.getDepartmentLabel();
    if (!departmentLabel || !this.arrivalDate) {
      return departmentLabel;
    }
    if (this.shareMode === 'department-plan-return') {
      const roomCode = this.returnMeta?.roomCode || '';
      return buildPlanReturnEmailSubject(departmentLabel, this.arrivalDate, roomCode);
    }
    if (!this.calendarRoomsArea) {
      return departmentLabel;
    }
    return buildDepartmentFinalPlanEmailSubject(departmentLabel, this.arrivalDate, this.calendarRoomsArea);
  }

  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value) {
      this.fruits.push(value);
    }

    // event.chipInput!.clear();
    this.myControl.setValue(null);
  }

  remove(fruit: any): void {
    const index = this.fruits.indexOf(fruit);
    if (index >= 0) {
      this.fruits.splice(index, 1);
    }
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    if (event.option.value.id == "1") {
      this.specialForces.forEach(element => {
        this.fruits.push(element);
      });
    } else {
      this.fruits.push(event.option.value);
    }
    this.fruitInput.nativeElement.value = '';
    this.myControl.setValue(null);
  }

  private _filter(value: any): string[] {
    let filterValue = "";
    if (value != '' && value.FirstName == undefined) {
      filterValue = value.toLowerCase();
    }
    return this.users.filter(fruit => fruit.FirstName.toLowerCase().includes(filterValue));
  }

  getFruitsList() {
    this.http.post(environment.urlipracticom + 'GetEmployeesListForSurgeriesCalendar', {}).subscribe(res => {
      if (res['d']) {
        this.openSnackBar("התוכנית נשלחה בהצלחה");
        this.dialogRef.close();
      }
      else this.openSnackBar("אירעה תקלה, לא נשלח");
    });
  }

  shareReportWithOthers() {
    this.disableBtn = true;

    if (this.fruits.length === 0) {
      this.openSnackBar('נא לבחור אחראי לשליחה');
      this.disableBtn = false;
      return;
    }

    if (this.shareMode === 'department-plan-return') {
      this.departmentPlanReturnApi.sendReturnToDepartment({
        returnId: this.returnMeta ? this.returnMeta.returnId : undefined,
        department: this.department,
        fileString: this.reportArray,
        emailBody: this.returnMeta ? this.returnMeta.emailBody : undefined,
        arrivalDate: this.arrivalDate,
        calendarRoomsArea: this.calendarRoomsArea,
        roomCode: this.returnMeta ? this.returnMeta.roomCode : '',
        generalComment: this.returnMeta ? (this.returnMeta.generalComment || '') : '',
        users: this.fruits,
      }).subscribe({
        next: (ok) => {
          if (ok) {
            this.openSnackBar('אישור התוכנית נשלח בהצלחה למחלקה');
            this.dialogRef.close(true);
          } else {
            this.openSnackBar('אירעה תקלה בשליחה. ודא שההערה נשמרה לפני השליחה.');
            this.disableBtn = false;
          }
        },
        error: () => {
          this.openSnackBar('אירעה תקלה בחיבור לשרת');
          this.disableBtn = false;
        },
      });
      return;
    }

    this.http.post(environment.urlipracticom + 'SentDepartmentFinalSurgeryPlan', {
      department: this.department,
      fileString: this.reportArray,
      arrivalDate: this.arrivalDate,
      calendarRoomsArea: this.calendarRoomsArea,
      users: this.fruits,
    }).subscribe({
      next: (res) => {
        if (res['d']) {
          this.openSnackBar('התוכנית נשלחה בהצלחה');
          this.dialogRef.close();
        } else {
          this.openSnackBar('אירעה תקלה, לא נשלח');
          this.disableBtn = false;
        }
      },
      error: () => {
        this.openSnackBar('אירעה תקלה בחיבור לשרת');
        this.disableBtn = false;
      },
    });
  }

  openSnackBar(message) {
    this._snackBar.open(message, 'X', {
      duration: 5000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }
  getUsers() {
    this.http
      .post(environment.url + "GetUsersForInquiries", {

      })
      .subscribe((Response) => {
        this.all_users_filter = Response["d"];

        this.all_users_filter.forEach(element => {
          this.users.push({
            FirstName: element.firstname,
            LastName: element.lastname,
            id: element.id,
            Email: element.email
          });
        });
      });
  }
}


@Component({
  selector: 'app-summary-dialog',
  templateUrl: '../dialogs/summary-dialog.html',
  styleUrls: ['../styles/components/summary-dialog.css'],
})
export class SummaryDialogComponent implements OnInit {

  totalSurgeriesDuration = 0;
  prepTimeHours = 0;
  totalWithPrepHours = 0;
  surgeries: any[] = [];
  roomLabel = '';

  private static readonly STATUS_LABELS: Record<string, string> = {
    Completed: 'הושלם',
    InProgress: 'בתהליך',
    Planned: 'מתוכנן',
    Canceled: 'בוטל',
  };

  constructor(
    private datePipe: DatePipe,
    private dialogRef: MatDialogRef<SummaryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public surdata: any
  ) {}

  ngOnInit(): void {
    this.surgeries = this.surdata?.room?.newSurgeries ?? [];
    this.roomLabel =
      this.surdata?.room?.SurgeryRoom ??
      this.surdata?.room?.roomName ??
      '';
    this.differenceInTimes();
  }

  close(): void {
    this.dialogRef.close();
  }

  getSurgeryName(surgery: any): string {
    const procedures =
      surgery?.SurgeriesCalendar_Susgeries ??
      surgery?.SurgeriesCalendar_Surgeries ??
      [];
    if (procedures.length > 0) {
      const names = procedures
        .map((p: any) => p?.Service_Name || p?.S_SERVICE_VAL)
        .filter(Boolean);
      if (names.length > 0) {
        return names.join(', ');
      }
    }

    const services = surgery?.SurgeriesCalendar_Service ?? [];
    if (services.length > 0) {
      const names = services.map((s: any) => s?.Service_Name).filter(Boolean);
      if (names.length > 0) {
        return names.join(', ');
      }
    }

    return (
      surgery?.SurgeryServicesName?.S_SERVICE_VAL ??
      surgery?.S_SERVICE_VAL ??
      '—'
    );
  }

  getStartTime(surgery: any): string {
    if (surgery?.ArrivalTime) {
      return surgery.ArrivalTime;
    }
    if (surgery?.start) {
      return this.datePipe.transform(surgery.start, 'HH:mm') ?? '—';
    }
    const fromArrival = surgery?.ArrivalDate?.split?.(' ')?.[1];
    return fromArrival || '—';
  }

  getEndTime(surgery: any): string {
    if (surgery?.EndTime) {
      return surgery.EndTime;
    }
    if (surgery?.end) {
      return this.datePipe.transform(surgery.end, 'HH:mm') ?? '—';
    }
    return '—';
  }

  getStatusLabel(surgery: any): string {
    const status = surgery?.SurgeryStatus ?? '';
    return SummaryDialogComponent.STATUS_LABELS[status] ?? (status || '—');
  }

  getStatusRowClass(surgery: any): string {
    const status = (surgery?.SurgeryStatus ?? '').toLowerCase();
    if (status === 'completed') return 'summary-dialog__row--completed';
    if (status === 'inprogress') return 'summary-dialog__row--in-progress';
    if (status === 'planned') return 'summary-dialog__row--planned';
    if (status === 'canceled') return 'summary-dialog__row--canceled';
    return '';
  }

  getStatusBadgeClass(surgery: any): string {
    const status = (surgery?.SurgeryStatus ?? '').toLowerCase();
    if (status === 'completed') return 'summary-dialog__badge--completed';
    if (status === 'inprogress') return 'summary-dialog__badge--in-progress';
    if (status === 'planned') return 'summary-dialog__badge--planned';
    if (status === 'canceled') return 'summary-dialog__badge--canceled';
    return '';
  }

  formatDuration(hours: number | undefined): string {
    if (hours == null || !Number.isFinite(hours)) {
      return '—';
    }
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) {
      return `${m} דק׳`;
    }
    if (m === 0) {
      return `${h} שע׳`;
    }
    return `${h}:${String(m).padStart(2, '0')} שע׳`;
  }

  formatHours(hours: number): string {
    return `${hours.toFixed(2)} שעות`;
  }

  private differenceInTimes(): void {
    this.totalSurgeriesDuration = 0;

    this.surgeries.forEach((element) => {
      const datefordiff = this.datePipe.transform(element.ArrivalDate, 'yyyy-MM-dd');
      const start = this.getStartTime(element);
      const end = this.getEndTime(element);
      const before = new Date(`${datefordiff} ${start}`);
      const after = new Date(`${datefordiff} ${end}`);

      if (Number.isNaN(before.getTime()) || Number.isNaN(after.getTime())) {
        element.durationHours = 0;
        return;
      }

      const diffMs = Math.abs(after.getTime() - before.getTime());
      const durationHours = diffMs / 3600000;
      element.durationHours = durationHours;
      this.totalSurgeriesDuration += durationHours;
    });

    const prepPerGapHours = 20 / 60;
    this.prepTimeHours =
      this.surgeries.length > 1
        ? (this.surgeries.length - 1) * prepPerGapHours
        : 0;
    this.totalWithPrepHours =
      this.totalSurgeriesDuration + this.surgeries.length * prepPerGapHours;
  }

}

export type DepartmentPlanReturnDialogMode = 'send' | 'respond' | 'unified';

export interface DepartmentPlanReturnDialogData {
  mode: DepartmentPlanReturnDialogMode;
  department: string | string[];
  roomCode: string;
  planDate: string;
  calendarRoomsArea: string;
  returnId?: string;
  boardSurgeries?: DepartmentPlanReturnSurgeryRow[];
  onIndicatorsChange?: () => void;
}

@Component({
  selector: 'app-department-plan-return-dialog',
  templateUrl: '../dialogs/department-plan-return-dialog.html',
  styleUrls: ['../styles/components/department-plan-return-dialog.css'],
})
export class DepartmentPlanReturnDialogComponent implements OnInit {
  readonly statusLabels = DEPARTMENT_PLAN_TREATMENT_STATUS_LABELS;
  readonly statusOptions = DEPARTMENT_PLAN_TREATMENT_STATUS_OPTIONS;

  loading = true;
  saving = false;
  surgeries: DepartmentPlanReturnSurgeryRow[] = [];
  generalComment = '';
  generalResponseText = '';
  treatmentStatus: DepartmentPlanTreatmentStatus = 'pending';
  returnId = '';
  groupIsDeleted = false;
  groupDeletedAt: string | null = null;
  groupDeletedBy: string | null = null;
  recordSentBy = '';
  recordSentAt = '';
  recordCreatedAt = '';
  departmentDisplay = '';
  departmentParam = '';
  errorMessage: string | null = null;
  private userDisplayNames = new Map<string, string>();

  constructor(
    private dialogRef: MatDialogRef<DepartmentPlanReturnDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DepartmentPlanReturnDialogData,
    private api: DepartmentPlanReturnApiService,
    private userDirectory: DepartmentPlanReturnUserDirectoryService,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private host: ElementRef<HTMLElement>,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.departmentParam = this.formatDepartmentParam(this.data.department);
    this.departmentDisplay = this.stripDepartmentQuotes(this.departmentParam);
    this.returnId = this.data.returnId || '';
    this.userDisplayNames = new Map(this.userDirectory.getCachedDirectory());
    this.userDirectory.loadDirectory().subscribe((directory) => {
      this.userDisplayNames = new Map(directory);
      this.cdr.markForCheck();
    });
    this.loadSurgeries();
  }

  get isSendMode(): boolean {
    return this.data.mode === 'send';
  }

  get isRespondMode(): boolean {
    return this.data.mode === 'respond';
  }

  get isUnifiedMode(): boolean {
    return this.data.mode === 'unified';
  }

  get dialogTitle(): string {
    if (this.isRespondMode) {
      return `תגובת מחלקה — ${this.departmentDisplay}`;
    }
    return buildPlanReturnEmailSubject(
      this.departmentDisplay,
      this.data.planDate,
      this.data.roomCode,
    );
  }

  get dialogSubtitle(): string {
    return `חדר ${this.data.roomCode} · ${this.data.calendarRoomsArea}`;
  }

  get emailSubjectLine(): string {
    return buildPlanReturnEmailSubject(
      this.departmentDisplay,
      this.data.planDate,
      this.data.roomCode,
    );
  }

  close(): void {
    this.dialogRef.close();
  }

  resizeTextarea(target: EventTarget | null): void {
    const textarea = target as HTMLTextAreaElement | null;
    if (!textarea) {
      return;
    }
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  private scheduleTextareaResize(): void {
    setTimeout(() => {
      this.host.nativeElement
        .querySelectorAll<HTMLTextAreaElement>('.dept-plan-return__textarea--table')
        .forEach((textarea) => this.resizeTextarea(textarea));
    });
  }

  loadSurgeries(): void {
    this.loading = true;
    this.errorMessage = null;

    const afterBoardLoad = () => {
      this.api
        .loadReturnPlan({
          department: this.departmentParam,
          roomCode: this.data.roomCode,
          planDate: this.data.planDate,
          calendarRoomsArea: this.data.calendarRoomsArea,
        })
        .subscribe((record) => {
          if (record) {
            this.applyRecord(record, true);
            this.notifyIndicatorsChange();
          }
          this.scheduleTextareaResize();
        });
    };

    if (this.isRespondMode && this.returnId) {
      this.api.getReturnById(this.returnId).subscribe((record) => {
        if (record && record.surgeries && record.surgeries.length) {
          this.applyRecord(record);
          this.loading = false;
          this.scheduleTextareaResize();
          return;
        }
        this.loadFromBoardData(afterBoardLoad);
      });
      return;
    }

    this.loadFromBoardData(afterBoardLoad);
  }

  private applyRecord(record: {
    returnId?: string;
    generalComment?: string;
    generalResponseText?: string;
    treatmentStatus?: DepartmentPlanTreatmentStatus;
    sentBy?: string;
    sentAt?: string;
    createdAt?: string;
    isDeleted?: boolean;
    deletedAt?: string | null;
    deletedBy?: string | null;
    surgeries?: DepartmentPlanReturnSurgeryRow[];
  }, mergeOnly = false): void {
    const hydrated = hydratePlanReturnRecordAuthorship({
      returnId: record.returnId || this.returnId,
      department: this.departmentParam,
      departmentDisplay: this.departmentDisplay,
      roomCode: this.data.roomCode,
      planDate: this.data.planDate,
      calendarRoomsArea: this.data.calendarRoomsArea,
      generalComment: record.generalComment ?? this.generalComment,
      generalResponseText: record.generalResponseText ?? this.generalResponseText,
      treatmentStatus: record.treatmentStatus || this.treatmentStatus,
      sentBy: firstNonEmptyText(record.sentBy, this.recordSentBy),
      sentAt: firstNonEmptyText(record.sentAt, this.recordSentAt),
      createdAt: firstNonEmptyText(record.createdAt, this.recordCreatedAt),
      respondedAt: null,
      respondedBy: null,
      surgeries: record.surgeries || this.surgeries,
    });

    this.returnId = hydrated.returnId || this.returnId;
    if (record.generalComment !== undefined) {
      this.generalComment = hydrated.generalComment;
    }
    if (record.generalResponseText !== undefined) {
      this.generalResponseText = hydrated.generalResponseText;
    }
    if (record.treatmentStatus) {
      this.treatmentStatus = hydrated.treatmentStatus;
    }
    this.recordSentBy = hydrated.sentBy || this.recordSentBy;
    this.recordSentAt = hydrated.sentAt || this.recordSentAt;
    this.recordCreatedAt = hydrated.createdAt || this.recordCreatedAt;
    this.groupIsDeleted = !!record.isDeleted;
    this.groupDeletedAt = record.deletedAt ?? null;
    this.groupDeletedBy = record.deletedBy ?? null;

    if (!hydrated.surgeries.length) {
      this.scheduleTextareaResize();
      this.cdr.markForCheck();
      return;
    }

    if (!mergeOnly) {
      this.surgeries = hydrated.surgeries;
      this.scheduleTextareaResize();
      this.cdr.markForCheck();
      return;
    }

    const savedByKey = new Map<string, DepartmentPlanReturnSurgeryRow>();
    hydrated.surgeries.forEach((row) => {
      const rowId = (row.rowId || '').trim();
      const caseNumber = normalizePlanReturnCaseNumber(row.caseNumber);
      if (rowId) {
        savedByKey.set(rowId, row);
      }
      if (caseNumber) {
        savedByKey.set(caseNumber, row);
      }
    });
    this.surgeries = this.surgeries.map((surgery) => {
      const caseNumber = normalizePlanReturnCaseNumber(surgery.caseNumber);
      const saved = savedByKey.get(surgery.rowId)
        || (caseNumber ? savedByKey.get(caseNumber) : undefined);
      if (!saved) {
        return surgery;
      }
      const mergedRow = {
        ...surgery,
        coordinatorComment: saved.coordinatorComment !== undefined ? saved.coordinatorComment : surgery.coordinatorComment,
        coordinatorCommentSentBy: firstNonEmptyText(
          saved.coordinatorCommentSentBy,
          surgery.coordinatorCommentSentBy,
          hydrated.sentBy,
          this.recordSentBy,
        ),
        coordinatorCommentSentAt: firstNonEmptyText(
          saved.coordinatorCommentSentAt,
          surgery.coordinatorCommentSentAt,
          hydrated.sentAt,
          hydrated.createdAt,
          this.recordSentAt,
          this.recordCreatedAt,
        ),
        departmentResponseText: saved.departmentResponseText !== undefined
          ? saved.departmentResponseText
          : surgery.departmentResponseText,
        treatmentStatus: saved.treatmentStatus || surgery.treatmentStatus,
        isDeleted: saved.isDeleted ?? surgery.isDeleted,
        deletedAt: saved.deletedAt ?? surgery.deletedAt ?? null,
        deletedBy: saved.deletedBy ?? surgery.deletedBy ?? null,
      };
      return hydratePlanReturnRecordAuthorship({
        ...hydrated,
        surgeries: [mergedRow],
      }).surgeries[0];
    });
    this.scheduleTextareaResize();
    this.cdr.markForCheck();
  }

  saveChanges(successMessage = 'הנתונים נשמרו בהצלחה'): void {
    if (this.saving) {
      return;
    }

    if (this.isRespondMode && !this.isUnifiedMode) {
      this.saveDepartmentResponse();
      return;
    }

    if (!this.isSendMode && !this.isUnifiedMode) {
      return;
    }

    if (this.surgeries.length === 0) {
      this.openSnackBar('אין ניתוחים לשמירה');
      return;
    }

    this.saving = true;
    const loginUser = localStorage.getItem('loginUserName');
    const payload = this.buildCoordinatorPayload();

    const finishSave = (message: string) => {
      this.saving = false;
      this.openSnackBar(message);
      this.notifyIndicatorsChange();
      this.api.loadReturnPlan({
        department: this.departmentParam,
        roomCode: this.data.roomCode,
        planDate: this.data.planDate,
        calendarRoomsArea: this.data.calendarRoomsArea,
      }).subscribe((record) => {
        if (record) {
          this.applyRecord(record, true);
        }
      });
    };

    const saveResponse = (returnId: string | null | undefined) => {
      if (!this.isUnifiedMode || !returnId || !this.api.isServerReturnId(returnId) || !this.hasDepartmentResponseData()) {
        return of(true);
      }
      return this.api.saveDepartmentResponse({
        returnId,
        generalResponseText: this.generalResponseText.trim(),
        treatmentStatus: this.treatmentStatus,
        surgeries: this.surgeries.map((surgery) => ({
          rowId: surgery.rowId,
          departmentResponseText: surgery.departmentResponseText ? surgery.departmentResponseText.trim() : '',
          treatmentStatus: surgery.treatmentStatus,
        })),
        respondedBy: loginUser ? loginUser.toLowerCase() : '',
      });
    };

    this.api.lookupServerReturnId(payload).pipe(
      switchMap((lookupId) => {
        const knownId = lookupId || (this.api.isServerReturnId(this.returnId) ? this.returnId : null);
        if (knownId) {
          this.returnId = knownId;
        }

        const coordinatorPayload = { ...payload, returnId: knownId || payload.returnId };
        const coordinatorSave$ = this.hasCoordinatorSaveData()
          ? this.api.saveCoordinatorReturn(coordinatorPayload)
          : of(knownId);

        return coordinatorSave$.pipe(
          switchMap((coordinatorId) => {
            let resolvedId = coordinatorId || knownId || (this.api.isServerReturnId(this.returnId) ? this.returnId : null);
            if (resolvedId && this.api.isServerReturnId(resolvedId)) {
              this.returnId = resolvedId;
            }
            if (!resolvedId && this.hasDepartmentResponseData()) {
              return this.api.lookupServerReturnId(payload).pipe(
                switchMap((retryId) => {
                  if (retryId) {
                    this.returnId = retryId;
                    resolvedId = retryId;
                  }
                  return saveResponse(resolvedId);
                }),
              );
            }
            return saveResponse(resolvedId);
          }),
        );
      }),
    ).subscribe(
      (ok) => finishSave(ok ? successMessage : 'אירעה תקלה בשמירה'),
      () => finishSave('אירעה תקלה בשמירה'),
    );
  }

  hasGeneralCoordinatorComment(): boolean {
    return !this.groupIsDeleted && !!(this.generalComment || '').trim();
  }

  hasSurgeryCoordinatorComment(surgery: DepartmentPlanReturnSurgeryRow): boolean {
    return !this.isSurgeryRowDeleted(surgery) && !!resolveSurgeryArrangementComment(surgery);
  }

  isSurgeryRowDeleted(surgery: DepartmentPlanReturnSurgeryRow): boolean {
    return this.groupIsDeleted || surgeryRowIsSoftDeleted(surgery);
  }

  canSoftDelete(): boolean {
    return this.api.isServerReturnId(this.returnId);
  }

  getSurgeryDeletedTooltip(surgery: DepartmentPlanReturnSurgeryRow): string {
    if (this.groupIsDeleted) {
      return formatDeletedTooltip(this.groupDeletedBy, this.groupDeletedAt);
    }
    return formatDeletedTooltip(surgery.deletedBy, surgery.deletedAt);
  }

  getGroupDeletedTooltip(): string {
    return formatDeletedTooltip(this.groupDeletedBy, this.groupDeletedAt);
  }

  private getDeletedByUser(): string {
    const loginUser = localStorage.getItem('loginUserName');
    return loginUser ? loginUser.toLowerCase() : '';
  }

  private buildCoordinatorPayload(): DepartmentPlanReturnPayload {
    this.stampCoordinatorCommentMetadata();
    return {
      returnId: this.returnId || undefined,
      department: this.departmentParam,
      departmentDisplay: this.departmentDisplay,
      roomCode: this.data.roomCode,
      planDate: this.data.planDate,
      calendarRoomsArea: this.data.calendarRoomsArea,
      generalComment: this.generalComment.trim(),
      treatmentStatus: this.treatmentStatus,
      surgeries: this.surgeries,
      sentBy: this.getDeletedByUser(),
    };
  }

  hasActiveCoordinatorContent(): boolean {
    return this.hasGeneralCoordinatorComment()
      || this.surgeries.some((surgery) => this.hasSurgeryCoordinatorComment(surgery));
  }

  private hasCoordinatorSaveData(): boolean {
    if ((this.generalComment || '').trim()) {
      return true;
    }
    return this.surgeries.some((surgery) => this.hasSurgeryCoordinatorComment(surgery));
  }

  private hasDepartmentResponseData(): boolean {
    if ((this.generalResponseText || '').trim()) {
      return true;
    }
    if (this.surgeries.some((surgery) => (surgery.departmentResponseText || '').trim().length > 0)) {
      return true;
    }
    return this.treatmentStatus !== 'pending'
      || this.surgeries.some((surgery) => surgery.treatmentStatus !== 'pending');
  }

  deleteGeneralCoordinatorComment(): void {
    if (!this.hasGeneralCoordinatorComment() || this.saving) {
      return;
    }

    this.saving = true;
    const deletedBy = this.getDeletedByUser();
    const hadOnlyGeneralComment = !this.surgeries.some((surgery) => this.hasSurgeryCoordinatorComment(surgery));

    this.api.deleteCoordinatorGeneralComment(this.buildCoordinatorPayload(), deletedBy).subscribe(({ success, returnId }) => {
      this.saving = false;
      if (!success) {
        this.openSnackBar('אירעה תקלה במחיקת ההערה');
        return;
      }
      if (returnId) {
        this.returnId = returnId;
      }
      this.generalComment = '';
      if (hadOnlyGeneralComment) {
        this.groupIsDeleted = true;
        this.groupDeletedBy = deletedBy;
        this.groupDeletedAt = new Date().toISOString();
      }
      this.openSnackBar('ההערה הכללית נמחקה');
      this.notifyIndicatorsChange();
      this.loadSurgeries();
    });
  }

  deleteSurgeryCoordinatorComment(surgery: DepartmentPlanReturnSurgeryRow): void {
    if (!this.hasSurgeryCoordinatorComment(surgery) || this.saving) {
      return;
    }

    this.saving = true;
    const deletedBy = this.getDeletedByUser();
    this.api.deleteCoordinatorSurgeryComment(
      this.buildCoordinatorPayload(),
      surgery.rowId,
      deletedBy,
    ).subscribe(({ success, returnId }) => {
      this.saving = false;
      if (!success) {
        this.openSnackBar('אירעה תקלה במחיקת ההערה');
        return;
      }
      if (returnId) {
        this.returnId = returnId;
      }
      surgery.isDeleted = true;
      surgery.deletedBy = deletedBy;
      surgery.deletedAt = new Date().toISOString();
      surgery.coordinatorComment = '';
      this.openSnackBar('הערה על הסידור נמחקה');
      this.notifyIndicatorsChange();
      this.loadSurgeries();
    });
  }

  deleteEntireReturnGroup(): void {
    if (this.saving || !this.hasActiveCoordinatorContent() || this.groupIsDeleted) {
      return;
    }
    if (!window.confirm('למחוק (סימון רך) את כל הערות הקבוצה לחדר ומחלקה זו?')) {
      return;
    }

    this.saving = true;
    const deletedBy = this.getDeletedByUser();
    this.api.deleteCoordinatorEntireGroup(this.buildCoordinatorPayload(), deletedBy).subscribe(({ success, returnId }) => {
      this.saving = false;
      if (!success) {
        this.openSnackBar('אירעה תקלה במחיקת הקבוצה');
        return;
      }
      if (returnId) {
        this.returnId = returnId;
      }
      this.groupIsDeleted = true;
      this.groupDeletedBy = deletedBy;
      this.groupDeletedAt = new Date().toISOString();
      this.generalComment = '';
      this.surgeries = this.surgeries.map((row) => ({
        ...row,
        coordinatorComment: '',
        isDeleted: true,
        deletedBy,
        deletedAt: this.groupDeletedAt,
      }));
      this.openSnackBar('כל הערות הקבוצה סומנו כמחוקות');
      this.notifyIndicatorsChange();
      this.loadSurgeries();
    });
  }

  private notifyIndicatorsChange(): void {
    if (this.data.onIndicatorsChange) {
      this.data.onIndicatorsChange();
    }
  }

  sendToDepartmentByEmail(): void {
    if (this.saving) {
      return;
    }

    if (this.isRespondMode && !this.isUnifiedMode) {
      this.saveAndSendResponse();
      return;
    }

    if (this.isSendMode || this.isUnifiedMode) {
      this.saveAndSend();
    }
  }

  saveAndSend(): void {
    if ((!this.isSendMode && !this.isUnifiedMode) || this.saving) {
      return;
    }

    if (this.surgeries.length === 0) {
      this.openSnackBar('אין ניתוחים לשליחה');
      return;
    }

    this.saving = true;
    const loginUser = localStorage.getItem('loginUserName');
    const payload = {
      returnId: this.returnId || undefined,
      department: this.departmentParam,
      departmentDisplay: this.departmentDisplay,
      roomCode: this.data.roomCode,
      planDate: this.data.planDate,
      calendarRoomsArea: this.data.calendarRoomsArea,
      generalComment: this.generalComment.trim(),
      treatmentStatus: this.treatmentStatus,
      surgeries: this.surgeries,
      sentBy: loginUser ? loginUser.toLowerCase() : '',
    };

    const closeWithShare = () => {
      this.saving = false;
      this.dialogRef.close({
        share: true,
        html: this.buildPlanHtml(),
        emailBody: this.buildPlanEmailBody(),
        returnId: this.returnId,
        generalComment: this.generalComment.trim(),
      });
    };

    this.api.saveCoordinatorReturn(payload).subscribe((returnId) => {
      if (!returnId || !this.api.isServerReturnId(returnId)) {
        this.saving = false;
        this.openSnackBar('אירעה תקלה בשמירה. לא ניתן לשלוח למחלקה.');
        return;
      }

      this.returnId = returnId;
      closeWithShare();
    }, () => {
      this.saving = false;
      this.openSnackBar('אירעה תקלה בשמירה. לא ניתן לשלוח למחלקה.');
    });
  }

  saveDepartmentResponse(onSuccess?: () => void): void {
    if ((!this.isRespondMode && !this.isUnifiedMode) || this.saving) {
      return;
    }

    if (!this.returnId) {
      this.openSnackBar('יש לשלוח הערה למחלקה לפני שמירת תגובה');
      return;
    }

    this.saving = true;
    const loginUser = localStorage.getItem('loginUserName');
    this.api
      .saveDepartmentResponse({
        returnId: this.returnId,
        generalResponseText: this.generalResponseText.trim(),
        treatmentStatus: this.treatmentStatus,
        surgeries: this.surgeries.map((surgery) => ({
          rowId: surgery.rowId,
          departmentResponseText: surgery.departmentResponseText ? surgery.departmentResponseText.trim() : '',
          treatmentStatus: surgery.treatmentStatus,
        })),
        respondedBy: loginUser ? loginUser.toLowerCase() : '',
      })
      .subscribe((ok) => {
        this.saving = false;
        if (ok) {
          if (onSuccess) {
            onSuccess();
          } else {
            this.openSnackBar('סטטוס הטיפול נשמר בהצלחה');
            if (!this.isUnifiedMode) {
              this.dialogRef.close(true);
            }
          }
        } else {
          this.openSnackBar('אירעה תקלה בשמירת סטטוס הטיפול');
        }
      });
  }

  saveAndSendResponse(): void {
    if ((!this.isRespondMode && !this.isUnifiedMode) || this.saving) {
      return;
    }

    this.saveDepartmentResponse(() => {
      this.dialogRef.close({
        share: true,
        html: this.buildPlanHtml(true),
        emailBody: this.buildPlanEmailBody(),
        returnId: this.returnId,
        generalComment: this.generalResponseText.trim(),
      });
    });
  }

  setSurgeryStatus(surgery: DepartmentPlanReturnSurgeryRow, status: DepartmentPlanTreatmentStatus): void {
    surgery.treatmentStatus = status;
  }

  setGeneralStatus(status: DepartmentPlanTreatmentStatus): void {
    this.treatmentStatus = status;
  }

  getStatusButtonClass(status: DepartmentPlanTreatmentStatus): string {
    return `dept-plan-return__status-btn--${status}`;
  }

  getRecordCreatedByLabel(): string {
    if (recordCreatedByTechnicalTestUser({
      sentBy: this.recordSentBy,
    } as DepartmentPlanReturnRecord)) {
      return '';
    }
    const directory = this.userDisplayNames.size
      ? this.userDisplayNames
      : this.userDirectory.getCachedDirectory();
    return resolveAdUserDisplayName(this.recordSentBy, directory);
  }

  getRecordCreatedTimestamp(): string {
    return resolveRecordCreatedTimestamp({
      sentAt: this.recordSentAt,
      createdAt: this.recordCreatedAt,
    } as DepartmentPlanReturnRecord);
  }

  getRecordCreatedTooltip(): string {
    const directory = this.userDisplayNames.size
      ? this.userDisplayNames
      : this.userDirectory.getCachedDirectory();
    return formatCreatedTooltip({
      sentBy: this.recordSentBy,
      sentAt: this.recordSentAt,
      createdAt: this.recordCreatedAt,
    } as DepartmentPlanReturnRecord, directory);
  }

  shouldShowRecordCreatedBy(): boolean {
    if (recordCreatedByTechnicalTestUser({
      sentBy: this.recordSentBy,
    } as DepartmentPlanReturnRecord)) {
      return false;
    }
    return this.hasRecordCreatedMetadata();
  }

  shouldShowGeneralCreatedBy(): boolean {
    return this.hasGeneralCoordinatorComment() && this.shouldShowRecordCreatedBy();
  }

  shouldShowSurgeryCreatedBy(surgery: DepartmentPlanReturnSurgeryRow): boolean {
    if (!this.hasSurgeryCoordinatorComment(surgery)) {
      return false;
    }
    return !!(this.getSurgeryCreatedByLabel(surgery) || this.getSurgeryCreatedTimestamp(surgery));
  }

  getSurgeryCreatedByLabel(surgery: DepartmentPlanReturnSurgeryRow): string {
    const sentBy = firstNonEmptyText(
      surgery.coordinatorCommentSentBy,
      this.recordSentBy,
    );
    if (!sentBy || recordCreatedByTechnicalTestUser({ sentBy } as DepartmentPlanReturnRecord)) {
      return '';
    }
    const directory = this.userDisplayNames.size
      ? this.userDisplayNames
      : this.userDirectory.getCachedDirectory();
    return resolveAdUserDisplayName(sentBy, directory);
  }

  getSurgeryCreatedTimestamp(surgery: DepartmentPlanReturnSurgeryRow): string {
    const raw = (surgery.coordinatorCommentSentAt || this.recordSentAt || this.recordCreatedAt || '').trim();
    return formatDeletedTimestamp(raw);
  }

  getSurgeryCreatedTooltip(surgery: DepartmentPlanReturnSurgeryRow): string {
    const directory = this.userDisplayNames.size
      ? this.userDisplayNames
      : this.userDirectory.getCachedDirectory();
    const sentBy = (surgery.coordinatorCommentSentBy || this.recordSentBy || '').trim();
    const sentAt = (surgery.coordinatorCommentSentAt || this.recordSentAt || '').trim();
    const createdAt = (surgery.coordinatorCommentSentAt || this.recordCreatedAt || '').trim();
    return formatCreatedTooltip({ sentBy, sentAt, createdAt } as DepartmentPlanReturnRecord, directory);
  }

  private stampCoordinatorCommentMetadata(): void {
    const sentBy = this.getDeletedByUser();
    const sentAt = new Date().toISOString();
    this.surgeries.forEach((surgery) => {
      if (!resolveSurgeryArrangementComment(surgery)) {
        return;
      }
      if (!(surgery.coordinatorCommentSentBy || '').trim()) {
        surgery.coordinatorCommentSentBy = sentBy;
      }
      if (!(surgery.coordinatorCommentSentAt || '').trim()) {
        surgery.coordinatorCommentSentAt = sentAt;
      }
    });
    if (sentBy) {
      this.recordSentBy = firstNonEmptyText(this.recordSentBy, sentBy);
    }
    if (!this.recordSentAt) {
      this.recordSentAt = sentAt;
    }
  }

  private hasRecordCreatedMetadata(): boolean {
    return !!(this.recordSentBy || '').trim()
      || !!(this.recordSentAt || '').trim()
      || !!(this.recordCreatedAt || '').trim();
  }

  private loadFromBoardData(afterLoad?: () => void): void {
    const boardSurgeries = this.data.boardSurgeries;
    if (!Array.isArray(boardSurgeries)) {
      this.loading = false;
      this.errorMessage = 'לא נמצאו ניתוחים מתוכננים למחלקה ביום זה';
      return;
    }

    this.surgeries = boardSurgeries.map((row) => ({ ...row }));
    this.loading = false;
    if (this.surgeries.length === 0) {
      this.errorMessage = 'לא נמצאו ניתוחים מתוכננים למחלקה ביום זה';
    }
    if (afterLoad) {
      afterLoad();
    }
    this.scheduleTextareaResize();
  }

  private loadFromPlannedExcel(afterLoad?: () => void): void {
    this.http
      .post(environment.url + 'GetSurgeriesPlannedExcel', {
        Department: this.departmentParam,
        _surRoomCode: this.data.roomCode,
        date: this.data.planDate,
      })
      .subscribe({
        next: (res) => {
          const rows = Array.isArray(res['d']) ? res['d'] : [];
          this.surgeries = this.api.mapPlannedExcelRows(rows);
          this.loading = false;
          if (this.surgeries.length === 0) {
            this.errorMessage = 'לא נמצאו ניתוחים מתוכננים למחלקה ביום זה';
          }
          if (afterLoad) {
            afterLoad();
          }
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'אירעה תקלה בטעינת רשימת הניתוחים';
        },
      });
  }

  private buildPlanHtml(includeDepartmentResponses = false): string {
    const fullDate = this.data.planDate;
    const room = this.data.roomCode;
    const emailSubject = buildPlanReturnEmailSubject(
      this.departmentDisplay,
      this.data.planDate,
      this.data.roomCode,
    );
    const generalStatusLabel = this.statusLabels[this.treatmentStatus] || this.treatmentStatus;
    const generalBlocks = [
      this.generalComment.trim()
        ? `<p><strong>הערה כללית על הסידור:</strong> ${this.escapeHtml(this.generalComment.trim())}</p>`
        : '',
      `<p><strong>סטטוס כללי לחדר:</strong> ${this.escapeHtml(generalStatusLabel)}</p>`,
      this.generalResponseText.trim()
        ? `<p><strong>תשובת מחלקה להערה הכללית:</strong> ${this.escapeHtml(this.generalResponseText.trim())}</p>`
        : '',
    ].join('');

    let html = `
      <!doctype html>
      <html lang="he">
        <head>
          <meta charset="utf-8"/>
          <title>${this.escapeHtml(emailSubject)}</title>
          <style>
            body{margin:0;padding:12px;font-family:Arial,Helvetica,sans-serif;}
            p,mat-label,span{font-weight:bold;font-size:18px;}
            .pdf-header{text-align:center;margin-bottom:16px;}
            .pdf-header__image{width:100%;display:block;margin:0 auto;}
            .pdf-title{margin:14px 0 0;font-size:20px;font-weight:700;line-height:1.65;text-align:center;}
            .pdf-title__line{display:block;margin:4px 0;}
            td,th{border:1px solid black;padding:6px;}
            table{border-collapse:collapse;width:100%;}
          </style>
        </head>
        <body dir="rtl">
          <div dir="rtl">
            <div class="pdf-header">
              <img class="pdf-header__image" src="${PDF_HOSPITAL_HEADER_IMAGE_SRC}" alt="" />
              <div class="pdf-title">
                <span class="pdf-title__line">הערה על הסידור</span>
                <span class="pdf-title__line">מחלקה: ${this.escapeHtml(this.departmentDisplay)}</span>
                <span class="pdf-title__line">תאריך: ${this.escapeHtml(fullDate)}</span>
                <span class="pdf-title__line">חדר: ${this.escapeHtml(room)}</span>
              </div>
            </div>
            ${generalBlocks}
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>מספר מקרה</th>
                  <th>חדר</th>
                  <th>שם מלא, ת.ז</th>
                  <th>תיאור פרוצדורה</th>
                  <th>שם מנתח</th>
                  <th>הערה קיימת</th>
                  <th>הערה על הסידור</th>
                  <th>סטטוס</th>
                  <th>תשובת מחלקה</th>
                </tr>
              </thead>
              <tbody>`;

    this.surgeries.forEach((surgery, index) => {
      html += `<tr>
        <td>${index + 1}</td>
        <td>${this.escapeHtml(surgery.caseNumber)}</td>
        <td>${this.escapeHtml(surgery.room)}</td>
        <td>${this.escapeHtml(surgery.patientLabel)}</td>
        <td>${this.escapeHtml(surgery.procedureName)}</td>
        <td>${this.escapeHtml(surgery.surgeon)}</td>
        <td>${this.escapeHtml(surgery.existingNote)}</td>
        <td>${this.escapeHtml(surgery.coordinatorComment)}</td>
        <td>${this.escapeHtml(this.statusLabels[surgery.treatmentStatus] || surgery.treatmentStatus)}</td>
        <td>${this.escapeHtml(surgery.departmentResponseText)}</td>
      </tr>`;
    });

    html += `
              </tbody>
            </table>
          </div>
        </body>
      </html>`;

    return html;
  }

  private buildPlanEmailBody(): string {
    const fullDate = this.data.planDate;
    const room = this.data.roomCode;
    const emailSubject = buildPlanReturnEmailSubject(
      this.departmentDisplay,
      this.data.planDate,
      this.data.roomCode,
    );
    const generalStatusLabel = this.statusLabels[this.treatmentStatus] || this.treatmentStatus;
    const thStyle = 'border:1px solid #b0bec5;padding:10px 8px;background:#1565c0;color:#fff;font-weight:bold;text-align:center;';
    const tdStyle = 'border:1px solid #cfd8dc;padding:8px;text-align:right;vertical-align:top;font-size:14px;line-height:1.45;';
    const tdHighlight = `${tdStyle}background:#fff8e1;font-weight:bold;color:#b71c1c;`;

    const generalBlocks = [
      this.generalComment.trim()
        ? `<div style="margin:12px 0;padding:12px 14px;border:1px solid #ffe082;border-radius:8px;background:#fffde7;">
            <div style="font-weight:bold;color:#f57f17;margin-bottom:6px;">הערה כללית על הסידור</div>
            <div style="white-space:pre-wrap;">${this.escapeHtml(this.generalComment.trim())}</div>
          </div>`
        : '',
      `<div style="margin:8px 0;padding:10px 14px;border:1px solid #e0e0e0;border-radius:8px;background:#fafafa;">
        <strong>סטטוס כללי לחדר:</strong> ${this.escapeHtml(generalStatusLabel)}
      </div>`,
      this.generalResponseText.trim()
        ? `<div style="margin:12px 0;padding:12px 14px;border:1px solid #90caf9;border-radius:8px;background:#e3f2fd;">
            <div style="font-weight:bold;color:#1565c0;margin-bottom:6px;">תשובת מחלקה להערה הכללית</div>
            <div style="white-space:pre-wrap;">${this.escapeHtml(this.generalResponseText.trim())}</div>
          </div>`
        : '',
    ].join('');

    let surgeryRows = '';
    this.surgeries.forEach((surgery, index) => {
      const hasCoordinatorComment = !!(surgery.coordinatorComment || '').trim();
      const rowBg = hasCoordinatorComment ? 'background:#fffde7;' : '';
      surgeryRows += `<tr style="${rowBg}">
        <td style="${tdStyle}text-align:center;">${index + 1}</td>
        <td style="${tdStyle}">${this.escapeHtml(surgery.caseNumber)}</td>
        <td style="${tdStyle}">${this.escapeHtml(surgery.room)}</td>
        <td style="${tdStyle}">${this.escapeHtml(surgery.patientLabel)}</td>
        <td style="${tdStyle}">${this.escapeHtml(surgery.procedureName)}</td>
        <td style="${tdStyle}">${this.escapeHtml(surgery.surgeon)}</td>
        <td style="${tdStyle}">${this.escapeHtml(surgery.existingNote)}</td>
        <td style="${hasCoordinatorComment ? tdHighlight : tdStyle}">${this.escapeHtml(surgery.coordinatorComment)}</td>
        <td style="${tdStyle}">${this.escapeHtml(this.statusLabels[surgery.treatmentStatus] || surgery.treatmentStatus)}</td>
        <td style="${tdStyle}">${this.escapeHtml(surgery.departmentResponseText)}</td>
      </tr>`;
    });

    return `<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;color:#212121;max-width:960px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#1565c0,#0d47a1);color:#fff;padding:18px 16px;border-radius:10px 10px 0 0;text-align:center;">
        <div style="font-size:20px;font-weight:bold;line-height:1.4;">${this.escapeHtml(emailSubject)}</div>
        <div style="margin-top:8px;font-size:15px;">חדר: ${this.escapeHtml(room)} | תאריך: ${this.escapeHtml(fullDate)}</div>
      </div>
      <div style="padding:16px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px;background:#fff;">
        ${generalBlocks}
        <div style="margin-top:18px;font-size:16px;font-weight:bold;color:#1565c0;">פירוט ניתוחים והערות</div>
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-top:10px;table-layout:fixed;">
          <thead>
            <tr>
              <th style="${thStyle}">#</th>
              <th style="${thStyle}">מספר מקרה</th>
              <th style="${thStyle}">חדר</th>
              <th style="${thStyle}">שם מלא, ת.ז</th>
              <th style="${thStyle}">תיאור פרוצדורה</th>
              <th style="${thStyle}">שם מנתח</th>
              <th style="${thStyle}">הערה קיימת</th>
              <th style="${thStyle}background:#ef6c00;">הערה על הסידור</th>
              <th style="${thStyle}">סטטוס</th>
              <th style="${thStyle}">תשובת מחלקה</th>
            </tr>
          </thead>
          <tbody>${surgeryRows}</tbody>
        </table>
        <p style="margin:16px 0 0;font-size:13px;color:#757575;text-align:center;">
          קובץ PDF מצורף למייל עם פרטי התוכנית המלאים.
        </p>
      </div>
    </div>`;
  }

  private formatDepartmentParam(department: string | string[]): string {
    return normalizeDepartmentForServer(department);
  }

  private stripDepartmentQuotes(value: string): string {
    return stripDepartmentQuotes(value);
  }

  private escapeHtml(value: string): string {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private openSnackBar(message: string): void {
    this.snackBar.open(message, 'X', { duration: 5000 });
  }
}

@Component({
  selector: 'app-department-plan-return-report-dialog',
  templateUrl: '../dialogs/department-plan-return-report-dialog.html',
  styleUrls: ['../styles/components/department-plan-return-report-dialog.css'],
})
export class DepartmentPlanReturnReportDialogComponent implements OnInit {
  readonly statusLabels = DEPARTMENT_PLAN_TREATMENT_STATUS_LABELS;
  readonly statusOptions: Array<DepartmentPlanTreatmentStatus | 'all'> = [
    'all',
    ...DEPARTMENT_PLAN_TREATMENT_STATUS_OPTIONS,
  ];

  loading = false;
  showDeleted = false;
  records: DepartmentPlanReturnReportRow[] = [];
  private allRecords: DepartmentPlanReturnRecord[] = [];
  dateFrom = '';
  dateTo = '';
  selectedDepartments: string[] = [];
  treatmentStatus: DepartmentPlanTreatmentStatus | 'all' = 'all';
  departmentOptions: string[] = [];
  private userDisplayNames = new Map<string, string>();

  constructor(
    private dialogRef: MatDialogRef<DepartmentPlanReturnReportDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      departments?: string[];
      defaultDate?: string;
      initialTreatmentStatus?: DepartmentPlanTreatmentStatus | 'all';
      openRoomPanel?: (roomCode: string, department?: string) => void;
    },
    private api: DepartmentPlanReturnApiService,
    private userDirectory: DepartmentPlanReturnUserDirectoryService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const defaultDate = (this.data && this.data.defaultDate) ? this.data.defaultDate : new Date().toISOString().slice(0, 10);
    this.dateFrom = defaultDate;
    this.dateTo = defaultDate;
    this.departmentOptions = (this.data && this.data.departments) ? [...this.data.departments] : [];
    this.treatmentStatus = (this.data && this.data.initialTreatmentStatus) ? this.data.initialTreatmentStatus : 'all';
    this.userDirectory.loadDirectory().subscribe((directory) => {
      this.userDisplayNames = new Map(directory);
      this.cdr.markForCheck();
    });
    this.loadReport();
  }

  close(): void {
    this.dialogRef.close();
  }

  loadReport(): void {
    this.loading = true;
    this.api
      .getReport({
        dateFrom: this.dateFrom,
        dateTo: this.dateTo,
        departments: this.selectedDepartments,
        treatmentStatus: this.treatmentStatus,
      })
      .subscribe((records) => {
        this.allRecords = records;
        this.applyVisibleRecords();
        this.loading = false;
      });
  }

  toggleShowDeleted(): void {
    const wasShowing = this.showDeleted;
    this.showDeleted = !this.showDeleted;
    if (!wasShowing && this.showDeleted) {
      this.loadReport();
      return;
    }
    this.applyVisibleRecords();
  }

  private applyVisibleRecords(): void {
    const visibleRecords = this.allRecords.filter((record) => !recordCreatedByTechnicalTestUser(record));
    let flattened = flattenPlanReturnReportRows(visibleRecords);
    if (!this.showDeleted) {
      flattened = flattened.filter((row) => {
        if (row.isGeneralComment) {
          return !recordIsSoftDeleted(row.record);
        }
        return !!row.surgery && !surgeryRowIsSoftDeleted(row.surgery);
      });
    }
    this.records = flattened;
  }

  private countFlattenedCommentRows(
    records: DepartmentPlanReturnRecord[],
    includeDeleted: boolean,
  ): number {
    let rows = flattenPlanReturnReportRows(records);
    if (!includeDeleted) {
      rows = rows.filter((row) => {
        if (row.isGeneralComment) {
          return !recordIsSoftDeleted(row.record);
        }
        return !!row.surgery && !surgeryRowIsSoftDeleted(row.surgery);
      });
    }
    return rows.length;
  }

  getHiddenDeletedCount(): number {
    if (this.showDeleted) {
      return 0;
    }
    const visibleRecords = this.allRecords.filter((record) => !recordCreatedByTechnicalTestUser(record));
    const allCount = this.countFlattenedCommentRows(visibleRecords, true);
    const activeCount = this.countFlattenedCommentRows(visibleRecords, false);
    return Math.max(0, allCount - activeCount);
  }

  getVisibleRecordCountLabel(): string {
    const visibleRecords = this.allRecords.filter((record) => !recordCreatedByTechnicalTestUser(record));
    const hiddenDeleted = this.getHiddenDeletedCount();
    if (this.showDeleted) {
      return `${this.records.length} הערות`;
    }
    if (hiddenDeleted > 0) {
      return `${this.records.length} הערות (${hiddenDeleted} מוסתרות)`;
    }
    return `${this.records.length} הערות`;
  }


  exportExcel(): void {
    if (this.records.length === 0) {
      this.openSnackBar('אין נתונים לייצוא');
      return;
    }

    const lines = [
      'תאריך,מחלקה,חדר,מטופל,פרוצדורה,סוג הערה,הערה,סטטוס טיפול,נוצר ע״י,תאריך יצירה,נמחק,נמחק ע"י,תאריך מחיקה',
    ];

    this.records.forEach((row) => {
      const record = row.record;
      const status = row.surgery?.treatmentStatus || record.treatmentStatus;
      const statusLabel = this.statusLabels[status] || status;
      const commentType = row.isGeneralComment ? 'הערה כללית' : 'הערה על ניתוח';
      const commentText = String(row.commentText || '').replace(/"/g, '""');
      const isDeleted = row.isGeneralComment
        ? recordIsSoftDeleted(record)
        : surgeryRowIsSoftDeleted(row.surgery!);
      const deletedBy = row.isGeneralComment
        ? record.deletedBy
        : row.surgery?.deletedBy;
      const deletedAt = row.isGeneralComment
        ? record.deletedAt
        : row.surgery?.deletedAt;
      lines.push([
        record.planDate,
        record.departmentDisplay || record.department,
        record.roomCode,
        row.surgery?.patientLabel || '',
        row.surgery?.procedureName || '',
        commentType,
        `"${commentText}"`,
        statusLabel,
        record.sentBy ? this.resolveUserDisplayName(record.sentBy) : '',
        record.sentAt || record.createdAt || '',
        isDeleted ? 'כן' : 'לא',
        deletedBy ? this.resolveUserDisplayName(deletedBy) : '',
        deletedAt || '',
      ].join(','));
    });

    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `דוח-תוכניות-שהוחזרו-למחלקות-${this.dateFrom}-${this.dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  openRoomForRecord(record: DepartmentPlanReturnRecord): void {
    if (this.data.openRoomPanel) {
      const departmentLabel = stripDepartmentQuotes(record.departmentDisplay || record.department);
      const department = departmentLabel.split(',')[0]?.trim() || departmentLabel;
      this.data.openRoomPanel(record.roomCode, department);
    }
    this.close();
  }

  hasCoordinatorAttention(row: DepartmentPlanReturnReportRow): boolean {
    return !!(row.commentText || '').trim();
  }

  hasDeletedItems(row: DepartmentPlanReturnReportRow): boolean {
    if (row.isGeneralComment) {
      return recordIsSoftDeleted(row.record);
    }
    return surgeryRowIsSoftDeleted(row.surgery!);
  }

  isRecordDeleted(row: DepartmentPlanReturnReportRow): boolean {
    return this.hasDeletedItems(row);
  }

  getRowTreatmentStatus(row: DepartmentPlanReturnReportRow): DepartmentPlanTreatmentStatus {
    return row.surgery?.treatmentStatus || row.record.treatmentStatus;
  }

  getRecordDeletedTooltip(row: DepartmentPlanReturnReportRow): string {
    if (row.isGeneralComment) {
      return formatDeletedTooltip(
        this.resolveUserDisplayName(row.record.deletedBy),
        row.record.deletedAt,
      );
    }
    return formatDeletedTooltip(
      this.resolveUserDisplayName(row.surgery?.deletedBy),
      row.surgery?.deletedAt,
    );
  }

  getRecordDeletedSummary(row: DepartmentPlanReturnReportRow): string {
    if (row.isGeneralComment) {
      return this.resolveUserDisplayName(row.record.deletedBy) || 'לא ידוע';
    }
    return this.resolveUserDisplayName(row.surgery?.deletedBy) || 'לא ידוע';
  }

  getRecordCreatedBy(row: DepartmentPlanReturnReportRow): string {
    if (recordCreatedByTechnicalTestUser(row.record)) {
      return '';
    }
    const sentBy = row.isGeneralComment
      ? row.record.sentBy
      : firstNonEmptyText(row.surgery?.coordinatorCommentSentBy, row.record.sentBy);
    return this.resolveUserDisplayName(sentBy);
  }

  getRecordCreatedTimestamp(row: DepartmentPlanReturnReportRow): string {
    const raw = row.isGeneralComment
      ? (row.record.sentAt || row.record.createdAt || '')
      : (row.surgery?.coordinatorCommentSentAt || row.record.sentAt || row.record.createdAt || '');
    return resolveRecordCreatedTimestamp({
      sentAt: raw,
      createdAt: raw,
    } as DepartmentPlanReturnRecord);
  }

  getRecordCreatedTooltip(row: DepartmentPlanReturnReportRow): string {
    const sentBy = row.isGeneralComment
      ? row.record.sentBy
      : (row.surgery?.coordinatorCommentSentBy || row.record.sentBy);
    const sentAt = row.isGeneralComment
      ? row.record.sentAt
      : (row.surgery?.coordinatorCommentSentAt || row.record.sentAt);
    const createdAt = row.isGeneralComment
      ? row.record.createdAt
      : (row.surgery?.coordinatorCommentSentAt || row.record.createdAt);
    return formatCreatedTooltip({
      sentBy,
      sentAt,
      createdAt,
    } as DepartmentPlanReturnRecord, this.userDisplayNames);
  }

  private resolveUserDisplayName(username: string | null | undefined): string {
    return resolveAdUserDisplayName(username, this.userDisplayNames);
  }

  getStatusLabel(status: DepartmentPlanTreatmentStatus): string {
    return this.statusLabels[status] || status;
  }

  getStatusBadgeClass(status: DepartmentPlanTreatmentStatus): string {
    return `dept-plan-report__badge--${status}`;
  }

  private openSnackBar(message: string): void {
    this.snackBar.open(message, 'X', { duration: 5000 });
  }
}
