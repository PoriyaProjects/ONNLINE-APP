import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MACHINE_ROOMS, MachineRoomType } from '../machines-calendar.types';

export interface MachinesRoomsDetailDialogData {
  roomType: MachineRoomType;
  roomTypeLabel: string;
  selectedDate: Date;
}

@Component({
  selector: 'app-machines-rooms-detail',
  templateUrl: './machines-rooms-detail.component.html',
  styleUrls: ['./machines-rooms-detail.component.css'],
})
export class MachinesRoomsDetailComponent {
  readonly rooms = MACHINE_ROOMS;
  readonly developmentMessage = 'עדיין בפיתוח';

  constructor(@Inject(MAT_DIALOG_DATA) public data: MachinesRoomsDetailDialogData) {}
}
