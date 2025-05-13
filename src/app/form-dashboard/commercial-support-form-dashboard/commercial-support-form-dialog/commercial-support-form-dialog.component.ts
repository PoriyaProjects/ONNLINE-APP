import { Component, Inject, OnInit, Optional } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { MatTableDataSource } from '@angular/material/table';
import { SupportRequestService } from '../commercial-support.service';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DatePipe } from '@angular/common';
import { environment } from 'src/environments/environment';

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
  supportTypes = [
    { Id: 'Registration', Description: 'רישום' },
    { Id: 'Travel', Description: 'טיסה' },
    { Id: 'Accommodation', Description: 'לינה' },
    { Id: 'Transportation', Description: 'העברות' },
    { Id: 'Other', Description: 'אחר' }
  ];
  displayedColumns: string[] = ['activity', 'directService', 'indirectHealth'];
  manager: boolean;
  selectedIndirectHealth: { [index: number]: string } = {};
  uploadedFiles: { [key: string]: File } = {};

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

  onFileChange(event: Event, field: string) {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = () => {
        const base64 = reader.result as string;
        // You can store the base64 string in the form
        this.SupportRequestDto.get(field)?.setValue(base64);
      };

      reader.onerror = (error) => {
        console.error('Error reading file:', error);
      };

      reader.readAsDataURL(file); // Converts file to base64
    }
  }

  buildForm() {
    this.SupportRequestDto = this.fb.group({
      RequesterID: new FormControl('', null),
      Requester: new FormControl('', null),
      RequesterDetails: new FormControl('', null),
      CompanySupport: new FormControl('', null),
      ConferenceName: new FormControl('', null),
      EventDate: new FormControl('', null),
      EventEndDate: new FormControl('', null),
      Location: new FormControl('', null),
      JoinPerson: new FormControl('', null),
      Position: new FormControl('', null),
      Currency: new FormControl('', null),
      SupportAmount: new FormControl('', null),
      // File fields
      SupportLetter: new FormControl(null),
      ConferenceApproval: new FormControl(null),
      AdditionalDocument: new FormControl(null),
      SupportType: this.fb.array([]),
      AmountIncludesTax: new FormControl(false, null),
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

  onSupportTypeChange(event: any) {
    const selectedIds = event.value;
    const updatedArray = this.fb.array([]);

    selectedIds.forEach(id => {
      const match = this.supportTypes.find(t => t.Id === id);
      if (match) {
        updatedArray.push(this.fb.group({ Id: match.Id, Description: match.Description }));
      }
    });

    this.SupportRequestDto.setControl('SupportType', updatedArray);
  }

  getSelectedSupportTypeIds(): string[] {
    const current = this.supportTypeArray.value as { Id: string; Description: string }[];
    return current.map(item => item.Id);
  }

  get supportTypeArray(): FormArray {
    return this.SupportRequestDto.get('SupportType') as FormArray;
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
      },
      error: (error) => {
        console.error('שגיאה בשמירת הבקשה:', error);
      }
    });
  }

  getEmployeeDetails() {
    let id = this.SupportRequestDto.value.RequesterID;
    this.supportRequestsService.getEmployeeDetails(id).subscribe({
      next: (res) => {
        let patient = res['d'][0];
        if (patient == undefined) return;
        else if (patient.EmployeeID != null) {
          this.SupportRequestDto.controls['Requester'].setValue(patient.FirstName + ' ' + patient.LastName);
          this.SupportRequestDto.controls['RequesterDetails'].setValue(patient.RankDescription + ', ' + patient.DepartnentDescripton);
        }
      },
      error: (err) => {
        console.error('שגיאה בפרטי עובד:', err);
        alert('אירעה שגיאה בפרטי עובד');
      }
    });
  }

}
