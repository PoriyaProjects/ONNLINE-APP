import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { MatTableDataSource } from '@angular/material/table';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
export interface Employee {
  id: number;
  name: string;
  services: number[]; // Array of service IDs the employee is connected to
}

export interface Service {
  id: number;
  name: string;
}
@Component({
  selector: 'app-departments-whatsapp-management',
  templateUrl: './departments-whatsapp-management.component.html',
  styleUrls: ['./departments-whatsapp-management.component.css']
})
export class DepartmentsWhatsappManagementComponent implements OnInit, OnDestroy {

  horizontalPosition: MatSnackBarHorizontalPosition = "start";
  verticalPosition: MatSnackBarVerticalPosition = "bottom";

  Services = [];
  employees = new MatTableDataSource<any>();
  newEmployeeName = ''; // Temporary storage for new employee name
  newEmployeeUserName = ''; // Temporary storage for new employee name
  add_employee_display: boolean = false;
  showBtn: boolean = true;

  constructor(
    private http: HttpClient,
    private _snackBar: MatSnackBar,
  ) { }

  ngOnInit(): void {
    this.getDepartmentsWhatsAppServices();
    this.getDepartmentsWhatsAppEmployees();
  }

  ngOnDestroy() {
    this.employees = new MatTableDataSource();
    this.Services = [];
  }
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    if (filterValue == '') this.showBtn = true;
    else this.showBtn = false;
    this.employees.filter = filterValue.trim().toLowerCase();
  }

  // Function to save permissions
  savePermissions() {
    this.http
      .post(environment.url + "SaveEmployeesServicesAssigns", {
        employees: this.employees.filteredData
      })
      .subscribe((Response) => {
        if (Response['d']) {
          this.openSnackBar("נשמר בהצלחה");
          this.getDepartmentsWhatsAppServices();
        } else {
          this.openSnackBar("תקלה! לא נשמר");
        }
      });
  }

  openSnackBar(message) {
    this._snackBar.open(message, "X", {
      duration: 2000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }

  addEmployeeShow() {
    this.add_employee_display = !this.add_employee_display;
  }

  addEmployee() {
    if (this.newEmployeeName.trim() && this.newEmployeeUserName.trim()) {
      const newEmployee = {
        Row_ID: null,
        Employee_Name: this.newEmployeeName,
        Employee_UserName: this.newEmployeeUserName,
        Services: [],
      };
      this.employees.filteredData.push(newEmployee);
      this.newEmployeeName = '';
      this.newEmployeeUserName = '';
    } else {
      alert('Employee name cannot be empty.');
    }
  }

  // Function to remove an employee
  removeEmployee(id) {
    if (this.employees.filteredData[id].Status == 'True') this.employees.filteredData[id].Status = 'False';
    else this.employees.filteredData[id].Status = 'True';
  }

  // Function to compare options (required for multi-select)
  compareFn(serviceId1: number, serviceId2: number): boolean {
    return serviceId1 === serviceId2;
  }

  getDepartmentsWhatsAppServices() {
    this.http
      .post(environment.url + "GetDepartmentsWhatsAppServices", {})
      .subscribe((Response) => {
        this.Services = Response["d"];
      });
  }

  getDepartmentsWhatsAppEmployees() {
    this.http
      .post(environment.url + "GetDepartmentsWhatsAppEmployees", {})
      .subscribe((Response) => {
        this.employees = new MatTableDataSource<any>(Response["d"]);
      });
  }

  // savePermissions() {
  //   this.http.post('/api/save-permissions', this.employees).subscribe({
  //     next: (response) => {
  //       console.log('Permissions saved successfully:', response);
  //     },
  //     error: (error) => {
  //       console.error('Error saving permissions:', error);
  //     },
  //   });
  // }


}
