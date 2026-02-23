import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from 'src/environments/environment';

export interface BacteriaDialogData {
  id: number;
  mdroDesc: string;
  isActive: boolean;
  isEdit: boolean;
}

@Component({
  selector: 'app-bacteria-dialog',
  templateUrl: './bacteria-dialog.component.html',
  styleUrls: ['./bacteria-dialog.component.css']
})
export class BacteriaDialogComponent {

  mdroDesc: string;
  isActive: boolean;
  isEdit: boolean;
  saving = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: BacteriaDialogData,
    private dialogRef: MatDialogRef<BacteriaDialogComponent>,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {
    this.mdroDesc = data.mdroDesc || '';
    this.isActive = data.isActive !== false;
    this.isEdit = data.isEdit === true;
  }

  save(): void {
    const desc = (this.mdroDesc || '').trim();
    if (!desc) {
      this.snackBar.open('Description is required', 'Close', { duration: 2000 });
      return;
    }
    this.saving = true;
    if (this.isEdit) {
      this.http.post(environment.url + 'InfectionControl_UpdateMdro', {
        id: this.data.id,
        mdroDesc: desc
      }).subscribe(
        () => {
          this.saving = false;
          this.snackBar.open('Bacteria updated', 'Close', { duration: 2000 });
          this.dialogRef.close(true);
        },
        (error) => {
          this.saving = false;
          this.snackBar.open(error?.error?.Message || 'Update failed', 'Close', { duration: 3000 });
        }
      );
    } else {
      this.http.post(environment.url + 'InfectionControl_CreateMdro', {
        mdroDesc: desc,
        isActive: this.isActive
      }).subscribe(
        () => {
          this.saving = false;
          this.snackBar.open('Bacteria added', 'Close', { duration: 2000 });
          this.dialogRef.close(true);
        },
        (error) => {
          this.saving = false;
          this.snackBar.open(error?.error?.Message || 'Create failed', 'Close', { duration: 3000 });
        }
      );
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
