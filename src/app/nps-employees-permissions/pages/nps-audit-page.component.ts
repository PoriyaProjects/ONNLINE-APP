import { Component, OnInit } from '@angular/core';
import { NpsAuditRow } from '../models/nps.models';
import { NpsEmployeesPermissionsApiService } from '../services/nps-employees-permissions-api.service';

@Component({
  selector: 'app-nps-audit-page',
  templateUrl: './nps-audit-page.component.html',
  styleUrls: ['./nps-audit-page.component.scss'],
})
export class NpsAuditPageComponent implements OnInit {
  rows: NpsAuditRow[] = [];
  cols = ['AuditID', 'ActorEmployeeID', 'ActionCode', 'EntityType', 'CreatedUTC'];
  private employee_id: string = localStorage.getItem('ID') || '';
  
  constructor(private api: NpsEmployeesPermissionsApiService) {}

  ngOnInit(): void {
    this.api.getAudit(this.employee_id || '', '', 0, 200).subscribe((r) => (this.rows = r));
  }
}
