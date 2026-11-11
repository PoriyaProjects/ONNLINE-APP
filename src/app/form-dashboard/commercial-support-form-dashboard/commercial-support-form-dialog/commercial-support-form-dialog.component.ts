import { Component, Inject } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { MatTableDataSource } from '@angular/material/table';
import { SupportRequestService } from '../commercial-support.service';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DatePipe } from '@angular/common';
import { isCommitteeDecisionUser, isImageOrPdfFile, isViewOnlyUser, UNSUPPORTED_FILE_TYPE_MESSAGE } from '../commercial-support.constants';
import { SecondaryAttachmentItem } from '../secondary-decision-step/secondary-decision-step.component';

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
  readOnly = false;
  secondary_decision_step = false;
  show_secondary_table = false;
  secondaryDecisions: any[] = [];
  secondaryAttachments: SecondaryAttachmentItem[] = [];
  readonly roler = 'A';
  UserName = localStorage.getItem("loginUserName").toLowerCase();
  date_now = new Date();
  saving: boolean = false;

  constructor(
    private fb: FormBuilder,
    private _snackBar: MatSnackBar,
    private _datePipe: DatePipe,
    private supportRequestsService: SupportRequestService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<CommercialSupportFormDialogComponent>
  ) { }

  ngOnInit(): void {
    this.readOnly = this.data?.readOnly === true;
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

    if (!isImageOrPdfFile(originalFile)) {
      this.openSnackBar(UNSUPPORTED_FILE_TYPE_MESSAGE);
      input.value = '';
      return;
    }

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

    if (file instanceof File) {
      return URL.createObjectURL(file);
    }

    if (typeof file === 'string' && file.startsWith('data:')) {
      return file;
    }

    if (file?.StoredFileName) {
      return `http://srv-ipracticom/RCF_WS/SupportFiles/Uploads/${file?.StoredFileName}`;
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
    let supportLetterFile = toSingle(data?.SupportLetter) ?? null;
    let supportLetter2File = toSingle(data?.SupportLetter2) ?? null;
    let conferenceApprovalFile = toSingle(data?.ConferenceApproval) ?? null;
    let additionalDocumentFile = toSingle(data?.AdditionalDocument) ?? null;

    if (data?.SupportFiles && Array.isArray(data.SupportFiles)) {
      data.SupportFiles.forEach((file: any) => {
        switch (file.Type) {
          case 'SupportLetter':
            supportLetterFile = file;
            break;
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

    this.SupportRequestDto = this.fb.group({
      Id: new FormControl(data?.Id, null),
      RequesterID: new FormControl(data?.RequesterID, Validators.required),
      Requester: new FormControl(data?.Requester, Validators.required),
      RequesterDetails: new FormControl(data?.RequesterDetails, Validators.required),
      CompanySupport: new FormControl(data?.CompanySupport, Validators.required),
      ConferenceName: new FormControl(data?.ConferenceName, Validators.required),
      EventDate: new FormControl(data?.EventDate, Validators.required),
      EventEndDate: new FormControl(data?.EventEndDate, Validators.required),
      Location: new FormControl(data?.Location, Validators.required),
      JoinPerson: new FormControl(data?.JoinPerson, Validators.required),
      Position: new FormControl(data?.Position, Validators.required),
      ParticipationType: new FormControl(data?.ParticipationType, Validators.required),
      ParticipationTypeNote: new FormControl(data?.ParticipationTypeNote ?? '', null),
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
      transfer_directService: new FormControl(data?.transfer_directService, null),
      transfer_extraOptions: new FormControl(data?.transfer_extraOptions, null),
      transfer_indirectHealth: new FormControl(data?.transfer_indirectHealth, null),
      // File fields (single file per control, like gathering component)
      SupportLetter: new FormControl(supportLetterFile, Validators.required),
      SupportLetter2: new FormControl(supportLetter2File, null),
      ConferenceApproval: new FormControl(conferenceApprovalFile, Validators.required),
      AdditionalDocument: new FormControl(additionalDocumentFile, null),
      CompanyRepName: new FormControl(data?.CompanyRepName, Validators.required),
      CompanyRepEmail: new FormControl(data?.CompanyRepEmail, [Validators.required, Validators.email]),
      CompanyRepPhone: new FormControl(data?.CompanyRepPhone, [Validators.required, Validators.pattern(/^[0-9+\-\s]{7,20}$/)]),
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
    this.SupportActivityDto.forEach((activity, index) => {
      this.setupActivityDirectVsIndirectMutualExclusion(activity.controlName, index);
    });
    this.SupportRequestDto.get('ParticipationType')?.valueChanges.subscribe((v) => {
      if (v !== 'other') {
        this.SupportRequestDto.get('ParticipationTypeNote')?.setValue('', { emitEvent: false });
      }
    });
    this.SupportRequestDto.get('CompanySupport').valueChanges.subscribe(value => {
      this.filteredCompanies = this._filterCompanies(value || '');
    });
    this.decision_making = !this.readOnly && data?.RequesterID != undefined && isCommitteeDecisionUser(this.UserName);
    if (this.readOnly) {
      this.SupportRequestDto.disable();
    }
    this.initSecondaryDecisions(data?.Id);
  }

  private hasFormFile(field: string): boolean {
    const v = this.SupportRequestDto?.get(field)?.value;
    return v != null && v !== '';
  }

  private refreshSecondaryAttachments(): void {
    this.secondaryAttachments = [
      { label: 'מכתב תמיכה מהחברה', key: 'SupportLetter', hasFile: this.hasFormFile('SupportLetter') },
      { label: 'תוכנית של הקורס/הכנס', key: 'ConferenceApproval', hasFile: this.hasFormFile('ConferenceApproval') },
      { label: 'מסמך אחר', key: 'AdditionalDocument', hasFile: this.hasFormFile('AdditionalDocument') },
      { label: 'מסמך אחר 2', key: 'SupportLetter2', hasFile: this.hasFormFile('SupportLetter2') }
    ];
  }

  private initSecondaryDecisions(id: any): void {
    const hasId = id != null && id !== '' && id !== '0';
    this.secondary_decision_step = isViewOnlyUser(this.UserName) && hasId;
    this.show_secondary_table = (isViewOnlyUser(this.UserName) || isCommitteeDecisionUser(this.UserName)) && hasId;
    this.refreshSecondaryAttachments();
    if (this.show_secondary_table) {
      this.loadSecondaryDecisions(String(id));
    }
  }

  loadSecondaryDecisions(id: string): void {
    this.supportRequestsService.getSupportSecondaryDecisions(id, this.roler).subscribe({
      next: (res) => {
        const list = res?.d || res || [];
        this.secondaryDecisions = Array.isArray(list) ? list : [];
      },
      error: () => {
        this.secondaryDecisions = [];
      }
    });
  }

  onSecondaryDecisionsChanged(list: any[]): void {
    this.secondaryDecisions = list || [];
  }

  onSecondaryViewAttachment(key: string): void {
    this.viewSupportFile(key);
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
    if (value === 'yes') {
      this.selectedIndirectHealth[index] = 'yes';
    } else {
      delete this.selectedIndirectHealth[index];
    }
    if (value == 'no') {
      this.SupportRequestDto.controls[this.SupportActivityDto[index].controlName + '_extraOptions'].setValue(value);
    }
  }

  private setupActivityDirectVsIndirectMutualExclusion(controlName: string, index: number): void {
    const directCtrl = this.SupportRequestDto.get(controlName + '_directService')!;
    const indirectCtrl = this.SupportRequestDto.get(controlName + '_indirectHealth')!;
    const extraCtrl = this.SupportRequestDto.get(controlName + '_extraOptions')!;

    const sync = () => {
      let d = directCtrl.value;
      let i = indirectCtrl.value;
      if (d === 'yes' && i === 'yes') {
        indirectCtrl.setValue(null, { emitEvent: false });
        extraCtrl.setValue(null, { emitEvent: false });
        i = null;
      }
      if (d === 'yes') {
        directCtrl.enable({ emitEvent: false });
        indirectCtrl.disable({ emitEvent: false });
        if (i != null) {
          indirectCtrl.setValue(null, { emitEvent: false });
          extraCtrl.setValue(null, { emitEvent: false });
        }
        this.onIndirectHealthChange(indirectCtrl.value, index);
      } else if (i === 'yes') {
        indirectCtrl.enable({ emitEvent: false });
        directCtrl.disable({ emitEvent: false });
        if (d != null) {
          directCtrl.setValue(null, { emitEvent: false });
        }
        this.onIndirectHealthChange(i, index);
      } else {
        directCtrl.enable({ emitEvent: false });
        indirectCtrl.enable({ emitEvent: false });
        this.onIndirectHealthChange(indirectCtrl.value, index);
      }
    };

    directCtrl.valueChanges.subscribe(() => sync());
    indirectCtrl.valueChanges.subscribe(() => sync());
    sync();
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

  submitForm(type: number) {
    this.saving = true;
    const eventDate = this._datePipe.transform(this.SupportRequestDto.value.EventDate, 'yyyy-MM-dd');
    const eventEndDate = this._datePipe.transform(this.SupportRequestDto.value.EventEndDate, 'yyyy-MM-dd');
    const decisionDate = this.SupportRequestDto.value.DecisionDate ? this._datePipe.transform(this.SupportRequestDto.value.DecisionDate, 'yyyy-MM-dd') : null;

    const formData = new FormData();
    const raw = this.SupportRequestDto.getRawValue();

    formData.set('EventDate', eventDate || '');
    formData.set('EventEndDate', eventEndDate || '');
    formData.set('DecisionDate', decisionDate || '');
    formData.set('Draft', type.toString());

    const fileFields = ['SupportLetter', 'SupportLetter2', 'ConferenceApproval', 'AdditionalDocument'];
    const excludeKeys = ['EventDate', 'EventEndDate', 'DecisionDate', 'SupportType', 'SupportManagerDto', ...fileFields];

    Object.keys(raw).forEach(key => {
      if (excludeKeys.includes(key)) return;

      const value = raw[key];
      if (value instanceof File) {
        formData.append(key, value, value.name);
      } else if (value !== null && value !== undefined) {
        formData.append(key, value);
      }
    });

    // Append file fields: File as binary, server objects as JSON
    fileFields.forEach(field => {
      const val = raw[field];
      if (val instanceof File) {
        formData.append(field, val, val.name);
      } else if (val !== null && val !== undefined) {
        formData.append(field, JSON.stringify(val));
      }
    });

    formData.append('SupportType', JSON.stringify(this.supportTypeArray.value));
    formData.append('SupportManagerDto', JSON.stringify(this.SupportRequestDto.get('SupportManagerDto')?.value));

    this.supportRequestsService.saveSupportRequestFormData(formData).subscribe({
      next: (response: string) => {
        // response === "OK"
        this.openSnackBar("נשמר בהצלחה");
        this.dialogRef.close(true);
      },
      error: (error) => {
        console.error('שגיאה בשמירת הבקשה:', error);
        this.openSnackBar("שגיאה בשמירה");
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
          this.decision_making = !this.readOnly && isCommitteeDecisionUser(this.UserName);
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
