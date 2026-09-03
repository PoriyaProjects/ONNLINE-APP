import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { CalendarEvent, CalendarEventTimesChangedEvent, CalendarView } from 'angular-calendar';
import { isSameMonth } from 'date-fns';
import { Subject } from 'rxjs';
import { registerLocaleData } from '@angular/common';
import localeHe from '@angular/common/locales/he';
import { MenuPerm } from '../menu-perm';
import { MachinesRoomsMenuComponent } from './machines-rooms-menu/machines-rooms-menu.component';
import { MachineCalendarDayEvent } from './machines-calendar.types';
import { GetMachineRooms } from './machines-calendar-api.server';

registerLocaleData(localeHe);

const MACHINES_ROOMS_MENU_PANEL_CLASS = 'machines-rooms-menu-panel';

@Component({
  selector: 'app-machines-calendar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './machines-calendar.component.html',
  styleUrls: ['./machines-calendar.component.css'],
})
export class MachinesCalendarComponent implements OnInit {
  @ViewChild('modalContent', { static: true }) modalContent: TemplateRef<unknown>;

  view: CalendarView = CalendarView.Month;
  CalendarView = CalendarView;
  viewDate: Date = new Date();
  locale = 'he';
  refresh: Subject<void> = new Subject();
  events: CalendarEvent[] = [];
  activeDayIsOpen = false;
  loader = true;

  horizontalPosition: MatSnackBarHorizontalPosition = 'start';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';

  private readonly userName = localStorage.getItem('loginUserName')?.toLowerCase();

  constructor(
    public datePipe: DatePipe,
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private menuPerm: MenuPerm,
    private cdr: ChangeDetectorRef,
  ) {
    this.menuPerm.setRoutName('machines-calendar');
    setTimeout(() => {
      if (!this.menuPerm.getHasPerm()) {
        localStorage.clear();
        this.router.navigate(['login']);
      }
    }, 2000);
  }

  ngOnInit(): void {
    if (this.userName != null) {
      const month = this.datePipe.transform(this.viewDate, 'MM');
      const year = this.datePipe.transform(this.viewDate, 'yyyy');
      this.getMachineRooms(month, year);
    }
  }

  dayClicked(day: { date: Date }, clickEvent: { day: { date: Date; day: number; events: CalendarEvent[] } }): void {
    if (isSameMonth(day.date, this.viewDate)) {
      this.viewDate = day.date;
      this.activeDayIsOpen = false;
      this.handleEvent('NewEvent', clickEvent);
    }
  }

  eventTimesChanged({ event, newStart }: CalendarEventTimesChangedEvent): void {
    this.events = this.events.map((calendarEvent) => {
      if (calendarEvent === event) {
        return { ...event, start: newStart };
      }
      return calendarEvent;
    });
  }

  handleEvent(
    action: string,
    event: CalendarEvent | { day: { date: Date; day: number; events: CalendarEvent[] } },
  ): void {
    const dialogEvent = this.normalizeDialogEvent(event);
    this.dialog.open(MachinesRoomsMenuComponent, {
      data: { event: dialogEvent, action },
      panelClass: MACHINES_ROOMS_MENU_PANEL_CLASS,
      width: '60vw',
      height: '60vh',
      maxWidth: '60vw',
      maxHeight: '60vh',
      autoFocus: false,
    });
  }

  private normalizeDialogEvent(
    event: CalendarEvent | { day: { date: Date; day: number; events: CalendarEvent[] } },
  ): { day: { date: Date; day: number; events: CalendarEvent[] } } {
    if ('day' in event) {
      return event;
    }

    const startDate = event.start ?? this.viewDate;
    return {
      day: {
        date: startDate,
        day: startDate.getDay(),
        events: [event],
      },
    };
  }

  closeOpenMonthViewDay(): void {
    const month = this.datePipe.transform(this.viewDate, 'MM');
    const year = this.datePipe.transform(this.viewDate, 'yyyy');
    this.getMachineRooms(month, year);
    this.activeDayIsOpen = false;
  }

  getMachineRooms(month: string, year: string): void {
    this.loader = true;
    this.events = [];
    this.cdr.markForCheck();

    const response = GetMachineRooms({ _month: month, _year: year });
    this.loader = false;

    if (response.length === 0) {
      this.events = this.buildPlaceholderEvents(Number(month), Number(year));
    } else {
      response.forEach((element: MachineCalendarDayEvent) => {
        element.start = new Date(element.ArrivalDate);
        element.time = '00:00';
        element.title = `${element.CalendarRoomsArea} -פז:${element.Physical} -ור:${element.Virtual}`;
        this.events.push(element as CalendarEvent);
      });
    }

    this.refresh.next();
    this.cdr.markForCheck();
  }

  private buildPlaceholderEvents(month: number, year: number): CalendarEvent[] {
    const daysInMonth = new Date(year, month, 0).getDate();
    const placeholders: CalendarEvent[] = [];

    for (let day = 1; day <= daysInMonth; day += 1) {
      const arrivalDate = new Date(year, month - 1, day);
      placeholders.push({
        start: arrivalDate,
        title: 'מכונים -פז:0 -ור:0',
        meta: {
          ArrivalDate: arrivalDate.toISOString(),
          CalendarRoomsArea: 'מכונים',
          Physical: 0,
          Virtual: 0,
        },
      });
    }

    return placeholders;
  }

  openSnackBar(message: string): void {
    this.snackBar.open(message, 'X', {
      duration: 3000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }
}
