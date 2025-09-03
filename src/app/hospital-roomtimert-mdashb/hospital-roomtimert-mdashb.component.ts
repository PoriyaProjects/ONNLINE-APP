import { Component, OnInit } from '@angular/core';
import { GoogleChartsService } from './services/google-charts.service'; // adjust path


@Component({
  selector: 'app-hospital-roomtimert-mdashb',
  templateUrl: './hospital-roomtimert-mdashb.component.html',
  styleUrls:  ['./hospital-roomtimert-mdashb.component.scss']
})
export class HospitalRoomTimeRTmDashbComponent implements OnInit {
 

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