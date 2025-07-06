import { Component, OnInit } from "@angular/core";
import { GoogleChartsService } from "./services/google-charts.service";

@Component({
    selector: 'income-group-tabs',
    template: `
      <mat-tab-group>
        <mat-tab *ngFor="let group of deptGroups" [label]="group.name">
          <income-department-tabs [group]="group.name"></income-department-tabs>
        </mat-tab>
      </mat-tab-group>
    `
  })
  export class GroupTabsComponent implements OnInit {
    deptGroups = [];
  
    constructor(private chartService: GoogleChartsService) {}
  
    async ngOnInit() {
      this.deptGroups = await this.chartService.getDepartmentGroups(); // You already have this
    }
  }
  