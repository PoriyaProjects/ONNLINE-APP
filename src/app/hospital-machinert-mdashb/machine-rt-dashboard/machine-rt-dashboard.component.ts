import { Component } from '@angular/core';

import { MachineRoomSlot } from '../models/machine-rt-dashboard.models';

@Component({
  selector: 'app-machine-rt-dashboard',
  templateUrl: './machine-rt-dashboard.component.html',
  styleUrls: ['./machine-rt-dashboard.component.css'],
})
export class MachineRtDashboardComponent {
  readonly developmentTitle = 'עדיין בפיתוח';
  readonly developmentHint = 'התצוגה תחובר למקור נתונים בקרוב';

  readonly machineRooms: MachineRoomSlot[] = [
    { code: 'cath-1', label: 'חדר צינתורים 1' },
    { code: 'cath-2', label: 'חדר צינתורים 2' },
    { code: 'gastro', label: 'חדר גסטרו' },
    { code: 'angio', label: 'חדר אנגיו' },
  ];

  trackByRoomCode(_index: number, room: MachineRoomSlot): string {
    return room.code;
  }
}
