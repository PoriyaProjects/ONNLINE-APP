import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MriScheduleService, ScheduleResponse, ScheduleDay, SchedulePattern, MriOrderDetail } from './mri-schedule.service';

function formatDateYyyyMmDd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMonthStartEnd(date: Date): { from: string; to: string } {
  const from = new Date(date.getFullYear(), date.getMonth(), 1);
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { from: formatDateYyyyMmDd(from), to: formatDateYyyyMmDd(to) };
}

@Component({
  selector: 'app-mri-schedule',
  templateUrl: './mri-schedule.component.html',
  styleUrls: ['./mri-schedule.component.css']
})
export class MriScheduleComponent implements OnInit {

  fromDate: string;
  toDate: string;
  loading = false;
  errorMessage: string | null = null;
  schedule: ScheduleResponse | null = null;

  editOpen = false;
  editTemplate = '';
  editDayy = 'Sunday';
  editNum: number | null = null;
  editSaving = false;
  uniqueTemplates: string[] = [];
  readonly weekdayOptions = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  ordersModalOpen = false;
  ordersLoading = false;
  ordersError: string | null = null;
  ordersList: MriOrderDetail[] = [];
  ordersDate = '';
  ordersTemplate = '';

  constructor(
    private mriScheduleService: MriScheduleService,
    private snackBar: MatSnackBar
  ) {
    const { from, to } = getMonthStartEnd(new Date());
    this.fromDate = from;
    this.toDate = to;
  }

  ngOnInit(): void {}

  loadSchedule(): void {
    this.errorMessage = null;
    this.schedule = null;
    this.loading = true;
    this.mriScheduleService.getMriScheduling(this.fromDate, this.toDate).subscribe({
      next: (res) => {
        this.schedule = res;
        this.uniqueTemplates = this.buildUniqueTemplates(res);
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Failed to load MRI schedule. Please try again.';
        this.snackBar.open(this.errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  private buildUniqueTemplates(res: ScheduleResponse): string[] {
    const set = new Set<string>();
    (res?.Days ?? []).forEach((d) => (d.Patterns ?? []).forEach((p) => set.add(p.Template)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  getDays(): ScheduleDay[] {
    return this.schedule?.Days ?? [];
  }

  formatDisplayDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  isOverbooked(ordered: number, capacity: number): boolean {
    return capacity > 0 && ordered > capacity;
  }

  /** When ordered > capacity, show (ordered - capacity); otherwise show Remaining. */
  getDisplayRemaining(p: { Capacity: number; OrderedCount: number; Remaining: number }): number {
    if (p.OrderedCount > p.Capacity) return p.OrderedCount - p.Capacity;
    return p.Remaining;
  }

  openEdit(): void {
    this.editOpen = true;
    this.editTemplate = this.uniqueTemplates[0] ?? '';
    this.editDayy = 'Sunday';
    this.editNum = null;
  }

  closeEdit(): void {
    this.editOpen = false;
  }

  openOrderDetails(date: string, template: string): void {
    this.ordersModalOpen = true;
    this.ordersLoading = true;
    this.ordersError = null;
    this.ordersList = [];
    this.ordersDate = date;
    this.ordersTemplate = template;
    this.mriScheduleService.getMriOrderDetails(date, template).subscribe({
      next: (list) => {
        this.ordersList = list ?? [];
        this.ordersLoading = false;
      },
      error: (err) => {
        this.ordersLoading = false;
        this.ordersError = err?.error?.message || 'Failed to load order details.';
        this.snackBar.open(this.ordersError, 'Close', { duration: 5000 });
      }
    });
  }

  closeOrderDetails(): void {
    this.ordersModalOpen = false;
    this.ordersError = null;
    this.ordersList = [];
  }

  submitEdit(): void {
    if (!this.editTemplate || !this.editDayy || this.editNum == null) {
      this.snackBar.open('Please select Template, Day and enter Number.', 'Close', { duration: 3000 });
      return;
    }
    this.editSaving = true;
    this.mriScheduleService.updatePattern(this.editTemplate, this.editDayy, String(this.editNum)).subscribe({
      next: () => {
        this.editSaving = false;
        this.closeEdit();
        this.snackBar.open('Updated successfully.', 'Close', { duration: 3000 });
        this.loadSchedule();
      },
      error: (err) => {
        this.editSaving = false;
        this.snackBar.open(err?.error?.message || 'Update failed.', 'Close', { duration: 5000 });
      }
    });
  }
}
