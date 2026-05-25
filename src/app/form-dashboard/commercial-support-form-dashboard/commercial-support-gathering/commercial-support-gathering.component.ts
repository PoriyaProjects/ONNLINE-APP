import { Component, Inject, OnInit, Optional } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { SupportRequestService } from '../commercial-support.service';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DatePipe } from '@angular/common';
import { DialogContentExampleDialog } from "../../../fill-survey/fill-survey.component";

@Component({
  selector: 'app-commercial-support-gathering',
  templateUrl: './commercial-support-gathering.component.html',
  styleUrls: ['./commercial-support-gathering.component.css']
})
export class CommercialSupportGatheringComponent implements OnInit {

  horizontalPosition: MatSnackBarHorizontalPosition = "start";
  verticalPosition: MatSnackBarVerticalPosition = "bottom";
  GatheringRequestDto!: FormGroup;
  decision_making: boolean = false;
  UserName = localStorage.getItem("loginUserName").toLowerCase();
  date_now = new Date();
  supportOptionsSelectControl = new FormControl([]);

  // Options for the multiple select field
  supportOptions = [
    { value: 'financing_refreshments', label: 'מימון כיבוד' },
    { value: 'inviting_lecturer', label: 'הזמנת מרצה' },
    { value: 'gift_participants', label: 'שי למשתתפים' },
    { value: 'poster_preparation', label: 'הכנת פוסטר' },
    { value: 'ordering_flowers', label: 'הזמנת פרחים' },
    { value: 'other', label: 'אחר' },
    { value: 'other2', label: 'אחר 2' }
  ];

  constructor(
    private fb: FormBuilder,
    private _snackBar: MatSnackBar,
    private datePipe: DatePipe,
    public dialog: MatDialog,
    private supportRequestsService: SupportRequestService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<CommercialSupportGatheringComponent>
  ) { }

  ngOnInit(): void {
    this.getGatheringRequestById();
  }

  buildForm(data) {
    // Initialize support options FormArray
    const supportOptionsArray = this.fb.array([]);
    const selectedValues: string[] = [];
    if (data?.GatheringRequestSupport && Array.isArray(data.GatheringRequestSupport)) {
      data.GatheringRequestSupport.forEach(option => {
        supportOptionsArray.push(this.createSupportOptionGroup(option));
        if (option.SupportOptionCode) {
          selectedValues.push(option.SupportOptionCode);
        }
      });
    }
    this.supportOptionsSelectControl.setValue(selectedValues);

    // Map GatheringFiles to their respective form controls based on Type
    let gatheringPlanFile = null;
    let gatheringOutcomeFile = null;
    const gatheringSupportFiles: any[] = [];
    const gatheringInquiriesFiles: any[] = [];

    if (data?.GatheringFiles && Array.isArray(data.GatheringFiles)) {
      data.GatheringFiles.forEach(file => {
        switch (file.Type) {
          case 'GatheringPlan':
            gatheringPlanFile = file;
            break;
          case 'GatheringOutcome':
            gatheringOutcomeFile = file;
            break;
          case 'GatheringSupport':
            gatheringSupportFiles.push(file);
            break;
          case 'GatheringInquiries':
            gatheringInquiriesFiles.push(file);
            break;
        }
      });
    }

    this.GatheringRequestDto = this.fb.group({
      Id: new FormControl(data?.Id, null),
      RequesterID: new FormControl(data?.RequesterID, Validators.required),
      Requester: new FormControl(data?.Requester, Validators.required),
      RequesterDetails: new FormControl(data?.RequesterDetails, Validators.required),
      GatheringSubject: new FormControl(data?.GatheringSubject, Validators.required),
      GatheringDate: new FormControl(data?.GatheringDate, Validators.required),
      GatheringEndDate: new FormControl(data?.GatheringEndDate, Validators.required),
      GatheringStartTime: new FormControl(data?.GatheringStartTime, Validators.required),
      GatheringEndTime: new FormControl(data?.GatheringEndTime, Validators.required),
      GatheringLocation: new FormControl(data?.GatheringLocation, null),
      GatheringPlan: new FormControl(gatheringPlanFile, Validators.required),
      GatheringOutcome: new FormControl(gatheringOutcomeFile, Validators.required),
      GatheringSupport: new FormControl(gatheringSupportFiles, null),
      GatheringInquiries: new FormControl(gatheringInquiriesFiles, Validators.required),
      SupportOptions: supportOptionsArray,
      Approved: new FormControl(data?.Approved, null),
      DecisionDate: new FormControl(data?.DecisionDate, null),
      ManagerSign: new FormControl(data?.ManagerSign, null),
      Note: new FormControl(data?.Note, null)
    });
    this.decision_making = data?.RequesterID != undefined && (this.UserName == 'okatz' || this.UserName == 'adahabre') ? true : false;
  }

  createSupportOptionGroup(option?: any): FormGroup {
    return this.fb.group({
      Row_ID: new FormControl(option?.Row_ID || '', null),
      SupportOptionCode: new FormControl(option?.SupportOptionCode || '', Validators.required),
      Note: new FormControl(option?.Note || '', null),
      Amount: new FormControl(option?.Amount || '', null)
    });
  }

  get supportOptionsFormArray(): FormArray {
    return this.GatheringRequestDto.get('SupportOptions') as FormArray;
  }

  getFileUrl(file: any): string {
    if (!file) return '';

    if (file instanceof File) {
      return URL.createObjectURL(file);
    }

    // If file is a base64 string, return it directly
    if (typeof file === 'string' && file.startsWith('data:')) {
      return file;
    }

    // If file is an object with StoredFileName, construct URL
    if (file?.StoredFileName) {
      return `http://srv-ipracticom/RCF_WS/SupportFiles/Uploads/${file.StoredFileName}`;
    }

    return '';
  }

  isImageFile(file: any): boolean {
    if (!file) return false;

    let contentType = '';
    if (file instanceof File) {
      contentType = file.type;
    } else if (file?.ContentType) {
      contentType = file.ContentType;
    } else if (typeof file === 'string' && file.startsWith('data:')) {
      const match = file.match(/data:(.*?);base64,/);
      contentType = match ? match[1] : '';
    }

    return contentType.startsWith('image/');
  }

  getFileName(file: any): string {
    if (!file) return '';

    if (file instanceof File) {
      return file.name;
    }

    if (file?.OriginalFileName) {
      return file.OriginalFileName;
    }

    return '';
  }

  getFilesArray(field: string): any[] {
    if (!this.GatheringRequestDto) {
      return [];
    }
    const value = this.GatheringRequestDto.get(field)?.value;
    if (!value) {
      return [];
    }
    return Array.isArray(value) ? value : [value];
  }

  private isExistingFileRecord(file: any): boolean {
    return !(file instanceof File) && !!file?.ID;
  }

  addSupportOption() {
    this.supportOptionsFormArray.push(this.createSupportOptionGroup());
  }

  removeSupportOption(index: number) {
    this.supportOptionsFormArray.removeAt(index);
    // Sync the FormControl value after removal
    const selectedValues = this.supportOptionsFormArray.value.map(item => item.SupportOptionCode).filter(opt => opt);
    this.supportOptionsSelectControl.setValue(selectedValues, { emitEvent: false });
  }

  onSupportOptionSelected(selectedOptions: string[]) {
    if (!selectedOptions) {
      selectedOptions = [];
    }

    const currentOptions = this.supportOptionsFormArray.value.map(item => item.SupportOptionCode);

    // Remove options that are no longer selected
    for (let i = this.supportOptionsFormArray.length - 1; i >= 0; i--) {
      if (!selectedOptions.includes(this.supportOptionsFormArray.at(i).get('SupportOptionCode').value)) {
        this.removeSupportOption(i);
      }
    }

    // Add new options that were selected
    selectedOptions.forEach(option => {
      if (!currentOptions.includes(option)) {
        const newGroup = this.createSupportOptionGroup({ SupportOptionCode: option });
        this.supportOptionsFormArray.push(newGroup);
      }
    });

    // Sync the FormControl value
    this.supportOptionsSelectControl.setValue(selectedOptions, { emitEvent: false });
  }

  getSelectedSupportOptions(): string[] {
    return this.supportOptionsFormArray.value.map(item => item.SupportOptionCode).filter(opt => opt);
  }

  getOptionLabel(value: string): string {
    const option = this.supportOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  }

  signForm() {
    const dialogRef = this.dialog
      .open(DialogContentExampleDialog, {
        data: { sign: "" },
      })
      .afterClosed()
      .subscribe((data) => {
        //to show the sign in the template
        if (data.sign == "data:image/png;base64,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MACCpYtMgAABAgQMAD9AgAABAgSCAgZAsHSRCRAgQICAAeAHCBAgQIBAUMAACJYuMgECBAgQMAD8AAECBAgQCAoYAMHSRSZAgAABAgaAHyBAgAABAkEBAyBYusgECBAgQMAA8AMECBAgQCAoYAAESxeZAAECBAgYAH6AAAECBAgEBQyAYOkiEyBAgAABA8APECBAgACBoIABECxdZAIECBAgYAD4AQIECBAgEBQwAIKli0yAAAECBAwAP0CAAAECBIICBkCwdJEJECBAgIAB4AcIECBAgEBQwAAIli4yAQIECBAwAPwAAQIECBAIChgAwdJFJkCAAAECBoAfIECAAAECQQEDIFi6yAQIECBAwADwAwQIECBAIChgAARLF5kAAQIECBgAfoAAAQIECAQFDIBg6SITIECAAAEDwA8QIECAAIGggAEQLF1kAgQIECBgAPgBAgQIECAQFDAAgqWLTIAAAQIEDAA/QIAAAQIEggIGQLB0kQkQIECAgAHgBwgQIECAQFDAAAiWLjIBAgQIEDAA/AABAgQIEAgKGADB0kUmQIAAAQIGgB8gQIAAAQJBAQMgWLrIBAgQIEDAAPADBAgQIEAgKGAABEsXmQABAgQIGAB+gAABAgQIBAUMgGDpIhMgQIAAAQPADxAgQIAAgaCAARAsXWQCBAgQIGAA+AECBAgQIBAUMACCpYtMgAABAgQMAD9AgAABAgSCAgZAsHSRCRAgQICAAeAHCBAgQIBAUMAACJYuMgECBAgQMAD8AAECBAgQCAoYAMHSRSZAgAABAgaAHyBAgAABAkEBAyBYusgECBAgQMAA8AMECBAgQCAoYAAESxeZAAECBAgYAH6AAAECBAgEBQyAYOkiEyBAgAABA8APECBAgACBoIABECxdZAIECBAgYAD4AQIECBAgEBQwAIKli0yAAAECBAwAP0CAAAECBIICBkCwdJEJECBAgIAB4AcIECBAgEBQwAAIli4yAQIECBAwAPwAAQIECBAIChgAwdJFJkCAAAECBoAfIECAAAECQQEDIFi6yAQIECBAwADwAwQIECBAIChgAARLF5kAAQIECBgAfoAAAQIECAQFDIBg6SITIECAAAEDwA8QIECAAIGggAEQLF1kAgQIECBgAPgBAgQIECAQFDAAgqWLTIAAAQIEDAA/QIAAAQIEggIGQLB0kQkQIECAgAHgBwgQIECAQFDAAAiWLjIBAgQIEDAA/AABAgQIEAgKGADB0kUmQIAAAQIGgB8gQIAAAQJBAQMgWLrIBAgQIEDAAPADBAgQIEAgKGAABEsXmQABAgQIGAB+gAABAgQIBAUMgGDpIhMgQIAAAQPADxAgQIAAgaCAARAsXWQCBAgQIGAA+AECBAgQIBAUMACCpYtMgAABAgQMAD9AgAABAgSCAgZAsHSRCRAgQICAAeAHCBAgQIBAUMAACJYuMgECBAgQMAD8AAECBAgQCAoYAMHSRSZAgAABAgaAHyBAgAABAkEBAyBYusgECBAgQMAA8AMECBAgQCAoYAAESxeZAAECBAgYAH6AAAECBAgEBQyAYOkiEyBAgAABA8APECBAgACBoIABECxdZAIECBAgYAD4AQIECBAgEBQwAIKli0yAAAECBAwAP0CAAAECBIICBkCwdJEJECBAgIAB4AcIECBAgEBQwAAIli4yAQIECBAwAPwAAQIECBAIChgAwdJFJkCAAAECBoAfIECAAAECQQEDIFi6yAQIECBAwADwAwQIECBAIChgAARLF5kAAQIECBgAfoAAAQIECAQFDIBg6SITIECAAAEDwA8QIECAAIGggAEQLF1kAgQIECBgAPgBAgQIECAQFDAAgqWLTIAAAQIEDAA/QIAAAQIEggIGQLB0kQkQIECAgAHgBwgQIECAQFDAAAiWLjIBAgQIEDAA/AABAgQIEAgKGADB0kUmQIAAAQIGgB8gQIAAAQJBAQMgWLrIBAgQIEDAAPADBAgQIEAgKGAABEsXmQABAgQIGAB+gAABAgQIBAUMgGDpIhMgQIAAAQPADxAgQIAAgaCAARAsXWQCBAgQIGAA+AECBAgQIBAUMACCpYtMgAABAgQMAD9AgAABAgSCAgZAsHSRCRAgQICAAeAHCBAgQIBAUMAACJYuMgECBAgQMAD8AAECBAgQCAoYAMHSRSZAgAABAgaAHyBAgAABAkEBAyBYusgECBAgQMAA8AMECBAgQCAoYAAESxeZAAECBAgYAH6AAAECBAgEBQyAYOkiEyBAgAABA8APECBAgACBoIABECxdZAIECBAgYAD4AQIECBAgEBQwAIKli0yAAAECBAwAP0CAAAECBIICBkCwdJEJECBAgIAB4AcIECBAgEBQwAAIli4yAQIECBAwAPwAAQIECBAIChgAwdJFJkCAAAECBoAfIECAAAECQQEDIFi6yAQIECBAwADwAwQIECBAIChgAARLF5kAAQIECBgAfoAAAQIECAQFDIBg6SITIECAAAEDwA8QIECAAIGggAEQLF1kAgQIECDwoOYBoxwL39cAAAAASUVORK5CYII=") {
          this.GatheringRequestDto.controls['ManagerSign'].setValue(undefined);
          return;
        }
        this.GatheringRequestDto.controls['ManagerSign'].setValue(data.sign);
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
          this.decision_making = this.UserName == 'okatz' || this.UserName == 'adahabre' ? true : false;
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

  submitForm(type: number) {

    if (!this.GatheringRequestDto.valid) {
      this.openSnackBar("שכחת שדות חובה");
      return;
    }

    const gatheringDate = this.datePipe.transform(
      this.GatheringRequestDto.controls['GatheringDate'].value,
      'yyyy-MM-dd'
    );

    const gatheringEndDate = this.datePipe.transform(
      this.GatheringRequestDto.controls['GatheringEndDate'].value,
      'yyyy-MM-dd'
    );

    const DecisionDate = this.datePipe.transform(
      this.GatheringRequestDto.controls['DecisionDate'].value,
      'yyyy-MM-dd'
    );

    const formData = new FormData();
    const raw = this.GatheringRequestDto.getRawValue();

    // ✅ set formatted dates ONCE
    formData.set('GatheringDate', gatheringDate!);
    formData.set('GatheringEndDate', gatheringEndDate!);
    formData.set('DecisionDate', DecisionDate!);



    // ✅ append everything except the dates
    Object.keys(raw).forEach(key => {
      if (
        key === 'GatheringDate' ||
        key === 'GatheringEndDate' ||
        key === 'DecisionDate' ||
        key === 'SupportOptions' ||
        key === 'Draft' ||
        key === 'GatheringPlan' ||
        key === 'GatheringOutcome' ||
        key === 'GatheringSupport' ||
        key === 'GatheringInquiries'
      ) {
        return;
      }
      const value = raw[key];
      if (value instanceof File) {
        formData.append(key, value, value.name);
      } else if (value !== null && value !== undefined) {
        formData.append(key, value);
      }
    });
    formData.append(
      'SupportOptions',
      JSON.stringify(this.supportOptionsFormArray.value)
    );
    formData.append(
      'GatheringPlan',
      JSON.stringify(this.GatheringRequestDto.value.GatheringPlan)
    );
    formData.append(
      'GatheringOutcome',
      JSON.stringify(this.GatheringRequestDto.value.GatheringOutcome)
    );
    formData.append(
      'GatheringSupport',
      JSON.stringify(this.getFilesArray('GatheringSupport').filter(file => this.isExistingFileRecord(file)))
    );
    formData.append(
      'GatheringInquiries',
      JSON.stringify(this.getFilesArray('GatheringInquiries').filter(file => this.isExistingFileRecord(file)))
    );

    const gatheringPlan = this.GatheringRequestDto.value.GatheringPlan;
    if (gatheringPlan instanceof File) {
      formData.append('GatheringPlanFile', gatheringPlan, gatheringPlan.name);
    }

    const gatheringOutcome = this.GatheringRequestDto.value.GatheringOutcome;
    if (gatheringOutcome instanceof File) {
      formData.append('GatheringOutcomeFile', gatheringOutcome, gatheringOutcome.name);
    }

    this.getFilesArray('GatheringSupport')
      .filter(file => file instanceof File)
      .forEach((file: File) => {
        formData.append('GatheringSupportFiles', file, file.name);
      });

    this.getFilesArray('GatheringInquiries')
      .filter(file => file instanceof File)
      .forEach((file: File) => {
        formData.append('GatheringInquiriesFiles', file, file.name);
      });

    formData.append('Draft', type.toString());

    this.supportRequestsService.saveGatheringRequest(formData).subscribe({
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

    if (!input.files || input.files.length === 0) {
      return;
    }

    const selectedFiles = Array.from(input.files);
    const maxSizeMB = 5;
    const oversizedFile = selectedFiles.find(file => file.size > maxSizeMB * 1024 * 1024);
    if (oversizedFile) {
      this.openSnackBar(`הקובץ ${oversizedFile.name} גדול מ־${maxSizeMB}MB`);
      input.value = '';
      return;
    }

    const isMultiFileField = field === 'GatheringSupport' || field === 'GatheringInquiries';
    if (isMultiFileField) {
      const existingFiles = this.getFilesArray(field);
      this.GatheringRequestDto.get(field)?.setValue([...existingFiles, ...selectedFiles]);
    } else {
      this.GatheringRequestDto.get(field)?.setValue(selectedFiles[0]);
    }
    this.GatheringRequestDto.get(field)?.markAsDirty();
    this.GatheringRequestDto.get(field)?.updateValueAndValidity();
    input.value = '';
  }

  removeFile(field: string, fileInput?: HTMLInputElement, fileIndex?: number) {
    const isMultiFileField = field === 'GatheringSupport' || field === 'GatheringInquiries';
    if (isMultiFileField) {
      const files = this.getFilesArray(field);
      if (fileIndex === undefined) {
        this.GatheringRequestDto.get(field)?.setValue([]);
      } else {
        this.GatheringRequestDto.get(field)?.setValue(files.filter((_, idx) => idx !== fileIndex));
      }
    } else {
      this.GatheringRequestDto.get(field)?.setValue(null);
    }
    this.GatheringRequestDto.get(field)?.markAsDirty();
    this.GatheringRequestDto.get(field)?.updateValueAndValidity();
    if (fileInput) {
      fileInput.value = '';
    }
  }

  file_in_new_window_base64() {
    this.viewGatheringFile('GatheringPlan');
  }

  file_in_new_window_base64_2() {
    this.viewGatheringFile('GatheringOutcome');
  }

  file_in_new_window_base64_3() {
    this.viewGatheringFile('GatheringSupport');
  }

  file_in_new_window_base64_4() {
    this.viewGatheringFile('GatheringInquiries');
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

  viewGatheringFile(fileControlName: string, fileIndex: number = 0) {
    const controlValue = this.GatheringRequestDto.get(fileControlName)?.value;
    const file = Array.isArray(controlValue) ? controlValue[fileIndex] : controlValue;
    if (!file) {
      this.openSnackBar('לא נמצא קובץ');
      return;
    }

    const fileUrl = this.getFileUrl(file);
    if (fileUrl) {
      if (this.isImageFile(file)) {
        // For images, open in new window
        window.open(fileUrl, '_blank');
      } else {
        // For other files, use the existing openFile method if it's base64
        if (typeof file === 'string' && file.startsWith('data:')) {
          this.openFile(file);
        } else {
          // Open file URL directly
          window.open(fileUrl, '_blank');
        }
      }
    } else {
      this.openSnackBar('לא ניתן לפתוח את הקובץ');
    }
  }

  formatFileSize(bytes: string): string {
    if (!bytes) return '';
    const size = parseInt(bytes);
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB';
    return (size / (1024 * 1024)).toFixed(2) + ' MB';
  }

  onImageError(event: any) {
    // Hide broken image and show error message
    event.target.style.display = 'none';
    console.error('Failed to load image:', event.target.src);
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
