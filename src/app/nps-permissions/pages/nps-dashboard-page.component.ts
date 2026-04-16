import { Component, OnInit } from '@angular/core';
import { NpsDashboardSummary } from '../models/nps.models';
import { NpsBaseApiService } from '../services/nps-base-api.service';

@Component({
  selector: 'app-nps-dashboard-page',
  templateUrl: './nps-dashboard-page.component.html',
  styleUrls: ['./nps-dashboard-page.component.scss'],
})
export class NpsDashboardPageComponent implements OnInit {
  summary: NpsDashboardSummary;
  busy = false;
  queueMsg = '';
  employee_id: string = localStorage.getItem('ID') || '';

  constructor(private api: NpsBaseApiService) {}

  ngOnInit(): void {
    this.api.getDashboardSummary(this.employee_id || '').subscribe((s) => (this.summary = s));
  }

  runQueue(): void {
    this.busy = true;
    this.api.processQueue(this.employee_id || '', 50).subscribe(
      (r) => {
        this.queueMsg = JSON.stringify(r);
        this.busy = false;
        this.api.getDashboardSummary(this.employee_id || '').subscribe((s) => (this.summary = s));
      },
      () => (this.busy = false)
    );
  }
}
