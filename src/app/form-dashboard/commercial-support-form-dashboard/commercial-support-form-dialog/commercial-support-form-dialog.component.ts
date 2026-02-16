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
  supportTypes = [
    { Id: null, Description: 'רישום' },
    { Id: null, Description: 'טיסה' },
    { Id: null, Description: 'לינה' },
    { Id: null, Description: 'העברות' },
    { Id: null, Description: 'אחר' }
  ];
  allCompanies: string[] = ['אבוט', 'אלי לילי', 'אסטרזניקה', 'באייר', 'גד מדיקל', 'גטר גרופ', 'גי-סי הלת"קר בע"מ', 'גמידה', 'טבע', 'טרימקו', 'כמיטק', 'לבנט', 'לברון', 'מדטכניקה', 'מדטרוניק', 'מדיסון פארמה'
    , 'נובו נורדיסק', 'נאופארם', 'עמוס גזית', 'פייזר', 'צמל', 'רוש', 'רפיד מדיקל', 'ש.שיווק כל מיליניום', 'Abbott', 'Baxter', 'Boehringer Ingelheim', 'Boston Scientific', 'Cook', 'Ferring Pharmaceuticals', 'MSD'];
  filteredCompanies: string[] = [];
  displayedColumns: string[] = ['activity', 'directService', 'indirectHealth'];
  manager: boolean;
  selectedIndirectHealth: { [index: number]: string } = {};
  uploadedFiles: { [key: string]: File } = {};
  decision_making: boolean = false;
  UserName = localStorage.getItem("loginUserName").toLowerCase();
  date_now = new Date();

  constructor(
    private fb: FormBuilder,
    private _snackBar: MatSnackBar,
    private _datePipe: DatePipe,
    private supportRequestsService: SupportRequestService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<CommercialSupportFormDialogComponent>
  ) { }

  ngOnInit(): void {
    // this.buildForm(null);
    this.getSupportRequestsByID();
  }

  private _filterCompanies(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.allCompanies.filter(company =>
      company.toLowerCase().includes(filterValue)
    );
  }

  // Optional: handle user selection
  onCompanySelected(value: string) {
    console.log('Selected company:', value);
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
    const maxSize = 2 * 1024 * 1024; // 1MB (1,024,000 bytes)

    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      const base64Files: any[] = this.SupportRequestDto.get(field)?.value;

      let loadedCount = 0;

      files.forEach(file => {
        if (file.size > maxSize) {
          alert("הקובץ גדול מדי! יש להעלות קובץ עד 2MB.\nשם הקובץ: " + file.name);
          input.value = ""; // Clear file input
          return;
        }
        const reader = new FileReader();

        reader.onload = () => {
          base64Files.push({
            FileName: file.name,
            FileType: file.type,
            Base64Content: reader.result as string
          });

          loadedCount++;

          // Once all files are loaded
          if (loadedCount === files.length) {
            this.SupportRequestDto.get(field)?.setValue(base64Files);
          }
        };

        reader.onerror = (error) => {
          console.error('Error reading file:', error);
        };

        reader.readAsDataURL(file);
      });
    }
  }

  buildForm(data) {
    const supportTypeArray = this.fb.array([]);
    if (data?.SupportType?.length) {
      data.SupportType.forEach((item: any) => {
        supportTypeArray.push(this.fb.group({
          Id: item.Id,
          Code: item.Code,
          Description: item.Description
        }));
      });
    }
    this.SupportRequestDto = this.fb.group({
      Id: new FormControl(data?.Id, null),
      RequesterID: new FormControl(data?.RequesterID, Validators.required),
      Requester: new FormControl(data?.Requester, Validators.required),
      RequesterDetails: new FormControl(data?.RequesterDetails, null),
      CompanySupport: new FormControl(data?.CompanySupport, null),
      ConferenceName: new FormControl(data?.ConferenceName, null),
      EventDate: new FormControl(data?.EventDate, null),
      EventEndDate: new FormControl(data?.EventEndDate, null),
      Location: new FormControl(data?.Location, null),
      JoinPerson: new FormControl(data?.JoinPerson, null),
      Position: new FormControl(data?.Position, null),
      Currency: new FormControl(data?.Currency, null),
      SupportAmount: new FormControl(data?.SupportAmount, null),
      SupportAmountOther: new FormControl(data?.SupportAmountOther, null),
      flight_directService: new FormControl(data?.flight_directService, null),
      flight_extraOptions: new FormControl(data?.flight_extraOptions, null),
      flight_indirectHealth: new FormControl(data?.flight_indirectHealth, null),
      register_directService: new FormControl(data?.register_directService, null),
      register_extraOptions: new FormControl(data?.register_extraOptions, null),
      register_indirectHealth: new FormControl(data?.register_indirectHealth, null),
      stay_directService: new FormControl(data?.stay_directService, null),
      stay_extraOptions: new FormControl(data?.stay_extraOptions, null),
      stay_indirectHealth: new FormControl(data?.stay_indirectHealth, null),
      // File fields
      SupportLetter: new FormControl(data?.SupportLetter, Validators.required),
      SupportLetter2: new FormControl(data?.SupportLetter2, null),
      ConferenceApproval: new FormControl(data?.ConferenceApproval, Validators.required),
      AdditionalDocument: new FormControl(data?.AdditionalDocument, null),
      SupportType: supportTypeArray,
      AmountIncludesTax: new FormControl(data?.AmountIncludesTax == null ? false : data?.AmountIncludesTax, null),
      SupportManagerDto: this.fb.array([
        this.createRow(),
        this.createRow()
      ]),
      Approved: new FormControl(data?.Approved, null),
      DecisionDate: new FormControl(data?.DecisionDate, null),
      Note: new FormControl(data?.Note, null)
    });
    // מוסיף לכל פעילות שדות דינמיים בטופס
    this.SupportActivityDto.forEach((activity, index) => {
      this.SupportRequestDto.addControl(activity.controlName + '_directService', new FormControl(''));
      this.SupportRequestDto.addControl(activity.controlName + '_indirectHealth', new FormControl(''));
      this.SupportRequestDto.addControl(activity.controlName + '_extraOptions', new FormControl(''));
      this.onIndirectHealthChange(this.SupportRequestDto.value[activity.controlName + '_indirectHealth'], index);
    });
    this.SupportRequestDto.get('CompanySupport').valueChanges.subscribe(value => {
      this.filteredCompanies = this._filterCompanies(value || '');
    });
    this.decision_making = data?.RequesterID != undefined && (this.UserName == 'okatz' || this.UserName == 'adahabre') ? true : false;
  }

  onSupportTypeChange(event: any) {
    const selectedIds: string[] = event.value;
    if (selectedIds.includes('אחר')) {
      this.SupportRequestDto.controls['SupportAmountOther'].setValue('');
    }else{
      this.SupportRequestDto.controls['SupportAmountOther'].setValue(null);
    }
    const formArray = this.SupportRequestDto.get('SupportType') as FormArray;

    // Clear only removed items
    for (let i = formArray.length - 1; i >= 0; i--) {
      const control = formArray.at(i);
      if (!selectedIds.includes(control.value.Description)) {
        formArray.removeAt(i);
      }
    }

    // Add new items (only if not already in array)
    selectedIds.forEach(Description => {
      const alreadyExists = formArray.controls.some(c => c.value.Description === Description);
      if (!alreadyExists) {
        const match = this.supportTypes.find(t => t.Description === Description);
        if (match) {
          formArray.push(this.fb.group({ Id: null, Description: match.Description }));
        }
      }
    });
  }

  getSelectedSupportTypeIds(): string[] {
    return this.supportTypeArray.value.map((item: any) => item.Description);
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
    if (value == "no") {
      this.SupportRequestDto.controls[this.SupportActivityDto[index].controlName + '_extraOptions'].setValue(value);
    }
  }

  getSupportRequestsByID() {
    this.supportRequestsService.getSupportRequestsByID(this.data == null ? '0' : this.data.Id).subscribe({
      next: (response) => {
        this.buildForm(response['d']);
      },
      error: (error) => {
        console.error('שגיאה בשליפת מידע:', error);
        // אפשר להראות טוסט או דיאלוג שגיאה
      }
    });
  }

  submitForm(type) {
    this.SupportRequestDto.controls['EventDate'].setValue(this._datePipe.transform(this.SupportRequestDto.value.EventDate, 'yyyy-MM-dd'));
    this.SupportRequestDto.controls['EventEndDate'].setValue(this._datePipe.transform(this.SupportRequestDto.value.EventEndDate, 'yyyy-MM-dd'));
    if (true) {
      this.supportRequestsService.saveSupportRequest(this.SupportRequestDto.getRawValue(), type).subscribe({
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
    } else {
      this.openSnackBar("שכחת שדות חובה");
    }
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
          this.decision_making = this.UserName == 'okatz' || this.UserName == 'adahabre' ? true : false;
        }
      },
      error: (err) => {
        console.error('שגיאה בפרטי עובד:', err);
        alert('אירעה שגיאה בפרטי עובד');
      }
    });
  }

  file_in_new_window_base64(file) {
    if (file.Base64Content) {
      this.openFile(file.Base64Content);
    } else {
      console.error('No file available to open');
    }
  }
  file_in_new_window_base64_2() {
    const base64String = this.SupportRequestDto.get('ConferenceApproval')?.value;
    if (base64String) {
      this.openFile(base64String);
    } else {
      console.error('No file available to open');
    }
  }
  file_in_new_window_base64_3() {
    const base64String = this.SupportRequestDto.get('AdditionalDocument')?.value;
    if (base64String) {
      this.openFile(base64String);
    } else {
      console.error('No file available to open');
    }
  }
  file_in_new_window_base64_1_2() {
    const base64String = this.SupportRequestDto.get('SupportLetter2')?.value;
    if (base64String) {
      this.openFile(base64String);
    } else {
      console.error('No file available to open');
    }
  }

  openFile(base64String: string) {
    // Extract the MIME type from the Base64 string
    const mimeType = base64String.match(/data:(.*?);base64,/)?.[1] || 'application/octet-stream';

    // Create a new window and write the file data
    const fileWindow = window.open();
    if (fileWindow) {
      fileWindow.document.write(
        `<iframe src="${base64String}" frameborder="0" style="width:100%;height:100%;"></iframe>`
      );
    } else {
      console.error('Unable to open a new window');
    }
  }

}
