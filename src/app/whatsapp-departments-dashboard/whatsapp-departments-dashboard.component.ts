// app.component.ts

import { Component, ElementRef, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { map, startWith } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ConfirmationDialogService } from '../confirmation-dialog/confirmation-dialog.service';
import { MatDialog } from '@angular/material/dialog';
import { DatePipe } from '@angular/common';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-whatsapp-departments-dashboard',
  templateUrl: './whatsapp-departments-dashboard.component.html',
  styleUrls: ['./whatsapp-departments-dashboard.component.css']
})
export class WhatsappDepartmentsDashboardComponent implements OnInit {

  horizontalPosition: MatSnackBarHorizontalPosition = "start";
  verticalPosition: MatSnackBarVerticalPosition = "bottom";
  currentContact: any;
  messages = [];
  users_filter = new FormControl('');
  filteredOptions: Observable<string[]>;
  notification = "";
  secondsLeft = 5;
  user_name = localStorage.getItem('loginUserName').toLowerCase();
  @ViewChild('scrollTarget') scrollTarget: ElementRef;
  contacts = [];
  contacts_filter = [];
  fixed_files_list = [];
  fixed_messages_list = [];
  unAnsweredConversations = [];
  selectedFile: File | null = null;
  unAnsweredConversations_filter = [];
  current_contact_cases: any = [];
  whatsAppGroup: FormGroup;
  newMessage: FormGroup;
  loadChat: boolean;
  @ViewChild('tooltipTemplate') tooltipTemplate: TemplateRef<any>;
  @ViewChild('modalContent', { static: true }) modalContent: TemplateRef<any>;
  base64String: string | ArrayBuffer | null = '';
  _searchNewPatient: any;
  selectedId: any;
  loadingUnRegistered: boolean;
  saving_namer: boolean;
  employee_service_action: any;
  services = [];
  loading_message = "";
  @ViewChild('fixedMessagesDialog', { static: true }) fixedMessagesDialog: TemplateRef<any>;

  unAnsweredPage = 1;
  unAnsweredPageSize = 20;
  unAnsweredTotal = 0;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient,
    private _snackBar: MatSnackBar,
    private confirmationDialogService: ConfirmationDialogService,
    public dialog: MatDialog,
    public datePipe: DatePipe
  ) { }

  ngOnInit(): void {
    this.getDepartmentsWhatsAppEmployees();
    this.currentContact = this.contacts[0];
    this.newMessage = this.fb.group({
      Row_ID: new FormControl('', null),
      Message_Text: new FormControl('', null),
      Message_Time: new FormControl('', null),
      From_ServiceEmployee: new FormControl('', null),
      ServiceIDFK: new FormControl('', null),
      ServiceEmployeeIDFK: new FormControl('', null),
      EndUserIDFK: new FormControl('', null),
      ActionIDFK: new FormControl('', null),
      Status: new FormControl('', null),
      Step: new FormControl('', null),
      Conversation_Status: new FormControl('', null),
    });

  }

  returnToHome() {
    this.currentContact = null;
    this.employee_service_action = undefined;
  }

  getDepartmentsWhatsAppEmployees() {
    this.http
      .post(environment.url + "GetDepartmentsWhatsAppEmployees", {})
      .subscribe((Response) => {
        let temp_employee = Response['d'].filter(x => x.Employee_UserName.toLowerCase() == this.user_name.toLowerCase());
        this.services = temp_employee[0].Services;
        if (false) {
        }
      });
  }

  chooseService(ser) {
    this.employee_service_action = ser;
    this.getPatientsForWhatsapp();
    this.getDepartmentsWhatsAppUsers();
  }

  attachFile() {

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

  applyFilter(filterValue: string): void {
    if (!filterValue) {
      // If the filter is empty, reset to the original array
      this.unAnsweredConversations_filter = [...this.unAnsweredConversations];
      return;
    }

    // Filter the array based on the input value
    this.unAnsweredConversations_filter = this.unAnsweredConversations.filter((conversation) => {
      // Customize this filter condition based on your conversation object properties
      return conversation.FirstName.includes(filterValue) || conversation.LastName.includes(filterValue);
    });
  }

  applyFilter2(filterValue: string): void {
    if (!filterValue) {
      // If the filter is empty, reset to the original array
      this.contacts_filter = [...this.contacts];
      return;
    }

    // Filter the array based on the input value
    this.contacts_filter = this.contacts.filter((conversation) => {
      // Customize this filter condition based on your conversation object properties
      return conversation.FirstName.includes(filterValue) || conversation.LastName.includes(filterValue) || conversation.CellNumber.includes(filterValue);
    });
  }

  openSnackBar(message) {
    this._snackBar.open(message, "X", {
      duration: 2000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();

    return this.contacts.filter(option => option.FirstName.toLowerCase().includes(filterValue));
  }

  async getPatientsForWhatsapp() {
    this.contacts = [];
    this.contacts_filter = [];
    this.http
      .post(environment.url + "GetPatientsForDepartmentsWhatsapp", {
        _user: this.user_name,
      })
      .subscribe((Response) => {
        this.contacts = Response["d"]?.data || Response["d"] || [];
        this.contacts_filter = this.contacts;
      });
  }

  searchNewPatient() {
    this.loadingUnRegistered = true;
    this.http
      .post(environment.url + "GetCardiologyPatientDetails", {
        _passport: this._searchNewPatient
      })
      .subscribe((Response) => {
        let patient = Response['d'];
        if (patient.PhoneNumber == null) {
          this.openSnackBar("תעודת זהות לא נמצאה");
          return;
        }
        this.currentContact = {
          FirstName: patient.FirstName.replace(/'/g, ''),
          FatherName: patient.FatherName.replace(/'/g, ''),
          LastName: patient.LastName.replace(/'/g, ''),
          CellNumber: patient.PhoneNumber.replace('-', '')
        }
        this.loadingUnRegistered = false;
      });
  }

  async getDepartmentsWhatsAppUsers(page = this.unAnsweredPage, pageSize = this.unAnsweredPageSize) {
    this.loading_message = "טוען...";
    this.http
      .post(environment.url + "getDepartmentsWhatsAppUsers", {
        _user_name: this.user_name,
        _service_idfk: this.employee_service_action.Service_Order,
        _action_idfk: this.employee_service_action.Action_Order,
        _page: page,
        _pageSize: pageSize
      })
      .subscribe((Response) => {
        this.unAnsweredConversations = Response["d"]?.data || Response["d"] || [];
        if (this.unAnsweredConversations.length == 0) this.loading_message = "לא נמצאו שיחות";
        else this.loading_message = "";
        this.unAnsweredConversations_filter = this.unAnsweredConversations;
        this.unAnsweredTotal = Response["d"]?.total || this.unAnsweredConversations.length;
        if (this.currentContact !== undefined && this.currentContact?.maxRow !== '' && this.currentContact?.Row_ID !== undefined) {
          this.currentContact = this.unAnsweredConversations.filter(x => x.Row_ID == this.currentContact?.Row_ID)[0];
          if (this.currentContact?.Row_ID !== undefined) this.getDepartmentsWhatsAppConversationsByIDFK(this.currentContact?.Row_ID);
        }
        this.filteredOptions = this.users_filter.valueChanges.pipe(
          startWith(''),
          map(value => this._filter(value || '')),
        );
        let interval = setTimeout(() => {
          if (this.router.url !== '/departments-whatsapp' || this.employee_service_action == undefined) {
            clearTimeout(interval);
          } else {
            console.log("Refreshing..");
            this.getDepartmentsWhatsAppUsers();
          }
        }, 10000);
      });
  }
  startCountdown() {
    const interval = setInterval(() => {
      this.secondsLeft--;
      this.notification = `השיחה תיסגר בעוד ${this.secondsLeft} שניות`;

      if (this.secondsLeft === 0) {
        clearInterval(interval);
        // בצע את הפעולה הרצויה לאחר סיום הספירה, לדוגמה:
        console.log('השיחה נסגרה');
        // this.closeCall(); // פונקציה לסגירת השיחה
      }
    }, 1000);
  }
  endConversation(contact) {
    this.confirmationDialogService
      .confirm("נא לאשר..", "אתה מנסה לסיים את השיחה ? ")
      .then((confirmed) => {
        console.log("User confirmed:", confirmed);
        if (confirmed) {
          // remove the conversation chat from the request to avoid error maximum size request
          contact.WhatsApp_Bot_Convesations = contact.WhatsApp_Bot_Convesations.filter(x => x.IfFileMessage === "False");
          this.startCountdown();
          this.http
            .post(environment.url + "EndDepartmentsWhatsAppConversation", {
              uncontact: contact
            })
            .subscribe((Response) => {
              if (Response["d"]) {
                this.notification = "";
                this.getDepartmentsWhatsAppUsers();
              }
              else alert("אירעה שגיאה בסיום שיחה");
            });
        } else {
        }
      })
      .catch(() =>
        console.log(
          "User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)"
        )
      );

  }

  async getDepartmentsWhatsAppConversationsByIDFK(row_id) {
    this.loadChat = true;
    this.http
      .post(environment.url + "GetDepartmentsWhatsAppConversationsByIDFK", {
        _row_ID: row_id,
        _service_idfk: this.employee_service_action.Service_Order,
        _action_idfk: this.employee_service_action.Action_Order
      })
      .subscribe((Response) => {
        this.currentContact.WhatsApp_Bot_Convesations = Response["d"];
        let indexOfLastMessage = this.currentContact?.WhatsApp_Bot_Convesations.length;
        if (indexOfLastMessage > 0) {
          this.newMessage.controls['Row_ID'].setValue(this.currentContact.WhatsApp_Bot_Convesations[0].Row_ID);
          this.newMessage.controls['From_ServiceEmployee'].setValue(this.currentContact.WhatsApp_Bot_Convesations[0].From_ServiceEmployee);
          this.newMessage.controls['ServiceIDFK'].setValue(this.currentContact.WhatsApp_Bot_Convesations[0].ServiceIDFK);
          this.newMessage.controls['ServiceEmployeeIDFK'].setValue(this.currentContact.WhatsApp_Bot_Convesations[0].ServiceEmployeeIDFK);
          this.newMessage.controls['EndUserIDFK'].setValue(this.currentContact.WhatsApp_Bot_Convesations[0].EndUserIDFK);
          this.newMessage.controls['ActionIDFK'].setValue(this.currentContact.WhatsApp_Bot_Convesations[0].ActionIDFK);
          this.newMessage.controls['Status'].setValue(this.currentContact.WhatsApp_Bot_Convesations[0].Status);
          this.newMessage.controls['Step'].setValue(this.currentContact.WhatsApp_Bot_Convesations[0].Step);
          this.newMessage.controls['Conversation_Status'].setValue(this.currentContact.WhatsApp_Bot_Convesations[0].Conversation_Status);
        }
        this.loadChat = false;
        // setTimeout(() => {
        //   this.scrollTarget.nativeElement.scrollTo(0, this.scrollTarget.nativeElement.scrollHeight);
        // }, 100);
      });
  }

  openChat(contact: any) {
    this.currentContact = contact;
    let check = this.checkIfContactHasConversation(contact);
    if (contact.Row_ID !== undefined) {
      this.getDepartmentsWhatsAppConversationsByIDFK(contact.Row_ID);
    }
  }

  sendMessage() {
    if (this.newMessage.controls['Message_Text'].value.trim() !== '' || this.base64String.toString() !== '') {
      this.newMessage.controls['ServiceEmployeeIDFK'].setValue(this.user_name);
      if (this.newMessage.value.ServiceIDFK == "") this.newMessage.controls['ServiceIDFK'].setValue(this.employee_service_action.Service_Order);
      if (this.newMessage.value.ActionIDFK == "") this.newMessage.controls['ActionIDFK'].setValue(this.employee_service_action.Action_Order);
      if (this.newMessage.value.EndUserIDFK == "") this.newMessage.controls['EndUserIDFK'].setValue(this.currentContact?.Row_ID);
      this.http
        .post(environment.url + "SendDepartmentsWhatsAppMessageToUser", {
          messageForm: this.newMessage.value,
          file: this.base64String == "" ? "" : this.base64String.toString().split(',')[1]
        })
        .subscribe((Response) => {
          if (Response["d"]) {
            if (this.selectedFile) window.location.reload();
            this.currentContact?.WhatsApp_Bot_Convesations.push({ Message_Text: this.selectedFile ? this.base64String : this.newMessage.controls['Message_Text'].value, From_ServiceEmployee: 'True', IfFileMessage: this.selectedFile ? 'True' : 'False' });
            this.newMessage.controls['Message_Text'].setValue('');
            setTimeout(() => {
              this.getDepartmentsWhatsAppConversationsByIDFK(this.newMessage.value.EndUserIDFK);
            }, 3000);
          } else {
            alert("Error")
          }
        });
    }
  }

  sendOneWayMessage() {
    if (this.newMessage.controls['Message_Text'].value.trim() !== '' || this.base64String.toString() !== '') {
      this.newMessage.controls['ServiceEmployeeIDFK'].setValue(this.currentContact?.CellNumber);
      this.newMessage.controls['EndUserIDFK'].setValue(this.currentContact?.FirstName + ' ' + this.currentContact?.LastName);
      this.newMessage.controls['ActionIDFK'].setValue(this.employee_service_action.Action_Order);
      this.http
        .post(environment.url + "SendDepartmentsWhatsAppMessageToUserOneWay", {
          messageForm: this.newMessage.value,
          file: this.base64String == "" ? "" : this.base64String.toString().split(',')[1],
          _user_name: this.user_name
        })
        .subscribe((Response) => {
          if (Response["d"]) {
            alert("הודעה נשלחה בהצלחה");
            if (this.selectedFile) window.location.reload();
            this.newMessage.controls['Message_Text'].setValue('');
          } else {
            alert("הודעה לא נשלחה עקב תקלה");
          }
        });
    }
  }

  getDepartmentsWhatsAppServiceFixedFiles() {
    this.http
      .post(environment.url + "GetDepartmentsWhatsAppServiceFixedFiles", {
        _user_name: this.user_name
      })
      .subscribe((Response) => {
        this.fixed_files_list = Response['d'];
      });
  }

  checkIfContactHasConversation(contact) {
    let t = this.unAnsweredConversations.filter(x => x.CellNumber === contact.CellNumber)[0];
    return true ? t !== undefined : false;
  }

  async convertBase64ToPDF(base64Data: string, fileName: string, file_type: string) {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: file_type });

    // Create a URL for the Blob
    const url = URL.createObjectURL(blob);

    // Create a link element to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;

    // Append the link element to the DOM
    document.body.appendChild(a);

    // Trigger the download
    a.click();

    // Cleanup
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async downloadPDF(base64Data, message) {
    try {
      // Replace 'your-base64-data' with the actual Base64 data
      base64Data = base64Data.replace('data:image/png;base64,', '');
      base64Data = base64Data.replace('data:application/pdf;base64,', '');
      const file_type = await this.detectFileType(base64Data);
      // Replace 'filename.pdf' with the desired file name
      let fileName = "";
      if (file_type == 'application/pdf') fileName = message.EndUserIDFK + '-' + this.currentContact?.FirstName + ' ' + this.currentContact?.LastName + ' ' + message.Message_Time + '.pdf';
      else fileName = message.EndUserIDFK + '-' + this.currentContact?.FirstName + ' ' + this.currentContact?.LastName + ' ' + message.Message_Time + '.png';

      await this.convertBase64ToPDF(base64Data, fileName, file_type);
    } catch (error) {
      console.error('Error downloading File:', error);
    }
  }

  displayAllCasesByPhoneNumber(base64Data) {
    this.http.post(environment.urlipracticom + "getAllPassportIdsByPhoneNumber", {
      phone_number: this.currentContact?.CellNumber
    }
    ).subscribe((res) => {
      this.current_contact_cases = res['d'];
      this.dialog.open(this.modalContent, {
        width: '40%'
      }).afterClosed().subscribe(() => {
        if (this.selectedId != undefined) this.sendToNamer(base64Data, this.selectedId);
        else return;
      });
    });
  }

  async sendToNamer(base64Data, select) {
    let htmlContent;
    if (base64Data.split(',')[0].includes('image')) {
      htmlContent = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Simple Image Display</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        body {
                            font-family: 'Inter', sans-serif;
                        }
                    </style>
                </head>
                <body class="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen flex flex-col items-center justify-center p-4">

                    <img src="${base64Data}"
                        alt="A beautiful natural landscape with mountains and trees"
                        class="max-w-full h-auto rounded-xl shadow-2xl object-cover w-full sm:w-3/4 md:w-2/3 lg:w-1/2 mx-auto border-4 border-blue-300 transform transition-transform duration-500 hover:scale-105"
                        onerror="this.onerror=null;this.src='https://placehold.co/600x400/CCCCCC/000000?text=Image+Not+Found';">

                </body>
                </html>
                `;
      base64Data = this.convertImageToPdfAndSend(base64Data);
    }
    this.confirmationDialogService
      .confirm("נא לאשר..", "לשלוח לנמר ? ")
      .then((confirmed) => {
        console.log("User confirmed:", confirmed);
        if (confirmed) {
          this.http.post(environment.urlipracticom + "createDepartmentsWhatsAppPdfOnServer", {
            // this.http.post("http://srv-ipracticom:8080/WebService.asmx/" + "createDepartmentsWhatsAppPdfOnServer", {
            case_number: select.casenumber,
            passport: select.id,
            base64: base64Data
          }
          )
            .subscribe((Response) => {
              let that = this;
              setTimeout(() => {
                that.http.post(environment.urlipracticom + "LinkPdfToPatientNamer", {
                  // that.http.post("http://srv-ipracticom:8080/WebService.asmx/" + "LinkPdfToPatientNamer", {
                  CaseNumber: select.casenumber,
                  FormID: "1",
                  Catigory: "ZPO_WTSUPD",
                  fileSource:
                    Response["d"],
                }
                )
                  .subscribe((Response) => {
                    this.saving_namer = false;
                    if (
                      Response["d"] ==
                      "success"
                    ) {
                      $("#loader_2").addClass("d-none");
                      that.openSnackBar(
                        "! נשמר בהצלחה לתיק מטופל בנמר"
                      );
                    } else {
                      that.openSnackBar(
                        "! משהו לא תקין"
                      );
                    }
                  });
              }, 1000);
            });
        } else {
        }
      })
      .catch(() =>
        console.log(
          "User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)"
        )
      );
  }

  convertImageToPdfAndSend(base64Image): string {
    const pdf = new jsPDF();

    // Remove header if needed
    const imgData = base64Image.startsWith('data:')
      ? base64Image
      : 'data:image/png;base64,' + base64Image;

    // Add image to PDF
    pdf.addImage(imgData, 'PNG', 10, 10, 190, 0); // Auto height

    // Export as base64 PDF string
    const pdfBase64 = pdf.output('datauristring'); // Includes the "data:application/pdf;base64,..."
    const base64Only = pdfBase64.split(',')[1]; // Extract only the Base64 part

    return base64Only;

  }

  onSelectionChange(event: any) {
    const selectedOption = event.option;
    if (selectedOption.selected) {
      this.selectedId = selectedOption.value;

      // Deselect all other options manually
      event.source.selectedOptions.selected.forEach(option => {
        if (option.value !== selectedOption.value) {
          option.deselect();
        } else {

        }
      });
    } else {
      this.selectedId = null;
    }
  }

  approveSelection(): void {
    this.dialog.closeAll();
  }

  cancel(): void {
    this.dialog.closeAll();
  }

  async detectFileType(base64Data) {
    const decodedData = atob(base64Data);
    const byte1 = decodedData.charCodeAt(0);
    const byte2 = decodedData.charCodeAt(1);

    // Check for common image file signatures
    if (byte1 === 0xff && byte2 === 0xd8) {
      return 'image/jpeg';
    } else if (byte1 === 0x89 && byte2 === 0x50) {
      return 'image/png';
    } else if (byte1 === 0x47 && byte2 === 0x49) {
      return 'image/gif';
    }

    // Check for PDF file signature
    if (byte1 === 0x25 && byte2 === 0x50) {
      return 'application/pdf';
    }

    // Unknown file type
    return 'unknown';
  }

  saveEditFixedMessagesWhatsappDepartments(fixed_message) {
    this.http
      .post(environment.url + "SaveEditFixedMessagesWhatsappDepartments", {
        fixed_message: fixed_message,
        ServiceIDFK: this.employee_service_action.Service_Order,
        ActionIDFK: this.employee_service_action.Action_Order
      })
      .subscribe((Response) => {
        this.fixed_messages_list = Response['d'];
      });
  }

  openFixedMessagesDialog() {
    this.saveEditFixedMessagesWhatsappDepartments(null);
    this.dialog.open(this.fixedMessagesDialog, { width: '40%' });
  }

  addFixedMessage() {
    const text = prompt('הזן הודעה חדשה:');
    if (text && text.trim()) {
      let text_obj = {
        Row_ID: null,
        Message_Text: text,
        Section: 'departments',
        ServiceIDFK: this.employee_service_action.Service_Order,
        ActionIDFK: this.employee_service_action.Action_Order,
        Status: true
      }
      // Save to backend if needed, here just add to the list for demo
      this.fixed_messages_list.push(text_obj);
      // TODO: Call backend to persist
      this.saveEditFixedMessagesWhatsappDepartments(text_obj);
    }
  }

  editFixedMessage(msg) {
    const newText = prompt('ערוך הודעה:', msg.Message_Text);
    if (newText && newText.trim()) {
      msg.Message_Text = newText;
      // TODO: Call backend to persist
      let text_obj = {
        Row_ID: msg.Row_ID,
        Message_Text: newText,
        Section: 'departments',
        ServiceIDFK: this.employee_service_action.Service_Order,
        ActionIDFK: this.employee_service_action.Action_Order,
        Status: true
      }
      this.saveEditFixedMessagesWhatsappDepartments(text_obj);
    }
  }

  removeFixedMessage(msg) {
    if (confirm('האם אתה בטוח שברצונך למחוק?')) {
      this.fixed_messages_list = this.fixed_messages_list.filter(m => m !== msg.Message_Text);
      // TODO: Call backend to persist
      let text_obj = {
        Row_ID: msg.Row_ID,
        Message_Text: msg.Message_Text,
        Section: 'departments',
        ServiceIDFK: this.employee_service_action.Service_Order,
        ActionIDFK: this.employee_service_action.Action_Order,
        Status: false
      }
      this.saveEditFixedMessagesWhatsappDepartments(text_obj);
    }
  }

  selectFixedMessage(msg, dialogRef) {
    this.newMessage.controls['Message_Text'].setValue(msg.Message_Text);
    dialogRef.close();
  }

  // Paging controls for unAnsweredConversations
  nextUnAnsweredPage() {
    this.unAnsweredPage++;
    this.getDepartmentsWhatsAppUsers(this.unAnsweredPage, this.unAnsweredPageSize);
    // if (this.unAnsweredPage * this.unAnsweredPageSize <= this.unAnsweredTotal) {
    // }
  }
  prevUnAnsweredPage() {
    if (this.unAnsweredPage > 1) {
      this.unAnsweredPage--;
      this.getDepartmentsWhatsAppUsers(this.unAnsweredPage, this.unAnsweredPageSize);
    }
  }

  calculateAllUnAnswered() {
    return Math.ceil(this.unAnsweredTotal / this.unAnsweredPageSize);
  }
}