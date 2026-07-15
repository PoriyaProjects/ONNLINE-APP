import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { environment } from 'src/environments/environment';
import { SurgeriesManagementComponent } from '../surgery-rooms-menu/surgeries-management/surgeries-management.component';
import { applySurgeriesManagementDialogSize, SURGERIES_DIALOG_PANEL_CLASS, SURGERY_ROOMS_MENU_PANEL_CLASS, SURGERY_URGENT_DIALOG_PANEL_CLASS } from './shared/surgeries-dialog-sizing';

@Component({
  selector: 'app-surgery-rooms-menu',
  templateUrl: './surgery-rooms-menu.component.html',
  styleUrls: ['./styles/components/rooms-menu.css']
})
export class SurgeryRoomsMenuComponent implements OnInit {

  horizontalPosition: MatSnackBarHorizontalPosition = 'start';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';
  surgeryRooms: any = [];
  urgentSurgeryRooms: any = [];
  urgentSurgeriesLoading = false;
  urgentSurgeriesError: string | null = null;
  private urgentDialogRef: MatDialogRef<any> | null = null;
  physicalSurgeryRooms: any = {
    roomsNumber: 0,
    SurgeriesNumber: 0
  };
  virtualSurgeryRooms: any = {
    roomsNumber: 0,
    SurgeriesNumber: 0
  };
  physicalSurgeryRoomsArr: any = [];
  virtualSurgeryRoomsArr: any = [];
  dayNamesArray = [
    { number: 0, name: "ראשון" },
    { number: 1, name: "שני" },
    { number: 2, name: "שלישי" },
    { number: 3, name: "רביעי" },
    { number: 4, name: "חמישי" },
    { number: 5, name: "שישי" },
    { number: 6, name: "שבת" },
  ];
  todaysName: string = "";
  userName = localStorage.getItem('loginUserName');
  userObject: any;
  @ViewChild('modalUrgentSurgeries', { static: true }) modalUrgentSurgeries: TemplateRef<any>;
  viewDate: Date;

  constructor(
    public dialogRef: MatDialogRef<SurgeryRoomsMenuComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _snackBar: MatSnackBar,
    public datePipe: DatePipe,
    private http: HttpClient,
    public dialog: MatDialog
  ) {
    ////debugger;
    this.surgeryRooms = data.event.day.events;
    this.surgeryRooms[0]['mSurgeriesRoomsGroup']?.forEach((element, index) => {
      if(element.RoomDes == 'ור'){
        this.virtualSurgeryRoomsArr.push(element)
      }else{
        this.physicalSurgeryRoomsArr.push(element)
      }
    })
    this.surgeryRooms.forEach((element)=>{
      let totalVer = element.Virtual;
      let totalPhy = element.Physical;
      let roomName = element.CalendarRoomsArea;
      //debugger
      let start = element.start;//this.datePipe.transform(element.start, 'yyyy-MM-dd')
      this.virtualSurgeryRoomsArr.forEach((element)=>{
        element.Start = start
        element.start = start
      })
      this.physicalSurgeryRoomsArr.forEach((element)=>{
        element.Start = start
        element.start = start
      })
      let findver = this.virtualSurgeryRoomsArr.filter((element)=> element.CalendarRoomsArea == roomName) 
      if(findver.length > 0){
        findver[0].TotalSurgeries = totalVer
        //findver[0].Start = start
      }
      let findPhy = this.physicalSurgeryRoomsArr.filter((element)=> element.CalendarRoomsArea == roomName) 
      if(findPhy.length > 0){
        findPhy[0].TotalSurgeries = totalPhy
        //findver[0].Start = start
      }
      //debugger
    })
    this.sortRoomsBySurgeryCount(this.physicalSurgeryRoomsArr);
    this.sortRoomsBySurgeryCount(this.virtualSurgeryRoomsArr);
    // this.surgeryRooms.forEach((element, index) => {
    //   let numberOfPhysical = element.mSurgeriesRoomsGroup.filter(x => x.RoomDes=='פז');
    //   let numberOfVirtual = element.mSurgeriesRoomsGroup.filter(x => x.RoomDes == 'ור');
    //   // this.surgeryRooms[index]['NumberOfSurgeriesRoomsPhysical'] = this.physicalSurgeryRooms.roomsNumber = numberOfPhysical.length;
    //   // this.surgeryRooms[index]['NumberOfSurgeriesRoomsVirtual'] = numberOfVirtual.length;
    //   // this.surgeryRooms[index]['NumberOfSurgeriesPhysical'] = 0
    //   // this.surgeryRooms[index]['NumberOfSurgeriesVirtual'] = 0
    //   // this.surgeryRooms[index].title2 = this.surgeryRooms[index].title.split(' -')[0];
    //   // for (let i = 0; i < numberOfPhysical.length; i++) {
    //   //   this.surgeryRooms[index]['NumberOfSurgeriesPhysical'] += parseInt(numberOfPhysical[i].NumberOfSurgeries);
    //   // }
    //   // for (let i = 0; i < numberOfVirtual.length; i++) {
    //   //   this.surgeryRooms[index]['NumberOfSurgeriesVirtual'] += parseInt(numberOfVirtual[i].NumberOfSurgeries);
    //   // }
    // });
    this.todaysName = this.dayNamesArray[data.event.day.day].name;
  }


  ngOnInit(): void {
    this.getUserTypeForPermissions(this.userName.toLowerCase());
    this.viewDate = this.data.event.day.date;
  }

  /** Sort room cards by surgery/patient count — highest first. */
  private sortRoomsBySurgeryCount(rooms: any[]): void {
    rooms.sort((a, b) => {
      const countA = Number(a?.TotalSurgeries) || 0;
      const countB = Number(b?.TotalSurgeries) || 0;
      return countB - countA;
    });
  }

  getUserTypeForPermissions(userName) {
    this.http
      .post(environment.url + "GetSurgeriesCalendarUserNamePermissions", {
        _userName: userName
      })
      .subscribe((Response) => {
        this.userObject = Response["d"];
      });
  }


  openSurgeryRoomSchedule(room, type) {
    //debugger
    room['type'] = type;
    // open the dialog only by super user and user of the same department and if the surgery room is empty! tooo much SHITTTT IS GOING ON
    if (this.userObject.UserDepartment.includes("All") || (this.userObject.UserDepartment.includes(room.S_DEPARTMENT_NAME) || room.S_DEPARTMENT_NAME == null)) {
      const dialogRef = this.dialog.open(SurgeriesManagementComponent, {
        data: {
          room: room,
          roomsList: room.SurgeryRooms,
          user: this.userObject
        },
        width: '95vw',
        maxWidth: '95vw',
        minWidth: '95vw',
        height: '95vh',
        maxHeight: '95vh',
        minHeight: '95vh',
        panelClass: SURGERIES_DIALOG_PANEL_CLASS,
        disableClose: true
      });
      applySurgeriesManagementDialogSize(dialogRef);
      dialogRef.afterClosed().subscribe(result => {
        console.log('The dialog was closed');
      });
    } else {
      this.openSnackBar("אינך מורשה לפתוח תיבה זו");
    }
  }

  openUrgentSurgeriesSchedule() {
    if (!this.urgentDialogRef) {
      this.urgentDialogRef = this.dialog.open(this.modalUrgentSurgeries, {
        width: 'min(94vw, 860px)',
        maxWidth: '96vw',
        panelClass: SURGERY_URGENT_DIALOG_PANEL_CLASS,
        autoFocus: false,
        disableClose: false,
      });
      this.urgentDialogRef.afterClosed().subscribe(() => {
        this.urgentDialogRef = null;
      });
    }
    this.loadUrgentSurgeries();
  }

  retryUrgentSurgeries(): void {
    this.loadUrgentSurgeries();
  }

  private loadUrgentSurgeries(): void {
    const fullDate = this.datePipe.transform(this.viewDate, 'yyyy-MM-dd');
    this.urgentSurgeriesLoading = true;
    this.urgentSurgeriesError = null;
    this.urgentSurgeryRooms = [];

    this.http
      .post(environment.url + "GetUrgentSurgeriesByDate", {
        _fullDate: fullDate,
      })
      .subscribe({
        next: (Response) => {
          const list = Response?.["d"]?.SurgeriesCalendarClassList ?? [];
          this.urgentSurgeryRooms = [...list].sort((a, b) =>
            (a?.SurgeryRoom || '').localeCompare(b?.SurgeryRoom || '', 'he')
          );
          this.urgentSurgeriesLoading = false;
        },
        error: () => {
          this.urgentSurgeriesLoading = false;
          this.urgentSurgeriesError = 'לא ניתן לטעון את רשימת הניתוחים הדחופים. נסו שוב.';
        },
      });
  }

  closeUrgentModal(): void {
    this.urgentDialogRef?.close();
    this.urgentDialogRef = null;
  }

  trackUrgentBy(_index: number, urgent: any): string {
    return String(
      urgent?.Row_ID
      ?? urgent?.SD_ROW_ID
      ?? urgent?.SurgeryPatientDetails?.PM_CASE_NUMBER
      ?? urgent?.SurgeryRoom
      ?? _index
    );
  }

  getUrgentPatientName(urgent: any): string {
    const patient = urgent?.SurgeryPatientDetails;
    const name = `${patient?.PM_FIRST_NAME || ''} ${patient?.PM_LAST_NAME || ''}`.trim();
    return name || '—';
  }

  getUrgentCaseNumber(urgent: any): string {
    return urgent?.SurgeryPatientDetails?.PM_CASE_NUMBER || '—';
  }

  getUrgentDepartment(urgent: any): string {
    return urgent?.S_DEPARTMENT
      || urgent?.SurgeryRequestDepartments?.S_DEPARTMENT
      || '—';
  }

  getUrgentProcedureLabel(urgent: any): string {
    const procedures = urgent?.SurgeriesCalendar_Susgeries;
    if (!Array.isArray(procedures) || procedures.length === 0) {
      return '—';
    }
    const names = procedures
      .map((item) => {
        const name = item?.Surgery_Name || item?.SurgeryName || '';
        const code = item?.Surgery_Code || item?.SurgeryCode || '';
        if (name && code) {
          return `${name} (${code})`;
        }
        return name || code;
      })
      .filter(Boolean);
    return names.length ? names.join(' · ') : '—';
  }

  getUrgentStartTime(urgent: any): string {
    return urgent?.ArrivalDate?.split(' ')?.[1]
      ?? this.datePipe.transform(urgent?.start, 'HH:mm')
      ?? '—';
  }

  getUrgentTypeLabel(urgent: any): string {
    return urgent?.SurgeryType || urgent?.Urgency || 'דחוף';
  }

  closeModal() {
    this.closeUrgentModal();
  }

  openSnackBar(message) {
    this._snackBar.open(message, 'X', {
      duration: 3000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }

}
