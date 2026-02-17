import { Component, Inject, OnInit, Optional } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { SupportRequestService } from '../commercial-support.service';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';


@Component({
  selector: 'app-commercial-support-research-dialog',
  templateUrl: './commercial-support-research-dialog.component.html',
  styleUrls: ['./commercial-support-research-dialog.component.css']
})
export class CommercialSupportResearchDialogComponent implements OnInit {

  horizontalPosition: MatSnackBarHorizontalPosition = "start";
  verticalPosition: MatSnackBarVerticalPosition = "bottom";
  ResearchRequestDto!: FormGroup;
  allCompanies: string[] = ['אבוט', 'אלי לילי', 'אסטרזניקה', 'באייר', 'גד מדיקל', 'גטר גרופ', 'גי-סי הלת"קר בע"מ', 'גמידה', 'טבע', 'טרימקו', 'כמיטק', 'לבנט', 'לברון', 'מדטכניקה', 'מדטרוניק', 'מדיסון פארמה'
    , 'נובו נורדיסק', 'נאופארם', 'עמוס גזית', 'פייזר', 'צמל', 'רוש', 'רפיד מדיקל', 'ש.שיווק כל מיליניום', 'Abbott', 'Baxter', 'Boehringer Ingelheim', 'Boston Scientific', 'Cook', 'Ferring Pharmaceuticals', 'MSD'];
  filteredCompanies: string[] = [];
  decision_making: boolean = false;
  UserName = localStorage.getItem("loginUserName").toLowerCase();
  date_now = new Date();

  constructor(
    private fb: FormBuilder,
    private _snackBar: MatSnackBar,
    public dialog: MatDialog,
    private supportRequestsService: SupportRequestService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<CommercialSupportResearchDialogComponent>
  ) { }

  ngOnInit(): void {
    this.getResearchRequestById();
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

  buildForm(data) {
    this.ResearchRequestDto = this.fb.group({
      Id: new FormControl(data?.Id, null),
      RequesterID: new FormControl(data?.RequesterID, Validators.required),
      Requester: new FormControl(data?.Requester, Validators.required),
      RequesterDetails: new FormControl(data?.RequesterDetails, null),
      ResearchNumber: new FormControl(data?.ResearchNumber, Validators.required),
      ResearchName: new FormControl(data?.ResearchName, Validators.required),
      CompanyName: new FormControl(data?.CompanyName, Validators.required),
      BudgetProposal: new FormControl(data?.BudgetProposal, null),
      EconomicAppendix: new FormControl(data?.EconomicAppendix, null),
      Form6: new FormControl(data?.Form6, null),
      Approved: new FormControl(data?.Approved, null),
      DecisionDate: new FormControl(data?.DecisionDate, null),
      Note: new FormControl(data?.Note, null)
    });
    this.ResearchRequestDto.get('CompanyName').valueChanges.subscribe(value => {
      this.filteredCompanies = this._filterCompanies(value || '');
    });
    this.decision_making = data?.RequesterID != undefined && (this.UserName == 'okatz' || this.UserName == 'adahabre') ? true : false;
  }

  getEmployeeDetails() {
    let id = this.ResearchRequestDto.value.RequesterID;
    this.supportRequestsService.getEmployeeDetails(id).subscribe({
      next: (res) => {
        let patient = res['d'][0];
        if (patient == undefined) return;
        else if (patient.EmployeeID != null) {
          this.ResearchRequestDto.controls['Requester'].setValue(patient.FirstName + ' ' + patient.LastName);
          this.ResearchRequestDto.controls['RequesterDetails'].setValue(patient.RankDescription + ', ' + patient.DepartnentDescripton);
          this.decision_making = this.UserName == 'okatz' || this.UserName == 'adahabre' ? true : false;
        }
      },
      error: (err) => {
        console.error('שגיאה בפרטי עובד:', err);
        alert('אירעה שגיאה בפרטי עובד');
      }
    });
  }

  getResearchRequestById() {
    this.supportRequestsService.getResearchRequestById(this.data == null ? '0' : this.data.Id).subscribe({
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
    if (true) {
      this.supportRequestsService.saveResearchRequest(this.ResearchRequestDto.getRawValue(), type).subscribe({
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
        this.ResearchRequestDto.get(field)?.setValue(base64);
      };

      reader.onerror = (error) => {
        console.error('Error reading file:', error);
      };

      reader.readAsDataURL(file); // Converts file to base64
    }
  }

  file_in_new_window_base64() {
    const base64String = this.ResearchRequestDto.get('BudgetProposal')?.value;
    if (base64String) {
      this.openFile(base64String);
    } else {
      console.error('No file available to open');
    }
  }
  file_in_new_window_base64_2() {
    const base64String = this.ResearchRequestDto.get('EconomicAppendix')?.value;
    if (base64String) {
      this.openFile(base64String);
    } else {
      console.error('No file available to open');
    }
  }
  file_in_new_window_base64_3() {
    const base64String = this.ResearchRequestDto.get('Form6')?.value;
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
