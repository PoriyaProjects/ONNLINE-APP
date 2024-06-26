import { Component, OnInit } from '@angular/core';



const ELEMENT_DATA1 = [
  { column1: 'Data 1.1', column2: 'Data 1.2' },
  { column1: 'Data 1.3', column2: 'Data 1.4' },
  // Add more data as needed
];

const ELEMENT_DATA2 = [
  { column1: 'Data 2.1', column2: 'Data 2.2' },
  { column1: 'Data 2.3', column2: 'Data 2.4' },
  // Add more data as needed
];

const ELEMENT_DATA3 = [
  { column1: 'Data 3.1', column2: 'Data 3.2' },
  { column1: 'Data 3.3', column2: 'Data 3.4' },
  // Add more data as needed
];

const ELEMENT_DATA4 = [
  { column1: 'Data 4.1', column2: 'Data 4.2' },
  { column1: 'Data 4.3', column2: 'Data 4.4' },
  // Add more data as needed
];

@Component({
  selector: 'app-report-reporting',
  templateUrl: './report-reporting.component.html',
  styleUrls: ['./report-reporting.component.css']
})




export class ReportReportingComponent implements OnInit {

  constructor() {
    
   }

  ngOnInit(): void {
  }



  displayedColumns: string[] = ['column1', 'column2'];
  dataSource1 = ELEMENT_DATA1;
  dataSource2 = ELEMENT_DATA2;
  dataSource3 = ELEMENT_DATA3;
  dataSource4 = ELEMENT_DATA4;

  

}
