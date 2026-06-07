import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { SupportRequestService } from '../commercial-support.service';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DatePipe } from '@angular/common';

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
    private datePipe: DatePipe,
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
    // Map ResearchFiles to form controls by Type (like gathering component)
    const toSingle = (v: any) => (Array.isArray(v) && v.length > 0 ? v[0] : v);
    let budgetProposalFile = toSingle(data?.BudgetProposal) ?? null;
    let economicAppendixFile = toSingle(data?.EconomicAppendix) ?? null;
    let form6File = toSingle(data?.Form6) ?? null;
    let paymentsExcelFile = toSingle(data?.PaymentsExcel) ?? null;

    if (data?.ResearchFiles && Array.isArray(data.ResearchFiles)) {
      data.ResearchFiles.forEach((file: any) => {
        switch (file.Type) {
          case 'BudgetProposal':
            budgetProposalFile = file;
            break;
          case 'EconomicAppendix':
            economicAppendixFile = file;
            break;
          case 'Form6':
            form6File = file;
            break;
          case 'PaymentsExcel':
            paymentsExcelFile = file;
            break;
        }
      });
    }

    this.ResearchRequestDto = this.fb.group({
      Id: new FormControl(data?.Id, null),
      RequesterID: new FormControl(data?.RequesterID, Validators.required),
      Requester: new FormControl(data?.Requester, Validators.required),
      RequesterDetails: new FormControl(data?.RequesterDetails, null),
      ResearchNumber: new FormControl(data?.ResearchNumber, Validators.required),
      ResearchName: new FormControl(data?.ResearchName, Validators.required),
      CompanyName: new FormControl(data?.CompanyName, Validators.required),
      BudgetProposal: new FormControl(budgetProposalFile, Validators.required),
      EconomicAppendix: new FormControl(economicAppendixFile, null),
      Form6: new FormControl(form6File, null),
      PaymentsExcel: new FormControl(paymentsExcelFile, null),
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

  submitForm(type: number) {
    const decisionDate = this.ResearchRequestDto.value.DecisionDate ? this.datePipe.transform(this.ResearchRequestDto.value.DecisionDate, 'yyyy-MM-dd') : null;

    const formData = new FormData();
    const raw = this.ResearchRequestDto.getRawValue();

    formData.set('DecisionDate', decisionDate || '');
    formData.set('Draft', type.toString());

    const fileFields = ['BudgetProposal', 'EconomicAppendix', 'Form6', 'PaymentsExcel'];
    const excludeKeys = ['DecisionDate', ...fileFields];

    Object.keys(raw).forEach(key => {
      if (excludeKeys.includes(key)) return;

      const value = raw[key];
      if (value instanceof File) {
        formData.append(key, value, value.name);
      } else if (value !== null && value !== undefined) {
        formData.append(key, value);
      }
    });

    fileFields.forEach(field => {
      const val = raw[field];
      if (val instanceof File) {
        formData.append(field, val, val.name);
      } else if (val !== null && val !== undefined) {
        formData.append(field, JSON.stringify(val));
      }
    });

    this.supportRequestsService.saveResearchRequestFormData(formData).subscribe({
      next: (response: string) => {
        // response === "OK"
        this.openSnackBar("נשמר בהצלחה");
        this.dialogRef.close(true);
      },
      error: (error) => {
        console.error('שגיאה בשמירת הבקשה:', error);
        this.openSnackBar("שגיאה בשמירה");
      }
    });
  }

  onFileChange(event: Event, field: string) {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) return;

    const originalFile = input.files[0];
    const maxSizeMB = 5;
    if (originalFile.size > maxSizeMB * 1024 * 1024) {
      this.openSnackBar(`הקובץ גדול מ־${maxSizeMB}MB`);
      input.value = '';
      return;
    }

    const extension = originalFile.name.split('.').pop();
    const newFileName = `${field}.${extension}`;
    const renamedFile = new File([originalFile], newFileName, { type: originalFile.type });

    this.ResearchRequestDto.get(field)?.setValue(renamedFile);
  }

  removeFile(field: string, fileInput?: HTMLInputElement) {
    this.ResearchRequestDto.get(field)?.setValue(null);
    if (fileInput) {
      fileInput.value = '';
    }
  }

  getFileUrl(file: any): string {
    if (!file) return '';

    if (file instanceof File) {
      return URL.createObjectURL(file);
    }
    if (typeof file === 'string' && file.startsWith('data:')) return file;
    if (file?.StoredFileName) {
      return `http://srv-ipracticom/RCF_WS/SupportFiles/Uploads/${file.StoredFileName}`;
    }
    return '';
  }

  isImageFile(file: any): boolean {
    if (!file) return false;
    let contentType = '';
    if (file instanceof File) contentType = file.type;
    else if (file?.ContentType) contentType = file.ContentType;
    else if (typeof file === 'string' && file.startsWith('data:')) {
      const match = file.match(/data:(.*?);base64,/);
      contentType = match ? match[1] : '';
    }
    return contentType.startsWith('image/');
  }

  getFileName(file: any): string {
    if (!file) return '';
    if (file instanceof File) return file.name;
    if (file?.OriginalFileName) return file.OriginalFileName;
    return '';
  }

  viewResearchFile(fileControlName: string) {
    const file = this.ResearchRequestDto.get(fileControlName)?.value;
    if (!file) {
      this.openSnackBar('לא נמצא קובץ');
      return;
    }
    const fileUrl = this.getFileUrl(file);
    if (fileUrl) {
      if (this.isImageFile(file)) {
        window.open(fileUrl, '_blank');
      } else {
        if (typeof file === 'string' && file.startsWith('data:')) {
          this.openFile(file);
        } else {
          window.open(fileUrl, '_blank');
        }
      }
    } else if (typeof file === 'object' && file?.Base64Content) {
      this.openFile(file.Base64Content);
    } else {
      this.openSnackBar('לא ניתן לפתוח את הקובץ');
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
