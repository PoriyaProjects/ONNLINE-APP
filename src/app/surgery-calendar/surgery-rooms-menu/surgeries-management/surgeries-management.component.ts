import {
  Component,
  ViewChild,
  TemplateRef,
  OnInit,
  ElementRef,
  Inject,
  OnDestroy
} from '@angular/core';
import {
  isSameDay,
  isSameMonth,
} from 'date-fns';
import { Observable, Subject } from 'rxjs';
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
import * as XLSX from 'xlsx';
import { map, startWith } from 'rxjs/operators';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
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
export class SurgeriesManagementComponent implements OnInit, OnDestroy {
  tempArrOfSurgeryRooms: any = []
  pdfString: string;
  selectable = true;
  removable = true;
  separatorKeysCodes: number[] = [ENTER, COMMA];
  @ViewChild('actionInput') public actionInput: ElementRef;
  horizontalPosition: MatSnackBarHorizontalPosition = 'start';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';
  @ViewChild('modalContent', { static: true }) modalContent: TemplateRef<any>;

  view: CalendarView = CalendarView.Month;

  CalendarView = CalendarView;

  viewDate: Date;
  locale: string = 'en';
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
  surgerySurf: boolean = false;
  loadingDataServer: boolean;
  loadingRoomPrices: boolean = false;
  IfPlannedSurgeries: string = "original"
  isPhysicalRoom: boolean = false;
  private intervalId: any;
  roomPriceSummariesFromServer: any[] = [];


  constructor(
    private modal: NgbModal,
    public datePipe: DatePipe,
    private confirmationDialogService: ConfirmationDialogService,
    private http: HttpClient,
    public dialog: MatDialog,
    private _snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<SurgeriesManagementComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
  }

  ngOnInit(): void {
    if (this.UserName != null) {
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

  ngOnDestroy(): void {
    // Clear the interval when the component is destroyed
    if (this.intervalId) {
      clearInterval(this.intervalId);
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
    if (event == undefined) event = this.data.room;
    else {
      // event['SurgeryRooms'] = this.data.room.SurgeryRoom;
      event['RoomsList'] = this.data.roomsList;
      if (event['ArrivalTime'] != null) {
        //debugger
        let dialogRef = this.dialog.open(ManageSingleSurgeryComponent, {
          data: {
            event: event,
            action: action,
            timeOpened: this.date
          },
          width: '80%',
          height: '80%',
          disableClose: true
        });
        dialogRef.afterClosed().subscribe(res => {
          this.getPatientsQueues();
        })
      }
    }
  }

  showSummaryReport(room) {
    // let tempRoom = room;
    room['newSurgeries'] = room.Surgeries.filter(x => (x.SurgeryType != 'ססיה' && x.SurgeryType != 'דחוף'));
    let dialogRef = this.dialog.open(SummaryDialogComponent, {
      data: {
        room: room,
      },
      width: '60%',
      height: '60%'
    });
  }

  closeDialog() {
    this.dialogRef.close();
  }

  closeOpenDayViewDay() {
    this.getPatientsQueues();
    // this.activeDayIsOpen = false;
  }

  filterDepartment(departmentName) {
    //debugger
    this.filteredSpecificRooms = this.deepClone(this.specificRooms);
    if (departmentName != "undo") {
      this.filteredSpecificRooms.forEach((element, index) => {
        //debugger
        if (element.Surgeries != undefined) {
          let shit = element.Surgeries.filter(x => departmentName == x.SurgeryRequestDepartments.S_DEPARTMENT);
          this.filteredSpecificRooms[index].Surgeries = this.deepClone(shit);
        }
      });
    }
  }

  // get the elements to the main calendar page
  getPatientsQueues() {
    this.refresh = new Subject();
    this.loader = true;
    this.loadingRoomPrices = true;
    this.events = [];
    this.tempArrOfSurgeryRooms = [];
    this.roomPriceSummariesFromServer = [];
    const fullDate = this.datePipe.transform(this.viewDate, 'yyyy-MM-dd');

    this.http.post(environment.url + 'GetSurgeriesBySurgeryRoomCode', {
      _fullDate: fullDate,
      _surRoomCode: this.data.room.CalendarRoomsArea
    }).subscribe((Response) => {
      this.processSurgeriesCalendarResponse(Response['d']);
      this.loader = false;
      this.loadSurgeryRoomPrices(fullDate);
    });
  }

  private processSurgeriesCalendarResponse(tempArr: any): void {
    const colors = {
      Completed: '#0ef12f',
      InProgress: '#e8abf1',
      Planned: '#abeff1',
      Canceled: '#f10e0e'
    };

    this.specificRooms.forEach((x) => {
      const ele = {
        roomName: x,
        Surgeries: []
      };
      if (!x.Surgeries) {
        this.tempArrOfSurgeryRooms.push(ele);
      } else {
        x.Surgeries = [];
      }
    });

    this.IfPlannedSurgeries = 'original';
    tempArr['SurgeriesCalendarClassList'].forEach((element) => {
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
      element.color = {
        primary: '#000000', secondary: colors[element.SurgeryStatus]
      };
      element.cssClass = 'event-css-' + element.SurgeryStatus;
      if (element.Urgency.includes('ססיה')) {
        element.color = { primary: '#000000', secondary: '#FFA100' };
      }
      if (element.Urgency.includes('דחוף')) {
        element.color = { primary: '#000000', secondary: '#F1F305' };
      }
      element.draggable = true;
      let index = this.tempArrOfSurgeryRooms.find((ele) => element.SurgeryRoom == ele.roomName);
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
    if (this.isPhysicalRoom) {
      this.sortSurgeriesOfEachRoomInDay();
    }
    this.refresh.next();
  }

  private loadSurgeryRoomPrices(fullDate: string): void {
    this.loadingRoomPrices = true;
    this.http.post(environment.url + 'GetSurgeriesRoomPricesBySurgeryRoomCode', {
      _fullDate: fullDate,
      _surRoomCode: this.data.room.CalendarRoomsArea
    }).subscribe({
      next: (Response) => {
        this.applySurgeryPricesFromServer(Response['d']);
        this.loadingRoomPrices = false;
        this.refresh.next();
      },
      error: () => {
        this.loadingRoomPrices = false;
      }
    });
  }

  private applySurgeryPricesFromServer(priceData: any): void {
    if (!priceData) {
      return;
    }

    const prices = Array.isArray(priceData.SurgeryPrices) ? priceData.SurgeryPrices : [];
    const priceByRowId = new Map<string, string>();
    prices.forEach((item) => {
      const grossPrice = this.parsePriceValue(item.GrossPrice);
      if (grossPrice != null) {
        priceByRowId.set(String(item.Row_ID), String(grossPrice));
      }
    });

    this.roomPriceSummariesFromServer = Array.isArray(priceData.RoomPriceSummaries)
      ? priceData.RoomPriceSummaries
      : [];

    const updateRoomSurgeries = (rooms: any[]) => {
      rooms.forEach((room) => {
        (room.Surgeries ?? []).forEach((surgery) => {
          const grossPrice = priceByRowId.get(String(surgery.Row_ID));
          if (grossPrice == null) {
            return;
          }

          surgery.GrossPrice = grossPrice;
          if (surgery.SurgeryPatientDetails) {
            surgery.title = this.buildEventTitle(surgery);
          }
        });
      });
    };

    updateRoomSurgeries(this.specificRooms);
    updateRoomSurgeries(this.filteredSpecificRooms);
  }

  plannedFromDrorSystem() {
    this.loader = true;
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
                title: `Setup Time: <b>20min</b>`,
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
      this.refresh.next();
    }
    this.loader = false;
  }

  sortSurgeriesOfEachRoomInDay() {
    this.loader = true;
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
                title: `Setup Time: <b>20min</b>`,
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
      this.refresh.next();
    }
    this.loader = false;
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
      let deptsNoSisia = room.Surgeries.filter(x => (x.SurgeryType != 'ססיה' && x.SurgeryType != 'דחוף'));
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
    if (!surgery?.SurgeryPatientDetails) {
      return null;
    }

    return this.parsePriceValue(surgery.GrossPrice);
  }

  formatGrossPrice(value: number): string {
    return Math.round(value).toLocaleString('he-IL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  buildEventTitle(element: any, startTime?: string, endTime?: string): string {
    if (element.SurgeryPatientDetails == null) {
      return `<h6 class="text-center"><b>זמן הכנה משעה: </b>${element.ArrivalDate.split(' ')[1]}</h6>`;
    }

    const start = startTime ?? element.ArrivalDate.split(' ')[1];
    const end = endTime ?? element.EndTime;
    let hr = '';
    if (element.WithAnesthesia == 'False') {
      hr = '<hr>';
    }

    const grossPrice = this.getSurgeryGrossPrice(element);
    const priceLine = grossPrice != null
      ? `מחירון: <b>${this.formatGrossPrice(grossPrice)}</b> ₪<br>`
      : '';

    return hr + `
            מחלקה: <b>${element.SurgeryRequestDepartments.S_DEPARTMENT}</b><br>
            שם: <b>${element.SurgeryPatientDetails.PM_FIRST_NAME} ${element.SurgeryPatientDetails.PM_LAST_NAME}</b><b> -- ${element.SurgeryPatientDetails.PM_CASE_NUMBER}</b> <br>
            דחיפות: <b>${element.Urgency}</b><br>
            ${priceLine}S:<b>${start}</b> - E:<b>${end}</b>`;
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
    const serverSummary = this.roomPriceSummariesFromServer.find(
      (item) => item.SurgeryRoom === room.roomName
    );
    const fromSummary = this.parsePriceValue(serverSummary?.DepartmentDayAverage);
    if (fromSummary != null) {
      return fromSummary;
    }

    return null;
  }

  getRoomPriceSummary(room: any): { total: string; departmentDailyAverage?: string } | null {
    if (!room?.Surgeries) {
      return null;
    }

    const prices = room.Surgeries
      .filter((surgery) => surgery.SurgeryPatientDetails != null && surgery.SurgeryStatus !== 'Canceled')
      .map((surgery) => this.getSurgeryGrossPrice(surgery))
      .filter((price): price is number => price != null);

    if (prices.length === 0) {
      return null;
    }

    const serverSummary = this.roomPriceSummariesFromServer.find((item) => item.SurgeryRoom === room.roomName);
    const serverTotal = this.parsePriceValue(serverSummary?.RoomGrossPriceTotal);
    const total = serverTotal ?? prices.reduce((sum, price) => sum + price, 0);
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

  openShareDialog(pdf, department) {
    let dialogRef = this.dialog.open(ShareSurgeriesPDFDialog, {
      width: '25%',
      height: '50%',
    });
    console.log("this data to check ---> ", this.data)
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
  disableBtn: boolean;
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

  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value) {
      this.fruits.push(value);
    }

    // event.chipInput!.clear();
    this.myControl.setValue(null);
  }

  remove(fruit: string): void {
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
    //debugger
    this.disableBtn = true;
    if (this.fruits.length == 0) {
      this.openSnackBar("נא לבחור אחראי לשליחה");
      this.disableBtn = false;
    } else {
      this.http.post(environment.urlipracticom + 'SentDepartmentFinalSurgeryPlan', {
        department: this.department,
        fileString: this.reportArray,
        arrivalDate: this.arrivalDate,
        calendarRoomsArea: this.calendarRoomsArea,
        users: this.fruits, // people list
      }).subscribe(res => {
        if (res['d']) {
          this.openSnackBar("התוכנית נשלחה בהצלחה");
          this.dialogRef.close();
        }
        else this.openSnackBar("אירעה תקלה, לא נשלח");
      });
      // this.http
      //   .post(environment.urlipracticom + "AttachReportToUser", {
      //     _userSender: localStorage.getItem('loginUserName').toLowerCase(),
      //     users: this.fruits, // people list
      //     _reportArray: this.reportArray, // pdf string
      //   })
      //   .subscribe((Response) => {
      //     console.log(Response);
      //     if (Response["d"]) {
      //       this.openSnackBar("! נשלח בהצלחה לנמען");
      //       this.dialogRef.close();
      //     } else {
      //       this.openSnackBar("! אירעה תקלה, לא נשלח");
      //     }
      //     this.disableBtn = false;
      //   });
    }
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
  styles: ['surgeries-management.component.css']
})
export class SummaryDialogComponent implements OnInit {

  totalSurgeriesDuration: number = 0;

  constructor(
    private datePipe: DatePipe,
    private dialogRef: MatDialogRef<SummaryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public surdata: any
  ) { }


  ngOnInit(): void {
    // this.surdata.room.Surgeries = this.surdata.room.Surgeries.filter(x => (x.SurgeryType != 'ססיה' && x.SurgeryType != 'דחוף'));
    if (this.surdata.room.newSurgeries != undefined) this.differenceInTimes();
  }

  differenceInTimes() {
    this.surdata.room.newSurgeries.forEach(element => {
      let datefordiff = this.datePipe.transform(element.ArrivalDate, 'yyyy-MM-dd');
      let before = new Date(datefordiff + ' ' + element.ArrivalTime);
      let after = new Date(datefordiff + ' ' + element.EndTime);
      let diff = Math.abs(after.getTime() - before.getTime());//difference in time
      let hours = Math.floor((diff % 86400000) / 3600000);//hours
      let minutes = Math.round(((diff % 86400000) % 3600000) / 60000);//minutes
      element['duration'] = hours + '.' + minutes;
      // if (hours == 0) element['duration'] = parseFloat(element['duration']) / 0.6;
      this.totalSurgeriesDuration += parseFloat(element['duration']);
    });
    // this.totalSurgeriesDuration += ((this.surdata.room.Surgeries.length * 0.2)/0.6);
  }

  // differenceInTimes() {
  //   var totalMin = 0;
  //   var totalHouers = 0;
  //   this.surdata.room.newSurgeries.forEach(element => {
  //     let datefordiff = this.datePipe.transform(element.ArrivalDate, 'yyyy-MM-dd');
  //     let before = new Date(datefordiff + ' ' + element.ArrivalTime);
  //     let after = new Date(datefordiff + ' ' + element.EndTime);
  //     let diff = Math.abs(after.getTime() - before.getTime());//difference in time
  //     let hours = Math.floor((diff % 86400000) / 3600000);//hours
  //     let minutes = Math.round(((diff % 86400000) % 3600000) / 60000);//minutes
  //     if(minutes < 10) {element['duration'] = hours + ':0' + minutes;}else{
  //       element['duration'] = hours + ':' + minutes;
  //     }
  //     totalMin +=minutes 
  //     totalHouers +=hours
  //     //if (hours == 0) element['duration'] = parseFloat(element['duration']) / 0.6;

  //   });
  //   var totalTime = (totalHouers + Math.floor(totalMin/60)) ;
  //   this.totalSurgeriesDuration = totalTime + ':' +(totalMin%60);
  //   // this.totalSurgeriesDuration += ((this.surdata.room.Surgeries.length * 0.2)/0.6);
  // }

}