import { Component, HostListener, OnInit } from '@angular/core';
import { Form29Service } from '../form29.service';
import { F29ListItem } from '../form29.models';

@Component({
  selector: 'app-form29-list',
  templateUrl: './form29-list.component.html',
  styleUrls: ['./form29-list.component.scss'],
})
export class Form29ListComponent implements OnInit {
  q = '';
  status = '';
  items: F29ListItem[] = [];
  loading = false;
  error = '';
  newMenuOpen = false;

  constructor(private form29: Form29Service) {}

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.error = '';
    this.form29.list(this.q, this.status).subscribe(
      (items) => {
        this.items = items;
        this.loading = false;
      },
      (err) => {
        this.items = [];
        this.loading = false;
        this.error = (err && err.message) || 'אירעה שגיאה';
      }
    );
  }

  statusClass(status: string): string {
    return 'f29-status f29-status-' + (status || 'draft').toLowerCase();
  }

  toggleNewMenu(event: Event): void {
    event.stopPropagation();
    this.newMenuOpen = !this.newMenuOpen;
  }

  @HostListener('document:click')
  closeNewMenu(): void {
    this.newMenuOpen = false;
  }

  @HostListener('document:keydown.escape')
  closeNewMenuOnEscape(): void {
    this.newMenuOpen = false;
  }
}
