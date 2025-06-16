import { HttpClient } from '@angular/common/http';
import { Component, Inject, OnInit, Optional } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { DialogContentExampleDialog } from "../../../fill-survey/fill-survey.component";
import { environment } from 'src/environments/environment';
import { DatePipe } from '@angular/common';
import { map, startWith } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-training-request-form',
  templateUrl: './training-request-form.component.html',
  styleUrls: ['./training-request-form.component.scss'],
  providers: [{
    provide: STEPPER_GLOBAL_OPTIONS, useValue: { showError: true }
  }]
})
export class TrainingRequestFormComponent implements OnInit {
  Training_Request_Forms_A: FormGroup;
  Training_Request_Forms_B: FormGroup;
  Training_Request_Forms_C: FormGroup;
  Training_Request_Forms_D: FormGroup;
  Training_Request_Forms_E: FormGroup;
  Training_Request_Forms_F: FormGroup;
  Training_Request_Forms_H: FormGroup;
  Training_Request_Forms_G: FormGroup;
  formData: any;
  Health_Corporation_Options = {
    QuestionText: '',
    Training_Request_Options: [
      { OptionID: 0, OptionText: '' }
    ]
  };
  Department_Fund_Options = {
    QuestionText: '',
    Training_Request_Options: [
      { OptionID: 0, OptionText: '' }
    ]
  };
  Training_Importantce_Options = {
    QuestionText: '',
    Training_Request_Options: [
      { OptionID: 0, OptionText: '' }
    ]
  };
  Training_Importantce_Options2 = {
    QuestionText: '',
    Training_Request_Options: [
      { OptionID: 0, OptionText: '' }
    ]
  };
  Training_Importantce_Options3 = {
    QuestionText: '',
    Training_Request_Options: [
      { OptionID: 0, OptionText: '' }
    ]
  };
  plansList = [];
  employees = [];
  intity_list = [];
  CitiesArray: any[] = [];
  // titleList = ["מר", "גב'", "דר'", "פרופ'"];
  educationList = ["תיכונית", "מקצועית", "תואר ראשון", "תואר שני", "תואר שלישי"];
  requested: boolean = false;
  dorit_note_answer: boolean = false;
  horizontalPosition: MatSnackBarHorizontalPosition = "start";
  verticalPosition: MatSnackBarVerticalPosition = "bottom";
  passport: any = localStorage.getItem('ID').toLowerCase();
  user_name: any = localStorage.getItem('loginUserName').toLowerCase();
  filteredOptions: Observable<string[]>;
  Supervisor_Name1 = new FormControl();
  filteredOptions2: Observable<string[]>;
  Supervisor_Name2 = new FormControl();
  cityOptions: Observable<string[]>;
  cityControl = new FormControl("", Validators.required);
  date_now: any = Date.now();
  health_checkbox: any;
  fund_checkbox: any;

  constructor(
    private fb: FormBuilder,
    public dialog: MatDialog,
    private http: HttpClient,
    private activatedRoute: ActivatedRoute,
    private datePipe: DatePipe,
    private _snackBar: MatSnackBar,
    private confirmationDialogService: ConfirmationDialogService,
    @Optional() @Inject(MAT_DIALOG_DATA) public form_id: any,
    @Optional() private dialogRef: MatDialogRef<TrainingRequestFormComponent>
  ) {
    if (this.activatedRoute.snapshot.paramMap.get('id') != null) {
      this.form_id = this.activatedRoute.snapshot.paramMap.get('id');
    }
    this.buildFormGroup();
    this.date_now = this.datePipe.transform(this.date_now, 'yyyy-MM-dd');
  }

  ngOnInit(): void {
    if (this.passport && this.form_id == "") {
      this.getPersonDetails();
    }
    this.getAllTrainingRequestQuestionsList();
    this.getTrainingRequestPlansList();
    this.getPlanningIntityList();
    this.getEmployeesList();
    this.getCityCodes();
    this.filteredOptions = this.Supervisor_Name1.valueChanges
      .pipe(
        startWith(''),
        map(value => this._filter(value))
      );
    this.filteredOptions2 = this.Supervisor_Name2.valueChanges
      .pipe(
        startWith(''),
        map(value => this._filter2(value))
      );
  }

  check_if_fund_or_health() {
    let health = this.Training_Request_Forms_D.value.Health_Corporation?.filter(x => x != null);
    let fund = this.Training_Request_Forms_D.value.Department_Fund?.filter(x => x != null);
    if ((health?.length == 0 && fund?.length == 0) || (health == undefined && fund == undefined)) this.dorit_note_answer = false;
    else this.dorit_note_answer = true;
    if (health.length > 0) this.health_checkbox = true;
    if (fund.length > 0) this.fund_checkbox = true;
  }

  changeCity(event) {
    this.Training_Request_Forms_B.controls["Request_Location"].setValue(event);
  }

  private _filter(value: any): any[] {
    const filterValue1 = typeof value === 'string' ? value : value?.firstname || '';
    if (value && value.id !== undefined) {
      const currentValue = this.Training_Request_Forms_E.controls['Supervisor_Name'].value;
      if (currentValue !== value) {
        this.Training_Request_Forms_E.controls['Supervisor_Name'].setValue(value, { emitEvent: false });
      }
    }
    // Filter based on the provided value
    return this.employees.filter(option => option.firstname?.includes(filterValue1));
  }

  private city_filter(value: string): any[] {
    const filterValue = value.toLowerCase();
    return this.CitiesArray.filter((option) =>
      option.cityName.includes(filterValue)
    );
  }

  private _filter2(value: any): string[] {
    const filterValue1 = value;
    if (value && value.id !== undefined) {
      const currentValue = this.Training_Request_Forms_F.controls['Supervisor_Name'].value;
      if (currentValue !== value) {
        this.Training_Request_Forms_F.controls['Supervisor_Name'].setValue(value, { emitEvent: false }); // Prevent emitting events
      }
    }
    return this.employees.filter(option => option.firstname.includes(filterValue1));
  }

  displayFn(user: any): string {
    if (user) {
      // Display firstname if available, otherwise fallback to id or a placeholder
      return user.firstname ? user.firstname : user.id ? user.id : '';
    }
    return '';
  }

  displayFn2(user: any): string {
    if (user) {
      // Display firstname if available, otherwise fallback to id or a placeholder
      return user.firstname ? user.firstname : user.id ? user.id : '';
    }
    return '';
  }

  buildFormGroup() {
    this.http
      .post(environment.url + "GetTrainingRequestFormDataByID", {
        id: this.form_id,
      })
      .subscribe((Response) => {
        this.formData = Response['d'];
        let Training_Request_Forms_A = this.formData['A'];
        let Training_Request_Forms_B = this.formData['B'];
        let Training_Request_Forms_C = this.formData['C'];
        let Training_Request_Forms_D = this.formData['D'];
        let Training_Request_Forms_E = this.formData['E'];
        let Training_Request_Forms_F = this.formData['F'];
        let Training_Request_Forms_H = this.formData['H'];
        let Training_Request_Forms_G = this.formData['G'];
        this.Training_Request_Forms_A = this.fb.group({
          Row_ID: new FormControl(Training_Request_Forms_A?.Row_ID, null),
          Title: new FormControl(Training_Request_Forms_A?.Title, Validators.required),
          Family_Name: new FormControl(Training_Request_Forms_A?.Family_Name, Validators.required),
          First_Name: new FormControl(Training_Request_Forms_A?.First_Name, Validators.required),
          Passport_ID: new FormControl(Training_Request_Forms_A?.Passport_ID, [Validators.required, Validators.pattern(/^\d+$/)]),
          Address: new FormControl(Training_Request_Forms_A?.Address, Validators.required),
          Education: new FormControl(Training_Request_Forms_A?.Education, Validators.required),
          Phone_Number: new FormControl(Training_Request_Forms_A?.Phone_Number, [Validators.required, Validators.pattern(/^\d+$/)]),
        });
        this.Training_Request_Forms_B = this.fb.group({
          Request_Name: new FormControl(Training_Request_Forms_B?.Request_Name, Validators.required),
          Request_Location: new FormControl(Training_Request_Forms_B?.Request_Location, Validators.required),
          Planning_Intity: new FormControl(Training_Request_Forms_B?.Planning_Intity, null),
          Planning_Intity_Text: new FormControl(Training_Request_Forms_B?.Planning_Intity_Text, null),
          Date_Start: new FormControl(Training_Request_Forms_B?.Date_Start, Validators.required),
          Date_End: new FormControl(Training_Request_Forms_B?.Date_End, Validators.required),
          Request_Duration: new FormControl(Training_Request_Forms_B?.Request_Duration, [Validators.required, Validators.pattern(/^[0-9]*$/)]),
          Education_Fee: new FormControl({ value: Training_Request_Forms_B?.Education_Fee, disabled: Training_Request_Forms_B?.Training_Out == 'True' }, [Validators.required, Validators.pattern(/^\d+$/)]),
          // Transportation: new FormControl(Training_Request_Forms_B?.Transportation == 'True' ? true : false, null),
          Program_Attached: new FormControl(Training_Request_Forms_B?.Program_Attached, Validators.required),
          Poster_Attached: new FormControl(Training_Request_Forms_B?.Poster_Attached, null),
          Absence_Time: new FormControl({ value: Training_Request_Forms_B?.Absence_Time, disabled: this.user_name != 'ttsrefati' ? true : false }, [Validators.pattern(/^\d+$/)]),
          Training_Out: new FormControl(Training_Request_Forms_B?.Training_Out == 'True' ? true : false, null),
          Galilean_Partnership: new FormControl(Training_Request_Forms_B?.Galilean_Partnership == 'True' ? true : false, null),
          Request_Note: new FormControl(Training_Request_Forms_B?.Request_Note, null),
        });
        this.Training_Request_Forms_C = this.fb.group({
          Request_Name: new FormControl(Training_Request_Forms_C?.Request_Name == null ? this.date_now : Training_Request_Forms_C?.Request_Name, Validators.required),
          Request_Sign: new FormControl(Training_Request_Forms_C?.Request_Sign === "" ? undefined : Training_Request_Forms_C?.Request_Sign, null),
        });
        this.Training_Request_Forms_D = this.fb.group({
          Hospital_Budget: new FormControl(Training_Request_Forms_D?.Hospital_Budget == 'True' ? true : false, null),
          Galilean_Partnership: new FormControl(Training_Request_Forms_D?.Galilean_Partnership == 'True' ? true : false, null),
          OutSource_Company: new FormControl(Training_Request_Forms_D?.OutSource_Company == 'True' ? true : false, null),
          OutSource_Company_Plan: new FormControl(Training_Request_Forms_D?.OutSource_Company_Plan, null),
          OutSource_Company_Direct: new FormControl(Training_Request_Forms_D?.OutSource_Company_Direct == 'True' ? true : false, null),
          Budget_Amount: new FormControl(Training_Request_Forms_D?.Budget_Amount, [Validators.pattern(/^\d+(\.\d{1,2})?$/)]),
          Health_Corporation: new FormControl(Training_Request_Forms_D?.Health_Corporation == undefined ? [] : Training_Request_Forms_D?.Health_Corporation, null),
          Health_Corporation_Description: new FormControl(Training_Request_Forms_D?.Health_Corporation_Description, null),
          Department_Fund: new FormControl(Training_Request_Forms_D?.Department_Fund == undefined ? [] : Training_Request_Forms_D?.Department_Fund, null),
          Galilean_Partnership_Description: new FormControl(Training_Request_Forms_D?.Galilean_Partnership_Description, null),
          Training_Fund_Answer: new FormControl(Training_Request_Forms_D?.Training_Fund_Answer, null),
        });
        this.Training_Request_Forms_E = this.fb.group({
          Training_Importantce: new FormControl(Training_Request_Forms_E?.Training_Importantce, null),
          Recommendations: new FormControl(Training_Request_Forms_E?.Recommendations, null),
          Opinion_Date: new FormControl(Training_Request_Forms_E?.Opinion_Date == null ? this.date_now : Training_Request_Forms_E?.Opinion_Date, null),
          Supervisor_Name: new FormControl(Training_Request_Forms_E?.Supervisor_Name, null),
          Supervisor_Sign: new FormControl(Training_Request_Forms_E?.Supervisor_Sign, null),
          Sent_To_Manager: new FormControl(Training_Request_Forms_E?.Sent_To_Manager, null),
          Approved: new FormControl(Training_Request_Forms_E?.Approved, null),
        });
        this.Training_Request_Forms_F = this.fb.group({
          Training_Importantce: new FormControl(Training_Request_Forms_F?.Training_Importantce, null),
          Recommendations: new FormControl(Training_Request_Forms_F?.Recommendations, null),
          Opinion_Date: new FormControl(Training_Request_Forms_F?.Opinion_Date == null ? this.date_now : Training_Request_Forms_F?.Opinion_Date, null),
          Supervisor_Name: new FormControl(Training_Request_Forms_F?.Supervisor_Name, null),
          Supervisor_Sign: new FormControl(Training_Request_Forms_F?.Supervisor_Sign, null),
          Approved: new FormControl(Training_Request_Forms_F?.Approved, null),
        });
        this.Training_Request_Forms_H = this.fb.group({
          Opinion_Date: new FormControl(Training_Request_Forms_H?.Opinion_Date == null ? this.date_now : Training_Request_Forms_H?.Opinion_Date, null),
          Training_Type: new FormControl(Training_Request_Forms_H?.Training_Type, null),
          Approved: new FormControl(Training_Request_Forms_H?.Approved, null),
          Transportaion: new FormControl(Training_Request_Forms_H?.Transportaion == 'True' ? true : false, null),
          Approved_Percent: new FormControl(Training_Request_Forms_H?.Approved_Percent, [
            Validators.pattern(/^[0-9]*$/), // Only numbers allowed
            Validators.max(100)            // Maximum value is 100
          ]),
          Approved_Percent_Out_Of: new FormControl(Training_Request_Forms_B?.Education_Fee == '' ? Training_Request_Forms_H?.Approved_Percent_Out_Of : Training_Request_Forms_B?.Education_Fee, null),
          Approved_Absence_Time: new FormControl(Training_Request_Forms_H?.Approved_Absence_Time, null),
          Code_Type: new FormControl(Training_Request_Forms_H?.Code_Type, null),
          Recommendations: new FormControl(Training_Request_Forms_H?.Recommendations, null)
        });
        this.Training_Request_Forms_G = this.fb.group({
          Standart_Level: new FormControl(Training_Request_Forms_G?.Standart_Level, null),
          Function_Department: new FormControl(Training_Request_Forms_G?.Function_Department, null),
          Work_Start_Date: new FormControl(Training_Request_Forms_G?.Work_Start_Date, null),
          Standart_Job_Type: new FormControl(Training_Request_Forms_G?.Standart_Job_Type, [
            Validators.pattern(/^[0-9]*$/), // Only numbers allowed
            Validators.max(100)            // Maximum value is 100
          ]),
        });
        if (this.passport == Training_Request_Forms_A?.Passport_ID) this.requested = true;
        this.check_if_fund_or_health();
        this.cityControl.setValue(Training_Request_Forms_B?.Request_Location);
        this.Training_Out_Check();
        // Subscribe to changes in Date_End to calculate duration
        // this.Training_Request_Forms_B.get('Date_End').valueChanges.subscribe(() => {
        //   this.calculateRequestDuration();
        // });

        // this.Training_Request_Forms_B.get('Date_Start').valueChanges.subscribe(() => {
        //   this.calculateRequestDuration();
        // });
      });
  }

  calculateRequestDuration() {
    const startDate = this.Training_Request_Forms_B.get('Date_Start').value;
    const endDate = this.Training_Request_Forms_B.get('Date_End').value;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const durationMillis = end.getTime() - start.getTime(); // Difference in milliseconds

      // Calculate duration in days, hours, minutes, etc. as needed
      const durationDays = Math.ceil(durationMillis / (1000 * 60 * 60 * 24)); // Example: Duration in days

      this.Training_Request_Forms_B.get('Request_Duration').setValue(durationDays + 1); // Set the calculated duration
    } else {
      this.Training_Request_Forms_B.get('Request_Duration').setValue(null); // Clear if dates are invalid
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const maxSize = 2 * 1024 * 1024; // 1MB (1,024,000 bytes)
      if (file.size > maxSize) {
        alert("הקובץ גדול מדי! יש להעלות קובץ עד 2MB.");
        input.value = ""; // Clear file input
        return;
      }

      const reader = new FileReader();
      // Convert file to Base64 string
      reader.onload = () => {
        const base64String = reader.result as string;
        this.Training_Request_Forms_B.get('Program_Attached')?.setValue(base64String);
      };
      reader.readAsDataURL(file);
    }
  }
  
  onFileSelectedPoster(event: Event) {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const maxSize = 2 * 1024 * 1024; // 1MB (1,024,000 bytes)
      if (file.size > maxSize) {
        alert("הקובץ גדול מדי! יש להעלות קובץ עד 2MB.");
        input.value = ""; // Clear file input
        return;
      }

      const reader = new FileReader();
      // Convert file to Base64 string
      reader.onload = () => {
        const base64String = reader.result as string;
        this.Training_Request_Forms_B.get('Poster_Attached')?.setValue(base64String);
      };
      reader.readAsDataURL(file);
    }
  }

  onFileSelected2(event: Event) {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const maxSize = 1 * 1024 * 1024; // 1MB (1,024,000 bytes)
      if (file.size > maxSize) {
        alert("הקובץ גדול מדי! יש להעלות קובץ עד 1MB.");
        input.value = ""; // Clear file input
        return;
      }

      const reader = new FileReader();
      // Convert file to Base64 string
      reader.onload = () => {
        const base64String = reader.result as string;
        this.Training_Request_Forms_D.get('OutSource_Company_Plan')?.setValue(base64String);
      };
      reader.readAsDataURL(file);
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

  file_in_new_window_base64() {
    const base64String = this.Training_Request_Forms_B.get('Program_Attached')?.value;
    if (base64String) {
      this.openFile(base64String);
    } else {
      console.error('No file available to open');
    }
  }
  
  file_in_new_window_base64_Poster() {
    const base64String = this.Training_Request_Forms_B.get('Poster_Attached')?.value;
    if (base64String) {
      this.openFile(base64String);
    } else {
      console.error('No file available to open');
    }
  }

  file_in_new_window_base642() {
    const base64String = this.Training_Request_Forms_D.get('OutSource_Company_Plan')?.value;
    if (base64String) {
      this.openFile(base64String);
    } else {
      console.error('No file available to open');
    }
  }

  changeToAccountantApprove() {
    if (this.Training_Request_Forms_H.controls['Approved'].value == 'מאושר התחייבות חשב') {
      this.Training_Request_Forms_H.controls['Approved_Percent'].setValue('100');
    } else {
      this.Training_Request_Forms_H.controls['Approved_Percent'].setValue('');
    }
  }

  addRecommendations(type) {
    // if(type == 'transportation'){
    //   this.Training_Request_Forms_H.controls['Recommendations'].setValue(this.Training_Request_Forms_H.value.Recommendations + '');
    // }
  }

  getCityCodes() {
    this.CitiesArray = [];
    this.http
      .post(
        environment.url + "GetCityCodes",
        {}
      )
      .subscribe((Response) => {
        Response["d"].forEach((element) => {
          this.CitiesArray.push({
            cityName: element.cityName
          });
        });
        this.cityOptions = this.cityControl.valueChanges.pipe(
          startWith(""),
          map((value) => (typeof value === "string" ? value : value.name)),
          map((name) =>
            name ? this.city_filter(name) : this.CitiesArray.slice()
          )
        );
      });
  }

  checkPlanAvailability() {
    let date_today: any = new Date();
    date_today = this.datePipe.transform(date_today, 'yyyy-MM-dd');
    // Calculate the difference in days (avoiding date string manipulation)
    const differenceInDays = Math.floor((Date.parse(date_today) - Date.parse(this.plansList[0].Plan_Date)) / (1000 * 60 * 60 * 24));

    if (differenceInDays > -14) {
      alert("הבקשה שלך תעלה בעוד שתי ועדות בכפוף להתייחסות מנהלים\nמועד הועדה הקרוב מתקיים בתאריך: " + this.plansList[0].Plan_Date + "");
    }
  }

  Training_Out_Check() {
    if (this.Training_Request_Forms_B.controls['Training_Out'].value) {
      this.CitiesArray = [
        { cityName: 'אירופה' },
        { cityName: 'אפריקה' },
        { cityName: 'צפון אמריקה' },
        { cityName: 'דרום אמריקה' },
        { cityName: 'אוסטרליה' },
        { cityName: 'אנטארקטיקה' }
      ];

      this.Training_Request_Forms_B.controls['Education_Fee'].setValue(0);
      this.cityOptions = this.cityControl.valueChanges.pipe(
        startWith(""),
        map((value) => (typeof value === "string" ? value : value.name)),
        map((name) =>
          name ? this.city_filter(name) : this.CitiesArray.slice()
        )
      );
    }
    else {
      this.Training_Request_Forms_B.controls['Education_Fee'].enable();
      this.getCityCodes();
    }
  }

  Galilean_Partnership_Check() {
  }

  getEmployeesList() {
    this.http
      .post(environment.url + "GetUsersForInquiries", {
      })
      .subscribe((Response) => {
        let all_users_filter = Response["d"];
        all_users_filter.forEach(element => {
          this.employees.push({
            firstname: element.firstname + " " + element.lastname,
            id: element.id,
            email: element.email,
            doc: element.DocLicence,
            derug: element.derug,
            ADUserName: element.ADUserName.toLowerCase()
          });
        });
        setTimeout(() => {
          this.Supervisor_Name1.setValue(this.employees.filter(t => t.id === this.formData['E']?.Supervisor_Name.id)[0]);
          this.Supervisor_Name2.setValue(this.employees.filter(t => t.id === this.formData['F']?.Supervisor_Name.id)[0]);
          if (this.Supervisor_Name1.value?.id != this.passport) {
            this.Training_Request_Forms_E.controls['Training_Importantce'].disable();
            this.Training_Request_Forms_E.controls['Approved'].disable();
            this.Training_Request_Forms_E.controls['Recommendations'].disable();
            this.Training_Request_Forms_E.controls['Opinion_Date'].disable();
            this.Supervisor_Name1.disable();
          }
          if (this.Supervisor_Name2.value?.id != this.passport) {
            this.Training_Request_Forms_F.controls['Training_Importantce'].disable();
            this.Training_Request_Forms_F.controls['Approved'].disable();
            this.Training_Request_Forms_F.controls['Recommendations'].disable();
            this.Training_Request_Forms_F.controls['Opinion_Date'].disable();
            this.Supervisor_Name2.disable();
          }
        }, 1500);
      });
  }

  // Get the FormArray for convenience
  get healthCorporationArray() {
    return this.Training_Request_Forms_D.get('Health_Corporation') as FormArray;
  }
  // Get the FormArray for convenience
  get DepartmentFundArray() {
    return this.Training_Request_Forms_D.get('Department_Fund') as FormArray;
  }

  // Handle close button
  onClose() {
    this.dialogRef.close(); // Close the dialog
  }

  signForm(section, type) {
    const dialogRef = this.dialog
      .open(DialogContentExampleDialog, {
        data: { sign: "" },
      })
      .afterClosed()
      .subscribe((data) => {
        //to show the sign in the template
        switch (section) {
          case 3:
            if (data.sign == "data:image/png;base64,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MACCpYtMgAABAgQMAD9AgAABAgSCAgZAsHSRCRAgQICAAeAHCBAgQIBAUMAACJYuMgECBAgQMAD8AAECBAgQCAoYAMHSRSZAgAABAgaAHyBAgAABAkEBAyBYusgECBAgQMAA8AMECBAgQCAoYAAESxeZAAECBAgYAH6AAAECBAgEBQyAYOkiEyBAgAABA8APECBAgACBoIABECxdZAIECBAgYAD4AQIECBAgEBQwAIKli0yAAAECBAwAP0CAAAECBIICBkCwdJEJECBAgIAB4AcIECBAgEBQwAAIli4yAQIECBAwAPwAAQIECBAIChgAwdJFJkCAAAECBoAfIECAAAECQQEDIFi6yAQIECBAwADwAwQIECBAIChgAARLF5kAAQIECBgAfoAAAQIECAQFDIBg6SITIECAAAEDwA8QIECAAIGggAEQLF1kAgQIECBgAPgBAgQIECAQFDAAgqWLTIAAAQIEDAA/QIAAAQIEggIGQLB0kQkQIECAgAHgBwgQIECAQFDAAAiWLjIBAgQIEDAA/AABAgQIEAgKGADB0kUmQIAAAQIGgB8gQIAAAQJBAQMgWLrIBAgQIEDAAPADBAgQIEAgKGAABEsXmQABAgQIGAB+gAABAgQIBAUMgGDpIhMgQIAAAQPADxAgQIAAgaCAARAsXWQCBAgQIGAA+AECBAgQIBAUMACCpYtMgAABAgQMAD9AgAABAgSCAgZAsHSRCRAgQICAAeAHCBAgQIBAUMAACJYuMgECBAgQMAD8AAECBAgQCAoYAMHSRSZAgAABAgaAHyBAgAABAkEBAyBYusgECBAgQMAA8AMECBAgQCAoYAAESxeZAAECBAgYAH6AAAECBAgEBQyAYOkiEyBAgAABA8APECBAgACBoIABECxdZAIECBAgYAD4AQIECBAgEBQwAIKli0yAAAECBAwAP0CAAAECBIICBkCwdJEJECBAgIAB4AcIECBAgEBQwAAIli4yAQIECBAwAPwAAQIECBAIChgAwdJFJkCAAAECBoAfIECAAAECQQEDIFi6yAQIECBAwADwAwQIECBAIChgAARLF5kAAQIECBgAfoAAAQIECAQFDIBg6SITIECAAAEDwA8QIECAAIGggAEQLF1kAgQIECBgAPgBAgQIECAQFDAAgqWLTIAAAQIEDAA/QIAAAQIEggIGQLB0kQkQIECAgAHgBwgQIECAQFDAAAiWLjIBAgQIEDAA/AABAgQIEAgKGADB0kUmQIAAAQIGgB8gQIAAAQJBAQMgWLrIBAgQIEDAAPADBAgQIEAgKGAABEsXmQABAgQIGAB+gAABAgQIBAUMgGDpIhMgQIAAAQPADxAgQIAAgaCAARAsXWQCBAgQIGAA+AECBAgQIBAUMACCpYtMgAABAgQMAD9AgAABAgSCAgZAsHSRCRAgQICAAeAHCBAgQIBAUMAACJYuMgECBAgQMAD8AAECBAgQCAoYAMHSRSZAgAABAgaAHyBAgAABAkEBAyBYusgECBAgQMAA8AMECBAgQCAoYAAESxeZAAECBAgYAH6AAAECBAgEBQyAYOkiEyBAgAABA8APECBAgACBoIABECxdZAIECBAgYAD4AQIECBAgEBQwAIKli0yAAAECBAwAP0CAAAECBIICBkCwdJEJECBAgIAB4AcIECBAgEBQwAAIli4yAQIECBAwAPwAAQIECBAIChgAwdJFJkCAAAECBoAfIECAAAECQQEDIFi6yAQIECBAwADwAwQIECBAIChgAARLF5kAAQIECBgAfoAAAQIECAQFDIBg6SITIECAAAEDwA8QIECAAIGggAEQLF1kAgQIECBgAPgBAgQIECAQFDAAgqWLTIAAAQIEDAA/QIAAAQIEggIGQLB0kQkQIECAgAHgBwgQIECAQFDAAAiWLjIBAgQIEDAA/AABAgQIEAgKGADB0kUmQIAAAQIGgB8gQIAAAQJBAQMgWLrIBAgQIEDAAPADBAgQIEAgKGAABEsXmQABAgQIGAB+gAABAgQIBAUMgGDpIhMgQIAAAQPADxAgQIAAgaCAARAsXWQCBAgQIGAA+AECBAgQIBAUMACCpYtMgAABAgQMAD9AgAABAgSCAgZAsHSRCRAgQICAAeAHCBAgQIBAUMAACJYuMgECBAgQMAD8AAECBAgQCAoYAMHSRSZAgAABAgaAHyBAgAABAkEBAyBYusgECBAgQMAA8AMECBAgQCAoYAAESxeZAAECBAgYAH6AAAECBAgEBQyAYOkiEyBAgAABA8APECBAgACBoIABECxdZAIECBAgYAD4AQIECBAgEBQwAIKli0yAAAECBAwAP0CAAAECBIICBkCwdJEJECBAgIAB4AcIECBAgEBQwAAIli4yAQIECBAwAPwAAQIECBAIChgAwdJFJkCAAAECBoAfIECAAAECQQEDIFi6yAQIECBAwADwAwQIECBAIChgAARLF5kAAQIECBgAfoAAAQIECAQFDIBg6SITIECAAAEDwA8QIECAAIGggAEQLF1kAgQIECDwoOYBoxwL39cAAAAASUVORK5CYII=") {
              this.Training_Request_Forms_C.controls[type].setValue(undefined);
              return;
            }
            this.Training_Request_Forms_C.controls[type].setValue(data.sign);
            break;
          case 5:
            if (data.sign == "data:image/png;base64,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MACCpYtMgAABAgQMAD9AgAABAgSCAgZAsHSRCRAgQICAAeAHCBAgQIBAUMAACJYuMgECBAgQMAD8AAECBAgQCAoYAMHSRSZAgAABAgaAHyBAgAABAkEBAyBYusgECBAgQMAA8AMECBAgQCAoYAAESxeZAAECBAgYAH6AAAECBAgEBQyAYOkiEyBAgAABA8APECBAgACBoIABECxdZAIECBAgYAD4AQIECBAgEBQwAIKli0yAAAECBAwAP0CAAAECBIICBkCwdJEJECBAgIAB4AcIECBAgEBQwAAIli4yAQIECBAwAPwAAQIECBAIChgAwdJFJkCAAAECBoAfIECAAAECQQEDIFi6yAQIECBAwADwAwQIECBAIChgAARLF5kAAQIECBgAfoAAAQIECAQFDIBg6SITIECAAAEDwA8QIECAAIGggAEQLF1kAgQIECBgAPgBAgQIECAQFDAAgqWLTIAAAQIEDAA/QIAAAQIEggIGQLB0kQkQIECAgAHgBwgQIECAQFDAAAiWLjIBAgQIEDAA/AABAgQIEAgKGADB0kUmQIAAAQIGgB8gQIAAAQJBAQMgWLrIBAgQIEDAAPADBAgQIEAgKGAABEsXmQABAgQIGAB+gAABAgQIBAUMgGDpIhMgQIAAAQPADxAgQIAAgaCAARAsXWQCBAgQIGAA+AECBAgQIBAUMACCpYtMgAABAgQMAD9AgAABAgSCAgZAsHSRCRAgQICAAeAHCBAgQIBAUMAACJYuMgECBAgQMAD8AAECBAgQCAoYAMHSRSZAgAABAgaAHyBAgAABAkEBAyBYusgECBAgQMAA8AMECBAgQCAoYAAESxeZAAECBAgYAH6AAAECBAgEBQyAYOkiEyBAgAABA8APECBAgACBoIABECxdZAIECBAgYAD4AQIECBAgEBQwAIKli0yAAAECBAwAP0CAAAECBIICBkCwdJEJECBAgIAB4AcIECBAgEBQwAAIli4yAQIECBAwAPwAAQIECBAIChgAwdJFJkCAAAECBoAfIECAAAECQQEDIFi6yAQIECBAwADwAwQIECBAIChgAARLF5kAAQIECBgAfoAAAQIECAQFDIBg6SITIECAAAEDwA8QIECAAIGggAEQLF1kAgQIECBgAPgBAgQIECAQFDAAgqWLTIAAAQIEDAA/QIAAAQIEggIGQLB0kQkQIECAgAHgBwgQIECAQFDAAAiWLjIBAgQIEDAA/AABAgQIEAgKGADB0kUmQIAAAQIGgB8gQIAAAQJBAQMgWLrIBAgQIEDAAPADBAgQIEAgKGAABEsXmQABAgQIGAB+gAABAgQIBAUMgGDpIhMgQIAAAQPADxAgQIAAgaCAARAsXWQCBAgQIGAA+AECBAgQIBAUMACCpYtMgAABAgQMAD9AgAABAgSCAgZAsHSRCRAgQICAAeAHCBAgQIBAUMAACJYuMgECBAgQMAD8AAECBAgQCAoYAMHSRSZAgAABAgaAHyBAgAABAkEBAyBYusgECBAgQMAA8AMECBAgQCAoYAAESxeZAAECBAgYAH6AAAECBAgEBQyAYOkiEyBAgAABA8APECBAgACBoIABECxdZAIECBAgYAD4AQIECBAgEBQwAIKli0yAAAECBAwAP0CAAAECBIICBkCwdJEJECBAgIAB4AcIECBAgEBQwAAIli4yAQIECBAwAPwAAQIECBAIChgAwdJFJkCAAAECBoAfIECAAAECQQEDIFi6yAQIECBAwADwAwQIECBAIChgAARLF5kAAQIECBgAfoAAAQIECAQFDIBg6SITIECAAAEDwA8QIECAAIGggAEQLF1kAgQIECBgAPgBAgQIECAQFDAAgqWLTIAAAQIEDAA/QIAAAQIEggIGQLB0kQkQIECAgAHgBwgQIECAQFDAAAiWLjIBAgQIEDAA/AABAgQIEAgKGADB0kUmQIAAAQIGgB8gQIAAAQJBAQMgWLrIBAgQIEDAAPADBAgQIEAgKGAABEsXmQABAgQIGAB+gAABAgQIBAUMgGDpIhMgQIAAAQPADxAgQIAAgaCAARAsXWQCBAgQIGAA+AECBAgQIBAUMACCpYtMgAABAgQMAD9AgAABAgSCAgZAsHSRCRAgQICAAeAHCBAgQIBAUMAACJYuMgECBAgQMAD8AAECBAgQCAoYAMHSRSZAgAABAgaAHyBAgAABAkEBAyBYusgECBAgQMAA8AMECBAgQCAoYAAESxeZAAECBAgYAH6AAAECBAgEBQyAYOkiEyBAgAABA8APECBAgACBoIABECxdZAIECBAgYAD4AQIECBAgEBQwAIKli0yAAAECBAwAP0CAAAECBIICBkCwdJEJECBAgIAB4AcIECBAgEBQwAAIli4yAQIECBAwAPwAAQIECBAIChgAwdJFJkCAAAECBoAfIECAAAECQQEDIFi6yAQIECBAwADwAwQIECBAIChgAARLF5kAAQIECBgAfoAAAQIECAQFDIBg6SITIECAAAEDwA8QIECAAIGggAEQLF1kAgQIECDwoOYBoxwL39cAAAAASUVORK5CYII=") {
              this.Training_Request_Forms_E.controls[type].setValue(undefined);
              return;
            }
            this.Supervisor_Name2.setValidators(Validators.required);
            this.Supervisor_Name2.updateValueAndValidity();
            if (this.Training_Request_Forms_F.value.Supervisor_Name.id == "")

              this.Training_Request_Forms_F.controls['Supervisor_Name'].setValidators(Validators.required);
            this.Training_Request_Forms_F.controls['Supervisor_Name'].updateValueAndValidity();
            this.Training_Request_Forms_E.controls[type].setValue(data.sign);
            break;
          case 6:
            if (data.sign == "data:image/png;base64,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MACCpYtMgAABAgQMAD9AgAABAgSCAgZAsHSRCRAgQICAAeAHCBAgQIBAUMAACJYuMgECBAgQMAD8AAECBAgQCAoYAMHSRSZAgAABAgaAHyBAgAABAkEBAyBYusgECBAgQMAA8AMECBAgQCAoYAAESxeZAAECBAgYAH6AAAECBAgEBQyAYOkiEyBAgAABA8APECBAgACBoIABECxdZAIECBAgYAD4AQIECBAgEBQwAIKli0yAAAECBAwAP0CAAAECBIICBkCwdJEJECBAgIAB4AcIECBAgEBQwAAIli4yAQIECBAwAPwAAQIECBAIChgAwdJFJkCAAAECBoAfIECAAAECQQEDIFi6yAQIECBAwADwAwQIECBAIChgAARLF5kAAQIECBgAfoAAAQIECAQFDIBg6SITIECAAAEDwA8QIECAAIGggAEQLF1kAgQIECBgAPgBAgQIECAQFDAAgqWLTIAAAQIEDAA/QIAAAQIEggIGQLB0kQkQIECAgAHgBwgQIECAQFDAAAiWLjIBAgQIEDAA/AABAgQIEAgKGADB0kUmQIAAAQIGgB8gQIAAAQJBAQMgWLrIBAgQIEDAAPADBAgQIEAgKGAABEsXmQABAgQIGAB+gAABAgQIBAUMgGDpIhMgQIAAAQPADxAgQIAAgaCAARAsXWQCBAgQIGAA+AECBAgQIBAUMACCpYtMgAABAgQMAD9AgAABAgSCAgZAsHSRCRAgQICAAeAHCBAgQIBAUMAACJYuMgECBAgQMAD8AAECBAgQCAoYAMHSRSZAgAABAgaAHyBAgAABAkEBAyBYusgECBAgQMAA8AMECBAgQCAoYAAESxeZAAECBAgYAH6AAAECBAgEBQyAYOkiEyBAgAABA8APECBAgACBoIABECxdZAIECBAgYAD4AQIECBAgEBQwAIKli0yAAAECBAwAP0CAAAECBIICBkCwdJEJECBAgIAB4AcIECBAgEBQwAAIli4yAQIECBAwAPwAAQIECBAIChgAwdJFJkCAAAECBoAfIECAAAECQQEDIFi6yAQIECBAwADwAwQIECBAIChgAARLF5kAAQIECBgAfoAAAQIECAQFDIBg6SITIECAAAEDwA8QIECAAIGggAEQLF1kAgQIECBgAPgBAgQIECAQFDAAgqWLTIAAAQIEDAA/QIAAAQIEggIGQLB0kQkQIECAgAHgBwgQIECAQFDAAAiWLjIBAgQIEDAA/AABAgQIEAgKGADB0kUmQIAAAQIGgB8gQIAAAQJBAQMgWLrIBAgQIEDAAPADBAgQIEAgKGAABEsXmQABAgQIGAB+gAABAgQIBAUMgGDpIhMgQIAAAQPADxAgQIAAgaCAARAsXWQCBAgQIGAA+AECBAgQIBAUMACCpYtMgAABAgQMAD9AgAABAgSCAgZAsHSRCRAgQICAAeAHCBAgQIBAUMAACJYuMgECBAgQMAD8AAECBAgQCAoYAMHSRSZAgAABAgaAHyBAgAABAkEBAyBYusgECBAgQMAA8AMECBAgQCAoYAAESxeZAAECBAgYAH6AAAECBAgEBQyAYOkiEyBAgAABA8APECBAgACBoIABECxdZAIECBAgYAD4AQIECBAgEBQwAIKli0yAAAECBAwAP0CAAAECBIICBkCwdJEJECBAgIAB4AcIECBAgEBQwAAIli4yAQIECBAwAPwAAQIECBAIChgAwdJFJkCAAAECBoAfIECAAAECQQEDIFi6yAQIECBAwADwAwQIECBAIChgAARLF5kAAQIECBgAfoAAAQIECAQFDIBg6SITIECAAAEDwA8QIECAAIGggAEQLF1kAgQIECBgAPgBAgQIECAQFDAAgqWLTIAAAQIEDAA/QIAAAQIEggIGQLB0kQkQIECAgAHgBwgQIECAQFDAAAiWLjIBAgQIEDAA/AABAgQIEAgKGADB0kUmQIAAAQIGgB8gQIAAAQJBAQMgWLrIBAgQIEDAAPADBAgQIEAgKGAABEsXmQABAgQIGAB+gAABAgQIBAUMgGDpIhMgQIAAAQPADxAgQIAAgaCAARAsXWQCBAgQIGAA+AECBAgQIBAUMACCpYtMgAABAgQMAD9AgAABAgSCAgZAsHSRCRAgQICAAeAHCBAgQIBAUMAACJYuMgECBAgQMAD8AAECBAgQCAoYAMHSRSZAgAABAgaAHyBAgAABAkEBAyBYusgECBAgQMAA8AMECBAgQCAoYAAESxeZAAECBAgYAH6AAAECBAgEBQyAYOkiEyBAgAABA8APECBAgACBoIABECxdZAIECBAgYAD4AQIECBAgEBQwAIKli0yAAAECBAwAP0CAAAECBIICBkCwdJEJECBAgIAB4AcIECBAgEBQwAAIli4yAQIECBAwAPwAAQIECBAIChgAwdJFJkCAAAECBoAfIECAAAECQQEDIFi6yAQIECBAwADwAwQIECBAIChgAARLF5kAAQIECBgAfoAAAQIECAQFDIBg6SITIECAAAEDwA8QIECAAIGggAEQLF1kAgQIECDwoOYBoxwL39cAAAAASUVORK5CYII=") {
              this.Training_Request_Forms_F.controls[type].setValue(undefined);
              return;
            }
            this.Training_Request_Forms_F.controls[type].setValue(data.sign);
            break;
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

  getTrainingRequestPlansList() {
    this.http
      .post(environment.url + "GetTrainingRequestPlansList", {})
      .subscribe((Response) => {
        this.plansList = Response["d"];
      });
  }

  getPlanningIntityList() {
    this.http
      .post(environment.url + "GetPlanningIntityList", {})
      .subscribe((Response) => {
        this.intity_list = Response["d"];
      });
  }

  getAllTrainingRequestQuestionsList() {
    this.http
      .post(environment.url + "GetAllTrainingRequestQuestionsList", {})
      .subscribe((Response) => {
        this.Health_Corporation_Options = Response['d'].filter(x => x.QuestionID == '1')[0];
        this.Department_Fund_Options = Response['d'].filter(x => x.QuestionID == '2')[0];
        this.Training_Importantce_Options = Response['d'].filter(x => x.QuestionID == '3')[0];
        this.Training_Importantce_Options2 = Response['d'].filter(x => x.QuestionID == '4')[0];
        this.Training_Importantce_Options3 = Response['d'].filter(x => x.QuestionID == '5')[0];
      });
  }

  compareFn(optionValue: any, selectedValue: any): boolean {
    return optionValue === selectedValue;
  }

  compareFn2(optionValue: any, selectedValue: any): boolean {
    return optionValue === selectedValue;
  }

  compareFn3(optionValue: any, selectedValue: any): boolean {
    return optionValue === selectedValue;
  }

  compareFn4(optionValue: any, selectedValue: any): boolean {
    return optionValue === selectedValue;
  }

  getPersonDetails() {
    let id = "000000000";
    if (this.Training_Request_Forms_A != undefined) {
      id = this.Training_Request_Forms_A.value.Passport_ID;
    } else {
      this.requested = true;
    }
    this.http
      .post(environment.url + "GetEmployeesToUpdateByID", {
        _empId: id
      })
      .subscribe((Response) => {
        let patient = Response['d'][0];
        if (patient == undefined) return;
        else if (patient.EmployeeID != null) {
          if (this.passport == patient.EmployeeID) this.requested = true;
          this.Training_Request_Forms_A.controls['Passport_ID'].setValue(patient.EmployeeID);
          this.Training_Request_Forms_A.controls['Family_Name'].setValue(patient.LastName);
          this.Training_Request_Forms_A.controls['First_Name'].setValue(patient.FirstName);
          this.Training_Request_Forms_A.controls['Address'].setValue(patient.CityName);
          this.Training_Request_Forms_A.controls['Phone_Number'].setValue(patient.CellNumber);
          this.Training_Request_Forms_A.controls['Title'].setValue(patient.JobTitleID);
          this.Training_Request_Forms_G.controls['Work_Start_Date'].setValue(patient.StartWorkDate);
          this.Training_Request_Forms_G.controls['Standart_Job_Type'].setValue(patient.StandartJobType);
          this.Training_Request_Forms_G.controls['Function_Department'].setValue(patient.FunctionDescription + ' - ' + patient.DepartnentDescripton);
          this.Training_Request_Forms_G.controls['Standart_Level'].setValue(patient.RankDescription);
          this.Supervisor_Name1.setValue(this.employees.filter(t => t.id === patient.ManagerID1.id)[0]);
          this.Supervisor_Name2.setValue(this.employees.filter(t => t.id === patient.ManagerID2.id)[0]);
          this.Training_Request_Forms_E.controls['Supervisor_Name'].setValue(this.Supervisor_Name1.value);
          this.Training_Request_Forms_F.controls['Supervisor_Name'].setValue(this.Supervisor_Name2.value);
          if (this.Supervisor_Name1.value?.id != this.passport) {
            this.Training_Request_Forms_E.controls['Training_Importantce'].disable();
            // this.Training_Request_Forms_E.controls['Approved'].disable();
            this.Training_Request_Forms_E.controls['Recommendations'].disable();
            this.Training_Request_Forms_E.controls['Opinion_Date'].disable();
          }
          if (this.Supervisor_Name2.value?.id != this.passport) {
            this.Training_Request_Forms_F.controls['Training_Importantce'].disable();
            // this.Training_Request_Forms_F.controls['Approved'].disable();
            this.Training_Request_Forms_F.controls['Recommendations'].disable();
            this.Training_Request_Forms_F.controls['Opinion_Date'].disable();
          }
        }
      });
  }

  onSubmit(final) {
    if (this.Training_Request_Forms_A.valid && this.Training_Request_Forms_B.valid && this.Training_Request_Forms_C.valid && this.Training_Request_Forms_D.valid) {
      if (this.Supervisor_Name1.value == undefined) {
        this.openSnackBar('חסר מנהל ישיר, נא ליצור קשר עם משאבי אנוש');
        return;
      }
      this.Training_Request_Forms_B.controls['Date_Start'].setValue(this.datePipe.transform(this.Training_Request_Forms_B.value.Date_Start, 'yyyy-MM-dd'));
      this.Training_Request_Forms_B.controls['Date_End'].setValue(this.datePipe.transform(this.Training_Request_Forms_B.value.Date_End, 'yyyy-MM-dd'));
      this.Training_Request_Forms_C.controls['Request_Name'].setValue(this.datePipe.transform(this.Training_Request_Forms_C.value.Request_Name, 'yyyy-MM-dd'));
      this.Training_Request_Forms_E.controls['Opinion_Date'].setValue(this.datePipe.transform(this.Training_Request_Forms_E.controls['Opinion_Date'].value, 'yyyy-MM-dd'));
      this.Training_Request_Forms_F.controls['Opinion_Date'].setValue(this.datePipe.transform(this.Training_Request_Forms_F.controls['Opinion_Date'].value, 'yyyy-MM-dd'));
      this.Training_Request_Forms_G.controls['Work_Start_Date'].setValue(this.datePipe.transform(this.Training_Request_Forms_G.value.Work_Start_Date, 'yyyy-MM-dd'));
      const base64Data = this.Training_Request_Forms_B.controls['Program_Attached'].value;
      const base64Data2 = this.Training_Request_Forms_D.controls['OutSource_Company_Plan'].value;
      const sizeBInBytes = (base64Data.length * 3) / 4 - (base64Data.endsWith("==") ? 2 : base64Data.endsWith("=") ? 1 : 0); // Base64 size calculation
      const sizeDInBytes = base64Data2 == null ? 0 : (base64Data2.length * 3) / 4 - (base64Data2.endsWith("==") ? 2 : base64Data2.endsWith("=") ? 1 : 0); // Base64 size calculation
      const sizeInBytes = sizeBInBytes + sizeDInBytes; // Set limit (5MB in this example)
      const maxSize = 5 * 1024 * 1024; // Set limit (5MB in this example)

      if (sizeInBytes > maxSize) {
        throw new Error("Base64 data is too large!");
      }
      this.http
        .post(environment.url + "SaveTrainingRequestForm", {
          A: this.Training_Request_Forms_A.getRawValue(),
          B: this.Training_Request_Forms_B.getRawValue(),
          C: this.Training_Request_Forms_C.getRawValue(),
          D: this.Training_Request_Forms_D.getRawValue(),
          E: this.Training_Request_Forms_E.getRawValue(),
          F: this.Training_Request_Forms_F.getRawValue(),
          H: this.Training_Request_Forms_H.getRawValue(),
          G: this.Training_Request_Forms_G.getRawValue(),
          Send_Response: final,
        })
        .subscribe((Response) => {
          if (Response["d"] != 0) {
            this.openSnackBar('נשמר בהצלחה');
            if (final == 1) this.askBeforeSaving(Response["d"]);
            else this.dialogRef.close(null);
          } else {
            this.openSnackBar('תקלה! לא נשמר');
          }
        });
    } else {
      this.openSnackBar('שדה/ות לא תקינים/חסרים');
    }
  }

  askBeforeSaving(rowId) {
    this.confirmationDialogService
      .confirm("נא לאשר..", "לשמור ולשלוח ...? ")
      .then((confirmed) => {
        console.log("User confirmed:", confirmed);
        if (confirmed) {
          this.checkPlanAvailability();
          this.dialogRef.close(rowId);
        } else {
        }
      })
      .catch(() =>
        console.log(
          "User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)"
        )
      );
  }

}
