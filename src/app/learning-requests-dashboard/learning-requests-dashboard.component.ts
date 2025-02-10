import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-learning-requests-dashboard',
  templateUrl: './learning-requests-dashboard.component.html',
  styleUrls: ['./learning-requests-dashboard.component.scss']
})
export class LearningRequestsDashboardComponent implements OnInit {

  // Donut Chart Data
  donutChart1 = {
    title: '',
    type: 'PieChart',
    data: [
    ],
    options: {
      pieHole: 0.4,
      height: 300,
      colors: ['#42f57e', '#f54b42']
    }
  };

  donutChart2 = {
    title: '',
    type: 'PieChart',
    data: [
    ],
    options: {
      pieHole: 0.4,
      height: 300,
      colors: ['#42f57e', '#f54b42']
    }
  };

  // Pie Charts
  pieChart1 = {
    title: '',
    type: 'PieChart',
    data: [
      ['Satisfied', 60],
      ['Neutral', 25],
      ['Dissatisfied', 15]
    ],
    options: { height: 300 }
  };

  pieChart2 = {
    title: '',
    type: 'PieChart',
    data: [
      ['Mobiles', 35],
      ['Laptops', 25],
      ['Accessories', 20],
      ['Wearables', 20]
    ],
    options: { height: 300 }
  };

  pieChart3 = {
    title: '',
    type: 'PieChart',
    data: [
      ['Direct', 40],
      ['Social Media', 35],
      ['Search Engine', 25]
    ],
    options: { height: 300 }
  };

  // Table Data
  displayedColumns: string[] = ['assignment_id', 'name', 'due_date'];
  tableData = new MatTableDataSource<any>();

  employeeId = localStorage.getItem('ID');

  constructor(
    private http: HttpClient,) { }

  ngOnInit(): void {
    this.getLearningCoursesByEmployeeID();
    this.getUnDoneLearningCoursesByEmployeeID();
  }

  getLearningCoursesByEmployeeID() {
    this.http
      .post(environment.url + "GetLearningCoursesByEmployeeID", {
        employee_id: this.employeeId
      })
      .subscribe((Response) => {
        this.donutChart1.data = Response['d']['personal_list'];
        this.donutChart2.data = Response['d']['personal_department_list'];
      });
  }

  getUnDoneLearningCoursesByEmployeeID() {
    this.http
      .post(environment.url + "GetUnDoneLearningCoursesByEmployeeID", {
        employee_id: this.employeeId
      })
      .subscribe((Response) => {
        this.tableData = new MatTableDataSource<any>(Response['d']);
      });
  }

}
