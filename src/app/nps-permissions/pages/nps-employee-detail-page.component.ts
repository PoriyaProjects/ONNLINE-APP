import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NpsEducationRow, NpsEmployeeDetail, NpsRequestSummary } from '../models/nps.models';
import { NpsBaseApiService } from '../services/nps-base-api.service';

@Component({
  selector: 'app-nps-employee-detail-page',
  templateUrl: './nps-employee-detail-page.component.html',
  styleUrls: ['./nps-employee-detail-page.component.scss'],
})
export class NpsEmployeeDetailPageComponent implements OnInit {
  employee: NpsEmployeeDetail;
  educations: NpsEducationRow[] = [];
  requests: NpsRequestSummary[] = [];
  assignments: any[] = [];
  currentProfile: any;
  timelineSteps: any[] = [];
  ecols = ['edu', 'spec', 'pri'];
  rcols = ['rid', 'st', 'dt'];
  acols = ['pid', 'from', 'to', 'act'];
  private id: number;
  private employee_id: string = localStorage.getItem('ID') || '';

  constructor(private route: ActivatedRoute, private api: NpsBaseApiService, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.route.params.subscribe((p) => {
      this.id = +p.id;
      this.reload();
    });
  }

  reload(): void {
    this.api.getEmployee(this.employee_id, this.id).subscribe((e) => (this.employee = e));
    this.api.getEmployeeEducations(this.employee_id, this.id).subscribe((x) => (this.educations = x));
    this.api.getEmployeeRequests(this.employee_id, this.id).subscribe((x) => {
      this.requests = x;
      const last = x && x.length ? x[0] : null;
      if (last) {
        this.api.getRequest(this.employee_id, last.RequestID).subscribe((d) => (this.timelineSteps = d.steps || []));
      } else {
        this.timelineSteps = [];
      }
    });
    this.api.getEmployeeAssignments(this.employee_id, this.id).subscribe((x) => (this.assignments = x));
    this.api.getEmployeeCurrentProfile(this.employee_id, this.id).subscribe((x) => (this.currentProfile = x));
  }

  resolve(): void {
    this.api.resolveEmployeeProfile(this.employee_id, this.id).subscribe((x) => {
      this.snack.open('פרופיל: ' + (x.ProfileName || x.ProfileID), 'סגור', { duration: 3000 });
    });
  }

  createReq(): void {
    this.api.createEmployeeRequest(this.employee_id, this.id).subscribe(
      () => {
        this.snack.open('נוצרה בקשה', 'סגור', { duration: 3000 });
        this.reload();
      },
      (err) => this.snack.open(err.error?.message || 'שגיאה', 'סגור', { duration: 5000 })
    );
  }
}
