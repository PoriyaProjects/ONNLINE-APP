import { MatDialogRef } from '@angular/material/dialog';

export const SURGERIES_DIALOG_PANEL_CLASS = 'surgeries-management-panel';

export function applySurgeriesManagementDialogSize<T>(dialogRef: MatDialogRef<T>): void {
  const apply = () => {
    dialogRef.addPanelClass(SURGERIES_DIALOG_PANEL_CLASS);
    dialogRef.updateSize('95vw', '95vh');

    const container = document.getElementById(dialogRef.id) as HTMLElement | null;
    const pane = container?.closest('.cdk-overlay-pane') as HTMLElement | null;
    const host = container?.querySelector('app-surgeries-management') as HTMLElement | null;

    if (pane) {
      pane.style.setProperty('width', '95vw', 'important');
      pane.style.setProperty('max-width', '95vw', 'important');
      pane.style.setProperty('height', '95vh', 'important');
      pane.style.setProperty('max-height', '95vh', 'important');
    }

    if (container) {
      container.style.setProperty('width', '100%', 'important');
      container.style.setProperty('max-width', '100%', 'important');
      container.style.setProperty('height', '100%', 'important');
      container.style.setProperty('max-height', '100%', 'important');
      container.style.setProperty('display', 'flex', 'important');
      container.style.setProperty('flex-direction', 'column', 'important');
      container.style.setProperty('overflow', 'hidden', 'important');
    }

    if (host) {
      host.style.setProperty('flex', '1 1 auto', 'important');
      host.style.setProperty('min-height', '0', 'important');
      host.style.setProperty('display', 'flex', 'important');
      host.style.setProperty('flex-direction', 'column', 'important');
      host.style.setProperty('width', '100%', 'important');
    }
  };

  dialogRef.afterOpened().subscribe(apply);
  setTimeout(apply, 0);
}
