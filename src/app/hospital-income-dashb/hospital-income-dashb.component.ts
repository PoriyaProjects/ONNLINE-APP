import { Component, OnInit } from '@angular/core';


@Component({
  selector: 'app-hospital-income-dashb',
  templateUrl: './hospital-income-dashb.component.html',
  styleUrls:  ['./hospital-income-dashb.component.scss']
})
export class HospitalIncomeDashbComponent implements OnInit {
 

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