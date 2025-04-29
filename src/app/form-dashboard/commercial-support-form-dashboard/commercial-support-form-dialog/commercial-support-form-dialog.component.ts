import { Component, Inject, OnInit, Optional } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { MatTableDataSource } from '@angular/material/table';
import { SupportRequestService } from '../commercial-support.service';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-commercial-support-form-dialog',
  templateUrl: './commercial-support-form-dialog.component.html',
  styleUrls: ['./commercial-support-form-dialog.component.css'],
  animations: [
    trigger('expandCollapse', [
      state('void', style({ height: '0', opacity: 0, overflow: 'hidden' })),
      state('*', style({ height: '*', opacity: 1, overflow: 'hidden' })),
      transition('void <=> *', [
        animate('300ms ease-in-out')
      ]),
    ])
  ]
})
export class CommercialSupportFormDialogComponent {

  displayedColumnsManagers: string[] = ['first', 'last', 'department'];
  dataSource = new MatTableDataSource([]);

  horizontalPosition: MatSnackBarHorizontalPosition = "start";
  verticalPosition: MatSnackBarVerticalPosition = "bottom";
  SupportRequestDto!: FormGroup;
  // SupportManagerDto!: FormArray;

  SupportActivityDto = [
    { ActivityName: 'רישום', controlName: 'register' },
    { ActivityName: 'לינה', controlName: 'stay' },
    { ActivityName: 'טיסה', controlName: 'flight' }
  ];
  displayedColumns: string[] = ['activity', 'directService', 'indirectHealth'];
  manager: boolean;
  selectedIndirectHealth: { [index: number]: string } = {};

  constructor(
    private fb: FormBuilder,
    private _snackBar: MatSnackBar,
    private _datePipe: DatePipe,
    private supportRequestsService: SupportRequestService,
    @Optional() @Inject(MAT_DIALOG_DATA) public form_id: any,
    @Optional() private dialogRef: MatDialogRef<CommercialSupportFormDialogComponent>
  ) { }

  ngOnInit(): void {
    this.buildForm();
  }

  openSnackBar(message) {
    this._snackBar.open(message, "X", {
      duration: 3000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }

  buildForm() {
    this.SupportRequestDto = this.fb.group({
      Requester: [''],
      CompanySupport: [''],
      Other: [''],
      ConferenceName: [''],
      EventDate: [''],
      EventEndDate: [''],
      Location: [''],
      JoinPerson: [''],
      Position: [''],
      SupportAmount: [''],
      AmountIncludesTax: [false],
      SupportManagerDto: this.fb.array([
        this.createRow(),
        this.createRow()
      ])
    });

    // מוסיף לכל פעילות שדות דינמיים בטופס
    this.SupportActivityDto.forEach(activity => {
      this.SupportRequestDto.addControl(activity.controlName + '_directService', new FormControl(''));
      this.SupportRequestDto.addControl(activity.controlName + '_indirectHealth', new FormControl(''));
      this.SupportRequestDto.addControl(activity.controlName + '_extraOptions', new FormControl(''));
    });

  }

  // Create a new form group for each row
  createRow(): FormGroup {
    return this.fb.group({
      FirstName: ['', null],
      LastName: ['', null],
      Department: ['', null]
    });
  }

  // Handle close button
  onClose() {
    this.dialogRef.close(); // Close the dialog
  }

  onIndirectHealthChange(value: string, index: number) {
    this.selectedIndirectHealth[index] = value;
  }

  getSupportRequestsByID() {
    this.supportRequestsService.saveSupportRequest(this.form_id).subscribe({
      next: (response) => {

        // פה תוכל להציג הודעת הצלחה או לעדכן את המסך
      },
      error: (error) => {
        console.error('שגיאה בשליפת מידע:', error);
        // אפשר להראות טוסט או דיאלוג שגיאה
      }
    });
  }

  submitForm() {
    this.SupportRequestDto.controls['EventDate'].setValue(this._datePipe.transform(this.SupportRequestDto.value.EventDate, 'yyyy-MM-dd'));
    this.SupportRequestDto.controls['EventEndDate'].setValue(this._datePipe.transform(this.SupportRequestDto.value.EventEndDate, 'yyyy-MM-dd'));
    this.supportRequestsService.saveSupportRequest(this.SupportRequestDto.getRawValue()).subscribe({
      next: (response) => {
        if (response['d']) {
          this.openSnackBar("נשמר בהצלחה");
          this.dialogRef.close(true);
        } else {
          this.openSnackBar("תקלה!");
        }
        // פה תוכל להציג הודעת הצלחה או לעדכן את המסך
      },
      error: (error) => {
        console.error('שגיאה בשמירת הבקשה:', error);
        // אפשר להראות טוסט או דיאלוג שגיאה
      }
    });
  }

}
