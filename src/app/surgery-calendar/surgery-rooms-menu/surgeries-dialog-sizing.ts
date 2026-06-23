import { MatDialogRef } from '@angular/material/dialog';

export const SURGERIES_DIALOG_PANEL_CLASS = 'surgeries-management-panel';
export const SURGERY_DIALOG_PANEL_CLASS = 'surgery-dialog-panel';

const SURGERIES_DIALOG_WIDTH = '95vw';
const SURGERIES_DIALOG_HEIGHT = '95vh';
const SURGERY_DIALOG_WIDTH = '95vw';
const SURGERY_DIALOG_HEIGHT = '95vh';

type DialogRefWithInternals<T> = MatDialogRef<T> & {
  _overlayRef?: { overlayElement: HTMLElement };
  _containerInstance?: { _elementRef: { nativeElement: HTMLElement } };
};

function setContainerSize(container: HTMLElement, host: HTMLElement | null): void {
  container.style.setProperty('width', '100%', 'important');
  container.style.setProperty('max-width', '100%', 'important');
  container.style.setProperty('height', '100%', 'important');
  container.style.setProperty('max-height', '100%', 'important');
  container.style.setProperty('display', 'flex', 'important');
  container.style.setProperty('flex-direction', 'column', 'important');
  container.style.setProperty('overflow', 'hidden', 'important');

  if (!host) {
    return;
  }

  host.style.setProperty('flex', '1 1 auto', 'important');
  host.style.setProperty('min-height', '0', 'important');
  host.style.setProperty('display', 'flex', 'important');
  host.style.setProperty('flex-direction', 'column', 'important');
  host.style.setProperty('width', '100%', 'important');
}

export function applySurgeriesManagementDialogSize<T>(dialogRef: MatDialogRef<T>): void {
  applyDialogSize(dialogRef, SURGERIES_DIALOG_PANEL_CLASS, SURGERIES_DIALOG_WIDTH, SURGERIES_DIALOG_HEIGHT, 'app-surgeries-management');
}

export function applySurgeryDialogSize<T>(dialogRef: MatDialogRef<T>): void {
  applyDialogSize(dialogRef, SURGERY_DIALOG_PANEL_CLASS, SURGERY_DIALOG_WIDTH, SURGERY_DIALOG_HEIGHT, 'app-manage-single-surgery');
}

function applyDialogSize<T>(
  dialogRef: MatDialogRef<T>,
  panelClass: string,
  width: string,
  height: string,
  hostSelector: string
): void {
  const dialog = dialogRef as DialogRefWithInternals<T>;

  const apply = () => {
    dialogRef.addPanelClass(panelClass);
    dialogRef.updateSize(width, height);

    const container =
      dialog._containerInstance?._elementRef.nativeElement ??
      (document.getElementById(dialogRef.id) as HTMLElement | null);
    const pane =
      dialog._overlayRef?.overlayElement ??
      (container?.closest('.cdk-overlay-pane') as HTMLElement | null);
    const host =
      (container?.querySelector(hostSelector) as HTMLElement | null) ??
      (container?.firstElementChild as HTMLElement | null);

    if (pane) {
      pane.style.setProperty('width', width, 'important');
      pane.style.setProperty('min-width', width, 'important');
      pane.style.setProperty('max-width', width, 'important');
      pane.style.setProperty('height', height, 'important');
      pane.style.setProperty('min-height', height, 'important');
      pane.style.setProperty('max-height', height, 'important');
    }

    if (container) {
      setContainerSize(container, host);
    }
  };

  dialogRef.afterOpened().subscribe(apply);
  setTimeout(apply, 0);
  requestAnimationFrame(() => {
    apply();
    requestAnimationFrame(apply);
  });
}
