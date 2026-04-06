import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NpsRequestSummary } from '../models/nps.models';
import { NpsBaseApiService } from '../services/nps-base-api.service';

@Component({
  selector: 'app-nps-requests-page',
  templateUrl: './nps-requests-page.component.html',
  styleUrls: ['./nps-requests-page.component.scss'],
})
export class NpsRequestsPageComponent implements OnInit {
  rows: NpsRequestSummary[] = [];
  cols = ['RequestID', 'EmployeeID', 'Status', 'Actions'];
  private employee_id = localStorage.getItem('ID');
  constructor(private api: NpsBaseApiService, private router: Router) {}

  ngOnInit(): void {
    this.api.getRequests(this.employee_id || '', '', 0, 100).subscribe((r) => (this.rows = r));
  }

  open(id: number): void {
    this.router.navigate(['/nps-permissions/requests', id]);
  }
}
