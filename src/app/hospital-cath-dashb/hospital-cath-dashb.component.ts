import { Component, OnInit } from '@angular/core';


@Component({
  selector: 'app-hospital-cath-dashb',
  templateUrl: './hospital-cath-dashb.component.html',
  styleUrls:  ['./hospital-cath-dashb.component.scss']
})
export class HospitalCathDashbComponent implements OnInit {
 

  constructor() { }

  ngOnInit(): void {
    // Initialize any data or services here
    
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/material-components-web@latest/dist/material-components-web.min.js';
      script.onload = () => {
        (window as any).mdc?.autoInit();
      };
      document.body.appendChild(script);
    
  }
}