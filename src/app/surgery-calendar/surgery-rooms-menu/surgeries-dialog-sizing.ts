import { MatDialogRef } from '@angular/material/dialog';

export const SURGERIES_DIALOG_PANEL_CLASS = 'surgeries-management-panel';

const SURGERIES_DIALOG_WIDTH = '95vw';
const SURGERIES_DIALOG_HEIGHT = '95vh';

type DialogRefWithInternals<T> = MatDialogRef<T> & {
  _overlayRef?: { overlayElement: HTMLElement };
  _containerInstance?: { _elementRef: { nativeElement: HTMLElement } };
};

function setPaneSize(pane: HTMLElement): void {
  pane.style.setProperty('width', SURGERIES_DIALOG_WIDTH, 'important');
  pane.style.setProperty('min-width', SURGERIES_DIALOG_WIDTH, 'important');
  pane.style.setProperty('max-width', SURGERIES_DIALOG_WIDTH, 'important');
  pane.style.setProperty('height', SURGERIES_DIALOG_HEIGHT, 'important');
  pane.style.setProperty('min-height', SURGERIES_DIALOG_HEIGHT, 'important');
  pane.style.setProperty('max-height', SURGERIES_DIALOG_HEIGHT, 'important');
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
  const dialog = dialogRef as DialogRefWithInternals<T>;

  const apply = () => {
    dialogRef.addPanelClass(SURGERIES_DIALOG_PANEL_CLASS);
    dialogRef.updateSize(SURGERIES_DIALOG_WIDTH, SURGERIES_DIALOG_HEIGHT);

    const container =
      dialog._containerInstance?._elementRef.nativeElement ??
      (document.getElementById(dialogRef.id) as HTMLElement | null);
    const pane =
      dialog._overlayRef?.overlayElement ??
      (container?.closest('.cdk-overlay-pane') as HTMLElement | null);
    const host =
      (container?.querySelector('app-surgeries-management') as HTMLElement | null) ??
      (container?.firstElementChild as HTMLElement | null);

    if (pane) {
      setPaneSize(pane);
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
