import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-dashboard-construction-banner',
  templateUrl: './dashboard-construction-banner.component.html',
  styleUrls: ['./dashboard-construction-banner.component.css'],
})
export class DashboardConstructionBannerComponent implements OnInit {
  /** localStorage key for persisting dismiss state per dashboard */
  @Input() storageKey = 'dashboard.constructionBanner.dismissed';

  @Input() isDark = false;

  readonly contactEmail = 'CCYMERMAN@tzmc.gov.il';

  visible = true;

  ngOnInit(): void {
    this.visible = localStorage.getItem(this.storageKey) !== 'true';
  }

  dismiss(): void {
    this.visible = false;
    localStorage.setItem(this.storageKey, 'true');
  }

  get mailtoHref(): string {
    const subject = encodeURIComponent('הערות לדשבורד בבניה');
    return `mailto:${this.contactEmail}?subject=${subject}`;
  }
}
