import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-commercial-support-protocol-dialog',
  templateUrl: './commercial-support-protocol-dialog.component.html',
  styleUrls: ['./commercial-support-protocol-dialog.component.css']
})
export class CommercialSupportProtocolDialogComponent {
  selectedPeople: any[] = [];
  ProtocolDate: any = null;
  selectedMeeting: any = null;
  peopleList: any[] = [];
  savedMeetings: any[] = [];
  manualName = '';
  manualRole = '';

  constructor(
    public dialogRef: MatDialogRef<CommercialSupportProtocolDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.peopleList = (data?.peopleList || []).map(p => ({ ...p }));
    this.savedMeetings = data?.savedMeetings || [];
    if (data?.ProtocolDate) {
      this.ProtocolDate = data.ProtocolDate;
    }
  }

  meetingLabel(meeting: any): string {
    return meeting.ProtocolDate;
  }

  addManualPerson(): void {
    const name = (this.manualName || '').trim();
    if (!name) {
      return;
    }
    const person = {
      Full_Name: name,
      Role: (this.manualRole || '').trim(),
      IsManual: true
    };
    this.peopleList = [...this.peopleList, person];
    this.selectedPeople = [...this.selectedPeople, person];
    this.manualName = '';
    this.manualRole = '';
  }

  save(): void {
    if (!this.ProtocolDate || !this.selectedPeople?.length) {
      return;
    }
    this.dialogRef.close({
      action: 'save',
      people: this.selectedPeople,
      ProtocolDate: this.ProtocolDate
    });
  }

  reprint(): void {
    if (!this.selectedMeeting) {
      return;
    }
    this.dialogRef.close({
      action: 'reprint',
      ProtocolDate: this.selectedMeeting.ProtocolDate
    });
  }
}
