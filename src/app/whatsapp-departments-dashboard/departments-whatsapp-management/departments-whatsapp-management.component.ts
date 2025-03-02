import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { MatTableDataSource } from '@angular/material/table';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { map, startWith } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { FormControl } from '@angular/forms';
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
  newEmployeeName = new FormControl();
  add_employee_display: boolean = false;
  showBtn: boolean = true;
  employees_list = [];
  filteredOptions: Observable<string[]>;

  constructor(
    private http: HttpClient,
    private _snackBar: MatSnackBar,
  ) { }

  ngOnInit(): void {
    this.getDepartmentsWhatsAppServices();
    this.getDepartmentsWhatsAppEmployees();
    this.getEmployeesList();
    this.filteredOptions = this.newEmployeeName.valueChanges
      .pipe(
        startWith(''),
        map(value => this._filter(value))
      );
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
          window.location.reload();
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
    if (this.newEmployeeName.value) {
      const newEmployee = {
        Row_ID: this.newEmployeeName.value.RowID,
        Employee_Name: this.newEmployeeName.value.FirstName + ' ' + this.newEmployeeName.value.LastName,
        Employee_UserName: this.newEmployeeName.value.ADUserName,
        Status: 'True',
        Services: [],
      };
      this.employees.filteredData.push(newEmployee);
      this.newEmployeeName.setValue('');
    } else {
      alert('משתמש לא יכול להיות ריק.');
    }
  }

  // Function to remove an employee
  removeEmployee(id) {
    if (this.employees.filteredData[id].Status == 'True') this.employees.filteredData[id].Status = 'False';
    else this.employees.filteredData[id].Status = 'True';
  }

  // compareFn(serviceId1: any, serviceId2: any): boolean {
  //   if (serviceId1 && serviceId2) {
  //     if (serviceId1.Row_ID && serviceId2.Row_ID) {
  //       // If both have Row_ID, compare by Row_ID
  //       return serviceId1.Row_ID === serviceId2.Row_ID;
  //     } else {
  //       // If either Row_ID is missing, compare by Service_Name
  //       return serviceId1.Service_Name === serviceId2.Service_Name;
  //     }
  //   }
  //   return serviceId1 === serviceId2; // Handle null/undefined cases
  // }

  compareFn(serviceId1: any, serviceId2: any): boolean {
    if (serviceId1 && serviceId2) {
      if (serviceId1.Row_ID && serviceId2.Row_ID) {
        // If both have Row_ID, compare by Row_ID
        return serviceId1.Row_ID === serviceId2.Row_ID && serviceId1.Service_Name === serviceId2.Service_Name;
      }
    }
    return serviceId1 === serviceId2; // Handle null/undefined cases
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

  getEmployeesList() {
    this.http
      .post(environment.url + "GetEmployeesForWhatsapp", {
        _empId: '',
        _empFirstName: '',
        _empLastName: '',
        _phoneNumber: '',
        _gender: '',
        _department: '',
        _role: '',
        _sektor: '',
        _on: "1",
        _workPlace: ''
      })
      .subscribe((Response) => {
        this.employees_list = Response["d"];
      });
  }

  displayFn(user: any): string {
    if (user) {
      // Display firstname if available, otherwise fallback to id or a placeholder
      return user && user.FirstName ? user.FirstName + ' ' + user.LastName : ''
    }
  }

  private _filter(value: any): any[] {
    const filterValue1 = value;
    // if (value.RowID != undefined) {
    //   this.newEmployeeName.setValue(value);
    // }

    // Filter based on the provided value
    return this.employees_list.filter(option => option.FirstName?.includes(filterValue1));
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
