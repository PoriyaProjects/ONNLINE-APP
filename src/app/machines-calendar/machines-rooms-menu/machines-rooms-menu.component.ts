import { Component, Inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MACHINE_ROOM_TYPE_LABELS, MachineRoomType } from '../machines-calendar.types';
import { MachinesRoomsDetailComponent } from '../machines-rooms-detail/machines-rooms-detail.component';

@Component({
  selector: 'app-machines-rooms-menu',
  templateUrl: './machines-rooms-menu.component.html',
  styleUrls: ['./machines-rooms-menu.component.css'],
})
export class MachinesRoomsMenuComponent implements OnInit {
  readonly roomTypeLabels = MACHINE_ROOM_TYPE_LABELS;
  viewDate: Date;

  private readonly dayNames = [
    { number: 0, name: 'ראשון' },
    { number: 1, name: 'שני' },
    { number: 2, name: 'שלישי' },
    { number: 3, name: 'רביעי' },
    { number: 4, name: 'חמישי' },
    { number: 5, name: 'שישי' },
    { number: 6, name: 'שבת' },
  ];

  todaysName = '';

  constructor(
    public dialogRef: MatDialogRef<MachinesRoomsMenuComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { event: { day: { date: Date; day: number; events?: unknown[] } }; action?: string },
    public datePipe: DatePipe,
    private dialog: MatDialog,
  ) {
    this.todaysName = this.dayNames[data.event.day.day]?.name ?? '';
  }

  ngOnInit(): void {
    this.viewDate = this.data.event.day.date;
  }

  openRoomType(roomType: MachineRoomType): void {
    this.dialog.open(MachinesRoomsDetailComponent, {
      data: {
        roomType,
        roomTypeLabel: this.roomTypeLabels[roomType],
        selectedDate: this.viewDate,
      },
      width: 'min(96vw, 900px)',
      maxWidth: '96vw',
      autoFocus: false,
    });
  }
}
