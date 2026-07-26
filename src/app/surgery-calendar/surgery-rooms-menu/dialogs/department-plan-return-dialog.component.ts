import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { DepartmentPlanReturnApiService } from '../shared/department-plan-return-api.service';
import {
  DEPARTMENT_PLAN_TREATMENT_STATUS_LABELS,
  DepartmentPlanReturnSurgeryRow,
  DepartmentPlanTreatmentStatus,
} from '../shared/department-plan-return.models';

export type DepartmentPlanReturnDialogMode = 'send' | 'respond';

export interface DepartmentPlanReturnDialogData {
  mode: DepartmentPlanReturnDialogMode;
  department: string | string[];
  roomCode: string;
  planDate: string;
  calendarRoomsArea: string;
  returnId?: string;
}

@Component({
  selector: 'app-department-plan-return-dialog',
  templateUrl: './department-plan-return-dialog.html',
  styleUrls: ['../styles/components/department-plan-return-dialog.css'],
})
export class DepartmentPlanReturnDialogComponent implements OnInit {
  readonly statusLabels = DEPARTMENT_PLAN_TREATMENT_STATUS_LABELS;
  readonly statusOptions: DepartmentPlanTreatmentStatus[] = ['pending', 'in_progress', 'completed'];

  loading = true;
  saving = false;
  surgeries: DepartmentPlanReturnSurgeryRow[] = [];
  generalComment = '';
  generalResponseText = '';
  treatmentStatus: DepartmentPlanTreatmentStatus = 'pending';
  returnId = '';
  departmentDisplay = '';
  departmentParam = '';
  errorMessage: string | null = null;

  constructor(
    private dialogRef: MatDialogRef<DepartmentPlanReturnDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DepartmentPlanReturnDialogData,
    private api: DepartmentPlanReturnApiService,
    private http: HttpClient,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.departmentParam = this.formatDepartmentParam(this.data.department);
    this.departmentDisplay = this.stripDepartmentQuotes(this.departmentParam);
    this.returnId = this.data.returnId ?? '';
    this.loadSurgeries();
  }

  get isSendMode(): boolean {
    return this.data.mode === 'send';
  }

  get isRespondMode(): boolean {
    return this.data.mode === 'respond';
  }

  get dialogTitle(): string {
    if (this.isRespondMode) {
      return `טיפול בתוכנית שהוחזרה — ${this.departmentDisplay}`;
    }
    return `החזרת תוכנית למחלקה — ${this.departmentDisplay}`;
  }

  get dialogSubtitle(): string {
    return `${this.data.planDate} · ${this.data.calendarRoomsArea} · ${this.data.roomCode}`;
  }

  close(): void {
    this.dialogRef.close();
  }

  loadSurgeries(): void {
    this.loading = true;
    this.errorMessage = null;

    if (this.isRespondMode && this.returnId) {
      this.api
        .loadReturnPlan({
          department: this.departmentParam,
          roomCode: this.data.roomCode,
          planDate: this.data.planDate,
          calendarRoomsArea: this.data.calendarRoomsArea,
        })
        .subscribe((record) => {
          if (record?.surgeries?.length) {
            this.applyRecord(record);
            this.loading = false;
            return;
          }
          this.loadFromPlannedExcel();
        });
      return;
    }

    this.loadFromPlannedExcel(() => {
      this.api
        .loadReturnPlan({
          department: this.departmentParam,
          roomCode: this.data.roomCode,
          planDate: this.data.planDate,
          calendarRoomsArea: this.data.calendarRoomsArea,
        })
        .subscribe((record) => {
          if (record) {
            this.applyRecord(record, true);
          }
        });
    });
  }

  private applyRecord(record: {
    returnId?: string;
    generalComment?: string;
    generalResponseText?: string;
    treatmentStatus?: DepartmentPlanTreatmentStatus;
    surgeries?: DepartmentPlanReturnSurgeryRow[];
  }, mergeOnly = false): void {
    this.returnId = record.returnId || this.returnId;
    if (record.generalComment) {
      this.generalComment = record.generalComment;
    }
    if (record.generalResponseText) {
      this.generalResponseText = record.generalResponseText;
    }
    if (record.treatmentStatus) {
      this.treatmentStatus = record.treatmentStatus;
    }

    if (!record.surgeries?.length) {
      return;
    }

    if (!mergeOnly) {
      this.surgeries = record.surgeries;
      return;
    }

    const byRowId = new Map(record.surgeries.map((row) => [row.rowId, row]));
    this.surgeries = this.surgeries.map((surgery) => {
      const saved = byRowId.get(surgery.rowId);
      if (!saved) {
        return surgery;
      }
      return {
        ...surgery,
        coordinatorComment: saved.coordinatorComment || surgery.coordinatorComment,
        departmentResponseText: saved.departmentResponseText || surgery.departmentResponseText,
        treatmentStatus: saved.treatmentStatus || surgery.treatmentStatus,
      };
    });
  }

  saveAndSend(): void {
    if (!this.isSendMode || this.saving) {
      return;
    }

    if (this.surgeries.length === 0) {
      this.openSnackBar('אין ניתוחים לשליחה');
      return;
    }

    this.saving = true;
    const payload = {
      returnId: this.returnId || undefined,
      department: this.departmentParam,
      departmentDisplay: this.departmentDisplay,
      roomCode: this.data.roomCode,
      planDate: this.data.planDate,
      calendarRoomsArea: this.data.calendarRoomsArea,
      generalComment: this.generalComment.trim(),
      surgeries: this.surgeries,
      sentBy: localStorage.getItem('loginUserName')?.toLowerCase() ?? '',
    };

    this.api.saveCoordinatorReturn(payload).subscribe((returnId) => {
      if (returnId) {
        this.returnId = returnId;
      }
      this.saving = false;
      this.dialogRef.close({
        share: true,
        html: this.buildPlanHtml(),
        returnId: this.returnId,
        generalComment: this.generalComment.trim(),
      });
    }, () => {
      this.saving = false;
      this.dialogRef.close({
        share: true,
        html: this.buildPlanHtml(),
        returnId: this.returnId,
        generalComment: this.generalComment.trim(),
      });
    });
  }

  saveDepartmentResponse(): void {
    if (!this.isRespondMode || this.saving) {
      return;
    }

    this.saving = true;
    this.api
      .saveDepartmentResponse({
        returnId: this.returnId,
        generalResponseText: this.generalResponseText.trim(),
        treatmentStatus: this.treatmentStatus,
        surgeries: this.surgeries.map((surgery) => ({
          rowId: surgery.rowId,
          departmentResponseText: surgery.departmentResponseText?.trim() ?? '',
          treatmentStatus: surgery.treatmentStatus,
        })),
        respondedBy: localStorage.getItem('loginUserName')?.toLowerCase() ?? '',
      })
      .subscribe((ok) => {
        this.saving = false;
        if (ok) {
          this.openSnackBar('סטטוס הטיפול נשמר בהצלחה');
          this.dialogRef.close(true);
        } else {
          this.openSnackBar('אירעה תקלה בשמירת סטטוס הטיפול');
        }
      });
  }

  setSurgeryStatus(surgery: DepartmentPlanReturnSurgeryRow, status: DepartmentPlanTreatmentStatus): void {
    surgery.treatmentStatus = status;
  }

  private loadFromPlannedExcel(afterLoad?: () => void): void {
    this.http
      .post(environment.url + 'GetSurgeriesPlannedExcel', {
        Department: this.departmentParam,
        _surRoomCode: this.data.roomCode,
        date: this.data.planDate,
      })
      .subscribe({
        next: (res) => {
          const rows = Array.isArray(res?.['d']) ? res['d'] : [];
          this.surgeries = this.api.mapPlannedExcelRows(rows);
          this.loading = false;
          if (this.surgeries.length === 0) {
            this.errorMessage = 'לא נמצאו ניתוחים מתוכננים למחלקה ביום זה';
          }
          afterLoad?.();
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'אירעה תקלה בטעינת רשימת הניתוחים';
        },
      });
  }

  private buildPlanHtml(): string {
    const fullDate = this.data.planDate;
    const departmentDisplay = this.departmentDisplay;
    const calendarArea = this.data.calendarRoomsArea;
    const room = this.data.roomCode;
    const generalComment = this.generalComment.trim();

    let html = `
      <!doctype html>
      <html lang="he">
        <head>
          <meta charset="utf-8"/>
          <title>תוכנית ניתוחים שהוחזרה למחלקה ${departmentDisplay}</title>
          <style>
            p,mat-label,span{font-weight:bold;font-size:18px;}
            h1{font-size:22px;font-weight:700;line-height:1.35;}
            .plan-title__line{display:block;}
            td,th{border:1px solid black;padding:6px;}
            table{border-collapse:collapse;width:100%;}
          </style>
        </head>
        <body dir="rtl">
          <div dir="rtl">
            <div style="text-align:center;">
              <img style="width:100%;" src="https://poria.is-great.org/images/covid_2_header.png" />
              <h1>
                <u>
                  <span class="plan-title__line">תוכנית ניתוחים שהוחזרה למחלקה</span>
                  <span class="plan-title__line">${departmentDisplay}</span>
                  <span class="plan-title__line">- תאריך ${fullDate} - ${calendarArea} - ${room}</span>
                </u>
              </h1>
            </div>
            ${generalComment ? `<p><strong>הערה כללית מד״ר דייב:</strong> ${this.escapeHtml(generalComment)}</p>` : ''}
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>מספר מקרה</th>
                  <th>חדר</th>
                  <th>שם מלא, ת.ז</th>
                  <th>תיאור פרוצדורה</th>
                  <th>שם מנתח</th>
                  <th>הערות קיימות</th>
                  <th>הערת ד״ר דייב</th>
                </tr>
              </thead>
              <tbody>`;

    this.surgeries.forEach((surgery, index) => {
      html += `<tr>
        <td>${index + 1}</td>
        <td>${this.escapeHtml(surgery.caseNumber)}</td>
        <td>${this.escapeHtml(surgery.room)}</td>
        <td>${this.escapeHtml(surgery.patientLabel)}</td>
        <td>${this.escapeHtml(surgery.procedureName)}</td>
        <td>${this.escapeHtml(surgery.surgeon)}</td>
        <td>${this.escapeHtml(surgery.existingNote)}</td>
        <td>${this.escapeHtml(surgery.coordinatorComment)}</td>
      </tr>`;
    });

    html += `
              </tbody>
            </table>
          </div>
        </body>
      </html>`;

    return html;
  }

  private formatDepartmentParam(department: string | string[]): string {
    if (Array.isArray(department)) {
      return department.map((x) => `'${x}'`).join(',');
    }
    return `'${department}'`;
  }

  private stripDepartmentQuotes(value: string): string {
    return (value ?? '')
      .replace(/^'+|'+$/g, '')
      .replace(/','/g, ', ');
  }

  private escapeHtml(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private openSnackBar(message: string): void {
    this.snackBar.open(message, 'X', { duration: 5000 });
  }
}
