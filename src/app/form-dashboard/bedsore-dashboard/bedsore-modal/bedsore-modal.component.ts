import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-bedsore-modal',
  templateUrl: './bedsore-modal.component.html',
  styleUrls: ['./bedsore-modal.component.css']
})
export class BedsoreModalComponent implements OnInit {

  selectedBodyPart: string = '';

  horizontalPosition: MatSnackBarHorizontalPosition = "start";
  verticalPosition: MatSnackBarVerticalPosition = "bottom";
  formControl = new FormControl(['']);
  users = [];
  doctors = [];
  filteredDoctors: Observable<string[]>;
  @ViewChild('hologramContainer') hologramContainer: ElementRef<HTMLDivElement>;
  @ViewChild('doctorsInput') doctorsInput: ElementRef<HTMLInputElement>;
  @ViewChild('head') head: ElementRef<HTMLInputElement>;
  @ViewChild('torso') torso: ElementRef<HTMLInputElement>;
  @ViewChild('left-arm') leftarm: ElementRef<HTMLInputElement>;
  @ViewChild('right-arm') rightarm: ElementRef<HTMLInputElement>;
  @ViewChild('leftleg') leftleg: ElementRef<HTMLInputElement>;
  @ViewChild('rightleg') rightleg: ElementRef<HTMLInputElement>;
  employees = [];
  filteredOptions1: Observable<string[]>;
  docfilter = new FormControl();
  UserName = localStorage.getItem("loginUserName");
  imageFile: File;
  base64Image: string;


  constructor(
    public dialog: MatDialogRef<BedsoreModalComponent>,
    @Inject(MAT_DIALOG_DATA) public DataDialog: any,
    private fb: FormBuilder,
    private el: ElementRef,
    private http: HttpClient,
    private _snackBar: MatSnackBar
  ) { }

  selectable = true;
  removable = true;
  patientGroup: FormGroup;
  fullForm: FormGroup;
  imageForm: FormGroup;
  all_doctors_filter = [];
  pipe = new DatePipe('en-US');
  myDate = new Date();
  images_list = [];

  ngOnInit(): void {
    let patient: any;
    let form: any;
    this.imageFile = null;
    this.base64Image = '';
    this.getEmployeesList();
    if (this.DataDialog.PatientDetails === undefined) {
      // edit
      this.getBedsoreImagesByRowID();
      setTimeout(() => {
        this.editFormFunc(this.DataDialog.data);
      }, 1000);
    } else {
      // new
      patient = this.DataDialog.PatientDetails;
      form = this.DataDialog.PatientDetails;
      this.patientGroup = this.fb.group({
        RowID: patient.RowID,
        Passport: patient.Passport,
        FirstName: patient.FirstName,
        FatherName: patient.FatherName,
        LastName: patient.LastName,
        PhoneNumber: patient.PhoneNumber,
        CaseNumber: patient.CaseNumber,
        Address: patient.Address,
        DOB: patient.DOB,
      });

      this.fullForm = this.fb.group({
        Row_ID: form.Row_ID,
        DateOfForm: this.pipe.transform(this.myDate, 'yyyy-MM-dd'),
        TimeOfForm: this.pipe.transform(this.myDate, 'HH:mm'),
        UpdateDateTime: new FormControl("", null),
        UpdateUser: new FormControl(this.UserName, null),
        Status: true
      });
      this.imageForm = this.fb.group({
        ImagesList: this.fb.array([])
      });
      for (let i = 0; i < 3; i++) {
        this.onAddImage(null);
      }
    }
  }

  onBodyPartClick(part: string): void {
    this.selectedBodyPart = part;
    console.log(`Selected body part: ${part}`);
  }

  editFormFunc(data: any) {
    this.patientGroup = this.fb.group({
      RowID: data.PatientDetails.RowID,
      Passport: data.PatientDetails.Passport,
      FirstName: data.PatientDetails.FirstName,
      FatherName: data.PatientDetails.FatherName,
      LastName: data.PatientDetails.LastName,
      PhoneNumber: data.PatientDetails.PhoneNumber,
      CaseNumber: data.PatientDetails.CaseNumber,
      Address: data.PatientDetails.Address,
      DOB: data.PatientDetails.DOB,
    });

    this.fullForm = this.fb.group({
      Row_ID: data.Row_ID,
      DateOfForm: this.pipe.transform(this.myDate, 'yyyy-MM-dd'),
      TimeOfForm: this.pipe.transform(this.myDate, 'HH:mm'),
      UpdateUser: this.UserName,
      Status: true
    });
    this.imageForm = this.fb.group({
      ImagesList: this.fb.array([])
    });
    for (let i = 0; i < 3; i++) {
      this.onAddImage(this.images_list[i]);
    }
  }

  onAddImage(image_data) {
    const imageItem = new FormGroup({
      Row_ID: new FormControl(image_data?.Row_ID, null),
      DateOfImage: new FormControl("", null),
      TimeOfImage: new FormControl("", null),
      Content: new FormControl(image_data?.Content, null),
      Note: new FormControl(image_data?.Note, null),
      BedsoreIDFK: new FormControl(image_data?.BedsoreIDFK, null),
      Status: new FormControl(true, null)
    });
    (<FormArray>this.imageForm.get('ImagesList')).push(imageItem);
  }

  getEmployeesList() {
    this.http
      .post(environment.url + "GetUsersForInquiries", {
      })
      .subscribe((Response) => {
        let all_users_filter = Response["d"];
        all_users_filter.forEach(element => {
          this.employees.push({
            firstname: element.firstname + " " + element.lastname
          });
        })
      });
  }

  getBedsoreImagesByRowID() {
    this.http
      .post(environment.url + "GetBedsoreImagesByRowID", {
        id: this.DataDialog.data.Row_ID
      })
      .subscribe((Response) => {
        this.images_list = Response["d"];
      });
  }

  closeModal() {
    this.dialog.close();
  }

  bodyPartClick(part) {
    alert(part);
  }


  // convert new image selection to base64 to display for the user
  // selectFile(event: any) { //Angular 11, for stricter type
  //   // if (event.type == undefined) event['type'] = "image/jpeg";
  //   var mimeType = event.type;
  //   // if (mimeType.match(/image\/*/) == null) {
  //   //   this.msg = "Only images are supported";
  //   //   return;
  //   // }
  //   var reader = new FileReader();
  //   reader.readAsDataURL(event);
  //   reader.onload = (_event) => {
  //     // this.msg = "";
  //     let imageObj = {
  //       Path: reader.result,
  //       Row_ID: null,
  //       Status: true
  //     }
  //     this.imagesList.push(imageObj);
  //   }
  // }
  get imagesList(): FormArray {
    return this.imageForm.get('ImagesList') as FormArray;
  }

  onImageFileChange(event: any, index: number) {
    if (event.length > 0) {
      const file = event[0];

      this.imageFile = file;

      const reader = new FileReader();
      reader.onload = () => {
        let id = null;
        if (this.fullForm.value.Row_ID !== null) {
          id = this.fullForm.value.Row_ID;
        }
        this.base64Image = reader.result.toString();
        const files = this.imageForm.get('ImagesList') as FormArray;
        let imgObj = {
          Row_ID: files.value[index].Row_ID,
          DateOfImage: "",
          TimeOfImage: "",
          Content: this.base64Image,
          Note: "",
          BedsoreIDFK: id,
          Status: true
        }
        files.controls[index].setValue(imgObj);
      };
      reader.readAsDataURL(file);
    }
  }

  triggerFileInput(fileInput: HTMLInputElement) {
    fileInput.click();
  }

  submitForm() {
    // this.fullForm.controls['ReceiveDate'].setValue(this.pipe.transform(this.fullForm.controls['ReceiveDate'].value, 'yyyy-MM-dd'));
    this.http
      .post(environment.url + "SaveBedsoreForm", {
        _fullForm: this.fullForm.value,
        _patientDetails: this.patientGroup.value
      })
      .subscribe((Response) => {
        if (Response["d"] !== 0) {
          if (this.imageForm.controls['ImagesList'].value.filter(x => x.Content !== "").length > 0) {
            this.imageForm.controls['ImagesList'].value.forEach(element => {
              if (element.Row_ID === null) {
                this.http
                  .post(environment.url + "SaveBedsoreImages", {
                    _imageForm: element,
                    _formIDFK: Response["d"],
                  })
                  .subscribe((Response) => {
                    if (Response["d"]) {
                      this.openSnackBar("נשמר בהצלחה");
                    } else {
                      this.openSnackBar("משהו השתבש, לא נשמר");
                    }
                  });
              } else {
                this.http
                  .post(environment.url + "UpdateBedsoreImages", {
                    _imageForm: element,
                    _formIDFK: Response["d"],
                  })
                  .subscribe((Response) => {
                    if (Response["d"]) {
                      this.openSnackBar("נשמר בהצלחה");
                    } else {
                      this.openSnackBar("משהו השתבש, לא נשמר");
                    }
                  });
              }
              this.closeModal();
            });
          }
          else {
            this.openSnackBar("נשמר בהצלחה");
            this.closeModal();
          }
        } else {
          this.openSnackBar("משהו השתבש, לא נשמר");
        }
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
