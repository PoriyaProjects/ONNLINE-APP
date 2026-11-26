import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface InquiryDetailRow {
  Date: string;
  Type: string;
  Summary: string;
  Status: string;
}

@Component({
  selector: 'app-inquiry-details-dialog',
  templateUrl: './inquiry-details-dialog.component.html',
  styleUrls: ['./inquiry-details-dialog.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class InquiryDetailsDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<InquiryDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { quarter: number; rows: InquiryDetailRow[]; sourcePending: boolean }
  ) { }

  close(): void {
    this.dialogRef.close();
  }
}
