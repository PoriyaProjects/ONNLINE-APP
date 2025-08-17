import { Component, OnInit } from '@angular/core';
import { GoogleChartsService } from './services/google-charts.service'; // adjust path


@Component({
  selector: 'app-hospital-roomtimen-dashb',
  templateUrl: './hospital-roomtimen-dashb.component.html',
  styleUrls:  ['./hospital-roomtimen-dashb.component.scss']
})
export class HospitalRoomTimeNDashbComponent implements OnInit {
 

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