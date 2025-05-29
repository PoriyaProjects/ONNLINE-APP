import { DatePipe } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { WhatsappCategoriesPermissionsComponent } from './whatsapp-categories-permissions/whatsapp-categories-permissions.component';

@Component({
  selector: 'app-whatsapp-messages-dashboard',
  templateUrl: './whatsapp-messages-dashboard.component.html',
  styleUrls: ['./whatsapp-messages-dashboard.component.css']
})
export class WhatsappMessagesDashboardComponent implements OnInit, OnDestroy {


  horizontalPosition: MatSnackBarHorizontalPosition = "start";
  verticalPosition: MatSnackBarVerticalPosition = "bottom";
  displayedColumns: string[] = ['sender', 'name', 'number', 'content', 'date'];
  dataSource = new MatTableDataSource([]);
  sendersList = [];
  total_number_of_reciepents: number = 0;
  customInputs: any[] = [];
  customForm: FormGroup;
  manyContacts: FormGroup;
  typeOfScreen: boolean;
  searchEmployeesGroup: FormGroup;
  WorkPlacesList = [];
  EmergencyList = [];
  EmergencyEmployeesList = [];
  selectedFile: File | null = null;
  base64String: string | ArrayBuffer | null = '';
  DepartmentsList = [];
  FunctionsList = [];
  SektorsList = [];
  screenTitle = 'אישי';
  searchProgress: boolean = false;
  sending: boolean = false;
  send_emergency: boolean = false;
  username = localStorage.getItem('loginUserName').toLowerCase();
  selectedFiles: FileList | null;
  fixed_text: string = "";
  media_file: string = "";
  file_path: string = "";
  message_content: string = "";

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private _snackBar: MatSnackBar,
    private _datePipe: DatePipe,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.searchEmployeesGroup = this.fb.group({
      EmpID: new FormControl('', null),
      EmpFirstName: new FormControl('', null),
      EmpLastName: new FormControl('', null),
      PhoneNumber: new FormControl('', null),
      Gender: new FormControl('', null),
      Department: new FormControl('', null),
      Role: new FormControl('', null),
      Sektor: new FormControl('', null),
      WorkPlace: new FormControl('', null)
    });
    this.customForm = this.fb.group({
      customInputs: this.fb.array([])
    });
    this.manyContacts = this.fb.group({
      Phone_Number: new FormControl('', Validators.required),
      Message_Content: new FormControl('', Validators.required),
      SenderIDFK: new FormControl('1', Validators.required),
      File_Path: new FormControl(this.media_file, null)
    });
    this.getWhatsAppSendersFromServer();
    this.getEmployeeDepartmentList();
    this.getEmployeesFunctionsList();
    this.getSektorsList();
    this.getWorkPlacesList();
    this.getEmergencyContactCategories();
    this.sendEmergencyPermission();
  }

  ngOnDestroy(): void {
    this.customForm.reset();
    this.manyContacts.reset();
  }

  get customFormArray(): FormArray {
    return this.customForm.get('customInputs') as FormArray;
  }

  removecustomInput(index: number) {
    this.customFormArray.removeAt(index);
  }

  addInput(phone, fullName, sender) {
    const contact = new FormGroup({
      Recipient_Type: new FormControl('0', Validators.required),
      Phone_Number: new FormControl(phone, Validators.required),
      Recipient: new FormControl(fullName, null),
      Message_Content: new FormControl('', Validators.required),
      SenderIDFK: new FormControl(sender, Validators.required),
      Message_Timing: new FormControl(null, null),
      Message_Timing_Time: new FormControl(null, null),
      File_Path: new FormControl(null, null)
    });
    (<FormArray>this.customForm.get('customInputs')).push(contact);
  }

  deleteRow(row: any, index: number) {
    if (index >= 0) {
      (this.customForm.get('customInputs') as FormArray).removeAt(index);
      this.cd.detectChanges();
    }
    this.total_number_of_reciepents = this.total_number_of_reciepents - 1;
  }

  deleteAllRow() {
    (this.customForm.get('customInputs') as FormArray).clear();
    this.total_number_of_reciepents = 0;
  }

  setSenderIDFK() {
    this.customForm.controls['customInputs'].value.forEach((element, index) => {
      this.customForm.controls['customInputs']['controls'][index].controls.SenderIDFK.setValue(this.customForm.controls['customInputs'].value[0].SenderIDFK);
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.convertFileToBase64(this.selectedFile);
    }
  }

  convertFileToBase64(file: File): void {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      this.base64String = reader.result;
    };
    reader.onerror = (error) => {
      console.error('Error: ', error);
    };
  }

  setMessageTiming(index) {
    if (this.customForm.controls['customInputs']['controls'][index].controls.Message_Timing.value == null)
      this.customForm.controls['customInputs']['controls'][index].controls.Message_Timing.setValue('');
    else this.customForm.controls['customInputs']['controls'][index].controls.Message_Timing.setValue(null);
    if (this.customForm.controls['customInputs']['controls'][index].controls.Message_Timing_Time.value == null)
      this.customForm.controls['customInputs']['controls'][index].controls.Message_Timing_Time.setValue('00:00:00');
    else this.customForm.controls['customInputs']['controls'][index].controls.Message_Timing_Time.setValue(null);
  }

  SetNewDate(index) {
    let formatedDate = this._datePipe.transform(this.customForm.controls['customInputs']['controls'][index].controls.Message_Timing.value, 'yyyy-MM-dd');
    let formatedTime = this.customForm.controls['customInputs']['controls'][index].controls.Message_Timing_Time.value;
    this.customForm.controls['customInputs']['controls'][index].controls.Message_Timing.setValue(formatedDate + ' ' + formatedTime + ':00');
  }

  sendMessages() {
    if (!this.typeOfScreen) {
      if (!this.customForm.invalid && this.customForm.value.customInputs.length > 0) {
        // todo set the path for each number
        if (this.file_path !== null) {
          this.customForm.value.customInputs.forEach((element, index) => {
            this.customForm.controls['customInputs']['controls'][index].controls.File_Path.setValue(this.file_path);
          });
        }
        this.sending = true;
        this.http
          .post(environment.url + "Send_Custom_WhatsApp_Messages", {
            customForm: this.customForm.value,
            file: this.base64String == "" ? "" : this.base64String.toString().split(',')[1]
          })
          .subscribe((Response) => {
            if (Response["d"]) {
              this.openSnackBar('נוסף לתור השליחה');
              this.deleteAllRow();
            }
            else this.openSnackBar('תקלה!');
            this.sending = false;
          });
      } else {
        this.openSnackBar("למלא שדות חובה");
      }
    } else {
      if (!this.manyContacts.invalid) {
        // todo set the file path if exists
        if (this.file_path !== null) {
          this.manyContacts.controls['File_Path'].setValue(this.file_path);
        }
        this.sending = true;
        this.http
          .post(environment.url + "Send_ToMany_WhatsApp_Messages", {
            manyForm: this.manyContacts.value
          })
          .subscribe((Response) => {
            if (Response["d"]) {
              this.openSnackBar('נוסף לתור השליחה');
              this.deleteAllRow();
            }
            else this.openSnackBar('תקלה!');
            this.sending = false;
          });
      } else {
        this.openSnackBar("למלא שדות חובה");
      }

    }
  }

  uploadFiles() {
    if (this.selectedFiles) {
      const headers = new HttpHeaders({
        'Content-Type': 'multipart/form-data'
      });
      const formData = new FormData();
      formData.append('files', this.selectedFiles[0]);
      this.http.post(environment.url + 'whatsappRecieveFile', formData, { responseType: 'text' }).subscribe((response: string) => {
        // this.http.post('http://srv-ipracticom:8080/WebService.asmx/WhatsappRecieveFile', formData, { responseType: 'text' }).subscribe((response: string) => {
        // Parse the XML response to extract the text content
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response, 'text/xml');
        let file_path = xmlDoc.getElementsByTagName('string')[0].textContent;
        this.sendMessages();
      });
    }
    else {
      this.sendMessages();
    }
  }

  changeScreens() {
    this.typeOfScreen = !this.typeOfScreen;
    if (this.typeOfScreen) this.screenTitle = 'כללי';
    else this.screenTitle = 'אישי';
  }

  getWhatsAppMessagesFromServer() {
    const sender = this.customForm.controls['customInputs']['controls'][0].controls.SenderIDFK.value;
    if (this.dataSource.filteredData.length > 0 && sender !== "") this.dataSource = new MatTableDataSource<any>();
    else {
      this.http
        .post(environment.url + "GetWhatsAppMessagesFromServer", {
          sender_IDFK: this.customForm.controls['customInputs']['controls'][0].controls.SenderIDFK.value
        })
        .subscribe((Response) => {
          this.dataSource = new MatTableDataSource<any>(Response["d"]);
        });
    }
  }

  openPermissionsManager() {
    this.dialog.open(WhatsappCategoriesPermissionsComponent, {
      width: '70%'
    }).afterClosed().subscribe(() => {
      this.getEmergencyContactCategories();
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  getWhatsAppSendersFromServer() {
    this.http
      .post(environment.url + "GetWhatsAppSendersFromServer", {
        _user: this.username
      })
      .subscribe((Response) => {
        this.sendersList = Response["d"];
      });
  }

  public getWhatsAppMessagesFromServerService(func): Observable<any> {
    let headers = new HttpHeaders();
    headers = headers.set('content-type', 'application/json');
    return this.http.get(environment.url + func, {
      headers
    });
  }

  openSnackBar(message) {
    this._snackBar.open(message, "X", {
      duration: 2000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }

  GetEmployeesToUpdate() {
    this.total_number_of_reciepents = 0;
    this.deleteAllRow();
    this.searchProgress = true;
    let empId = this.searchEmployeesGroup.controls['EmpID'].value;
    let empFirstName = this.searchEmployeesGroup.controls['EmpFirstName'].value;
    let empLastName = this.searchEmployeesGroup.controls['EmpLastName'].value;
    let phoneNumber = this.searchEmployeesGroup.controls['PhoneNumber'].value;
    let gender = this.searchEmployeesGroup.controls['Gender'].value;
    let department = this.searchEmployeesGroup.controls['Department'].value;
    let role = this.searchEmployeesGroup.controls['Role'].value;
    let sektor = this.searchEmployeesGroup.controls['Sektor'].value;
    let workPlace = this.searchEmployeesGroup.controls['WorkPlace'].value;
    this.http
      .post(environment.url + "GetEmployeesForWhatsapp", {
        _empId: empId,
        _empFirstName: empFirstName,
        _empLastName: empLastName,
        _phoneNumber: phoneNumber,
        _gender: gender,
        _department: department,
        _role: role,
        _sektor: sektor,
        _on: "1",
        _workPlace: workPlace
      })
      .subscribe((Response) => {
        this.searchProgress = false;
        let t = Response["d"];
        this.total_number_of_reciepents = t.length;
        // this.customForm.controls['customInputs'] = this.fb.array([]);
        for (let i = 0; i < t.length; i++) {
          this.addInput(t[i].CellNumber, t[i].FirstName + ' ' + t[i].LastName, '');
        }
      });
  }

  fillAllMessageContentFields(id) {
    let messageContent = this.customForm.controls['customInputs'].value[0].Message_Content;
    let firstNewlineIndex = messageContent.indexOf('\n');

    let message_content = firstNewlineIndex !== -1 ? messageContent.substring(firstNewlineIndex + 1) : messageContent;
    if (id == 0) {
      this.customForm.controls['customInputs'].value.forEach((element, index) => {
        let message = this.setMessageWithFixedHead(element.Recipient, message_content);
        this.customForm.controls['customInputs']['controls'][index].controls.Message_Content.setValue(message);
      });
    }
  }

  setMessageWithFixedHead(fullName, content) {
    if (content === undefined || !content.includes(" שלום רב")) {
      return fullName + " שלום רב,\n" + content;
    } else {
      return content;
    }
  }


  getEmployeeDepartmentList() {
    this.http
      .post(environment.url + "GetEmployeeDepartmentList", {
      })
      .subscribe((Response) => {
        this.DepartmentsList = Response["d"];
      });
  }

  getEmployeesFunctionsList() {
    this.http
      .post(environment.url + "GetEmployeesFunctionsList", {
        _userName: ""
      })
      .subscribe((Response) => {
        this.FunctionsList = Response["d"];
      });
  }

  getSektorsList() {
    this.http
      .post(environment.url + "getEmployeesBlossomSektorList", {
      })
      .subscribe((Response) => {
        this.SektorsList = Response["d"];
      });
  }

  getWorkPlacesList() {
    this.http
      .post(environment.url + "GetWorkPlacesList", {
      })
      .subscribe((Response) => {
        this.WorkPlacesList = Response["d"];
      });
  }

  getEmergencyContactCategories() {
    this.http
      .post(environment.url + "GetEmergencyContactCategories", {
        user_name: this.username
      })
      .subscribe((Response) => {
        this.EmergencyList = Response["d"];
      });
  }

  onEmergencyClick(category) {
    this.http
      .post(environment.url + "GetEmergencyContactCategoriesEmployees", {
        category: category
      })
      .subscribe((Response) => {
        let t = Response["d"];
        this.total_number_of_reciepents = t.length;
        this.customForm.controls['customInputs'] = this.fb.array([]);
        for (let i = 0; i < t.length; i++) {
          this.addInput(t[i].Phone_Number, t[i].Employee_Name, '1');
        }
      });
  }

  sendEmergencyPermission() {
    this.http
      .post(environment.url + "SendEmergencyPermission", {
        user_name: this.username
      })
      .subscribe((Response) => {
        if (Response['d']) this.send_emergency = true;
        else this.send_emergency = false;
      });
  }

}
