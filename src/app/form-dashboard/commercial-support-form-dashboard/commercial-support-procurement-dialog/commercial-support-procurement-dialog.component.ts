import { Component, Inject, OnInit, Optional } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { MatTableDataSource } from '@angular/material/table';
import { SupportRequestService } from '../commercial-support.service';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DatePipe } from '@angular/common';

/** Validates procurement step 2: consideration checkboxes and conditional required text. */
function procurementStep2ConsiderationValidator(group: AbstractControl): ValidationErrors | null {
  const fg = group as FormGroup;
  const truthy = (v: unknown) => v === true || v === 'true' || v === 1 || v === '1';
  const cash = truthy(fg.get('ConsiderationCash')?.value);
  const supply = truthy(fg.get('ConsiderationSupply')?.value);
  const consulting = truthy(fg.get('ConsiderationConsultingHR')?.value);
  const noTransfer = truthy(fg.get('ConsiderationNoMoneyTransfer')?.value);
  const other = truthy(fg.get('ConsiderationOther')?.value);
  const errs: ValidationErrors = {};
  if (cash && !String(fg.get('ConsiderationCashDetail')?.value ?? '').trim()) {
    errs['ConsiderationCashDetailRequired'] = true;
  }
  if (supply && !String(fg.get('ConsiderationSupplyDetail')?.value ?? '').trim()) {
    errs['ConsiderationSupplyDetailRequired'] = true;
  }
  if (other && !String(fg.get('ConsiderationOtherDetail')?.value ?? '').trim()) {
    errs['ConsiderationOtherDetailRequired'] = true;
  }
  if (!cash && !supply && !consulting && !noTransfer && !other) {
    errs['ConsiderationSelectionRequired'] = true;
  }
  return Object.keys(errs).length ? errs : null;
}

@Component({
  selector: 'app-commercial-support-procurement-dialog',
  templateUrl: './commercial-support-procurement-dialog.component.html',
  styleUrls: ['./commercial-support-procurement-dialog.component.css'],
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
export class CommercialSupportProcurementDialogComponent implements OnInit {

  displayedColumnsManagers: string[] = ['first', 'last', 'department'];
  dataSource = new MatTableDataSource([]);

  horizontalPosition: MatSnackBarHorizontalPosition = "start";
  verticalPosition: MatSnackBarVerticalPosition = "bottom";
  SupportRequestDto!: FormGroup;
  // SupportManagerDto!: FormArray;

  SupportActivityDto = [
    { ActivityName: 'רישום', controlName: 'register' },
    { ActivityName: 'לינה', controlName: 'stay' },
    { ActivityName: 'טיסה', controlName: 'flight' },
    { ActivityName: 'העברות מ/אל שדה התעופה', controlName: 'transfer' }
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
  decision_making: boolean = false;
  UserName = localStorage.getItem("loginUserName").toLowerCase();
  date_now = new Date();
  saving: boolean = false;

  constructor(
    private fb: FormBuilder,
    private _snackBar: MatSnackBar,
    private _datePipe: DatePipe,
    private supportRequestsService: SupportRequestService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<CommercialSupportProcurementDialogComponent>
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

    if (!input.files || input.files.length === 0) {
      return;
    }

    const originalFile = input.files[0];

    // Validation
    const maxSizeMB = 5;
    if (originalFile.size > maxSizeMB * 1024 * 1024) {
      this.openSnackBar(`הקובץ גדול מ־${maxSizeMB}MB`);
      input.value = '';
      return;
    }

    // Preserve extension
    const extension = originalFile.name.split('.').pop();
    const newFileName = `${field}.${extension}`;

    const renamedFile = new File(
      [originalFile],
      newFileName,
      { type: originalFile.type }
    );

    // Store the File object in the form (like gathering component)
    this.SupportRequestDto.get(field)?.setValue(renamedFile);
  }

  removeFile(field: string, fileInput?: HTMLInputElement) {
    this.SupportRequestDto.get(field)?.setValue(null);
    if (fileInput) {
      fileInput.value = '';
    }
  }

  getFileUrl(file: any): string {
    if (!file) return '';

    if (typeof file === 'string' && file.startsWith('data:')) {
      return file;
    }

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

  viewSupportFile(fileControlName: string) {
    const file = this.SupportRequestDto.get(fileControlName)?.value;
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

  buildForm(data) {
    if (data == null || typeof data !== 'object') {
      data = {};
    }
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

    // Map SupportFiles to form controls by Type (like gathering component)
    const toSingle = (v: any) => (Array.isArray(v) && v.length > 0 ? v[0] : v);
    let supportLetter2File = toSingle(data?.SupportLetter2) ?? null;
    let conferenceApprovalFile = toSingle(data?.ConferenceApproval) ?? null;
    let additionalDocumentFile = toSingle(data?.AdditionalDocument) ?? null;

    if (data?.SupportFiles && Array.isArray(data.SupportFiles)) {
      data.SupportFiles.forEach((file: any) => {
        switch (file.Type) {
          case 'SupportLetter2':
            supportLetter2File = file;
            break;
          case 'ConferenceApproval':
            conferenceApprovalFile = file;
            break;
          case 'AdditionalDocument':
            additionalDocumentFile = file;
            break;
        }
      });
    }

    const nest =
      data?.ProcurementStep2 && typeof data.ProcurementStep2 === 'object' ? (data.ProcurementStep2 as Record<string, unknown>) : {};
    const p2 = (key: string) => (nest[key] !== undefined && nest[key] !== null ? nest[key] : data?.[key]);
    const bool = (v: unknown) => v === true || v === 'true' || v === 1 || v === '1';

    this.SupportRequestDto = this.fb.group({
      Id: new FormControl(data?.Id, null),
      RequesterID: new FormControl(data?.RequesterID, Validators.required),
      Requester: new FormControl(data?.Requester, Validators.required),
      RequesterDetails: new FormControl(data?.RequesterDetails, null),
      CompanySupport: new FormControl(data?.CompanySupport, null),
      EventDate: new FormControl(data?.EventDate, null),
      ParticipationNote: new FormControl(data?.ParticipationNote ?? '', null),
      // File fields: company/agreement required; two optional attachments
      SupportLetter2: new FormControl(supportLetter2File, null),
      ConferenceApproval: new FormControl(conferenceApprovalFile, Validators.required),
      AdditionalDocument: new FormControl(additionalDocumentFile, null),
      SupportType: supportTypeArray,
      SupportManagerDto: this.fb.array([]),
      Approved: new FormControl(data?.Approved, null),
      DecisionDate: new FormControl(data?.DecisionDate, null),
      Note: new FormControl(data?.Note, null),
      ProcurementStep2: this.fb.group(
        {
          ExecutionContactFirstName: new FormControl(String(p2('ExecutionContactFirstName') ?? ''), Validators.required),
          ExecutionContactLastName: new FormControl(String(p2('ExecutionContactLastName') ?? ''), Validators.required),
          ExecutionContactRole: new FormControl(String(p2('ExecutionContactRole') ?? ''), Validators.required),
          ConsiderationCash: new FormControl(bool(p2('ConsiderationCash'))),
          ConsiderationCashDetail: new FormControl(String(p2('ConsiderationCashDetail') ?? '')),
          ConsiderationSupply: new FormControl(bool(p2('ConsiderationSupply'))),
          ConsiderationSupplyDetail: new FormControl(String(p2('ConsiderationSupplyDetail') ?? '')),
          ConsiderationConsultingHR: new FormControl(bool(p2('ConsiderationConsultingHR'))),
          ConsiderationConsultingNote: new FormControl(String(p2('ConsiderationConsultingNote') ?? '')),
          ConsiderationNoMoneyTransfer: new FormControl(bool(p2('ConsiderationNoMoneyTransfer'))),
          ConsiderationOther: new FormControl(bool(p2('ConsiderationOther'))),
          ConsiderationOtherDetail: new FormControl(String(p2('ConsiderationOtherDetail') ?? '')),
        },
        { validators: procurementStep2ConsiderationValidator },
      ),
    });
    this.wireProcurementStep2ClearDetailFields();
    this.SupportRequestDto.get('CompanySupport').valueChanges.subscribe(value => {
      this.filteredCompanies = this._filterCompanies(value || '');
    });
    this.decision_making = data?.RequesterID != undefined && (this.UserName == 'okatz' || this.UserName == 'adahabre') ? true : false;
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

  get procurementStep2(): FormGroup {
    return this.SupportRequestDto?.get('ProcurementStep2') as FormGroup;
  }

  private wireProcurementStep2ClearDetailFields(): void {
    const p2 = this.SupportRequestDto.get('ProcurementStep2') as FormGroup;
    if (!p2) {
      return;
    }
    const pairs: [string, string][] = [
      ['ConsiderationCash', 'ConsiderationCashDetail'],
      ['ConsiderationSupply', 'ConsiderationSupplyDetail'],
      ['ConsiderationOther', 'ConsiderationOtherDetail'],
    ];
    pairs.forEach(([flag, detail]) => {
      p2.get(flag)?.valueChanges.subscribe((on) => {
        const truthy = on === true || on === 'true';
        if (!truthy) {
          p2.get(detail)?.setValue('', { emitEvent: false });
        }
        p2.updateValueAndValidity({ emitEvent: false });
      });
    });
    ['ConsiderationConsultingHR', 'ConsiderationNoMoneyTransfer', 'ConsiderationOther'].forEach((name) => {
      p2.get(name)?.valueChanges.subscribe(() => p2.updateValueAndValidity({ emitEvent: false }));
    });
    ['ConsiderationCashDetail', 'ConsiderationSupplyDetail', 'ConsiderationOtherDetail'].forEach((name) => {
      p2.get(name)?.valueChanges.subscribe(() => p2.updateValueAndValidity({ emitEvent: false }));
    });
  }

  getSupportRequestsByID() {
    const id = this.data == null ? '0' : String(this.data.Id ?? '0');
    this.supportRequestsService.getProcurementRequestById(id).subscribe({
      next: (response) => {
        const d = this.unwrapAspNetD(response);
        this.buildForm(d);
      },
      error: (error) => {
        console.error('שגיאה בשליפת מידע:', error);
      },
    });
  }

  /** ASMX wraps payload in `d`; value may already be an object or a JSON string. */
  private unwrapAspNetD(response: unknown): any {
    if (response == null) {
      return null;
    }
    if (typeof response === 'object' && response !== null && 'd' in (response as Record<string, unknown>)) {
      const inner = (response as { d: unknown }).d;
      if (typeof inner === 'string') {
        try {
          return JSON.parse(inner);
        } catch {
          return null;
        }
      }
      return inner;
    }
    return response;
  }

  submitForm(type: number) {
    this.saving = true;
    if (type === 0) {
      this.SupportRequestDto.get('ProcurementStep2')?.markAllAsTouched();
    }
    const eventDate = this._datePipe.transform(this.SupportRequestDto.value.EventDate, 'yyyy-MM-dd');
    const eventEndDate = this._datePipe.transform(this.SupportRequestDto.value.EventEndDate, 'yyyy-MM-dd');
    const decisionDate = this.SupportRequestDto.value.DecisionDate ? this._datePipe.transform(this.SupportRequestDto.value.DecisionDate, 'yyyy-MM-dd') : null;

    const formData = new FormData();
    const raw = this.SupportRequestDto.getRawValue();

    formData.set('EventDate', eventDate || '');
    formData.set('EventEndDate', eventEndDate || '');
    formData.set('DecisionDate', decisionDate || '');
    formData.set('Draft', type.toString());

    const fileFields = ['SupportLetter2', 'ConferenceApproval', 'AdditionalDocument'];
    const excludeKeys = ['EventDate', 'EventEndDate', 'DecisionDate', 'SupportType', 'SupportManagerDto', 'ProcurementStep2', ...fileFields];

    Object.keys(raw).forEach(key => {
      if (excludeKeys.includes(key)) return;

      const value = raw[key];
      if (value instanceof File) {
        formData.append(key, value, value.name);
      } else if (value !== null && value !== undefined) {
        formData.append(key, value);
      }
    });

    const step2 = raw.ProcurementStep2 as Record<string, unknown> | undefined;
    if (step2 && typeof step2 === 'object') {
      Object.keys(step2).forEach((k) => {
        const v = step2[k];
        if (v !== null && v !== undefined) {
          if (typeof v === 'boolean') {
            formData.append(k, v ? 'true' : 'false');
          } else {
            formData.append(k, String(v));
          }
        }
      });
    }

    // Append file fields: File as binary, server objects as JSON
    fileFields.forEach(field => {
      const val = raw[field];
      if (val instanceof File) {
        formData.append(field, val, val.name);
      } else if (val !== null && val !== undefined) {
        formData.append(field, JSON.stringify(val));
      }
    });

    formData.append('SupportType', JSON.stringify(this.supportTypeArray?.value ?? []));
    formData.append('SupportManagerDto', JSON.stringify(this.SupportRequestDto.get('SupportManagerDto')?.value ?? []));

    this.supportRequestsService.saveProcurementRequestFormData(formData).subscribe({
      next: (ok) => {
        if (ok) {
          this.openSnackBar('נשמר בהצלחה');
          this.dialogRef.close(true);
        } else {
          this.openSnackBar('שגיאה בשמירה');
        }
      },
      error: (err) => {
        console.error('שגיאה בשמירת הבקשה:', err);
        this.openSnackBar('שגיאה בשמירה');
      },
      complete: () => {
        this.saving = false;
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
          this.decision_making = this.UserName == 'okatz' || this.UserName == 'adahabre' ? true : false;
        }
      },
      error: (err) => {
        console.error('שגיאה בפרטי עובד:', err);
        alert('אירעה שגיאה בפרטי עובד');
      }
    });
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
