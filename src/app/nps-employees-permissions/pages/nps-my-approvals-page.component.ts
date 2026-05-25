import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NpsRequestSummary } from '../models/nps.models';
import { NpsEmployeesPermissionsApiService } from '../services/nps-employees-permissions-api.service';

@Component({
  selector: 'app-nps-my-approvals-page',
  templateUrl: './nps-my-approvals-page.component.html',
  styleUrls: ['./nps-my-approvals-page.component.scss'],
})
export class NpsMyApprovalsPageComponent implements OnInit {
  rows: NpsRequestSummary[] = [];
  cols = ['RequestID', 'EmployeeID', 'Actions'];
  private employee_id: string = localStorage.getItem('ID') || '';
  
  constructor(private api: NpsEmployeesPermissionsApiService, private router: Router) {}

  ngOnInit(): void {
    this.api.getMyApprovals(this.employee_id || '').subscribe((r) => (this.rows = r));
  }

  go(id: number): void {
    this.router.navigate(['/nps-employees-permissions/requests', id]);
  }
}
