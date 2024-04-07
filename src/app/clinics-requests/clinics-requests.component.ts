import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ViewChild,
  AfterViewInit,
  Input,
  TemplateRef,
  ChangeDetectorRef,
  ElementRef,
} from "@angular/core";
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { DatePipe } from '@angular/common';
import {
  startOfDay,
  endOfDay,
  subDays,
  addDays,
  endOfMonth,
  isSameDay,
  isSameMonth,
  addHours,
} from "date-fns";
import {
  CalendarEvent,
  CalendarEventAction,
  CalendarEventTimesChangedEvent,
  CalendarView
} from "angular-calendar";

import { Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { MatPaginator, PageEvent } from "@angular/material/paginator";
import { MatRadioChange } from "@angular/material/radio";
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from "@angular/material/snack-bar";
import { formatDate } from "@angular/common";
import { MatSort } from "@angular/material/sort";
import { MatTable, MatTableDataSource } from "@angular/material/table";

import {
  NgbModal,
  ModalDismissReasons,
  NgbModalOptions,
  NgbActiveModal,
} from "@ng-bootstrap/ng-bootstrap";
import * as $ from "jquery";
import {
  FormControl,
  FormBuilder,
  FormGroup,
  Validators,
} from "@angular/forms";
import { Subject } from "rxjs";
import { MatDialog } from "@angular/material/dialog";
import { ClinicsRequestsDialogComponent } from "./clinics-requests-dialog/clinics-requests-dialog.component";
import { environment } from "src/environments/environment";
export interface EventDay {
  Depart: string;
  Depart_ID: string;
  AppointmentDate: string;
  Total: number;
}
export interface EventDepartDay {
  RowId: string;
  ServiceNumber: string;
  ServiceDescription: string;
  Depart: string;
  AppointmentDate: string;
  AppointmentTime: string;
  Duration: string;
  PatientNumber: string;
  PatientId: string;
  PatientFirstName: string;
  PatientLastName: string;
  UniqueServiceNumber: string;
  Total: number;
}
@Component({
  selector: 'app-clinics-requests',
  templateUrl: './clinics-requests.component.html',
  styleUrls: ['./clinics-requests.component.css'],
})
export class ClinicsRequestsComponent implements OnInit {
  @ViewChild('toDayCall') toDayCall: ElementRef;
  @ViewChild("modalContent", { static: true }) modalContent: TemplateRef<any>;
  displayedColumns: string[] = [
    "ServiceDescription",
    "AppointmentTime",
    "PatientNumber",
    "PatientId",
    "PatientFirstName",
    "PatientLastName",
    // "CLICK_sendtosafe",
  ];
  EventsDerpatDay = [] as EventDepartDay[];
  EventsDay = [] as EventDay[];
  unDeparts = [] as any[];
  unDepartsToSelect = [] as any[];
  locale: string = "he";
  view: CalendarView = CalendarView.Week;
  CalendarView = CalendarView;
  events: CalendarEvent[] = [];
  refresh: Subject<any> = new Subject();
  viewDate: Date = new Date();
  activeDayIsOpen: boolean = false;
  TABLE_DATA: EventDepartDay[] = [];
  dataSource = new MatTableDataSource<EventDepartDay>(this.TABLE_DATA);
  modalData: {
    action: string;
    events: EventDepartDay[];
    dataSource: any
  };
  constructor(
    public dialog: MatDialog,
    private _snackBar: MatSnackBar,
    private router: Router,
    private http: HttpClient,
    private datePipe: DatePipe,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    setTimeout(() => {
      this.getEvents();
      this.refresh.next();
      this.cdr.detectChanges();
    }, 1500);
  }
  onSelectionChange(eventw: any) {
    eventw.selected = !eventw.selected
    console.log(eventw);
    let isSelected = false;
    this.unDepartsToSelect.forEach((ele: any) => {
      if (ele.selected) {
        isSelected = true
      }
    })

    var obj: Array<any> = [];
    // //debugger
    let DateTime = [];
    let hour = 0;
    let min = 0;
    let lastAppointmentDate = '';
    this.setEvents(isSelected,
      obj,
      DateTime,
      hour,
      min,
      lastAppointmentDate);
  }
  getDateTotalRequests(events): number {
    
    let sum = 0;
    for (const item of events) {
      sum += parseInt(item.Total);
    }
    return sum;
  }
  getDateTotalRequestsWeek(events: any[], date: Date): Number  {
    let sum = 0;
    for (const item of events) {
     
      if(date.getTime() == item.dateToCheck.getTime()){
        sum += parseInt(item.Total);
      }
      
    }
    return sum;
  }
  setEvents(isSelected,
    obj,
    DateTime,
    hour,
    min,
    lastAppointmentDate) {
    for (var i = 0; i < this.EventsDay.length; i++) {
      if (this.unDeparts.indexOf(this.EventsDay[i].Depart) < 0) {
        this.unDeparts.push(this.EventsDay[i].Depart);
        this.unDepartsToSelect.push({ name: this.EventsDay[i].Depart, selected: false });
      }
      if (i == 0) {
        lastAppointmentDate = this.EventsDay[i].AppointmentDate;
      }
      if (this.EventsDay[i].AppointmentDate != lastAppointmentDate) {
        lastAppointmentDate = this.EventsDay[i].AppointmentDate;
        hour = 0;
        min = 0;
      }
      let sHour = "0" + hour;
      let sMin = "0" + min;

      if (parseInt(sMin) > 55) {
        min = 0;
      }



      if (hour > 9) {
        sHour = hour + "";
      }
      if (min > 9) {
        sMin = min + "";
      } else {
        sMin = "0" + min;
      }
      //console.log(this.EventsDay[i].AppointmentDate  + ' ' + sHour + ':' + sMin)
      let event = {
        title:
          this.EventsDay[i].Depart +
          " (" +
          this.EventsDay[i].Total +
          ") ",
        start: new Date(
          Date.parse(this.EventsDay[i].AppointmentDate + ' ' + sHour + ':' + sMin)
        ),
        dateToCheck: new Date(
          Date.parse(this.EventsDay[i].AppointmentDate + ' 00:00:00' )
        ),
        cssClass: "my-custom-class",
        depart: this.EventsDay[i].Depart,
        Total: this.EventsDay[i].Total,
        depart_ID: this.EventsDay[i].Depart_ID,
      };
      ////debugger
      if (isSelected) {
        this.unDepartsToSelect.forEach((ele: any) => {
          if (ele.selected) {
            if (this.EventsDay[i].Depart == ele.name) {
              obj.push(event);
              min = min + 30;
              if (hour > 23) {
                hour = 0;
              } else if (min == 60) {
                hour = hour + 1;
              }
            }
          }
        })

      } else {
        obj.push(event);
        min = min + 30;
        if (hour > 23) {
          hour = 0;
        } else if (min == 60) {
          hour = hour + 1;
        }
      }





    }
    this.events = obj;
  }
  dayClicked({
    date,
    events,
  }: {
    date: Date;
    events: CalendarEvent[];
  }): void {
    if (isSameMonth(date, this.viewDate)) {
      if (
        (isSameDay(this.viewDate, date) &&
          this.activeDayIsOpen === true) ||
        events.length === 0
      ) {
        this.activeDayIsOpen = false;
      } else {
        this.activeDayIsOpen = true;
      }
      this.viewDate = date;
    }
  }
  setView(view: CalendarView) {
    this.view = view;
  }
  handleEvent(action: string, event: CalendarEvent): void {
    $("#loader").removeClass("d-none");
    // //debugger
    console.log(event);
    console.log(this.datePipe.transform(event['start'], "yyyy-MM-dd"));
    this.http
      .post(
        environment.url + "GetAllClinicDepartAppointmentsByDay",
        {
          depart: event['depart_ID'],
          date: this.datePipe.transform(event['start'], "yyyy-MM-dd"),
        }
      )
      .subscribe((Response) => {
        console.log(Response);
        let res = {
          data: Response["d"] as any[],
          title: event["title"],
          date: this.datePipe.transform(event['start'], "yyyy-MM-dd")
        }
        const dialogRef = this.dialog.open(ClinicsRequestsDialogComponent, {
          width: "95%",
          data: res
        });

        dialogRef.afterClosed().subscribe(result => {
          console.log(`Dialog result: ${result}`);
        });
        $("#loader").addClass("d-none");
      });

  }
  getEvents() {
    $("#loader").removeClass("d-none");
    this.http
      .post(
        environment.url + "GetAllClinicsAppointments",
        {}
      )
      .subscribe((Response) => {
        this.events = [];
        this.unDeparts = [];
        var obj: Array<any> = [];
        this.EventsDay = Response["d"] as EventDay[];
        // //debugger
        let DateTime = [];
        let hour = 0;
        let min = 0;
        let lastAppointmentDate = '';
        this.setEvents(false,
          obj,
          DateTime,
          hour,
          min,
          lastAppointmentDate)
        this.viewDate = new Date();
        this.viewDate.setDate(this.viewDate.getDate() + 31)
        //this.events.
        this.refresh.next();
        // Next
        //this.viewDate = 
        this.toDayCall.nativeElement.click();
        //debugger;
        $("#loader").addClass("d-none");
      });
  }
}
