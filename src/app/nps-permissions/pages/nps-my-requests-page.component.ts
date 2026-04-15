import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NpsRequestSummary } from '../models/nps.models';
import { NpsBaseApiService } from '../services/nps-base-api.service';

@Component({
  selector: 'app-nps-my-requests-page',
  templateUrl: './nps-my-requests-page.component.html',
  styleUrls: ['./nps-my-requests-page.component.scss'],
})
export class NpsMyRequestsPageComponent implements OnInit {
  rows: NpsRequestSummary[] = [];
  cols = ['RequestID', 'Status', 'Actions'];
  private employee_id: string = localStorage.getItem('ID') || '';
  
  constructor(private api: NpsBaseApiService, private router: Router) {}

  ngOnInit(): void {
    this.api.getMyRequests(this.employee_id || '').subscribe((r) => (this.rows = r));
  }

  go(id: number): void {
    this.router.navigate(['/nps-permissions/requests', id]);
  }
}
