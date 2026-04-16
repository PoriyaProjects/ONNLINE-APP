import { Component, OnInit } from '@angular/core';
import { GoogleChartsService } from './services/google-charts.service'; // adjust path


@Component({
  selector: 'app-hospital-roomtime-dashb',
  templateUrl: './hospital-roomtime-dashb.component.html',
  styleUrls:  ['./hospital-roomtime-dashb.component.scss']
})
export class HospitalRoomTimeDashbComponent implements OnInit {
 

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