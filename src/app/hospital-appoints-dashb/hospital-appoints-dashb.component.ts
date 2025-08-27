import { Component, OnInit } from '@angular/core';
import { GoogleChartsService } from './services/google-charts.service'; 

@Component({
  selector: 'app-hospital-roomtime-dashb',
  templateUrl: './hospital-appoints-dashb.component.html',
  styleUrls:  ['./hospital-appoints-dashb.component.scss']
})
export class AppointsDashbComponent implements OnInit {
 

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