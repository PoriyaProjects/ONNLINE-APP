import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { DimoteDoingByDateAndDepart } from '../dimot-activity-dashboard.component';
export interface DialogData {
  mDimoteDoingByDateAndDepart: DimoteDoingByDateAndDepart[];
  DepartName: string;
  DateDoing: string;
}
@Component({
  selector: 'app-dialog-doing',
  templateUrl: './dialog-doing.component.html',
  styleUrls: ['./dialog-doing.component.css']
})
export class DialogDoingComponent implements OnInit {
  displayedColumns: string[] = [
    'CaseNumber',
    'TechDate',
    'Depart',
    'DocName',
    'CaseType'
  ];
  dataSource: MatTableDataSource<DimoteDoingByDateAndDepart>;
  constructor(
    public dialogRef: MatDialogRef<DialogDoingComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData) { 
      this.dataSource = new MatTableDataSource(data.mDimoteDoingByDateAndDepart);
    }

  ngOnInit(): void {
  }
  // Function to close the dialog, optionally passing data back
  onNoClick(): void {
    this.dialogRef.close(); // Closes the dialog, no data passed back
  }

  onYesClick(): void {
    // Closes the dialog, passing back 'true'
    this.dialogRef.close(true);
  }
}
