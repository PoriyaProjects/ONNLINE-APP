import { HttpClient } from '@angular/common/http';
import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-namer-user-actions',
  templateUrl: './namer-user-actions.component.html',
  styleUrls: ['./namer-user-actions.component.css']
})
export class NamerUserActionsComponent implements OnInit {

  username: string = '';
  validationfromwhatsapp: string = '';
  messageToUser: string = '';
  validationCode: number;

  constructor(
    public dialogRef: MatDialogRef<NamerUserActionsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private http: HttpClient
  ) { }


  ngOnInit(): void {
    // throw new Error('Method not implemented.');
  }

  generateRandomNumber(): void {
    // Generate a random number between 100000 and 999999
    this.validationCode = Math.floor(Math.random() * 900000) + 100000;
    this.sendNotificationToWhatsApp();
  }

  sendNotificationToWhatsApp() {
    this.http
      .post(environment.url + "SaveNamerValidationCode", {
        validation_code: this.validationCode,
        user_name: this.username,
      })
      .subscribe((Response) => {
        try {
          if (Response['d']) this.messageToUser = "קוד אימות נשלח לוואטסאפ שלך";
        } catch (error) {
          this.messageToUser = "תקלה";
        }
      });
  }

  onCancel(): void {
    this.dialogRef.close(null); // Close the modal without returning data
  }

  onSubmit(action): void {
    this.http
      .post(environment.url + "resetPasswordNamer", {
        ValidationCode: this.validationfromwhatsapp,
        UserName: this.username,
        action_type: action
      })
      .subscribe((Response) => {
        try {
          alert(Response['d']);
        } catch (error) {
          console.log("error in sending notification!");
        }
      });
  }

}
