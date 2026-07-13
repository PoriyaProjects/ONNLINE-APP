import { MatDialogRef } from '@angular/material/dialog';

export const SURGERIES_DIALOG_PANEL_CLASS = 'surgeries-management-panel';
export const SURGERY_DIALOG_PANEL_CLASS = 'surgery-dialog-panel';
export const SURGERY_ROOMS_MENU_PANEL_CLASS = 'surgery-rooms-menu-panel';
export const SURGERY_SELECT_PANEL_CLASS = 'surgery-select-panel';
export const SURGERY_SELECT_PANEL_WIDE_CLASS = [
  SURGERY_SELECT_PANEL_CLASS,
  'surgery-select-panel--wide',
];
export const SURGERY_ROOM_FILTER_MENU_CLASS = 'surgery-room-filter-menu';
export const SURGERY_SUMMARY_DIALOG_PANEL_CLASS = 'surgery-summary-dialog-panel';
export const SURGERY_WAITING_REC_DIALOG_PANEL_CLASS = 'surgery-waiting-rec-dialog-panel';
export const SURGERY_SHARE_PDF_DIALOG_PANEL_CLASS = 'surgery-share-pdf-dialog-panel';

const SURGERIES_DIALOG_WIDTH = '95vw';
const SURGERIES_DIALOG_HEIGHT = '95vh';
const SURGERY_DIALOG_WIDTH = '95vw';
const SURGERY_DIALOG_HEIGHT = '95vh';
const SURGERY_ROOMS_MENU_DIALOG_WIDTH = 'min(96vw, 1180px)';
const SURGERY_ROOMS_MENU_DIALOG_HEIGHT = 'min(92vh, 880px)';

type DialogInternals = {
  _overlayRef?: { overlayElement: HTMLElement };
  _containerInstance?: { _elementRef: { nativeElement: HTMLElement } };
};

function getDialogElements<T>(
  dialogRef: MatDialogRef<T>,
  hostSelector: string
): { container: HTMLElement | null; pane: HTMLElement | null; host: HTMLElement | null } {
  const dialog = dialogRef as unknown as DialogInternals;
  const container =
    dialog._containerInstance?._elementRef?.nativeElement ??
    (document.getElementById(dialogRef.id) as HTMLElement | null);
  const pane =
    dialog._overlayRef?.overlayElement ??
    (container?.closest('.cdk-overlay-pane') as HTMLElement | null);
  const host =
    (container?.querySelector(hostSelector) as HTMLElement | null) ??
    (container?.firstElementChild as HTMLElement | null);

  return { container, pane, host };
}

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

export function applySurgeryRoomsMenuDialogSize<T>(dialogRef: MatDialogRef<T>): void {
  applyDialogSize(
    dialogRef,
    SURGERY_ROOMS_MENU_PANEL_CLASS,
    SURGERY_ROOMS_MENU_DIALOG_WIDTH,
    SURGERY_ROOMS_MENU_DIALOG_HEIGHT,
    'app-surgery-rooms-menu'
  );
}

function applyDialogSize<T>(
  dialogRef: MatDialogRef<T>,
  panelClass: string,
  width: string,
  height: string,
  hostSelector: string
): void {
  const apply = () => {
    dialogRef.addPanelClass(panelClass);
    dialogRef.updateSize(width, height);

    const { container, pane, host } = getDialogElements(dialogRef, hostSelector);

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
