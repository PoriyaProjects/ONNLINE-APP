import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-training-request-form',
  templateUrl: './training-request-form.component.html',
  styleUrls: ['./training-request-form.component.scss']
})
export class TrainingRequestFormComponent implements OnInit {
  trainingForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.trainingForm = this.fb.group({
      First_Name: [''],
      Family_Name: [''],
      Passport_ID: [''],
      Phone_Number: [''],
      // Add other controls as needed
    });
  }

  ngOnInit(): void {
  }

  onSubmit() {
    console.log(this.trainingForm.value);
  }

}
