import { Component, Inject, OnInit, Optional } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { SupportRequestService } from '../commercial-support.service';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-commercial-support-gathering',
  templateUrl: './commercial-support-gathering.component.html',
  styleUrls: ['./commercial-support-gathering.component.css']
})
export class CommercialSupportGatheringComponent implements OnInit {

  horizontalPosition: MatSnackBarHorizontalPosition = "start";
  verticalPosition: MatSnackBarVerticalPosition = "bottom";
  GatheringRequestDto!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private _snackBar: MatSnackBar,
    public dialog: MatDialog,
    private supportRequestsService: SupportRequestService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<CommercialSupportGatheringComponent>
  ) { }

  ngOnInit(): void {
    this.getGatheringRequestById();
  }

  buildForm(data) {
    this.GatheringRequestDto = this.fb.group({
      Id: new FormControl(data?.Id, null),
      RequesterID: new FormControl(data?.RequesterID, Validators.required),
      Requester: new FormControl(data?.Requester, Validators.required),
      RequesterDetails: new FormControl(data?.RequesterDetails, Validators.required),
      GatheringSubject: new FormControl(data?.GatheringSubject, Validators.required),
      GatheringDate: new FormControl(data?.GatheringDate, Validators.required),
      GatheringStartTime: new FormControl(data?.GatheringStartTime, Validators.required),
      GatheringEndTime: new FormControl(data?.GatheringEndTime, Validators.required),
      GatheringLocation: new FormControl(data?.GatheringLocation, null),
      GatheringPlan: new FormControl(data?.GatheringPlan, Validators.required),
      GatheringOutcome: new FormControl(data?.GatheringOutcome, Validators.required),
      GatheringSupport: new FormControl(data?.GatheringSupport, null),
      GatheringInquiries: new FormControl(data?.GatheringInquiries, Validators.required),
    });
  }

  getEmployeeDetails() {
    let id = this.GatheringRequestDto.value.RequesterID;
    this.supportRequestsService.getEmployeeDetails(id).subscribe({
      next: (res) => {
        let patient = res['d'][0];
        if (patient == undefined) return;
        else if (patient.EmployeeID != null) {
          this.GatheringRequestDto.controls['Requester'].setValue(patient.FirstName + ' ' + patient.LastName);
          this.GatheringRequestDto.controls['RequesterDetails'].setValue(patient.RankDescription + ', ' + patient.DepartnentDescripton);
        }
      },
      error: (err) => {
        console.error('שגיאה בפרטי עובד:', err);
        alert('אירעה שגיאה בפרטי עובד');
      }
    });
  }

  getGatheringRequestById() {
    this.supportRequestsService.getGatheringRequestById(this.data == null ? '0' : this.data.Id).subscribe({
      next: (response) => {
        this.buildForm(response['d']);
      },
      error: (error) => {
        console.error('שגיאה בשליפת מידע:', error);
        // אפשר להראות טוסט או דיאלוג שגיאה
      }
    });
  }

  submitForm() {
    if (this.GatheringRequestDto.valid) {
      this.supportRequestsService.saveGatheringRequest(this.GatheringRequestDto.getRawValue()).subscribe({
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

  onFileChange(event: Event, field: string) {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = () => {
        const base64 = reader.result as string;
        // You can store the base64 string in the form
        this.GatheringRequestDto.get(field)?.setValue(base64);
      };

      reader.onerror = (error) => {
        console.error('Error reading file:', error);
      };

      reader.readAsDataURL(file); // Converts file to base64
    }
  }

  file_in_new_window_base64() {
    const base64String = this.GatheringRequestDto.get('GatheringPlan')?.value;
    if (base64String) {
      this.openFile(base64String);
    } else {
      console.error('No file available to open');
    }
  }
  file_in_new_window_base64_2() {
    const base64String = this.GatheringRequestDto.get('GatheringOutcome')?.value;
    if (base64String) {
      this.openFile(base64String);
    } else {
      console.error('No file available to open');
    }
  }
  file_in_new_window_base64_3() {
    const base64String = this.GatheringRequestDto.get('GatheringSupport')?.value;
    if (base64String) {
      this.openFile(base64String);
    } else {
      console.error('No file available to open');
    }
  }
  file_in_new_window_base64_4() {
    const base64String = this.GatheringRequestDto.get('GatheringInquiries')?.value;
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

  openSnackBar(message) {
    this._snackBar.open(message, "X", {
      duration: 3000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }

  // Handle close button
  onClose() {
    this.dialogRef.close(); // Close the dialog
  }

}
