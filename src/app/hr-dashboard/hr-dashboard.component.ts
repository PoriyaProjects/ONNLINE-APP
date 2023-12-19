// app.component.ts

import { Component, OnInit } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-hr-dashboard',
  templateUrl: './hr-dashboard.component.html',
  styleUrls: ['./hr-dashboard.component.css']
})
export class HrDashboardComponent implements OnInit {
  // isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset);

  currentContact: any;
  messages = [
    [
      { content: 'Hello!', sentByMe: false },
    ], [
      { content: 'Hi there!', sentByMe: false },
    ]
  ];


  contacts = [
    { name: 'אופיר ורטהיים', phone: "0521231231", messages: this.messages[0] },
    { name: 'משה ממן', phone: "0523123124", messages: this.messages[1] },
  ];

  whatsAppGroup: FormGroup;

  newMessage: string = '';

  constructor(
    private breakpointObserver: BreakpointObserver,
    private fb: FormBuilder,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.getContactsAndConversations();
    this.currentContact = this.contacts[0];
    this.whatsAppGroup = this.fb.group({
      contacts: this.fb.array([{
        name: "",
        phone: "",
        messages: this.fb.array([{
          content: "",
          sentByMe: false
        }])
      }])
    });
  }

  async getContactsAndConversations() {
    this.http
      .post(environment.url + "GetHRContactsAndConversations", {
      })
      .subscribe((Response) => {
      });
  }

  openChat(contact: any) {
    this.currentContact = contact;
  }

  sendMessage() {
    if (this.newMessage.trim() !== '') {
      this.currentContact.messages.push({ content: this.newMessage, sentByMe: true });
      this.newMessage = '';
    }
  }
}