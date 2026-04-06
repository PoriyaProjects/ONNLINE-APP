import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NpsDepartment, NpsEmployeeListRow } from '../models/nps.models';
import { NpsBaseApiService } from '../services/nps-base-api.service';

@Component({
  selector: 'app-nps-employees-page',
  templateUrl: './nps-employees-page.component.html',
  styleUrls: ['./nps-employees-page.component.scss'],
})
export class NpsEmployeesPageComponent implements OnInit {
  rows: NpsEmployeeListRow[] = [];
  departments: NpsDepartment[] = [];
  cols = ['id', 'name', 'dept', 'act'];
  private q = '';
  private departnentCode = '';  
  private employee_id = localStorage.getItem('ID');

  constructor(private api: NpsBaseApiService, private router: Router) {}

  ngOnInit(): void {
    this.api.getDepartments(this.employee_id || '').subscribe((d) => (this.departments = d));
    this.load();
  }

  onFilter(e: { q: string; departnentCode: string }): void {
    this.q = e.q;
    this.departnentCode = e.departnentCode; 
    this.load();
  }

  load(): void {
    this.api.getEmployees(this.employee_id || '', this.q, this.departnentCode).subscribe((r) => {
      this.rows = r;
    });
  }

  go(id: number): void {
    this.router.navigate(['/nps-permissions/employees', id]);
  }
}
