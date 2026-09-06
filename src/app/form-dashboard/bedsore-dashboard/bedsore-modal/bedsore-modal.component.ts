import { DatePipe } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { BedsoreService } from '../bedsore.service';
import { BEDSORE_BODY_PARTS, getBodyPartLabel, validateBedsoreImageFile } from '../bedsore.utils';

@Component({
  selector: 'app-bedsore-modal',
  templateUrl: './bedsore-modal.component.html',
  styleUrls: ['./bedsore-modal.component.css']
})
export class BedsoreModalComponent implements OnInit {

  horizontalPosition: MatSnackBarHorizontalPosition = "start";
  verticalPosition: MatSnackBarVerticalPosition = "bottom";
  UserName = localStorage.getItem("loginUserName");
  saving = false;
  bodyParts = BEDSORE_BODY_PARTS;
  selectedBodyPart: string | null = null;
  getBodyPartLabel = getBodyPartLabel;

  constructor(
    public dialog: MatDialogRef<BedsoreModalComponent>,
    @Inject(MAT_DIALOG_DATA) public DataDialog: any,
    private fb: FormBuilder,
    private bedsoreService: BedsoreService,
    private _snackBar: MatSnackBar
  ) { }

  patientGroup: FormGroup;
  fullForm: FormGroup;
  imageForm: FormGroup;
  pipe = new DatePipe('en-US');
  myDate = new Date();
  images_list = [];
  readOnly = false;

  ngOnInit(): void {
    this.readOnly = this.DataDialog?.data?.ToNamer === 'True';
    if (this.DataDialog.PatientDetails === undefined) {
      this.bedsoreService.getBedsoreImagesByRowID(this.DataDialog.data.Row_ID).subscribe({
        next: (images) => {
          this.images_list = images || [];
          this.editFormFunc(this.DataDialog.data);
        },
        error: () => {
          this.openSnackBar('שגיאה בטעינת תמונות');
          this.editFormFunc(this.DataDialog.data);
        }
      });
    } else {
      this.initNewForm(this.DataDialog.PatientDetails);
    }
  }

  initNewForm(patient) {
    this.patientGroup = this.fb.group({
      RowID: [patient.RowID],
      Passport: [patient.Passport, Validators.required],
      FirstName: [patient.FirstName, Validators.required],
      FatherName: [patient.FatherName],
      LastName: [patient.LastName, Validators.required],
      PhoneNumber: [patient.PhoneNumber],
      CaseNumber: [patient.CaseNumber, Validators.required],
      Address: [patient.Address],
      DOB: [patient.DOB],
    });

    this.fullForm = this.fb.group({
      Row_ID: [null],
      DateOfForm: [this.pipe.transform(this.myDate, 'yyyy-MM-dd')],
      TimeOfForm: [this.pipe.transform(this.myDate, 'HH:mm')],
      UpdateDateTime: [''],
      UpdateUser: [this.UserName],
      Status: [true]
    });
    this.initImageForm([]);
    if (this.readOnly) {
      this.patientGroup.disable();
      this.fullForm.disable();
      this.imageForm.disable();
    }
  }

  editFormFunc(data: any) {
    this.patientGroup = this.fb.group({
      RowID: [data.PatientDetails.Row_ID],
      Passport: [data.PatientDetails.Passport, Validators.required],
      FirstName: [data.PatientDetails.FirstName, Validators.required],
      FatherName: [data.PatientDetails.FatherName],
      LastName: [data.PatientDetails.LastName, Validators.required],
      PhoneNumber: [data.PatientDetails.PhoneNumber],
      CaseNumber: [data.PatientDetails.CaseNumber, Validators.required],
      Address: [data.PatientDetails.Address],
      DOB: [data.PatientDetails.DOB],
    });

    this.fullForm = this.fb.group({
      Row_ID: [data.Row_ID],
      DateOfForm: [data.DateOfForm],
      TimeOfForm: [data.TimeOfForm],
      UpdateUser: [this.UserName],
      Status: [true]
    });
    this.initImageForm(this.images_list || []);
    if (this.readOnly) {
      this.patientGroup.disable();
      this.fullForm.disable();
      this.imageForm.disable();
    }
  }

  initImageForm(existingImages: any[]) {
    this.imageForm = this.fb.group({
      ImagesList: this.fb.array([])
    });
    this.bodyParts.forEach(part => {
      const byPart = (existingImages || []).find(img => img.BodyPart === part.id);
      this.onAddImage(byPart ? byPart : { BodyPart: part.id });
    });
  }

  onAddImage(image_data) {
    const imageItem = new FormGroup({
      Row_ID: new FormControl(image_data?.Row_ID ?? null),
      BodyPart: new FormControl(image_data?.BodyPart ?? '', null),
      DateOfImage: new FormControl(image_data?.DateOfImage ?? '', null),
      TimeOfImage: new FormControl(image_data?.TimeOfImage ?? '', null),
      Content: new FormControl(image_data?.Content ?? '', null),
      Note: new FormControl(image_data?.Note ?? '', null),
      BedsoreIDFK: new FormControl(image_data?.BedsoreIDFK ?? null),
      Status: new FormControl(true, null)
    });
    (<FormArray>this.imageForm.get('ImagesList')).push(imageItem);
  }

  get imagesList(): FormArray {
    return this.imageForm.get('ImagesList') as FormArray;
  }

  get selectedImageIndex(): number {
    if (!this.selectedBodyPart) {
      return -1;
    }
    return this.imagesList.controls.findIndex(c => c.get('BodyPart')?.value === this.selectedBodyPart);
  }

  get selectedImage(): FormGroup | null {
    const idx = this.selectedImageIndex;
    return idx >= 0 ? this.imagesList.at(idx) as FormGroup : null;
  }

  hasImageForPart(partId: string): boolean {
    const ctrl = this.imagesList.controls.find(c => c.get('BodyPart')?.value === partId);
    return !!(ctrl && ctrl.get('Content')?.value);
  }

  onBodyPartClick(partId: string): void {
    if (this.readOnly) {
      this.selectedBodyPart = partId;
      return;
    }
    this.selectedBodyPart = partId;
  }

  closeModal(saved = false) {
    this.dialog.close({ saved });
  }

  onImageFileChange(event: any) {
    if (!event?.length || !this.selectedBodyPart) {
      return;
    }
    const file = event[0];
    const validationError = validateBedsoreImageFile(file);
    if (validationError) {
      this.openSnackBar(validationError);
      return;
    }

    const index = this.selectedImageIndex;
    if (index < 0) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const current = this.imagesList.value[index];
      this.imagesList.at(index).patchValue({
        Content: reader.result?.toString() ?? '',
        BodyPart: this.selectedBodyPart,
        BedsoreIDFK: this.fullForm.value.Row_ID ?? current.BedsoreIDFK,
        Note: current.Note ?? ''
      });
    };
    reader.readAsDataURL(file);
  }

  triggerFileInput(fileInput: HTMLInputElement) {
    if (!this.selectedBodyPart || this.readOnly) {
      return;
    }
    fileInput.click();
  }

  submitForm() {
    if (this.readOnly) {
      return;
    }
    if (this.patientGroup.invalid || this.fullForm.invalid) {
      this.openSnackBar('נא למלא את כל השדות הנדרשים');
      return;
    }

    this.saving = true;
    this.bedsoreService.saveBedsoreForm(this.fullForm.getRawValue(), this.patientGroup.getRawValue())
      .pipe(finalize(() => this.saving = false))
      .subscribe({
        next: (formId) => {
          if (!formId) {
            this.openSnackBar("משהו השתבש, לא נשמר");
            return;
          }
          const images = this.imageForm.controls['ImagesList'].value.filter(x => x.Content);
          if (!images.length) {
            this.openSnackBar("נשמר בהצלחה");
            this.closeModal(true);
            return;
          }

          const saves$ = images.map(element => {
            if (element.Row_ID === null || element.Row_ID === undefined) {
              return this.bedsoreService.saveBedsoreImages(element, formId);
            }
            return this.bedsoreService.updateBedsoreImages(element, formId);
          });

          forkJoin(saves$).subscribe({
            next: (results) => {
              const allOk = results.every(r => r);
              this.openSnackBar(allOk ? "נשמר בהצלחה" : "משהו השתבש, לא נשמר");
              if (allOk) {
                this.closeModal(true);
              }
            },
            error: () => this.openSnackBar("משהו השתבש, לא נשמר")
          });
        },
        error: () => this.openSnackBar("משהו השתבש, לא נשמר")
      });
  }

  openSnackBar(message) {
    this._snackBar.open(message, "X", {
      duration: 3000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }
}
