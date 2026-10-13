import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DpEmployeeDetail, DpProfile } from '../../models/dp.models';
import { DoctorPermissionsService } from '../../services/doctor-permissions.service';
import { formatDay, formatStamp } from '../../utils/dp-status';

@Component({
  selector: 'app-dp-my',
  templateUrl: './dp-my.component.html',
  styleUrls: ['../../styles/dp.shared.scss'],
})
export class DpMyComponent implements OnInit {
  loading = true;
  error = '';
  detail: DpEmployeeDetail;
  busyId = 0;
  day = formatDay;
  stamp = formatStamp;

  constructor(private service: DoctorPermissionsService, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.service.mine().subscribe(
      (detail) => {
        this.detail = detail;
        this.loading = false;
      },
      () => {
        this.loading = false;
        this.error = 'לא ניתן לטעון את ההרשאות שלך כרגע.';
      }
    );
  }

  signState(value: string): string {
    return value ? 'חתם' : 'טרם חתם';
  }

  sign(row: DpProfile): void {
    const employee = this.detail && this.detail.employee;
    this.busyId = row.profileId || row.id;
    this.service.approve(employee.employeeId, row.profileId || row.id, 'doctor').subscribe(
      () => {
        this.busyId = 0;
        this.load();
      },
      (err) => {
        this.busyId = 0;
        this.snack.open((err && err.message) || 'החתימה נכשלה', null, { duration: 3000 });
      }
    );
  }
}
