
import { MenuPerm } from '../menu-perm';
import { MatDialog } from '@angular/material/dialog';
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
import { CalendarEvent, CalendarEventAction, CalendarView } from "angular-calendar";

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
import { environment } from "src/environments/environment";
import { MatButtonToggleChange, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { ChartType } from 'angular-google-charts';
import { Console } from 'console';
import { DialogDoingComponent } from './dialog-doing/dialog-doing.component';

export interface ClinicActivityComparisonResult {
  [x: string]: any;
  Year: number;
  Approved: number;
  NoShow: number;
  Canceled: number;
}
export interface DimotActivityTotal {
  [x: string]: any;
  YearNumber: number;
  Total: number;
  DepartName: string;
}
export interface DimoteDoingByDateAndDepart {
  [x: string]: any;
  CaseNumber: string;
  TechDate: string;
  TechTime: string;
  Depart: string;
  DocDate: string;
  DocTime: string;
  DocDepart: string;
  DocName: string;
  CaseType: string;
  DocCheckType: string;
}
export interface DimotActivityTotalByCheckType {
  [x: string]: any;
  YearNumber: number;
  Total: number;
  DepartName: string;
  DocCheckType: string;
}
export interface EventDay {
  DepartName: string;
  Date: string;
  TotalTech: number;
  Total: number;
  TotalDoc: number;
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
  Total: string;
}
@Component({
  selector: 'app-dimot-activity-dashboard',
  templateUrl: './dimot-activity-dashboard.component.html',
  styleUrls: ['./dimot-activity-dashboard.component.css']
})
export class DimotActivityDashboardComponent implements OnInit {
  @ViewChild('toggleGroup') toggleGroup!: MatButtonToggleGroup;
  @ViewChild('toDayCall') toDayCall: ElementRef;
  viewDate: Date = new Date();
  view: CalendarView = CalendarView.Month;
  CalendarView = CalendarView;
  EventsDay = [] as EventDay[];
  EventDerpatDay = {} as EventDepartDay;
  EventsDerpatDay = [] as EventDepartDay[];
  activeDayIsOpen: boolean = false;
  events: CalendarEvent[] = [];
  departEvents: CalendarEvent[] = [];
  departs: any[] = [];
  refresh: Subject<any> = new Subject();
  chartData: any[] = [];
  chartOptions: any;
  chartType = ChartType.BarChart;
  chartTypeActivityTimes = ChartType.BarChart;
  chartColumnsActivityTimes = ['מכון', 'פחות מ- 4 ימים', '5-7 ימים', '8-21 ימים', '22-30 ימים', 'יותר מ- 30 ימים', 'ללא פענוח'];

  chartDataActivityTimes = [];
  chartOptionsActivityTimes = {
    isStacked: true,
    hAxis: { title: " מס' פענוחים" },
    vAxis: { title: 'מכון' },
    colors: ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336', '#607d8b']
  }
  chartColumns: string[] = ['שם מכון', '2025', '2024', '2023', '2022'];
  colorMap: { [key: string]: string } = {};
  DimotActivityTotalArrya = [/* paste your JSON object here */];
  DimotActivitiesByTimesArrya = [/* paste your JSON object here */];
  DimotActivityTotalArryaByCheckType = [/* paste your JSON object here */];
  locale: string = "he";
  selectedDeps: string[] = [];
  allEvents: any[] = [];
  mDimoteDoingByDateAndDepart: DimoteDoingByDateAndDepart[] = [];

  GaugeChartType = ChartType.Gauge;

  // 2. Set the Chart Data (will be populated in ngOnInit)
  //    The format is: [['Label', 'Value'], [string, number]]
  GaugeChartData: any[] = [];
  GaugeChartDataTech: any[] = [];

  // 3. Set the Chart Column Names
  GaugeChartColumns = ['Label', 'Value'];

  // 4. Set the Chart Options
  //    THIS IS THE MOST IMPORTANT PART
  GaugeChartOptions = {
    min: 0,
    max: 300, // <-- *** YOU MUST SET YOUR OWN MAX VALUE ***

    // Optional: Define color ranges
    redFrom: 0,
    redTo: 50,
    yellowFrom: 50,
    yellowTo: 75,

    greenFrom: 200,
    greenTo: 300,

    minorTicks: 5 // Number of small ticks between numbers
  };

  GaugeWidth = 250;
  GaugeHeight = 250;
  constructor(
    private _snackBarUsers: MatSnackBar,
    private router: Router,
    private http: HttpClient,
    private datePipe: DatePipe,
    private formBuilderUsers: FormBuilder,
    private mMenuPerm: MenuPerm,
    public dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {
    mMenuPerm.setRoutName("clinicactivitydashboard");
    setTimeout(() => {
      // if (!mMenuPerm.getHasPerm()) {
      //   localStorage.clear();
      //   this.router.navigate(["login"]);
      // }
    }, 2000);
    this.getDimotActivityTotal();
  }
  addColorToMap(key: string, color: string): void {
    if (!(key in this.colorMap)) {
      this.colorMap[key] = color; // Add the key-value pair only if the key does not exist
    }
  }

  ngOnInit(): void {
    this.GetDimoteDoingByDate(new Date(), 'Doc')
    this.GetDimoteDoingByDate(new Date(), 'Tech')
    this.getActivities();
    this.GetAllDimotActivitiesByTimes();
  }
  setView(view: CalendarView) {
    this.view = view;
  }
  getDimotActivityTotal() {

    this.http
      .post(environment.url + "GetDimotActivityTotal", {
      })
      .subscribe((Response: DimotActivityTotal) => {
        this.DimotActivityTotalArrya = Response["d"]
        console.log(this.DimotActivityTotalArrya)

        this.prepareChartData();

        this.chartOptions = {
          title: 'השוואת פעילות לפי מכון ושנה',
          hAxis: { title: 'סה״כ בדיקות' },
          vAxis: { title: 'שם המכון' },
          bars: 'horizontal',
          isStacked: false,
          legend: { position: 'top', alignment: 'center' },
          chartArea: { left: 150, width: '70%', height: '80%' },
          animation: { duration: 800, easing: 'out', startup: true },
        };
      })

  }
  /*
  getDimotActivityTotalByDocCheckType() {

    this.http
      .post(environment.url + "GetDimotActivityTotalByDocCheckType", {
      })
      .subscribe((Response: DimotActivityTotal) => {
        this.DimotActivityTotalArryaByCheckType = Response["d"]
        console.log(this.DimotActivityTotalArryaByCheckType)

        this.prepareChartDataByCheckType();

        this.chartOptionsByCheckType = {
          title: 'השוואת פעילות לפי מכון וסוג בדיקה',
          hAxis: { title: 'סה״כ בדיקות' },
          vAxis: { title: 'שם המכון' },
          bars: 'horizontal',
          isStacked: false,
          legend: { position: 'top', alignment: 'center' },
          chartArea: { left: 150, width: '70%', height: '80%' },
          animation: { duration: 800, easing: 'out', startup: true },
        };
      })

  }*/
  prepareChartDataByCheckType() {
    // Get unique years
    const years = [...new Set(this.DimotActivityTotalArrya.map(d => d.YearNumber))].sort();
    // 3️⃣ Build the chartColumns dynamically
    this.chartColumns = ['שם מכון', ...years.map(y => y.toString())];
    // Get department names (to ensure consistent order)
    const departments = [...new Set(this.DimotActivityTotalArrya.map(d => d.DepartName))];

    this.chartData = departments.map(dep => [
      dep,
      ...years.map(year => {
        const found = this.DimotActivityTotalArrya.find(d => d.YearNumber === year && d.DepartName === dep);
        return found ? found.Total : 0;
      })
    ]);


  }
  prepareChartData() {
    // Get unique years
    const years = [...new Set(this.DimotActivityTotalArrya.map(d => d.YearNumber))].sort();
    // 3️⃣ Build the chartColumns dynamically
    this.chartColumns = ['שם מכון', ...years.map(y => y.toString())];
    // Get department names (to ensure consistent order)
    const departments = [...new Set(this.DimotActivityTotalArrya.map(d => d.DepartName))];

    this.chartData = departments.map(dep => [
      dep,
      ...years.map(year => {
        const found = this.DimotActivityTotalArrya.find(d => d.YearNumber === year && d.DepartName === dep);
        return found ? found.Total : 0;
      })
    ]);


  }
  getDateTotalRequests(events): number {

    let sum = 0;
    for (const item of events) {
      //debugger
      sum += parseInt(item.TotalTech);
    }
    return sum;
  }

  getDateTotalDocRequests(events): number {

    let sum = 0;
    for (const item of events) {
      // debugger
      sum += parseInt(item.TotalDoc);
    }
    return sum;
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
  GetDimoteDoingByDate(date: any, type: any) {
    this.http
      .post(
        environment.url + "GetDimoteDoingByDate",
        {
          date: this.datePipe.transform(date, "yyyy-MM-dd").toString(),
          type: type
        }
      )
      .subscribe((Response) => {
        if (type == 'Doc') {
          this.GaugeChartData = Response["d"]
          const totalValue = this.GaugeChartData[0]?.Total;
          this.GaugeChartData = [
            ['פענוחים להיום', totalValue]
          ];
        } else {
          this.GaugeChartDataTech = Response["d"]
          const totalValue = this.GaugeChartDataTech[0]?.Total;
          this.GaugeChartDataTech = [
            ['בדיקות טכנאים להיום', totalValue]
          ];
        }


      })
  }
  handleEvent(action: string, event: any) {
    // $("#loader").removeClass("d-none");
    console.log(event)
    // debugger
    this.http
      .post(
        environment.url + "GetDimoteDoingByDateAndDepart",
        {
          depart: event['depart'],
          date: this.datePipe.transform(event['start'], "yyyy-MM-dd").toString(),
        }
      )
      .subscribe((Response) => {
        this.mDimoteDoingByDateAndDepart = Response["d"] as DimoteDoingByDateAndDepart[];
        const dialogRef = this.dialog.open(DialogDoingComponent, {
          width: '100%',

          // 3. Pass data to the dialog
          data: {
            mDimoteDoingByDateAndDepart: this.mDimoteDoingByDateAndDepart,
            DepartName: event['depart'],
            DateDoing: this.datePipe.transform(event['start'], "yyyy-MM-dd").toString()
          }
        });

        // 4. Get data back when the dialog is closed
        dialogRef.afterClosed().subscribe(result => {
          console.log('The dialog was closed');

          if (result) {
            console.log('User clicked YES', result); // 'result' will be 'true'
          } else {
            console.log('User clicked CANCEL or closed'); // 'result' will be undefined
          }
        });
        $("#loader").addClass("d-none");
      });

  }


  GetAllDimotActivitiesByTimes() {
    this.http
      .post(environment.url + "GetAllDimotActivitiesByTimes", {
      })
      .subscribe((Response: DimotActivityTotal) => {
        this.DimotActivitiesByTimesArrya = Response["d"]
        console.log(this.DimotActivityTotalArrya)
        //debugger
        this.chartDataActivityTimes = this.DimotActivitiesByTimesArrya.map(row => [
          row.DepartName,
          row.Less_4_Days,
          row.Days_5_To_7,
          row.Days_8_To_21,
          row.Days_22_To_30,
          row.More_Than_30,
          row.No_Doc_Check
        ]);
      })
  }
  getActivities() {
    $("#loader").removeClass("d-none");
    this.http
      .post(
        environment.url + "GetAllDimotTechActivities",
        {}
      )
      .subscribe((Response) => {
        this.http
          .post(
            environment.url + "GetAllDimotDocActivities",
            {}
          )
          .subscribe((ResponseDoc) => {
            this.events = [];
            var obj: Array<any> = [];
            // debugger
            let DocEvents = ResponseDoc["d"] as EventDay[];
            this.EventsDay = Response["d"] as EventDay[];
            // //debugger
            for (var i = 0; i < this.EventsDay.length; i++) {
              const [day, month, yearAndTime] = this.EventsDay[i].Date.split('/');
              const [year, time] = yearAndTime.split(' ');
              const formattedDate = new Date(`${year}-${month}-${day}T${time}`);

              const eventsForMyDate = DocEvents.filter(event => event.Date === this.EventsDay[i].Date && this.EventsDay[i].DepartName === event.DepartName);
              //debugger
              let eventClass = "my-custom-class"
              let mTitle = this.EventsDay[i].DepartName +
                ", בדיקות טכנאים (" +
                this.EventsDay[i].TotalTech +
                ") ,  פענוחים  לאותם בדיקות (" +
                this.EventsDay[i].TotalDoc +
                ") ,  פענוחים באותו יום (" +
                (eventsForMyDate[0]?.Total > 0 ? eventsForMyDate[0]?.Total : 0) +
                ")";
              if (this.EventsDay[i].TotalTech > this.EventsDay[i].TotalDoc) {
                eventClass = "less-doc-doing"
              }
              let event = {
                title: mTitle,
                start: formattedDate,
                cssClass: eventClass,
                depart: this.EventsDay[i].DepartName,
                TotalTech: this.EventsDay[i].TotalTech,
                TotalDoc: this.EventsDay[i].TotalDoc,
                eventFromServer: this.EventsDay[i]
                // clickable: true,
              };

              if (this.departs.indexOf(this.EventsDay[i].DepartName) < 0) {
                this.departs.push(this.EventsDay[i].DepartName)
              }
              ////debugger
              obj.push(event);

            }
            this.allEvents = this.events = obj;
            this.viewDate = new Date();
            this.viewDate.setDate(this.viewDate.getDate() + 31)
            //this.events.
            this.refresh.next();
            // Next
            //this.viewDate = 
            this.toDayCall.nativeElement.click();
          })

      });
  }
  onDepSelected(event: MatButtonToggleChange, group: MatButtonToggleGroup) {
    this.selectedDeps = group.value; // all selected departments (array)

    if (!this.selectedDeps || this.selectedDeps.length === 0) {
      // if nothing selected → show all events
      this.events = this.allEvents;
    } else {
      // filter by selected departments
      this.events = this.allEvents.filter(ev =>
        this.selectedDeps.includes(ev.depart)
      );
    }

    // refresh your calendar or view
    this.refresh.next();
  }
}
