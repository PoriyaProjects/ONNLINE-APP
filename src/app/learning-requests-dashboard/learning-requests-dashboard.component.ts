import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-learning-requests-dashboard',
  templateUrl: './learning-requests-dashboard.component.html',
  styleUrls: ['./learning-requests-dashboard.component.scss']
})
export class LearningRequestsDashboardComponent implements OnInit {

  @ViewChild('paginator1') paginator1: MatPaginator;
  @ViewChild('paginator2') paginator2: MatPaginator;
  @ViewChild(MatSort) sort1: MatSort;
  @ViewChild('sort2') sort2: MatSort;

  // Modern Chart Configurations
  donutChart1 = {
    type: 'PieChart',
    data: [],
    options: {
      pieHole: 0.65, // Modern, thinner donut ring
      colors: ['#10B981', '#EF4444'], // Modern Emerald Green & Soft Rose
      legend: { position: 'bottom', textStyle: { color: '#64748b', fontSize: 13, fontName: 'Rubik' } },
      chartArea: { width: '90%', height: '75%' },
      tooltip: { textStyle: { fontName: 'Rubik' }, showColorCode: true },
      pieSliceText: 'percentage',
      fontName: 'Rubik'
    }
  };

  donutChart2 = {
    type: 'PieChart',
    data: [],
    options: {
      pieHole: 0.65,
      colors: ['#10B981', '#EF4444'],
      legend: { position: 'bottom', textStyle: { color: '#64748b', fontSize: 13, fontName: 'Rubik' } },
      chartArea: { width: '90%', height: '75%' },
      tooltip: { textStyle: { fontName: 'Rubik' }, showColorCode: true },
      pieSliceText: 'percentage',
      fontName: 'Rubik'
    }
  };

  // Table Setup
  displayedColumns: string[] = ['assignment_id', 'name', 'due_date', 'lesson_type', 'link'];
  displayedColumns2: string[] = ['assignment_id', 'name', 'depart', 'employee'];
  
  tableData = new MatTableDataSource<any>();
  managerTableData = new MatTableDataSource<any>();
  
  // Dashboard Metrics
  is_manager: boolean = false;
  employeeId = localStorage.getItem('ID');

  totalPersonalCourses: number = 0;
  completedPersonalCourses: number = 0;
  pendingPersonalCourses: number = 0;
  personalCompletionRate: number = 0;

  totalDeptCourses: number = 0;

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.getLearningCoursesByEmployeeID();
    this.getUnDoneLearningCoursesByEmployeeID();
  }

  openLink(assignmentId: string): void {
    const url = `https://platform.blossom-kc.com/poria/mail_link?group=${assignmentId}`;
    window.open(url, '_blank');
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.tableData.filter = filterValue.trim().toLowerCase();
  }

  applyManagerFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.managerTableData.filter = filterValue.trim().toLowerCase();
  }

  getLearningCoursesByEmployeeID() {
    this.http
      .post(environment.url + "GetLearningCoursesByEmployeeID", {
        employee_id: this.employeeId
      })
      .subscribe((Response: any) => {
        const data = Response['d'];
        this.is_manager = data['is_manager'];
        this.donutChart1.data = data['personal_list'];
        this.donutChart2.data = data['personal_department_list'];

        this.calculatePersonalMetrics(data['personal_list']);
        this.calculateDeptMetrics(data['personal_department_list']);
      });
  }

  getUnDoneLearningCoursesByEmployeeID() {
    this.http
      .post(environment.url + "GetUnDoneLearningCoursesByEmployeeID", {
        employee_id: this.employeeId
      })
      .subscribe((Response: any) => {
        const data = Response['d'];
        
        this.tableData = new MatTableDataSource<any>(data['undone_courses_list']);
        this.tableData.paginator = this.paginator1;
        this.tableData.sort = this.sort1;

        this.managerTableData = new MatTableDataSource<any>(data['depart_undone_courses_list']);
        this.managerTableData.paginator = this.paginator2;
        this.managerTableData.sort = this.sort2;
      });
  }

  private calculatePersonalMetrics(chartData: any[]) {
    if (!chartData || chartData.length === 0) return;
    
    // Assumes chartData is in format [['Status', 'Count'], ['Completed', X], ['Pending', Y]]
    let completed = 0;
    let pending = 0;

    chartData.forEach(row => {
      if (row[0]?.includes('בוצע') || row[0]?.toLowerCase().includes('complete')) {
        completed += row[1];
      } else {
        pending += row[1];
      }
    });

    this.completedPersonalCourses = completed;
    this.pendingPersonalCourses = pending;
    this.totalPersonalCourses = completed + pending;
    this.personalCompletionRate = this.totalPersonalCourses > 0 
      ? Math.round((completed / this.totalPersonalCourses) * 100) 
      : 0;
  }

  private calculateDeptMetrics(chartData: any[]) {
    if (!chartData || chartData.length === 0) return;
    this.totalDeptCourses = chartData.reduce((acc, row) => typeof row[1] === 'number' ? acc + row[1] : acc, 0);
  }
}