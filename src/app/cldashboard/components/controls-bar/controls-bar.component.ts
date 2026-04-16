
import { Component, Output, EventEmitter, Input } from '@angular/core';
import { DepartmentService, TimePeriodService} from '../../services/department.service';

@Component({
  selector: 'app-controls-bar',
  templateUrl: './controls-bar.component.html',
  styleUrls: ['./controls-bar.component.scss']
})
export class ControlsBarComponent {
  @Input() departments: { id: number, name: string }[] = [];

  @Input() periods: { id: number, name: string }[] = [];
  timePeriods: any[] = [];
  selectedTimePeriod: string;

  @Output() filtersChanged = new EventEmitter<any>();

  selectedDept = '1';
  dateRange = 'lastMonth';
  payerType = 'all';
  granularity = 'monthly';

  applyFilters() {
    this.filtersChanged.emit({
      deptCode: this.selectedDept,
      dateRange: this.dateRange,
      payerType: this.payerType,
      granularity: this.granularity
    });
  }


  constructor(
    private departmentService: DepartmentService,
    private timePeriodService: TimePeriodService
  ) {}

  ngOnInit(): void {
    this.loadDepartments();
    this.loadTimePeriods();
  }

  loadDepartments() {
    this.departmentService.getDepartments().subscribe({
      next: (data) => this.departments = data || [],
      error: (err) => console.error('Failed to load departments:', err)
    });
  }

  loadTimePeriods() {
    this.timePeriodService.getTimePeriods().subscribe({
      next: (data) => this.timePeriods = data || [],
      error: (err) => console.error('Failed to load time periods:', err)
    });
  }
}
