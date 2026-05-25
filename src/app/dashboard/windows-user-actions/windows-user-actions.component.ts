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
  pcLoggedInUsers: any[];
  /** Tracks which PC row is calling SignOutUserFromRemotePc (ComputerName|IpAddress). */
  signOutLoadingKey: string | null = null;
  /** True after איפוס סיסמה succeeded — panel title switches to post-reset messaging. */
  passwordResetCompleted = false;
  admin = localStorage.getItem('loginUserName').toLowerCase();

  /** Custom alert modal (centered overlay). */
  alertModalOpen = false;
  alertModalMessage = '';
  /** Copy of PC rows shown inside the modal (e.g. after successful reset). */
  modalPcSnapshot: any[] = [];

  constructor(
    private http: HttpClient
  ) { }

  signOutRowKey(row: any): string {
    const cn = (row && row.ComputerName) ? String(row.ComputerName) : '';
    const ip = (row && row.IpAddress) ? String(row.IpAddress) : '';
    return cn + '|' + ip;
  }

  signOutFromPc(row: any): void {
    if (!this.username?.trim()) {
      this.messageToUser = 'נא למלא שם משתמש לוינדוס.';
      return;
    }
    if (!this.validationfromwhatsapp?.trim() && this.admin != 'adahabre') {
      this.messageToUser = 'נא להזין קוד אימות לפני ניתוק מהמחשב.';
      return;
    }
    const key = this.signOutRowKey(row);
    this.signOutLoadingKey = key;
    this.http
      .post(environment.url + 'SignOutUserFromRemotePc', {
        ValidationCode: this.validationfromwhatsapp.trim(),
        UserName: this.username.trim(),
        ComputerName: row.ComputerName ?? '',
        IpAddress: row.IpAddress ?? '',
        LoggedOnUser: row.LoggedOnUser ?? '',
        Admin: this.admin
      })
      .subscribe({
        next: (Response: any) => {
          this.signOutLoadingKey = null;
          const msg = Response && Response['d'] !== undefined ? Response['d'] : Response;
          this.messageToUser = typeof msg === 'string' ? msg : JSON.stringify(msg);
          if (typeof msg === 'string' && msg.indexOf('בוצע ניתוק') >= 0) {
            this.getPcLoggedInUsers();
          }
        },
        error: () => {
          this.signOutLoadingKey = null;
          this.messageToUser = 'שגיאה בניתוק מהמחשב.';
        }
      });
  }


  ngOnInit(): void {
  }

  showAlert(message: string, includePcSnapshot = false): void {
    this.alertModalMessage = message ?? '';
    if (includePcSnapshot && this.pcLoggedInUsers?.length) {
      this.modalPcSnapshot = this.pcLoggedInUsers.map((r) => ({ ...r }));
    } else {
      this.modalPcSnapshot = [];
    }
    this.alertModalOpen = true;
  }

  closeAlert(): void {
    this.alertModalOpen = false;
    this.modalPcSnapshot = [];
  }

  generateRandomNumber(): void {
    // Generate a random number between 100000 and 999999
    this.validationCode = Math.floor(Math.random() * 900000) + 100000;
    this.sendNotificationToWhatsApp();
    // PC list is shown only after passwordResetCompleted — fetch happens in onSubmit on success.
  }

  typingUserName() {
    this.sendingBtn = true;
  }

  disableSendBtn() {
    setTimeout(() => {
      this.sendingBtn = true;
    }, 60000);
  }

  getPcLoggedInUsers(): void {
    this.http
      .post(environment.url + "GetPcLoggedInUsers", {
        UserName: this.username
      })
      .subscribe((Response: any) => {
        this.pcLoggedInUsers = Response['d'];
        console.log('pcLoggedInUsers', this.pcLoggedInUsers);
      });
  }

  sendNotificationToWhatsApp() {
    this.http
      .post(environment.url + "SaveWindowsValidationCode", {
        validation_code: this.validationCode,
        user_name: this.username,
      })
      .subscribe((Response) => {
        try {
          if (Response['d']) this.messageToUser = "קוד אימות נשלח לטלפון שלך, זה עשוי לקחת דקה נא להמתין";
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
      .subscribe({
        next: (Response: any) => {
          try {
            this.loading = false;
            const msg = Response && Response['d'] !== undefined ? Response['d'] : '';
            const alertBody =
              '‎' +
              msg +
              '‎ \n הסיסמה החדשה שלך צריכה להיות:\n 1- מורכבת מ 8 תווים\n 2- מכילה ספרה\n 3- מכילה אות גדולה\n 4- מכילה אות קטנה\n 5- מכילה תו מיוחד';

            const resetSucceeded =
              typeof msg === 'string' &&
              (msg.indexOf('התאפסה') >= 0 || msg.indexOf('סיסמתך הזמנית') >= 0);
            if (resetSucceeded) {
              this.passwordResetCompleted = true;
              this.getPcLoggedInUsers();
              this.showAlert(alertBody);
            } else {
              this.showAlert(alertBody);
            }
          } catch (error) {
            this.loading = false;
            console.log('error in sending notification!');
          }
        },
        error: () => {
          this.loading = false;
          this.messageToUser = 'שגיאה באיפוס הסיסמה. נסה שוב.';
        }
      });
  }

}
