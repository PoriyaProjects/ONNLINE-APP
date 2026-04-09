import { HttpClient } from '@angular/common/http';
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DatePipe } from '@angular/common';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { environment } from 'src/environments/environment';
import { FillSurveyComponent } from 'src/app/fill-survey/fill-survey.component';
import { MatTableDataSource } from '@angular/material/table';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';

export interface UsersEmployee {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  derug: string;
  InchargeComplaint: string;
  isRead: string;
  DocLicence: string;
  ADUserName: string;
}

@Component({
  selector: 'app-employees-add-update',
  templateUrl: './employees-add-update.component.html',
  styleUrls: ['./employees-add-update.component.css']
})
export class EmployeesAddUpdateComponent implements OnInit {


  horizontalPosition: MatSnackBarHorizontalPosition = 'start';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';
  employee: any;
  employeePersonalDetails: FormGroup;
  employeeWorkDetails: FormGroup;
  gymDetails: FormGroup;
  trainingsDetails: FormGroup;
  educationsDetails: FormGroup;
  RanksList = [];
  SektorsList = [];
  FunctionsList = [];
  EmployeeBlossomSektors = [];
  SpecialitiesList = [];
  DepartmentsList = [];
  end_work_reasons = [];
  WorkPlacesList = [];
  actionColumns = [''];
  previewImage: string | null = null;
  employee_change_history_list = new MatTableDataSource();
  managerType;
  ImageToBase64: string;
  empType: string = "none";
  UserName = localStorage.getItem("loginUserName").toLowerCase();
  EmployeeExists: boolean;
  myDate = new Date();
  _switchHTOK: any = "0";
  _switchBlossom: any = "0";
  AcceptTerms: any;
  saveBtnWait: boolean = false;
  print_only_Protocol: boolean = false;
  Api = environment.url;
  filteredOptions: Observable<string[]>;
  manfilter = new FormControl();
  filteredOptions2: Observable<string[]>;
  man2filter = new FormControl();
  employees = [];
  columnHeaderMap: { [key: string]: string } = {
    StartWorkDate: 'תאריך תחילת עבודה',
    EmployeeSektorID: 'סקטור עובד',
    EmployeeBlossomSektorID: 'סקטור עובד בבלוסום',
    Title: 'תאור',
    FunctionID: 'תפקיד',
    DepartnentCode: 'מחלקה',
    JobTitleID: 'תאור תפקיד',
    EmployeeID: 'תעודת זהות',
    FirstName: 'שם פרטי',
    StandartJobType: 'חלקיות משרה',
    LastName: 'שם משפחה',
    Gender: 'מגדר',
    RankID: 'דירוג',
    ADUserName: 'שם משתמש',
    Email: 'מייל',
    CellNumber: 'מספר טלפון',
    WorkPlaceID: 'מיקום עבודה',
    EndWorkDate: 'תאריך סיום עבודה',
    CityName: 'עיר',
    CityCode: 'קוד עיר',
    DateOfBirth: 'תאריך לידה',
    Address: 'כתובת',
    DocLicence: 'מספר רישיון',
    DocStartExperience: 'תחילת ניסיון ברישיון',
    InternLearnCountry: 'מיקום לימודים',
    InternLearnCountryDesc: 'מדינת לימודים',
    InternUniversity: 'אונברסיטה',
    UserName: 'שם משתמש',
    UpdateDate: 'תאריך עדכון',
    StatusRow: 'מאושר משאבי אנוש',
    AcceptTerms: 'אישר תקנון',
    ApprovedToBlossom: 'אישור בלוסום',
    FirstNameEng: 'שם פרטי באנגלית',
    LastNameEng: 'שם משפחה באנגלית',
    CarType: 'סוג רכב',
    CarNumber: 'מספר רכב',
    CarType_2: 'סוג רכב נוסף',
    CarNumber_2: 'מספר רכב נוסף',
    Toranot: 'מבצע תורנויות',
    DateToEndWork: 'תאריך לסיום עבודה',
    EndWorkReason: 'סיבת סיום עבודה',
    PersonalEmail: 'מייל אישי',
    SubDepartmentCode: 'תת מחלקה',
  };
  notify_arr = [
    { value: 1, text: 'שמירת הריון' },
    { value: 1, text: 'מחלה ממושכת' },
    { value: 2, text: 'חל"ד' },
    { value: 3, text: 'סיום העסקה בגין התפטרות' },
    { value: 3, text: 'סיום חוזה במועד' },
    { value: 3, text: 'סיום התמחות' },
    { value: 3, text: 'חיצוני סיום העסקה' },
    { value: 4, text: 'סיום העסקה בגין פרישה' }
  ];
  @ViewChild('modalEmployeeHistory', { static: true }) modalEmployeeHistory: TemplateRef<any>;
  dataSource: MatTableDataSource<any>;
  dataSourceEducation: MatTableDataSource<any>;

  constructor(private _snackBar: MatSnackBar,
    public dialog: MatDialogRef<EmployeesAddUpdateComponent>,
    public dialog2: MatDialog,
    private http: HttpClient,
    private formBuilder: FormBuilder
  ) { }

  ngOnInit(): void {
    // this.getImageUrl(this.employee.EmployeeID);
    this.getEmployeesList();
    this.getSektorsList();
    this.getEmployeesToUpdateByID();
    this.getEmployeesFunctionsList();
    this.getRanksList();
    this.getWorkPlacesList();
    this.getEmployeesBlossomSektorList();
    this.getEmployeesEndWorkReasons();
    this.getEmployeeDepartmentList();
    this.getHRDepartmentEmployees();

    this.filteredOptions = this.manfilter.valueChanges
      .pipe(
        startWith(''),
        map(value => this._filter1(value))
      );
    this.filteredOptions2 = this.man2filter.valueChanges
      .pipe(
        startWith(''),
        map(value => this._filter2(value))
      );
    this.getSpecialitiesList();
  }

  getSpecialitiesList() {
    this.http.post(this.Api + "GetEmployeeSpecialitiesList", {}).subscribe((Response) => {
      this.SpecialitiesList = Response["d"];
      console.log(this.SpecialitiesList);
    });
  }

  private _filter1(value: any): string[] {
    const filterValue1 = value;
    if (value != "" && value != undefined) {
      if (value.id != undefined) this.employeeWorkDetails.controls['ManagerID1'].setValue(value);
    }
    return this.employees.filter(option => option.firstname.includes(filterValue1));
  }

  private _filter2(value: any): string[] {
    const filterValue2 = value;
    if (value != "" && value != undefined) {
      if (value.id != undefined) this.employeeWorkDetails.controls['ManagerID2'].setValue(value);
    }
    return this.employees.filter(option => option.firstname.includes(filterValue2));
  }

  displayFn(user: any): string {
    return user && user.firstname ? user.firstname : "";
  }

  displayFn2(user: any): string {
    return user && user.firstname ? user.firstname : "";
  }

  getHRDepartmentEmployees() {
    this.print_only_Protocol = false;
    this.http
      .post(environment.url + "GetHRDepartmentEmployees", {})
      .subscribe((Response) => {
        const exists = Response['d'].some(obj =>
          Object.values(obj).some(val =>
            typeof val === 'string' && val.toLowerCase().includes(this.UserName)
          )
        );
        if (exists) this.print_only_Protocol = true;
      });
  }

  getEmployeesToUpdateByID() {
    this.http
      .post(this.Api + "GetEmployeesToUpdateByID", {
        _empId: this.employee.EmployeeID
      })
      .subscribe((Response) => {
        this.employee = Response["d"][0];
        let RankID = this.employee.RankID;
        let DepartnentCode = this.employee.DepartnentCode;
        let WorkPlaceID = this.employee.WorkPlaceID;
        let functionDefault = this.employee.FunctionID;
        let employeeBlossomSektorID = this.employee.EmployeeBlossomSektorID;
        if (this.managerType == "stager") {
          RankID = "031";
          DepartnentCode = "00079150";
          employeeBlossomSektorID = "1";
          WorkPlaceID = "1";
          functionDefault = "18";
        } else if (this.managerType == "research") {
          WorkPlaceID = "2";
        }
        this.employeePersonalDetails = this.formBuilder.group({
          RowID: new FormControl(this.employee.RowID, null),
          EmployeeID: new FormControl(this.employee.EmployeeID, [Validators.required, Validators.pattern("[0-9 ]{1,9}")]),
          FirstName: new FormControl(this.employee.FirstName, [Validators.required]),
          FirstNameEng: new FormControl(this.employee.FirstNameEng, null),
          LastName: new FormControl(this.employee.LastName, [Validators.required]),
          LastNameEng: new FormControl(this.employee.LastNameEng, null),
          Gender: new FormControl(this.employee.Gender, [Validators.required]),
          KupaID: new FormControl(this.employee.KupaID, null),
          Email: new FormControl(this.employee.Email, null),
          PersonalEmail: new FormControl(this.employee.PersonalEmail, null),
          CellNumber: new FormControl(this.employee.CellNumber, [Validators.required, Validators.pattern("[0-9 ]{10}")]),
          CityName: new FormControl(this.employee.CityName, null),
          ProfilePicture: new FormControl(this.employee.ProfilePicture, null),
          DateOfBirth: new FormControl(this.employee.DateOfBirth, [Validators.required]),
          JobTitleID: new FormControl(this.employee.JobTitleID, [Validators.required]),
        });
        this.gymDetails = this.formBuilder.group({
          GymParticipant: new FormControl(this.employee.GymParticipation.Row_ID != null, null),
          Row_ID: new FormControl(this.employee.GymParticipation.Row_ID, null),
          PaymentDate: new FormControl(this.employee.GymParticipation.PaymentDate, null),
          Payment: new FormControl(this.employee.GymParticipation.Payment, null),
          StartGymDate: new FormControl(this.employee.GymParticipation.StartGymDate, null),
          EndGymDate: new FormControl(this.employee.GymParticipation.EndGymDate, null),
          MedicalProblems: new FormControl(this.employee.GymParticipation.MedicalProblems, null),
          MedicalApproval: new FormControl(this.employee.GymParticipation.MedicalApproval.toLowerCase() == 'true', null),
          PausePeriod: new FormControl(this.employee.GymParticipation.PausePeriod.toLowerCase() == 'true', null),
          PausePeriodExplain: new FormControl(this.employee.GymParticipation.PausePeriodExplain, null),
          EmployeesID: new FormControl(this.employee.GymParticipation.EmployeesID === null ? this.employee.RowID : null, null),
          Status: new FormControl(this.employee.GymParticipation.Status, null),
        });
        this.trainingsDetails = this.formBuilder.group({
          trainings: this.formBuilder.array([])
        });
        this.educationsDetails = this.formBuilder.group({
          educations: this.formBuilder.array([])
        });
        this.employeeWorkDetails = this.formBuilder.group({
          RowID: new FormControl(this.employee.RowID, null),
          EmployeeIndex: new FormControl('', null),
          StandartJobType: new FormControl(this.employee.StandartJobType, null),
          StartWorkDate: new FormControl(this.employee.StartWorkDate, Validators.required),
          EmployeeSektorID: new FormControl(this.employee.EmployeeSektorID, Validators.required),
          EmployeeBlossomSektorID: new FormControl(employeeBlossomSektorID, Validators.required),
          Title: new FormControl(this.employee.Title, null),
          FunctionID: new FormControl(functionDefault, null),
          DepartnentCode: new FormControl(DepartnentCode, Validators.required),
          SubDepartmentCode: new FormControl(this.employee.SubDepartmentCode, null),
          RankID: new FormControl(RankID, null),
          ADUserName: new FormControl('', null),
          WorkPlaceID: new FormControl(WorkPlaceID, null),
          EndWorkDate: new FormControl(this.employee.EndWorkDate, null),
          DateToEndWork: new FormControl(this.employee.DateToEndWork, null),
          EndWorkReason: new FormControl(this.employee.EndWorkReason, null),
          CarType: new FormControl(this.employee.CarType, null),
          CarNumber: new FormControl(this.employee.CarNumber, null),
          CarType2: new FormControl(this.employee.CarType2, null),
          CarNumber2: new FormControl(this.employee.CarNumber2, null),
          Remarks: new FormControl(this.employee.Remarks, null),
          Notifications: new FormControl(this.employee.Notifications, null),
          DocLicence: new FormControl(this.employee.DocLicence, null),
          DocStartExperience: new FormControl(this.employee.DocStartExperience, null),
          InternLearnCountry: new FormControl(this.employee.InternLearnCountry, null),
          InternLearnCountryDesc: new FormControl(this.employee.InternLearnCountryDesc, null),
          InternUniversity: new FormControl(this.employee.InternUniversity, null),
          StatusRow: new FormControl(this.employee.StatusRow, null),
          ApprovedToBlossom: new FormControl(this.employee.ApprovedToBlossom, null),
          AcceptTerms: new FormControl(this.employee.AcceptTerms, null),
          Toranot: new FormControl(this.employee.Toranot, null),
          ManagerID1: new FormControl({ id: this.employee.ManagerID1.id, firstname: "", lastname: "", ADUserName: "" }, Validators.required),
          ManagerID2: new FormControl({ id: this.employee.ManagerID2.id, firstname: "", lastname: "", ADUserName: "" }, Validators.required),
        });
        if (this.employee.RowID == null || this.employee.StatusRow == "1") {
          this.employeePersonalDetails.controls['FirstNameEng'].setValidators(Validators.required);
          this.employeePersonalDetails.controls['LastNameEng'].setValidators(Validators.required);
        }
        this.markRequiredFields();
        this._switchHTOK = this.employee.StatusRow;
        this._switchBlossom = this.employee.ApprovedToBlossom;
        this.AcceptTerms = this.employee.AcceptTerms;
        this.sektorSelection(this.employee.EmployeeSektorID);
        this.getUserName(this.employee.Email);
        this.dataSource = new MatTableDataSource();
        this.dataSourceEducation = new MatTableDataSource();
        this.createTrainingGroup(this.employee.EmployeeTrainings)
        this.createEducationGroup(this.employee.EmployeeEducations)
      });
  }

  createTrainingGroup(arr) {
    let temp = this.formBuilder.group({
      Row_ID: [null, null],
      TrainingSubject: [null, null],
      StartDate: [null, null],
      EndDate: [null, null],
      Note: [null, null]
    });
    if (arr != null) {
      arr.forEach(element => {
        temp = this.formBuilder.group({
          Row_ID: [element.Row_ID, null],
          TrainingSubject: [element.TrainingSubject, null],
          StartDate: [element.StartDate, null],
          EndDate: [element.EndDate, null],
          Note: [element.Note, null]
        });
        this.trainings.push(temp);
      });
    } else this.trainings.push(temp);

    this.dataSource.data = this.trainings.controls;
  }

  createEducationGroup(arr) {
    let temp = this.formBuilder.group({
      Row_ID: [null, null],
      EducationSubject: [null, null],
      Speciality: [null, null],
      EducationDate: [null, null],
      Note: [null, null]
    });
    if (arr != null) {
      arr.forEach(element => {
        temp = this.formBuilder.group({
          Row_ID: [element.Row_ID, null],
          EducationSubject: [element.EducationSubject, null],
          Speciality: [element.Speciality, null],
          EducationDate: [element.EducationDate, null],
          Note: [element.Note, null]
        });
        this.educations.push(temp);
      });
    } else this.educations.push(temp);

    this.dataSourceEducation.data = this.educations.controls;
  }

  get educations(): FormArray {
    return this.educationsDetails.get('educations') as FormArray;
  }

  removeEducationRow(index: number) {
    this.educations.removeAt(index);
    this.dataSourceEducation.data = this.educations.controls; // Refresh table after removal
  }

  onEducationDateInput(event: MatDatepickerInputEvent<Date>, rowIndex: number): void {
    let pipe = new DatePipe('en-US');
    const selectedDate = event.value;
    const currentRow = this.educations.at(rowIndex) as FormGroup;
    currentRow.get('EducationDate')?.setValue(pipe.transform(selectedDate, 'yyyy-MM-dd'));
  }

  get trainings(): FormArray {
    return this.trainingsDetails.get('trainings') as FormArray;
  }

  removeTrainingRow(index: number) {
    this.trainings.removeAt(index);
    this.dataSource.data = this.trainings.controls; // Refresh table after removal
  }
  
  onStartDateInput(event: MatDatepickerInputEvent<Date>, rowIndex: number): void {
    let pipe = new DatePipe('en-US');
    const selectedDate = event.value;
    const currentRow = this.trainings.at(rowIndex) as FormGroup;
    currentRow.get('StartDate')?.setValue(pipe.transform(selectedDate, 'yyyy-MM-dd'));
  }

  onEndDateInput(event: MatDatepickerInputEvent<Date>, rowIndex: number): void {
    let pipe = new DatePipe('en-US');
    const selectedDate = event.value;
    const currentRow = this.trainings.at(rowIndex) as FormGroup;
    currentRow.get('EndDate')?.setValue(pipe.transform(selectedDate, 'yyyy-MM-dd'));
  }

  // onStartDateChange(event: MatDatepickerInputEvent<Date>, rowIndex: number): void {
  //   const selectedDate = event.value;
  //   const currentRowFormGroup = this.trainings.at(rowIndex) as FormGroup;
  //   const startDateControlValue = currentRowFormGroup.get('StartDate')?.value;
  //   console.log(`Form control value for StartDate in row ${rowIndex}:`, startDateControlValue);
  // }

  getEmployeesList() {
    this.http
      .post(this.Api + "GetUsersForInquiries", {
      })
      .subscribe((Response) => {
        let all_users_filter = Response["d"];
        all_users_filter.forEach(element => {
          this.employees.push({
            firstname: element.firstname + " " + element.lastname,
            id: element.id,
            ADUserName: element.ADUserName.toLowerCase()
          });
        });
        this.manfilter.setValue(this.employees.filter(t => t.id === this.employee.ManagerID1.id)[0]);
        this.man2filter.setValue(this.employees.filter(t => t.id === this.employee.ManagerID2.id)[0]);
      });
  }

  switchHTOK() {
    if (this._switchHTOK != "1") {
      this._switchHTOK = "1";
      this.employeePersonalDetails.controls['FirstNameEng'].setValidators(Validators.required);
      this.employeePersonalDetails.controls['LastNameEng'].setValidators(Validators.required);
      this.employeeWorkDetails.controls['StatusRow'].setValue(this._switchHTOK);
    } else {
      this._switchHTOK = "0";
      this.employeePersonalDetails.controls['FirstNameEng'].setValidators(null);
      this.employeePersonalDetails.controls['LastNameEng'].setValidators(null);
      this.employeeWorkDetails.controls['StatusRow'].setValue(this._switchHTOK);
    }
  }

  switchBlossom() {
    if (this._switchBlossom != "1") {
      this._switchBlossom = "1";
      this.employeeWorkDetails.controls['ApprovedToBlossom'].setValue(this._switchBlossom);
    } else {
      this._switchBlossom = "0";
      this.employeeWorkDetails.controls['ApprovedToBlossom'].setValue(this._switchBlossom);
    }
  }

  togglePreview() {
    this.previewImage = this.employeePersonalDetails.controls['ProfilePicture'].value;
  }

  closePreview() {
    this.previewImage = null;
  }

  goToSignForm() {
    let dialogRef = this.dialog2.open(FillSurveyComponent, { disableClose: true });
    dialogRef.componentInstance.urlID = 121;
    dialogRef.componentInstance.ifContinueForm = 0;
    dialogRef.componentInstance.NurseID = 0;
    dialogRef.afterClosed().subscribe(res => {
      console.log(res);
    });
  }

  markRequiredFields() {
    this.employeePersonalDetails.controls['EmployeeID'].markAsTouched();
    this.employeePersonalDetails.controls['FirstName'].markAsTouched();
    this.employeePersonalDetails.controls['LastName'].markAsTouched();
    this.employeePersonalDetails.controls['CellNumber'].markAsTouched();
    this.employeePersonalDetails.controls['DateOfBirth'].markAsTouched();
    if (this.employee.RowID == null) {
      this.employeePersonalDetails.controls['FirstNameEng'].markAsTouched();
      this.employeePersonalDetails.controls['LastNameEng'].markAsTouched();
    }
    this.employeeWorkDetails.controls['StartWorkDate'].markAsTouched();
  }

  getEmployeeIndex() {
    return this.employeeWorkDetails.controls['DepartnentCode'].value + '_' + this.employeeWorkDetails.controls['EmployeeSektorID'].value;
  }

  getUserName(email) {
    if (email == "") {
      email = this.employeePersonalDetails.controls['Email'].value;
    }
    let userName = "";
    if (email != undefined && email != "") {
      let domain = email.split('@')[1];
      if (domain.toLowerCase() == "tzmc.gov.il" || domain.toLowerCase() == "poria.health.gov.il") {
        userName = email.split('@')[0];
        this.employeeWorkDetails.controls['ADUserName'].setValue(userName);
      }
    }
    return userName;
  }

  duplicateToNewEmployee() {
    this.employeePersonalDetails.reset();
    this.employeeWorkDetails.controls['ADUserName'].reset();
    this.employeeWorkDetails.controls['RowID'].reset();
    this.employeeWorkDetails.controls['DocStartExperience'].reset();
    this.employeeWorkDetails.controls['DocLicence'].reset();
    this.employeeWorkDetails.controls['StartWorkDate'].setValue(this.myDate); //set to today
  }

  EmployeeChangeHistory(_employee_id) {
    this.http
      .post(this.Api + "EmployeeChangeHistory", {
        _employee_id: _employee_id
      })
      .subscribe((Response) => {
        this.employee_change_history_list = new MatTableDataSource(Response["d"]);
        if (this.employee_change_history_list.filteredData.length > 0) {
          const dataKeys = Object.keys(this.employee_change_history_list.filteredData[0]);

          // Only columns that exist in columnHeaderMap
          this.actionColumns = Object.keys(this.columnHeaderMap)
            .filter(key => dataKeys.includes(key));
        }
        this.dialog2.open(this.modalEmployeeHistory, { width: '90%', disableClose: false });
      });
  }

  closeModal() {
    this.dialog2.closeAll();
  }

  getRanksList() {
    this.http
      .post(this.Api + "GetRanksList", {
      })
      .subscribe((Response) => {
        this.RanksList = Response["d"];
      });
  }

  getWorkPlacesList() {
    this.http
      .post(this.Api + "GetWorkPlacesList", {
      })
      .subscribe((Response) => {
        this.WorkPlacesList = Response["d"];
      });
  }

  getEmployeeDepartmentList() {
    this.http
      .post(this.Api + "GetEmployeeDepartmentList", {
      })
      .subscribe((Response) => {
        this.DepartmentsList = Response["d"];
      });
  }

  getSektorsList() {
    this.http
      .post(this.Api + "GetSektorsList", {
      })
      .subscribe((Response) => {
        this.SektorsList = Response["d"];
      });
  }

  getEmployeesFunctionsList() {
    this.http
      .post(this.Api + "GetEmployeesFunctionsList", {
        _userName: this.UserName
      })
      .subscribe((Response) => {
        this.FunctionsList = Response["d"];
      });
  }

  getEmployeesBlossomSektorList() {
    this.http
      .post(this.Api + "GetEmployeesBlossomSektorList", {
      })
      .subscribe((Response) => {
        this.EmployeeBlossomSektors = Response["d"];
      });
  }

  getEmployeesEndWorkReasons() {
    this.http
      .post(this.Api + "GetEmployeesEndWorkReasons", {
      })
      .subscribe((Response) => {
        this.end_work_reasons = Response["d"];
      });
  }

  openSnackBar(message) {
    this._snackBar.open(message, 'X', {
      duration: 5000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }

  checkIfExists() {
    this.http
      .post(this.Api + "CheckIfEmployeeExists", {
        _EmployeeID: this.employeePersonalDetails.controls['EmployeeID'].value
      })
      .subscribe((Response) => {
        if (Response["d"].EmployeeID != null) {
          this.openSnackBar("העובד קיים במערכת - ליצור קשר עם מערכות מידע");
          this.EmployeeExists = true;
          this.employee = Response["d"];
          if (this.managerType != "stager") {
            let RankID = this.employee.RankID;
            let DepartnentCode = this.employee.DepartnentCode;
            let WorkPlaceID = this.employee.WorkPlaceID;
            let functionDefault = this.employee.FunctionID;
            let employeeBlossomSektorID = this.employee.EmployeeBlossomSektorID;
            this.employeePersonalDetails = this.formBuilder.group({
              RowID: new FormControl(this.employee.RowID, null),
              EmployeeID: new FormControl(this.employee.EmployeeID, [Validators.required, Validators.pattern("[0-9 ]{1,9}")]),
              FirstName: new FormControl(this.employee.FirstName, [Validators.required]),
              FirstNameEng: new FormControl(this.employee.FirstNameEng, null),
              LastName: new FormControl(this.employee.LastName, [Validators.required]),
              LastNameEng: new FormControl(this.employee.LastNameEng, null),
              Gender: new FormControl(this.employee.Gender, [Validators.required]),
              KupaID: new FormControl(this.employee.KupaID, null),
              Email: new FormControl(this.employee.Email, null),
              PersonalEmail: new FormControl(this.employee.PersonalEmail, null),
              CellNumber: new FormControl(this.employee.CellNumber, [Validators.required, Validators.pattern("[0-9 ]{10}")]),
              CityName: new FormControl(this.employee.CityName, null),
              DateOfBirth: new FormControl(this.employee.DateOfBirth, [Validators.required]),
              JobTitleID: new FormControl(this.employee.JobTitleID, [Validators.required]),
            });
            this.gymDetails = this.formBuilder.group({
              GymParticipant: new FormControl(this.employee.GymParticipation.Row_ID != null, null),
              Row_ID: new FormControl(this.employee.GymParticipation.Row_ID, null),
              PaymentDate: new FormControl(this.employee.GymParticipation.PaymentDate, null),
              Payment: new FormControl(this.employee.GymParticipation.Payment, null),
              StartGymDate: new FormControl(this.employee.GymParticipation.StartGymDate, null),
              EndGymDate: new FormControl(this.employee.GymParticipation.EndGymDate, null),
              MedicalProblems: new FormControl(this.employee.GymParticipation.MedicalProblems, null),
              MedicalApproval: new FormControl(this.employee.GymParticipation.MedicalApproval.toLowerCase() == 'true', null),
              PausePeriod: new FormControl(this.employee.GymParticipation.PausePeriod.toLowerCase() == 'true', null),
              PausePeriodExplain: new FormControl(this.employee.GymParticipation.PausePeriodExplain, null),
              EmployeesID: new FormControl(this.employee.GymParticipation.EmployeesID === null ? this.employee.RowID : null, null),
              Status: new FormControl(this.employee.GymParticipation.Status, null),
            });
            this.trainingsDetails = this.formBuilder.group({
              trainings: this.formBuilder.array([])
            });
            this.employeeWorkDetails = this.formBuilder.group({
              RowID: new FormControl(this.employee.RowID, null),
              EmployeeIndex: new FormControl('', null),
              StandartJobType: new FormControl(this.employee.StandartJobType, null),
              StartWorkDate: new FormControl(this.employee.StartWorkDate, Validators.required),
              EmployeeSektorID: new FormControl(this.employee.EmployeeSektorID, Validators.required),
              EmployeeBlossomSektorID: new FormControl(employeeBlossomSektorID, Validators.required),
              Title: new FormControl(this.employee.Title, null),
              FunctionID: new FormControl(functionDefault, null),
              DepartnentCode: new FormControl(DepartnentCode, Validators.required),
              SubDepartmentCode: new FormControl(this.employee.SubDepartmentCode, null),
              RankID: new FormControl(RankID, null),
              ADUserName: new FormControl('', null),
              WorkPlaceID: new FormControl(WorkPlaceID, null),
              EndWorkDate: new FormControl(this.employee.EndWorkDate, null),
              DateToEndWork: new FormControl(this.employee.DateToEndWork, null),
              EndWorkReason: new FormControl(this.employee.EndWorkReason, null),
              CarType: new FormControl(this.employee.CarType, null),
              CarNumber: new FormControl(this.employee.CarNumber, null),
              CarType2: new FormControl(this.employee.CarType2, null),
              CarNumber2: new FormControl(this.employee.CarNumber2, null),
              Remarks: new FormControl(this.employee.Remarks, null),
              Notifications: new FormControl(this.employee.Notifications, null),
              DocLicence: new FormControl(this.employee.DocLicence, null),
              DocStartExperience: new FormControl(this.employee.DocStartExperience, null),
              InternLearnCountry: new FormControl(this.employee.InternLearnCountry, null),
              InternLearnCountryDesc: new FormControl(this.employee.InternLearnCountryDesc, null),
              InternUniversity: new FormControl(this.employee.InternUniversity, null),
              StatusRow: new FormControl(this.employee.StatusRow, null),
              ApprovedToBlossom: new FormControl(this.employee.ApprovedToBlossom, null),
              AcceptTerms: new FormControl(this.employee.AcceptTerms, null),
              Toranot: new FormControl(this.employee.Toranot, null),
              ManagerID1: new FormControl(this.employee.ManagerID1, null),
              ManagerID2: new FormControl(this.employee.ManagerID2, null),
            });
            this._switchHTOK = this.employee.StatusRow;
            this._switchBlossom = this.employee.ApprovedToBlossom;
            this.AcceptTerms = this.employee.AcceptTerms;
          } else {
            this.employeePersonalDetails.disable();
            this.employeeWorkDetails.disable();
          }
        }
      });
  }

  setLearnCountry(country) {
    if (country.value == "ארץ") {
      this.employeeWorkDetails.controls['InternLearnCountryDesc'].setValue('ישראל');
    } else {
      this.employeeWorkDetails.controls['InternLearnCountryDesc'].setValue('');
    }
  }

  sektorSelection(sektor) {
    this.employeeWorkDetails.controls['EmployeeSektorID'].setValue(sektor);
    if (sektor == "999") {
      this.empType = "doctor";
    } else if (sektor == "899") {
      this.empType = "stager";
    } else {
      this.empType = "none";
    }
  }

  setEndTime() {
    let pipe = new DatePipe('en-US');
    this.gymDetails.controls['EndGymDate'].setValue(new Date());
    this.gymDetails.controls['EndGymDate'].value.setMonth(this.gymDetails.controls['StartGymDate'].value.getMonth() + 3);
    this.gymDetails.controls['EndGymDate'].value.setDate(this.gymDetails.controls['StartGymDate'].value.getDate());
    this.gymDetails.controls['EndGymDate'].setValue(pipe.transform(this.gymDetails.controls['EndGymDate'].value, 'yyyy-MM-dd'));
  }

  setTrainingEndTime(index) {
    let pipe = new DatePipe('en-US');
    let month = new Date(this.trainingsDetails.controls.trainings['controls'][index].controls.StartDate.value);
    this.trainingsDetails.controls.trainings['controls'][index].controls.EndDate.setValue(new Date());
    this.trainingsDetails.controls.trainings['controls'][index].controls.EndDate.value.setYear(month.getFullYear() + 2);
    this.trainingsDetails.controls.trainings['controls'][index].controls.EndDate.value.setDate(month.getDate());
    this.trainingsDetails.controls.trainings['controls'][index].controls.EndDate.setValue(pipe.transform(this.trainingsDetails.controls.trainings['controls'][index].controls.EndDate.value, 'yyyy-MM-dd'));
  }

  saveEmployee() {
    this.employeeWorkDetails.controls['EmployeeIndex'].setValue(this.getEmployeeIndex());
    let pipe = new DatePipe('en-US');
    this.employeeWorkDetails.controls['StartWorkDate'].setValue(pipe.transform(this.employeeWorkDetails.controls['StartWorkDate'].value, 'yyyy-MM-dd'));
    this.employeeWorkDetails.controls['DocStartExperience'].setValue(pipe.transform(this.employeeWorkDetails.controls['DocStartExperience'].value, 'yyyy-MM-dd'));
    this.employeeWorkDetails.controls['EndWorkDate'].setValue(pipe.transform(this.employeeWorkDetails.controls['EndWorkDate'].value, 'yyyy-MM-dd'));
    this.employeeWorkDetails.controls['DateToEndWork'].setValue(pipe.transform(this.employeeWorkDetails.controls['DateToEndWork'].value, 'yyyy-MM-dd'));
    this.employeePersonalDetails.controls['DateOfBirth'].setValue(pipe.transform(this.employeePersonalDetails.controls['DateOfBirth'].value, 'yyyy-MM-dd'));
    this.gymDetails.controls['StartGymDate'].setValue(pipe.transform(this.gymDetails.controls['StartGymDate'].value, 'yyyy-MM-dd'));
    this.gymDetails.controls['PaymentDate'].setValue(pipe.transform(this.gymDetails.controls['PaymentDate'].value, 'yyyy-MM-dd'));
    if (this.employeeWorkDetails.controls['StatusRow'].value == null || this.employeeWorkDetails.controls['StatusRow'].value == "0") {
      this.employeeWorkDetails.controls['StatusRow'].setValue('0');
      this.employeePersonalDetails.controls['FirstNameEng'].setValidators(null);
      this.employeePersonalDetails.controls['LastNameEng'].setValidators(null);
    } else if (this.employeeWorkDetails.controls['StatusRow'].value == "1") {
      this.employeePersonalDetails.controls['FirstNameEng'].setValidators(Validators.required);
      this.employeePersonalDetails.controls['LastNameEng'].setValidators(Validators.required);
    }
    if (!this.employeeWorkDetails.invalid && !this.employeePersonalDetails.invalid) {
      this.saveBtnWait = true;
      this.http
        .post(this.Api + "SaveEmployeeDetails", {
          _personalDetails: this.employeePersonalDetails.getRawValue(),
          _workDetails: this.employeeWorkDetails.getRawValue(),
          _gymDetails: this.gymDetails.getRawValue(),
          _trainingsDetails: this.trainingsDetails.value.trainings,
          _educationsDetails: this.educationsDetails.value.educations,
          _userName: this.UserName,
        })
        .subscribe((Response) => {
          if (Response["d"]) {
            this.openSnackBar("נשמר בהצלחה");
            this.dialog.close(1);
          } else {
            this.openSnackBar("משהו השתבש, לא נשמר");
          }
        });
    } else {
      this.openSnackBar("שכחת שדה חובה!");
    }
  }

}
