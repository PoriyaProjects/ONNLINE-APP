import { Component, OnInit } from '@angular/core';
import { GoogleChartsService } from './services/google-charts.service'; 

@Component({
  selector: 'app-hospital-roomtime-dashb',
  templateUrl: './hospital-appointscl-dashb.component.html',
  styleUrls:  ['./hospital-appointscl-dashb.component.scss']
})
export class AppointsCLDashbComponent implements OnInit {
 

  constructor() { }

  ngOnInit(): void {
      
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/material-components-web@latest/dist/material-components-web.min.js';
      script.onload = () => {
        (window as any).mdc?.autoInit();
      };
      document.body.appendChild(script);

      
    
  }
}