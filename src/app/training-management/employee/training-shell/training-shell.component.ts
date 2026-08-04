import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-training-shell',
  templateUrl: './training-shell.component.html',
  styleUrls: ['./training-shell.component.scss'],
})
export class TrainingShellComponent implements OnInit {
  isLoggedIn = false;
  employeeName = '';
  hideNav = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.isLoggedIn = localStorage.getItem('loginState') === 'true';
    const first = localStorage.getItem('FirstName') || '';
    const last = localStorage.getItem('LastName') || '';
    this.employeeName = `${first} ${last}`.trim();
    this.updateHideNav(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.updateHideNav(e.urlAfterRedirects || e.url));

    if (!this.isLoggedIn) {
      const returnUrl = window.location.hash || this.router.url;
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: returnUrl || '' },
      });
    }
  }

  private updateHideNav(url: string): void {
    this.hideNav = (url || '').indexOf('/attendance/') >= 0;
  }
}
