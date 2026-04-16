import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-ai-letters-dashboard',
  templateUrl: './ai-letters-dashboard.component.html',
  styleUrls: ['./ai-letters-dashboard.component.css']
})
export class AiLettersDashboardComponent implements OnInit {

  siteUrl!: SafeResourceUrl;

  constructor(private sanitizer: DomSanitizer) {
    // CHANGE THIS URL
    this.siteUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      'http://10.221.120.144:8501/'
    );
  }

  ngOnInit(): void {
  }

}
