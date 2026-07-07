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
import { forkJoin, Observable, Subject } from 'rxjs';
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
import { applySurgeriesManagementDialogSize, SURGERY_DIALOG_PANEL_CLASS, SURGERY_ROOM_FILTER_MENU_CLASS, SURGERY_SHARE_PDF_DIALOG_PANEL_CLASS, SURGERY_SUMMARY_DIALOG_PANEL_CLASS } from '../surgeries-dialog-sizing';
import * as XLSX from 'xlsx';
import { map, startWith } from 'rxjs/operators';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatMenuTrigger } from '@angular/material/menu';
import * as ExcelJS from 'exceljs';
import * as FileSaver from 'file-saver';
import { de } from 'date-fns/locale';

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

@Component({
  selector: 'app-surgeries-management',
  templateUrl: './surgeries-management.component.html',
  styleUrls: ['./surgeries-management.component.css']
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
  IfPlannedSurgeries: string = "original"
  isPhysicalRoom: boolean = false;
  /** Per-room department filter: roomName → department label */
  private roomDepartmentFilters = new Map<string, string>();
  readonly estimatedPriceTooltip = 'לא הוזן בזימון קוד שירות — לכן מוצג מחיר משוער';
  readonly roomFilterMenuClass = SURGERY_ROOM_FILTER_MENU_CLASS;
  private intervalId: any;
  roomPriceSummariesFromServer: any[] = [];
  private rawRoomPriceSummariesFromServer: any[] = [];
  private surgeryPriceByRowId = new Map<string, { grossPrice: number; isEstimated: boolean }>();
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
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
  }

  ngOnInit(): void {
    applySurgeriesManagementDialogSize(this.dialogRef);

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
    const surgery = this.resolveSurgeryEvent(event);
    if (!surgery) {
      return;
    }

    surgery['RoomsList'] = this.data.roomsList;
    const dialogRef = this.dialog.open(ManageSingleSurgeryComponent, {
      data: {
        event: surgery,
        action: action,
        timeOpened: this.date
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
    if (!event || this.isSetupTimeEvent(event)) {
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
        x.SurgeryType !== 'דחוף' &&
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
    this.reapplyCachedSurgeryPrices();
    this.rebuildSurgeryIndex();
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
    if (room?.surgerySurf) {
      return `${filterHint}${filterLine}\n\nחדר ירוק: הניתוח האחרון (ללא ססיה/דחוף) מסתיים אחרי 15:00 — ניצול טוב של היום`;
    }
    return `${filterHint}${filterLine}\n\nחדר כחול: לוח זמנים בטווח התקין`;
  }

  onRoomMenuOpened(room: any): void {
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
    if (this.isEstimatedPriceFlag(event?.IsEstimatedPrice)) {
      return true;
    }
    const fromMap = this.surgeryPriceByRowId.get(String(event?.Row_ID));
    return fromMap?.isEstimated === true;
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
    this.cachedPriceData = null;
  }

  isEventPriceLoading(event: any): boolean {
    if (!event?.SurgeryPatientDetails || event?.SurgeryStatus === 'Canceled') {
      return false;
    }
    return this.loadingRoomPrices;
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
      const priceLabel = this.isEventEstimatedPrice(event) ? 'מחירון (משוער)' : 'מחירון';
      lines.push(`${priceLabel}: ${this.formatGrossPrice(grossPrice)} ₪`);
      if (this.isEventEstimatedPrice(event)) {
        lines.push(this.estimatedPriceTooltip);
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
          silent: background,
          restoreMode: savedMode
        });
        this.roomDepartmentFilters = savedRoomFilters;
        this.applyRoomDepartmentFilters();
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
    if (mode === 'planned' || (mode === 'original' && this.isPhysicalRoom)) {
      this.sortSurgeriesOfEachRoomInDay(silent);
      return;
    }

    if (mode === 'dror') {
      this.plannedFromDrorSystem(silent);
      return;
    }

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
    options: { silent?: boolean; restoreMode?: string } = {}
  ): void {
    const silent = options.silent === true;
    const restoreMode = options.restoreMode ?? 'original';
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
    this.filteredSpecificRooms = this.deepClone(this.specificRooms);
    this.reapplyViewModeAfterLoad(restoreMode, silent);
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

  private getRoomGroupDescForApi(): string {
    const room = this.data?.room;
    const fromServer = String(room?.RoomGroupDesc ?? room?.RoomGroup ?? '').trim();
    if (fromServer) {
      return fromServer;
    }

    const fromRoomCodes = this.deriveRoomGroupDescFromRoomCodes(this.getRoomCodesList());
    if (fromRoomCodes) {
      return fromRoomCodes;
    }

    return this.deriveRoomGroupDesc(room);
  }

  private deriveRoomGroupDesc(room: any): string {
    const calendarArea = String(room?.CalendarRoomsArea ?? '').trim();
    const roomDes = String(room?.RoomDes ?? room?.type ?? '').trim();

    if (roomDes === 'ור') {
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

    // Physical groups use CalendarRoomsArea as RoomGroupDesc in SurgeriesRoomDesc.
    return calendarArea;
  }

  private getRoomCodesList(): string[] {
    const rooms = this.data?.room?.Rooms;
    if (!Array.isArray(rooms)) {
      return [];
    }

    return rooms
      .map((room) => {
        if (typeof room === 'string') {
          return room.trim();
        }
        return String(room?.SurgeryRoom ?? room?.roomName ?? '').trim();
      })
      .filter((code) => !!code);
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

    (room?.Surgeries ?? []).forEach((surgery: any) => {
      const surgeryRoom = this.normalizeRoomKey(surgery?.SurgeryRoom);
      const surgeryRoomName = this.normalizeRoomKey(surgery?.SurgeryRoomName);
      if (surgeryRoom) {
        keys.add(surgeryRoom);
      }
      if (surgeryRoomName) {
        keys.add(surgeryRoomName);
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
      summary?.RoomName
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

    const surgeryRoomCodes = new Set(
      this.getBillableSurgeries(room)
        .map((surgery) => this.normalizeRoomKey(surgery?.SurgeryRoom))
        .filter((roomKey) => !!roomKey)
    );
    if (surgeryRoomCodes.size === 0) {
      return null;
    }

    return this.rawRoomPriceSummariesFromServer.find((item) => {
      const summaryKey = this.normalizeRoomKey(item?.SurgeryRoom);
      return summaryKey && surgeryRoomCodes.has(summaryKey);
    }) ?? null;
  }

  private getPriceCacheKey(fullDate: string): string {
    const calendarArea = this.getCalendarRoomsAreaForApi();
    const groupDesc = this.getRoomGroupDescForApi();
    const roomCodes = this.getRoomCodesList().join('|');
    return `surgeryRoomPrices_v5_${calendarArea}_${groupDesc}_${roomCodes}_${fullDate}`;
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
      this.loadingRoomPrices = false;
      this.refreshCalendarView();
      this.cdr.detectChanges();
      return;
    }

    if (!options.background) {
      this.loadingRoomPrices = true;
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

  private finishRoomPricesLoad(cacheKey: string, priceData: any): void {
    if (!this.isPriceDataEmpty(priceData)) {
      this.savePriceCache(cacheKey, priceData);
    }
    this.applySurgeryPricesFromServer(priceData);
    this.loadingRoomPrices = false;
    this.refreshCalendarView();
    this.cdr.detectChanges();
  }

  private loadSurgeryRoomPricesFallback(fullDate: string, cacheKey: string): void {
    const candidates = this.getRoomGroupDescCandidates().slice(1);
    if (candidates.length === 0) {
      this.finishRoomPricesLoad(cacheKey, { SurgeryPrices: [], RoomPriceSummaries: [] });
      return;
    }

    const requests = candidates.map((roomGroupDesc) =>
      this.http.post(
        environment.url + 'GetSurgeriesRoomPricesBySurgeryRoomCode',
        this.buildRoomPricesApiPayload(fullDate, roomGroupDesc)
      )
    );

    forkJoin(requests).subscribe({
      next: (responses) => {
        const merged = {
          SurgeryPrices: [] as any[],
          SurgeryProcedurePrices: [] as any[],
          RoomPriceSummaries: [] as any[]
        };

        responses.forEach((response) => {
          const data = response['d'];
          if (!data || this.isPriceDataEmpty(data)) {
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

  private reapplyCachedSurgeryPrices(refreshView = true): void {
    if (!this.cachedPriceData) {
      return;
    }
    this.applySurgeryPricesFromServer(this.cachedPriceData);
    if (refreshView) {
      this.refreshCalendarView();
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

      if (surgery.cssClass) {
        surgery.cssClass = surgery.cssClass.replace(/\s*surgery-cal-event--estimated-price/g, '').trim();
      }
      if (this.isEstimatedPriceFlag(surgery.IsEstimatedPrice) && surgery.SurgeryPatientDetails) {
        surgery.cssClass = `${surgery.cssClass || ''} surgery-cal-event--estimated-price`.trim();
      }
      if (surgery.SurgeryPatientDetails) {
        surgery.title = this.buildEventTitle(surgery);
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

  sortSurgeriesOfEachRoomInDay(silent = false) {
    if (!silent) {
      this.loader = true;
    }
    //////debugger
    if (this.IfPlannedSurgeries == "original" || this.IfPlannedSurgeries == "dror") {
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
      this.rebuildSurgeryIndex();
      this.reapplyCachedSurgeryPrices(false);
      this.refreshCalendarView();
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
    ////debugger
    if (room.Surgeries != undefined) {
      let deptsNoSisia = room.Surgeries.filter((x) => !this.isSesiaSurgeryType(x) && x.SurgeryType != 'דחוף');
      if (deptsNoSisia.length > 0) {
        let ArrivalTime = room.Surgeries[0].ArrivalTime;
        // let EndTime = room.Surgeries[room.Surgeries.length - 1].EndTime;
        let EndTimeNoSisia = deptsNoSisia[deptsNoSisia.length - 1].EndTime;
        let datefordiff = this.datePipe.transform(room.Surgeries[0].ArrivalDate, 'yyyy-MM-dd');
        let before = new Date(datefordiff + ' ' + ArrivalTime);
        let after = new Date(datefordiff + ' ' + EndTimeNoSisia);
        let diff = Math.abs(after.getTime() - before.getTime());//difference in time
        let hours = Math.floor((diff % 86400000) / 3600000);//hours
        let minutes = Math.round(((diff % 86400000) % 3600000) / 60000);//minutes
        // the condition that determinds if the room is overtime or not.
        // if the end time of the last surgery - the start time of the first surgery above 8 hours.
        // if the last surgery is after 3 Oclock.
        let totalTime = parseFloat(hours + '.' + minutes);
        // set it to false as initial 
        room['surgerySurf'] = false;
        // if (totalTime < 1) totalTime = totalTime / 0.6;
        if (EndTimeNoSisia > '15:00') {
          room['surgerySurf'] = true;
        }
      }
      return room;
    }
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

  buildEventTitle(element: any, startTime?: string, endTime?: string): string {
    if (element.SurgeryPatientDetails == null) {
      const setupTime = element.ArrivalDate?.split(' ')[1] ?? this.datePipe.transform(element.start, 'HH:mm');
      return this.buildSetupTimeTitle(element.start, setupTime);
    }

    const start = startTime ?? element.ArrivalDate.split(' ')[1];
    const end = endTime ?? element.EndTime;
    const grossPrice = this.getSurgeryGrossPrice(element);
    const isEstimated = this.isEstimatedPriceFlag(element.IsEstimatedPrice);
    const priceLabel = isEstimated ? 'מחירון (משוער)' : 'מחירון';
    const priceRow = grossPrice != null
      ? `<div class="surgery-event__row surgery-event__row--price${isEstimated ? ' surgery-event__row--price-estimated' : ''}"><span>${priceLabel}</span><strong>${this.formatGrossPrice(grossPrice)} ₪</strong></div>`
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

  private getDepartmentSixMonthDailyAverage(room: any): number | null {
    const serverSummary = this.findRoomPriceSummary(room);
    const fromSummary = this.parsePriceValue(serverSummary?.DepartmentDayAverage);
    if (fromSummary != null) {
      return fromSummary;
    }

    return null;
  }

  private filterSummariesForBoard(summaries: any[]): any[] {
    const boardRoomKeys = new Set(
      [...this.filteredSpecificRooms, ...this.specificRooms]
        .map((room) => this.normalizeRoomKey(room?.roomName))
        .filter((roomKey) => !!roomKey)
    );

    if (boardRoomKeys.size === 0) {
      return summaries;
    }

    return summaries.filter((summary) => {
      const summaryKey = this.normalizeRoomKey(summary?.SurgeryRoom);
      return summaryKey && boardRoomKeys.has(summaryKey);
    });
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
    return this.isSesiaLabel(type)
      || this.isSesiaLabel(urgency)
      || cssClass.includes('event-css-sesia');
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
    return surgeries
      .map((surgery) => this.getSurgeryGrossPrice(surgery))
      .filter((price): price is number => price != null)
      .reduce((sum, price) => sum + price, 0);
  }

  private computeRoomTotalFromPriceMap(room: any): number | null {
    const prices = this.getBillableSurgeries(room)
      .map((surgery) => this.getSurgeryGrossPrice(surgery))
      .filter((price): price is number => price != null);

    return prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) : null;
  }

  private resolveDailyRoomIncomeTotal(room: any, serverTotal: number | null): number | null {
    const scheduled = this.getScheduledSurgeries(room);
    if (scheduled.length === 0) {
      return null;
    }

    const billable = this.getBillableSurgeries(room);
    if (billable.length === 0) {
      return null;
    }

    const excludedTotal = this.sumSurgeryGrossPrices(this.getDailyIncomeExcludedSurgeries(room));
    const billableTotal = this.computeRoomTotalFromPriceMap(room);

    if (billableTotal != null) {
      return billableTotal;
    }

    if (serverTotal != null) {
      return excludedTotal > 0 ? Math.max(0, serverTotal - excludedTotal) : serverTotal;
    }

    return null;
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
    let fullDate = this.datePipe.transform(this.viewDate, 'yyyy-MM-dd');
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
              <title>תוכנית ניתוחים סופית ${department}</title>
            <style>p,mat-label,span{font-weight: bold;font-size: 18px;}h1{font-size: 14px}.col-2{width: 16.66667%;justify-content: center;}.row{display: flex;margin-top: 10px;}td{border: 1px solid black}</style>
          </head>
          <body dir="rtl">
            <div class="d-none-desktop" dir="rtl">
              <div class="card-header border-bottomIn rel" style="text-align: center;">
                  <img class="full-width" style="width: 100%;" src="https://poria.is-great.org/images/covid_2_header.png" />
                  <h1 class="text-center pos-abs-center"><u>תוכנית ניתוחים סופית ${department} - תאריך ${fullDate} - ${this.data.room.CalendarRoomsArea} -  ${room}</u></h1>
              </div>
              <div class="col-12" style="width: 100%;text-align: center;float: right;">
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

}



export interface User {
  FirstName: string;
  LastName: string;
  id: string;
  Email: string;
}

@Component({
  selector: 'share-pdf-dialog',
  templateUrl: 'share-pdf-dialog.html',
  styleUrls: ['share-pdf-dialog.component.css'],
})
export class ShareSurgeriesPDFDialog {

  horizontalPosition: MatSnackBarHorizontalPosition = 'start';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';

  constructor(
    public dialogRef: MatDialogRef<ShareSurgeriesPDFDialog>,
    @Inject(MAT_DIALOG_DATA) public data: string,
    private _snackBar: MatSnackBar,
    private http: HttpClient,
    private fb: FormBuilder) { }
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
  disableBtn = false;
  separatorKeysCodes: number[] = [ENTER, COMMA];
  fruits: any[] = [
    { FirstName: 'תפוצת', LastName: 'חדר ניתוח', id: '', Email: 'DL_SurgeryPlaning@tzmc.gov.il' },
    { FirstName: this.user_name, LastName: '', id: '', Email: this.user_name + '@tzmc.gov.il' },
  ];
  @ViewChild('fruitInput') fruitInput: ElementRef<HTMLInputElement>;

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
    return (value ?? '')
      .replace(/^'+|'+$/g, '')
      .replace(/','/g, ', ');
  }

  getDepartmentLabel(): string {
    return this.stripDepartmentQuotes(this.department);
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
  templateUrl: 'summary-dialog.html',
  styleUrls: ['summary-dialog.component.css'],
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