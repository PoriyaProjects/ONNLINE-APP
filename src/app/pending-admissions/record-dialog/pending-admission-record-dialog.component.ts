import { Component, Inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";

/**
 * A single detailed admission record as returned by
 * `GetPendingAdmissionsByAdmissionNo` (PatientAdmissionData).
 */
export interface PatientAdmissionRecord {
    AdmissionNo: string;
    PatientName: string;
    PatientAge: number | null;
    HospitalizationDate: string;
    DepartName: string;
    Category_Name: string;
    Diagnosis: string;
    Record_Text: string;
    Record_Date: string;
    Record_Time: string;
    Record_Employee: string;
}

/** Data passed into the record-details dialog. */
export interface RecordDialogData {
    admissionNo: string;
    patientName: string;
    patientAge: number | null;
    records: PatientAdmissionRecord[];
}

/** A tab in the dialog: a Category_Name and all of its records. */
export interface CategoryGroup {
    categoryName: string;
    records: PatientAdmissionRecord[];
}

@Component({
    selector: "app-pending-admission-record-dialog",
    templateUrl: "./pending-admission-record-dialog.component.html",
    styleUrls: ["./pending-admission-record-dialog.component.css"],
})
export class PendingAdmissionRecordDialogComponent {
    /** Records grouped by Category_Name, one entry per tab. */
    categories: CategoryGroup[] = [];

    constructor(
        public dialogRef: MatDialogRef<PendingAdmissionRecordDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: RecordDialogData
    ) {
        this.categories = this.groupByCategory(
            (data && data.records) || []
        );
    }

    /** Close the dialog. */
    close(): void {
        this.dialogRef.close();
    }

    /** trackBy helper for the category tabs. */
    trackByCategory(_index: number, group: CategoryGroup): string {
        return group.categoryName;
    }

    /** Group the records by Category_Name, preserving first-seen order. */
    private groupByCategory(
        records: PatientAdmissionRecord[]
    ): CategoryGroup[] {
        const map = new Map<string, PatientAdmissionRecord[]>();

        for (const record of records) {
            const name = record.Category_Name || "ללא קטגוריה";
            if (!map.has(name)) {
                map.set(name, []);
            }
            map.get(name).push(record);
        }

        const groups: CategoryGroup[] = [];
        map.forEach((list, categoryName) => {
            groups.push({ categoryName, records: list });
        });

        return groups;
    }
}
