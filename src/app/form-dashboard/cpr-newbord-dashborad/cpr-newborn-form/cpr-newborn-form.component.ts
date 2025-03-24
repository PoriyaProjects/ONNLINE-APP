import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
interface ResuscitationFormData {
  motherInfo: {
    name: string;
    id: string;
    resuscitationDate: Date;
    resuscitationTime: string;
    location: string; // 'birthRoom', 'operatingRoom', 'other'
    pediatricianCalledTime: string;
    birthTime: string;
    resuscitationStartTime: string;
    babyGender: 'male' | 'female';
    gestationAgeWeeks: number;
    babyWeight: number;
    deliveryMethod: string;
  };
  teamMembers: { name: string; role: string }[];
  pregnancyDeliveryInfo: {
    details: string;
    meconiumStaining: boolean;
    pediatricianPresent: boolean;
    pediatricianArrivalTime: string;
  };
}
@Component({
  selector: 'app-cpr-newborn-form',
  templateUrl: './cpr-newborn-form.component.html',
  styleUrls: ['./cpr-newborn-form.component.css']
})
export class CprNewbornFormComponent implements OnInit {

  resuscitationForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.resuscitationForm = this.fb.group({
      motherInfo: this.fb.group({
        babyName: [''],
        babyId: [''],
        resuscitationDate: [null],
        resuscitationTime: [''],
        location: ['birthRoom'], // Default value
        pediatricianCalledTime: [''],
        resuscitationStartTime: [''],
        babyGender: ['male'], // Default value
        gestationAgeWeeks: [null],
        babyWeight: [null],
        deliveryMethod: ['']
      }),
      teamMembers: this.fb.array([]), // Use FormArray for dynamic table rows
      pregnancyDeliveryInfo: this.fb.group({
        pregnancyDeliveryDetails: [''],
        meconiumStaining: ['false'], // Default value
        pediatricianPresent: ['false'], // Default value
        pediatricianArrivalTime: ['']
      }),
    });
    for (let i = 0; i < 3; i++) {
      let name = "name_" + i;
      let role = "role_" + i;

      this.addTeamMember();
    }
  }

  ngOnInit(): void {
  }

  addTeamMember() {
    const teamMembers = this.resuscitationForm.get('teamMembers') as FormArray;
    teamMembers.push(
      this.fb.group({
        row: ['', Validators.required],
        name: ['', Validators.required],
        role: ['', Validators.required]
      })
    );
  }

  onSubmit() {
    if (this.resuscitationForm.valid) {
      console.log(this.resuscitationForm.value);
      // Send the data to your backend
    }
  }

}
