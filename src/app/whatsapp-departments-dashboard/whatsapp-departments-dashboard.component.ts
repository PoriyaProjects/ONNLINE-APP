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

@Component({
  selector: 'app-whatsapp-departments-dashboard',
  templateUrl: './whatsapp-departments-dashboard.component.html',
  styleUrls: ['./whatsapp-departments-dashboard.component.css']
})
export class WhatsappDepartmentsDashboardComponent implements OnInit {
  // isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset);
  horizontalPosition: MatSnackBarHorizontalPosition = "start";
  verticalPosition: MatSnackBarVerticalPosition = "bottom";
  currentContact: any;
  messages = [];
  users_filter = new FormControl('');
  filteredOptions: Observable<string[]>;
  notification = "";
  secondsLeft = 5;
  user_name = localStorage.getItem('loginUserName');
  @ViewChild('scrollTarget') scrollTarget: ElementRef;
  contacts = [];
  contacts_filter = [];
  fixed_files_list = [];
  unAnsweredConversations = [];
  selectedFile: File | null = null;
  unAnsweredConversations_filter = [];
  whatsAppGroup: FormGroup;
  newMessage: FormGroup;
  loadChat: boolean;
  @ViewChild('tooltipTemplate') tooltipTemplate: TemplateRef<any>;
  base64String: string | ArrayBuffer | null = '';
  _searchNewPatient: any;
  loadingUnRegistered: boolean;

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
    this.getPatientsForWhatsapp(1);
    this.getDepartmentsWhatsAppUsers();
    // this.getDepartmentsWhatsAppServiceFixedFiles();
    // this.getContactsAndConversations();
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

  async getPatientsForWhatsapp(period) {
    if (parseInt(period) < 1 || parseInt(period) > 20) {
      this.openSnackBar('הטווח בין 1 ל 20');
      return;
    }
    this.contacts = [];
    this.contacts_filter = [];
    this.http
      .post(environment.url + "GetPatientsForDepartmentsWhatsapp", {
        _period: period,
        _user: this.user_name,
      })
      .subscribe((Response) => {
        this.contacts = Response["d"];
        this.contacts_filter = this.contacts;
      });
  }

  searchNewPatient() {
    this.loadingUnRegistered = true;
    this.http
      .post(environment.url + "selectDetailsFromNamer", {
        patientId: this._searchNewPatient
      })
      .subscribe((Response) => {
        let patient = Response['d'];
        this.currentContact = {
          FirstName: patient.FirstName,
          FatherName: patient.FatherName,
          LastName: patient.LastName,
          CellNumber: patient.PhoneNumber.replace('-', '')
        }
        this.loadingUnRegistered = false;
      });
  }

  async getDepartmentsWhatsAppUsers() {
    this.http
      .post(environment.url + "getDepartmentsWhatsAppUsers", {
        _user_name: this.user_name
      })
      .subscribe((Response) => {
        this.unAnsweredConversations = Response["d"];
        this.unAnsweredConversations_filter = this.unAnsweredConversations;
        if (this.currentContact !== undefined && this.currentContact.maxRow !== '') {
          this.currentContact = this.unAnsweredConversations.filter(x => x.Row_ID == this.currentContact.Row_ID)[0];
          if (this.currentContact.Row_ID !== undefined) this.getDepartmentsWhatsAppConversationsByIDFK(this.currentContact.Row_ID);
        }
        this.filteredOptions = this.users_filter.valueChanges.pipe(
          startWith(''),
          map(value => this._filter(value || '')),
        );
        let interval = setTimeout(() => {
          if (this.router.url !== '/departments-whatsapp') {
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
        _row_ID: row_id
      })
      .subscribe((Response) => {
        this.currentContact.WhatsApp_Bot_Convesations = Response["d"];
        let indexOfLastMessage = this.currentContact.WhatsApp_Bot_Convesations.length;
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
      this.http
        .post(environment.url + "SendDepartmentsWhatsAppMessageToUser", {
          messageForm: this.newMessage.value,
          file: this.base64String == "" ? "" : this.base64String.toString().split(',')[1]
        })
        .subscribe((Response) => {
          if (Response["d"]) {
            if (this.selectedFile) window.location.reload();
            this.currentContact.WhatsApp_Bot_Convesations.push({ Message_Text: this.selectedFile ? this.base64String : this.newMessage.controls['Message_Text'].value, From_ServiceEmployee: 'True', IfFileMessage: this.selectedFile ? 'True' : 'False' });
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
      this.newMessage.controls['ServiceEmployeeIDFK'].setValue(this.currentContact.CellNumber);
      this.newMessage.controls['EndUserIDFK'].setValue(this.currentContact.FirstName + ' ' + this.currentContact.LastName);
      this.http
        .post(environment.url + "SendDepartmentsWhatsAppMessageToUserOneWay", {
          messageForm: this.newMessage.value,
          file: this.base64String == "" ? "" : this.base64String.toString().split(',')[1]
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

  async downloadPDF(base64Data) {
    try {
      // Replace 'your-base64-data' with the actual Base64 data
      base64Data = base64Data.replace('data:image/png;base64,', '');
      const file_type = await this.detectFileType(base64Data);
      // Replace 'filename.pdf' with the desired file name
      let fileName = "";
      if (file_type == 'application/pdf') fileName = 'Inquiries_WhatsApp_Service_Media_File.pdf';
      else fileName = 'Inquiries_WhatsApp_Service_Media_File.png';

      await this.convertBase64ToPDF(base64Data, fileName, file_type);
    } catch (error) {
      console.error('Error downloading File:', error);
    }
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

}