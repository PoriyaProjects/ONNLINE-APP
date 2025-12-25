import { HttpClient } from '@angular/common/http';
import { Component, Inject, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-windows-user-actions',
  templateUrl: './windows-user-actions.component.html',
  styleUrls: ['./windows-user-actions.component.scss']
})
export class WindowsUserActionsComponent implements OnInit {

  username: string = '';
  validationfromwhatsapp: string = '';
  messageToUser: string = '';
  validationCode: number;
  loading: boolean;
  sendingBtn: boolean;

  constructor(
    private http: HttpClient
  ) { }


  ngOnInit(): void {
  }

  generateRandomNumber(): void {
    // Generate a random number between 100000 and 999999
    this.validationCode = Math.floor(Math.random() * 900000) + 100000;
    this.sendNotificationToWhatsApp();
  }

  typingUserName() {
    this.sendingBtn = true;
  }

  disableSendBtn() {
    setTimeout(() => {
      this.sendingBtn = true;
    }, 60000);
  }

  sendNotificationToWhatsApp() {
    this.http
      .post(environment.url + "SaveWindowsValidationCode", {
        validation_code: this.validationCode,
        user_name: this.username,
      })
      .subscribe((Response) => {
        try {
          if (Response['d']) this.messageToUser = "קוד אימות נשלח לטלפון שלך";
          this.sendingBtn = false;
          this.disableSendBtn();
        } catch (error) {
          this.messageToUser = "תקלה";
        }
      });
  }

  onSubmit(action): void {
    this.loading = true;
    this.http
      .post(environment.url + "ResetWindowsAccountPassword", {
        ValidationCode: this.validationfromwhatsapp,
        UserName: this.username
      })
      .subscribe((Response) => {
        try {
          this.loading = true;
          alert(Response['d'] + '/n סיסמה חדשה נשלחה לטלפון שלך');
          window.location.reload();
        } catch (error) {
          console.log("error in sending notification!");
        }
      });
  }

}
