import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { TrainingReportFilter } from '../../../models';

export type TrainingReportFilterPreset =
  | 'dashboard'
  | 'sessions'
  | 'courses'
  | 'attendance'
  | 'employees'
  | 'compliance'
  | 'certificates';

@Component({
  selector: 'app-training-report-filters',
  templateUrl: './training-report-filters.component.html',
  styleUrls: ['./training-report-filters.component.scss'],
})
export class TrainingReportFiltersComponent implements OnInit {
  @Input() preset: TrainingReportFilterPreset = 'dashboard';
  @Input() initial: Partial<TrainingReportFilter> | null = null;
  @Output() apply = new EventEmitter<TrainingReportFilter>();
  @Output() clear = new EventEmitter<void>();

  form: FormGroup;
  dateRangeError: string | null = null;

  constructor(private fb: FormBuilder) {
    const year = new Date().getFullYear();
    this.form = this.fb.group({
      FromDate: [`${year}-01-01`],
      ToDate: [`${year}-12-31`],
      CourseId: [null],
      SessionId: [null],
      DepartmentCode: [''],
      EmployeeID: [''],
      EmployeeSearch: [''],
      CourseType: [''],
      Location: [''],
      LecturerEmployeeID: [''],
      SessionStatus: [null],
      RegistrationStatus: [null],
      AttendanceStatus: [null],
      CertificateStatus: [null],
      ComplianceStatus: [null],
      ExpiringWithinDays: [null],
      MandatoryOnly: [false],
      ActiveEmployeesOnly: [true],
    });
  }

  ngOnInit(): void {
    if (this.initial) {
      this.form.patchValue(this.initial);
    }
  }

  show(field: string): boolean {
    const p = this.preset;
    const map: Record<string, TrainingReportFilterPreset[]> = {
      FromDate: ['dashboard', 'sessions', 'courses', 'attendance', 'employees', 'compliance', 'certificates'],
      ToDate: ['dashboard', 'sessions', 'courses', 'attendance', 'employees', 'compliance', 'certificates'],
      CourseId: ['dashboard', 'sessions', 'courses', 'attendance', 'compliance', 'certificates'],
      SessionId: ['attendance', 'sessions'],
      DepartmentCode: ['dashboard', 'sessions', 'courses', 'attendance', 'employees', 'compliance', 'certificates'],
      EmployeeID: ['attendance', 'employees', 'compliance', 'certificates'],
      EmployeeSearch: ['employees', 'attendance'],
      CourseType: ['dashboard', 'sessions', 'courses'],
      Location: ['sessions'],
      LecturerEmployeeID: ['sessions'],
      SessionStatus: ['dashboard', 'sessions'],
      RegistrationStatus: ['attendance', 'employees'],
      AttendanceStatus: ['attendance'],
      CertificateStatus: ['certificates'],
      ComplianceStatus: ['compliance'],
      ExpiringWithinDays: ['certificates'],
      MandatoryOnly: ['dashboard', 'courses', 'attendance', 'compliance'],
      ActiveEmployeesOnly: ['compliance', 'employees'],
    };
    return (map[field] || []).indexOf(p) >= 0;
  }

  onApply(): void {
    this.dateRangeError = null;
    const v = this.form.getRawValue();
    if (v.FromDate && v.ToDate && v.FromDate > v.ToDate) {
      this.dateRangeError = 'תאריך ההתחלה אינו יכול להיות אחרי תאריך הסיום.';
      return;
    }
    const filter: TrainingReportFilter = {
      FromDate: v.FromDate || null,
      ToDate: v.ToDate || null,
      CourseId: v.CourseId != null && v.CourseId !== '' ? Number(v.CourseId) : null,
      SessionId: v.SessionId != null && v.SessionId !== '' ? Number(v.SessionId) : null,
      DepartmentCode: v.DepartmentCode || null,
      EmployeeID: v.EmployeeID || null,
      EmployeeSearch: v.EmployeeSearch || null,
      CourseType: v.CourseType || null,
      Location: v.Location || null,
      LecturerEmployeeID: v.LecturerEmployeeID || null,
      SessionStatus: v.SessionStatus != null ? v.SessionStatus : null,
      RegistrationStatus: v.RegistrationStatus != null ? v.RegistrationStatus : null,
      AttendanceStatus: v.AttendanceStatus != null ? v.AttendanceStatus : null,
      CertificateStatus: v.CertificateStatus != null ? v.CertificateStatus : null,
      ComplianceStatus: v.ComplianceStatus != null ? v.ComplianceStatus : null,
      ExpiringWithinDays: v.ExpiringWithinDays != null && v.ExpiringWithinDays !== ''
        ? Number(v.ExpiringWithinDays)
        : null,
      MandatoryOnly: !!v.MandatoryOnly,
      ActiveEmployeesOnly: !!v.ActiveEmployeesOnly,
      Skip: 0,
      Take: 50,
    };
    this.apply.emit(filter);
  }

  onClear(): void {
    const year = new Date().getFullYear();
    this.form.reset({
      FromDate: `${year}-01-01`,
      ToDate: `${year}-12-31`,
      CourseId: null,
      SessionId: null,
      DepartmentCode: '',
      EmployeeID: '',
      EmployeeSearch: '',
      CourseType: '',
      Location: '',
      LecturerEmployeeID: '',
      SessionStatus: null,
      RegistrationStatus: null,
      AttendanceStatus: null,
      CertificateStatus: null,
      ComplianceStatus: null,
      ExpiringWithinDays: null,
      MandatoryOnly: false,
      ActiveEmployeesOnly: true,
    });
    this.dateRangeError = null;
    this.clear.emit();
    this.onApply();
  }
}
