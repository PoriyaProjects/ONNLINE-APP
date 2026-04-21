import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NpsRequestDetail } from '../models/nps.models';
import { NpsBaseApiService } from '../services/nps-base-api.service';

@Component({
  selector: 'app-nps-request-detail-page',
  templateUrl: './nps-request-detail-page.component.html',
  styleUrls: ['./nps-request-detail-page.component.scss'],
})
export class NpsRequestDetailPageComponent implements OnInit {
  detail: NpsRequestDetail;
  comments = '';
  private id: number;
  private employee_id: string = localStorage.getItem('ID') || '';

  constructor(private route: ActivatedRoute, private api: NpsBaseApiService, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.route.params.subscribe((p) => {
      this.id = +p.id;
      this.load();
    });
  }

  load(): void {
    this.api.getRequest(this.employee_id || '', this.id).subscribe((d) => (this.detail = d));
  }

  approve(): void {
    this.api.approveRequest(this.employee_id || '', this.id, this.comments).subscribe(
      () => {
        this.snack.open('אושר', 'סגור', { duration: 2000 });
        this.load();
      },
      (e) => this.snack.open(e.error?.message || 'שגיאה', 'סגור', { duration: 4000 })
    );
  }

  reject(): void {
    this.api.rejectRequest(this.employee_id || '', this.id, this.comments).subscribe(
      () => {
        this.snack.open('נדחה', 'סגור', { duration: 2000 });
        this.load();
      },
      (e) => this.snack.open(e.error?.message || 'שגיאה', 'סגור', { duration: 4000 })
    );
  }
}
