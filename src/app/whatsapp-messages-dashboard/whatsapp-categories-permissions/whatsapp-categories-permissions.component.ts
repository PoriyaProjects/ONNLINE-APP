import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-whatsapp-categories-permissions',
  templateUrl: './whatsapp-categories-permissions.component.html',
  styleUrls: ['./whatsapp-categories-permissions.component.css']
})
export class WhatsappCategoriesPermissionsComponent implements OnInit {
  leftSearch: string = '';
  rightSearch: string = '';

  assignedUsers: any = [];
  availableUsers: any = [];

  selectedLeftUsers = [];
  selectedRightUsers = [];
  EmergencyList = [];

  choosen_card: any;
  username = localStorage.getItem('loginUserName').toLowerCase();

  constructor(
    private http: HttpClient,
    private dialogRef: MatDialogRef<WhatsappCategoriesPermissionsComponent>
  ) { }

  ngOnInit(): void {
    // this.getEmployeesToUpdate();
    this.getEmergencyContactCategories();
  }

  selectCard(cardId: any) {
    this.choosen_card = cardId;
    this.getEmergencyAvailableList();
  }

  filteredLeftUsers() {
    return this.leftSearch
      ? this.assignedUsers.filter(u => u.Full_Name.includes(this.leftSearch))
      : this.assignedUsers;
  }

  filteredRightUsers() {
    return this.rightSearch
      ? this.availableUsers.filter(u => u.Full_Name.includes(this.rightSearch))
      : this.availableUsers;
  }

  addSelected() {
    this.selectedRightUsers.forEach(user => {
      this.assignedUsers.push(user);
      this.availableUsers = this.availableUsers.filter(u => u.User_Name.toLowerCase() !== user.User_Name.toLowerCase());
    });
    this.selectedRightUsers = [];
  }

  removeSelected() {
    this.selectedLeftUsers.forEach(user => {
      this.availableUsers.push(user);
      this.assignedUsers = this.assignedUsers.filter(u => u.User_Name.toLowerCase() !== user.User_Name.toLowerCase());
    });
    this.selectedLeftUsers = [];
  }

  moveAllRight() {
    this.availableUsers.forEach(user => this.assignedUsers.push(user));
    this.availableUsers = [];
  }

  moveAllLeft() {
    this.assignedUsers.forEach(user => this.availableUsers.push(user));
    this.assignedUsers = [];
  }

  getEmployeesToUpdate() {
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
        let t = Response["d"];
        this.availableUsers = t;
        this.assignedUsers = t;
      });
  }

  getEmergencyAvailableList() {
    this.http
      .post(environment.url + "GetEmergencyAvailableList", {
        category: this.choosen_card.Row_ID
      })
      .subscribe((Response) => {
        this.assignedUsers = Response['d'][0];
        this.availableUsers = Response['d'][1];
      });
  }

  saveAllPermissions() {
    this.http
      .post(environment.url + "SaveAllWhatsAppCategoryPermissions", {
        _assigned: this.assignedUsers,
        _category: this.choosen_card.Row_ID
      })
      .subscribe((Response) => {
        this.dialogRef.close();
      });
  }

  getEmergencyContactCategories() {
    this.http
      .post(environment.url + "GetEmergencyContactCategories", {
        user_name: this.username
      })
      .subscribe((Response) => {
        this.EmergencyList = Response["d"];
      });
  }

}
