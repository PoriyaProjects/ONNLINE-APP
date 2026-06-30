import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-reset-password-hub',
  templateUrl: './reset-password-hub.component.html',
  styleUrls: ['./reset-password-hub.component.scss']
})
export class ResetPasswordHubComponent {

  constructor(private router: Router) {}

  /**
   * Navigates to the specified reset route.
   * Update the paths to match your actual routing configuration.
   */
  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}