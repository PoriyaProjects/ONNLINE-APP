// app.component.ts

import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { map, startWith } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-hr-dashboard',
  templateUrl: './hr-dashboard.component.html',
  styleUrls: ['./hr-dashboard.component.css']
})
export class HrDashboardComponent implements OnInit {
  // isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset);

  currentContact: any;
  messages = [];
  users_filter = new FormControl('');
  filteredOptions: Observable<string[]>;

  user_name = localStorage.getItem('loginUserName');
  @ViewChild('scrollTarget') scrollTarget: ElementRef;
  contacts = [];
  contacts_filter = [];
  unAnsweredConversations = [];
  unAnsweredConversations_filter = [];
  whatsAppGroup: FormGroup;
  newMessage: FormGroup;

  constructor(
    private breakpointObserver: BreakpointObserver,
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.getEmployeesForWhatsapp();
    this.getHrWhatsAppUsers();
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

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();

    return this.contacts.filter(option => option.FirstName.toLowerCase().includes(filterValue));
  }

  async getEmployeesForWhatsapp() {
    this.http
      .post(environment.url + "GetEmployeesForWhatsapp", {
        _empId: "",
        _empFirstName: "",
        _empLastName: "",
        _phoneNumber: "",
        _gender: "",
        _department: "",
        _role: "",
        _sektor: "",
        _workPlace: ""
      })
      .subscribe((Response) => {
        this.contacts = Response["d"];
        this.contacts_filter = this.contacts;
      });
  }

  async getHrWhatsAppUsers() {
    this.http
      .post(environment.url + "GetHrWhatsAppUsers", {
        _user_name: this.user_name
      })
      .subscribe((Response) => {
        this.unAnsweredConversations = Response["d"];
        this.unAnsweredConversations_filter = this.unAnsweredConversations;
        if (this.currentContact !== undefined && this.currentContact.maxRow !== '') {
          this.currentContact = this.unAnsweredConversations.filter(x => x.Row_ID == this.currentContact.Row_ID)[0];
          if (this.currentContact.Row_ID !== undefined) this.getHRWhatsAppConversationsByIDFK(this.currentContact.Row_ID);
        }
        this.filteredOptions = this.users_filter.valueChanges.pipe(
          startWith(''),
          map(value => this._filter(value || '')),
        );
        let interval = setTimeout(() => {
          if (this.router.url !== '/hr-dashboard') {
            clearTimeout(interval);
          } else {
            console.log("Refreshing..");
            this.getHrWhatsAppUsers();
          }
        }, 10000);
      });
  }

  async getHRWhatsAppConversationsByIDFK(row_id) {
    this.http
      .post(environment.url + "GetHRWhatsAppConversationsByIDFK", {
        _row_ID: row_id
      })
      .subscribe((Response) => {
        this.currentContact.WhatsApp_Bot_Convesations = Response["d"];
        let indexOfLastMessage = this.currentContact.WhatsApp_Bot_Convesations.length;
        this.newMessage.controls['Row_ID'].setValue(this.currentContact.WhatsApp_Bot_Convesations[indexOfLastMessage - 1].Row_ID);
        this.newMessage.controls['From_ServiceEmployee'].setValue(this.currentContact.WhatsApp_Bot_Convesations[indexOfLastMessage - 1].From_ServiceEmployee);
        this.newMessage.controls['ServiceIDFK'].setValue(this.currentContact.WhatsApp_Bot_Convesations[indexOfLastMessage - 1].ServiceIDFK);
        this.newMessage.controls['ServiceEmployeeIDFK'].setValue(this.currentContact.WhatsApp_Bot_Convesations[indexOfLastMessage - 1].ServiceEmployeeIDFK);
        this.newMessage.controls['EndUserIDFK'].setValue(this.currentContact.WhatsApp_Bot_Convesations[indexOfLastMessage - 1].EndUserIDFK);
        this.newMessage.controls['ActionIDFK'].setValue(this.currentContact.WhatsApp_Bot_Convesations[indexOfLastMessage - 1].ActionIDFK);
        this.newMessage.controls['Status'].setValue(this.currentContact.WhatsApp_Bot_Convesations[indexOfLastMessage - 1].Status);
        this.newMessage.controls['Step'].setValue(this.currentContact.WhatsApp_Bot_Convesations[indexOfLastMessage - 1].Step);
        this.newMessage.controls['Conversation_Status'].setValue(this.currentContact.WhatsApp_Bot_Convesations[indexOfLastMessage - 1].Conversation_Status);
        // setTimeout(() => {
        //   this.scrollTarget.nativeElement.scrollTo(0, this.scrollTarget.nativeElement.scrollHeight);
        // }, 100);
      });
  }

  openChat(contact: any) {
    this.currentContact = contact;
    let check = this.checkIfContactHasConversation(contact);
    if (contact.Row_ID !== undefined) {
      this.getHRWhatsAppConversationsByIDFK(contact.Row_ID);
    }
  }

  sendMessage() {
    if (this.newMessage.controls['Message_Text'].value.trim() !== '') {
      this.newMessage.controls['ServiceEmployeeIDFK'].setValue(this.user_name);
      this.http
        .post(environment.url + "SendHrWhatsAppMessageToUser", {
          messageForm: this.newMessage.value
        })
        .subscribe((Response) => {
          if (Response["d"]) {
            this.currentContact.WhatsApp_Bot_Convesations.push({ Message_Text: this.newMessage.controls['Message_Text'].value, From_ServiceEmployee: 'True', IfFileMessage: 'False' });
            this.newMessage.controls['Message_Text'].setValue('');
          } else {
            alert("Error")
          }
        });
    }
  }

  sendOneWayMessage() {
    if (this.newMessage.controls['Message_Text'].value.trim() !== '') {
      this.newMessage.controls['ServiceEmployeeIDFK'].setValue(this.currentContact.CellNumber);
      this.newMessage.controls['EndUserIDFK'].setValue(this.currentContact.FirstName + ' ' + this.currentContact.LastName);
      this.http
        .post(environment.url + "SendHrWhatsAppMessageToUserOneWay", {
          messageForm: this.newMessage.value
        })
        .subscribe((Response) => {
          if (Response["d"]) {
            this.currentContact['WhatsApp_Bot_Convesations'] = [];
            this.currentContact['WhatsApp_Bot_Convesations'].push({ Message_Text: this.newMessage.controls['Message_Text'].value, From_ServiceEmployee: 'True', IfFileMessage: 'False' });
            alert("הודעה נשלחה בהצלחה");
            this.newMessage.controls['Message_Text'].setValue('');
          } else {
            alert("הודעה לא נשלחה עקב תקלה");
          }
        });
    }
  }

  checkIfContactHasConversation(contact) {
    let t = this.unAnsweredConversations.filter(x => x.CellNumber === contact.CellNumber)[0];
    return true ? t !== undefined : false;
  }
}