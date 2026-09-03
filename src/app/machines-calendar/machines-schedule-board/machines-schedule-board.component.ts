import { Component, HostBinding, Inject, OnInit } from '@angular/core';
import { DatePipe, registerLocaleData } from '@angular/common';
import localeHe from '@angular/common/locales/he';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CalendarEvent, CalendarView } from 'angular-calendar';
import { Subject } from 'rxjs';
import { MACHINE_ROOMS, MachineRoomType } from '../machines-calendar.types';
import { applyMachinesScheduleBoardDialogSize } from './machines-dialog-sizing';

registerLocaleData(localeHe);

export interface MachinesScheduleBoardDialogData {
  selectedDate: Date;
  roomType: MachineRoomType;
  roomTypeLabel: string;
}

interface MachineRoomColumn {
  roomCode: string;
  roomName: string;
  appointments: CalendarEvent[];
}

@Component({
  selector: 'app-machines-schedule-board',
  templateUrl: './machines-schedule-board.component.html',
  styleUrls: ['./machines-schedule-board.component.css'],
})
export class MachinesScheduleBoardComponent implements OnInit {
  @HostBinding('class.machines-schedule-board-dialog-root') readonly dialogRoot = true;

  readonly expectedRoomCount = 4;
  readonly developmentMessage = 'עדיין בפיתוח';
  readonly CalendarView = CalendarView;

  view = CalendarView.Day;
  viewDate: Date;
  locale = 'he';
  dayViewStartHour = 7;
  dayViewEndHour = 20;
  dayViewEndMinute = 0;
  hourSegmentHeight = 34;
  hourSegments = 2;
  refresh = new Subject<void>();
  rooms: MachineRoomColumn[] = [];

  constructor(
    public datePipe: DatePipe,
    public dialogRef: MatDialogRef<MachinesScheduleBoardComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MachinesScheduleBoardDialogData,
  ) {}

  ngOnInit(): void {
    applyMachinesScheduleBoardDialogSize(this.dialogRef);
    this.viewDate = new Date(this.data.selectedDate);
    this.rooms = MACHINE_ROOMS.map((room) => ({
      roomCode: room.code,
      roomName: room.name,
      appointments: [],
    }));
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  closeOpenDayViewDay(): void {
    this.refresh.next();
  }
}
