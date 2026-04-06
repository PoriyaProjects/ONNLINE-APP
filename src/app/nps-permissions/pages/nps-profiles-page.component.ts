import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NpsProfile } from '../models/nps.models';
import { NpsBaseApiService } from '../services/nps-base-api.service';

@Component({
  selector: 'app-nps-profiles-page',
  templateUrl: './nps-profiles-page.component.html',
  styleUrls: ['./nps-profiles-page.component.scss'],
})
export class NpsProfilesPageComponent implements OnInit {
  profiles: NpsProfile[] = [];
  cols = ['ProfileID', 'ProfileCode', 'ProfileName', 'Description', 'Actions'];
  private employee_id: string = localStorage.getItem('ID') || '';

  constructor(private api: NpsBaseApiService, private router: Router) {}

  ngOnInit(): void {
    this.api.getProfiles(this.employee_id || '').subscribe((p) => (this.profiles = p));
  }

  edit(id: number): void {
    this.router.navigate(['/nps-permissions/profiles', id, 'edit']);
  }
 
  view(id: number): void {
    this.router.navigate(['/nps-permissions/profiles', id, 'view']);
  }

  create(): void {
    this.router.navigate(['/nps-permissions/profiles/new']);
  }
}
