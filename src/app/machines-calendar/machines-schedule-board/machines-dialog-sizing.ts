import { MatDialogRef } from '@angular/material/dialog';

export const MACHINES_SCHEDULE_BOARD_PANEL_CLASS = 'machines-schedule-board-panel';

const DIALOG_WIDTH = '95vw';
const DIALOG_HEIGHT = '95vh';

export function applyMachinesScheduleBoardDialogSize<T>(dialogRef: MatDialogRef<T>): void {
  const apply = () => {
    dialogRef.addPanelClass(MACHINES_SCHEDULE_BOARD_PANEL_CLASS);
    dialogRef.updateSize(DIALOG_WIDTH, DIALOG_HEIGHT);
  };

  dialogRef.afterOpened().subscribe(apply);
  setTimeout(apply, 0);
}
