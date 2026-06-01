import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-windows-user-actions',
  templateUrl: './windows-user-actions.component.html',
  styleUrls: ['./windows-user-actions.component.scss']
})
export class WindowsUserActionsComponent implements OnInit {

  username: string = '';
  newPassword: string = '';
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

  /** Toggles visibility of the password input text */
  hidePassword = true;
  /** Controls authorization state of custom password mapping */
  isPasswordValid = false;

  /** Password validation tracking entity for live styling matches */
  passwordCriteria = {
    length: false,
    english: false,
    upper: false,
    lower: false,
    digit: false,
    special: false,
    noUsername: true,
    noPoria: true,
    noSequences: true
  };

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

  /**
   * Evaluates the chosen password against institutional rules dynamically as the user types.
   */
  validatePasswordLive(): void {
    const pass = this.newPassword;
    const user = this.username.trim().toLowerCase();

    // 1. Minimum 8 characters
    this.passwordCriteria.length = pass.length >= 8;

    // 2. English alphanumeric + safe special characters only
    this.passwordCriteria.english = pass.length > 0 && /^[A-Za-z0-9!@#$%*^()_+=\-`~[\]{}|;:',./<>?]*$/.test(pass);

    // 3. Complexity rules (4 required types)
    this.passwordCriteria.upper = /[A-Z]/.test(pass);
    this.passwordCriteria.lower = /[a-z]/.test(pass);
    this.passwordCriteria.digit = /[0-9]/.test(pass);
    this.passwordCriteria.special = /[!@#$%*^]/.test(pass);

    // 4. Exclusion checks
    this.passwordCriteria.noUsername = user ? !pass.toLowerCase().includes(user) : true;
    this.passwordCriteria.noPoria = !pass.toLowerCase().includes('poriya') && !pass.toLowerCase().includes('poria');
    
    // Simple verification for common linear keyboard strings
    const commonSequences = ['abc', '123', 'qwe', 'asd', 'zxc'];
    this.passwordCriteria.noSequences = !commonSequences.some(seq => pass.toLowerCase().includes(seq));

    // Form activation requires everything to evaluate to true
    this.isPasswordValid = Object.values(this.passwordCriteria).every(condition => condition === true);
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
    if (!this.isPasswordValid) {
      this.messageToUser = 'הסיסמה אינה עומדת בדרישות המאובטחות.';
      return;
    }

    this.loading = true;
    this.http
      .post(environment.url + "ResetWindowsAccountPassword", {
        ValidationCode: this.validationfromwhatsapp,
        UserName: this.username,
        NewPassword: this.newPassword.trim() // Sends your explicitly written password down to the server payload
      })
      .subscribe({
        next: (Response: any) => {
          try {
            this.loading = false;
            const msg = Response && Response['d'] !== undefined ? Response['d'] : '';
            
            const resetSucceeded =
              typeof msg === 'string' &&
              (msg.indexOf('התאפסה') >= 0 || msg.indexOf('בהצלחה') >= 0 || msg.indexOf('שונתה') >= 0);
            
            if (resetSucceeded) {
              this.passwordResetCompleted = true;
              this.getPcLoggedInUsers();
              this.showAlert("הסיסמה שונתה בהצלחה במערכת וחשבונך מעודכן.");
              this.newPassword = ''; // clear out password securely
              this.validatePasswordLive();
            } else {
              this.showAlert(msg || 'תקלה בעדכון הסיסמה מול השרת.');
            }
          } catch (error) {
            this.loading = false;
            console.log('error in processing password submission!');
          }
        },
        error: () => {
          this.loading = false;
          this.messageToUser = 'שגיאה באיפוס הסיסמה. נסה שוב.';
        }
      });
  }

}