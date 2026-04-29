import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-nps-dashboard-page',
  templateUrl: './nps-dashboard-page.component.html',
  styleUrls: ['./nps-dashboard-page.component.scss'],
})
export class NpsDashboardPageComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {
    // KPI cards are rendered once in the shell above all pages.
  }
}
