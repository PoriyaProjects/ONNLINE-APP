import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-waiting-recommendation-dialog',
  templateUrl: './waiting-recommendation-dialog.html',
  styleUrls: ['../styles/components/waiting-recommendation-dialog.css'],
})
export class WaitingRecommendationDialogComponent {
  event: any;
  procedureSummary = '—';
  reasons: string[] = [];
  procedureRows: Array<{
    code: string;
    name: string;
    depart: string;
    side: string;
    catalog: string;
    bloodUnit: string;
  }> = [];
  roomSurgeries: Array<{
    caseNumber: string;
    patientName: string;
    department: string;
    startTime: string;
    endTime: string;
  }> = [];

  constructor(
    private dialogRef: MatDialogRef<WaitingRecommendationDialogComponent>,
    private _snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    this.event = data?.event ?? {};
    this.procedureSummary = this.event?.waitingProceduresSummary ?? '—';
    this.procedureRows = (this.event?.waitingProcedures ?? []).map((procedure: any) => ({
      code: String(procedure?.Surgery_Code ?? procedure?.SurgeryCode ?? '').trim(),
      name: String(procedure?.Surgery_Name ?? procedure?.SurgeryName ?? '').trim(),
      depart: String(procedure?.Depart ?? '').trim(),
      side: String(procedure?.Side ?? '').trim(),
      catalog: String(procedure?.Catalog ?? '').trim(),
      bloodUnit: String(procedure?.BloodUnit ?? '').trim(),
    }));
    this.reasons = (this.event?.waitingReasons ?? [])
      .filter((reason: string) => !/^המתנה \d+ ימים$/.test(String(reason ?? '').trim()));
    this.roomSurgeries = this.event?.waitingRoomSurgeries ?? [];
  }

  close(): void {
    this.dialogRef.close();
  }

  copySapLookupLine(): void {
    const caseNumber = this.event?.SurgeryPatientDetails?.PM_CASE_NUMBER ?? '';
    const requestId = this.event?.RequestID ?? '';
    const primaryProcedure = this.procedureRows[0];
    const line = [
      `CaseNumber: ${caseNumber}`,
      `RequestID: ${requestId}`,
      primaryProcedure?.code ? `SurgeryCode: ${primaryProcedure.code}` : '',
      primaryProcedure?.name ? `SurgeryName: ${primaryProcedure.name}` : '',
      this.event?.waitingOperatingDepartment ? `Department: ${this.event.waitingOperatingDepartment}` : '',
      this.event?.waitingRequestDate ? `RequestDate: ${this.event.waitingRequestDate}` : '',
      this.event?.waitingDays != null ? `WaitingDays: ${this.event.waitingDays}` : '',
    ].filter(Boolean).join(' | ');
    this.copyText(line);
    this._snackBar.open('שורת זיהוי הועתקה ללוח', 'X', { duration: 2500 });
  }

  private copyText(value: string): void {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(value).catch(() => this.fallbackCopy(value));
      return;
    }
    this.fallbackCopy(value);
  }

  private fallbackCopy(value: string): void {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}
