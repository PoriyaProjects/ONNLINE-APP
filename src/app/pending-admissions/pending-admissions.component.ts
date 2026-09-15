import { Component, OnInit } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { MatDialog } from "@angular/material/dialog";
import { environment } from "src/environments/environment";
import {
    PatientAdmissionRecord,
    PendingAdmissionRecordDialogComponent,
} from "./record-dialog/pending-admission-record-dialog.component";

/** Single pending-admission record as returned by the server (PatientAdmissionData). */
export interface PatientAdmissionData {
    AdmissionNo: string;
    PatientName: string;
    PatientAge: number | null;
    HasSummaryLog: number | null;
    HospitalizationDate: string;
    DepartName: string;
    TotalInputTokens?: number;
    TotalOutputTokens?: number;
    TotalCostUSD?: number;
}

/** A department card model: a department and the admissions that belong to it. */
export interface DepartmentGroup {
    departName: string;
    admissions: PatientAdmissionData[];
    /** Per-card loading flag used to show a spinner while the details open. */
    loading: boolean;
}

@Component({
    selector: "app-pending-admissions",
    templateUrl: "./pending-admissions.component.html",
    styleUrls: ["./pending-admissions.component.css"],
})
export class PendingAdmissionsComponent implements OnInit {
    /** Columns rendered in the per-department admissions table. */
    displayedColumns: string[] = [
        "AdmissionNo",
        "PatientName",
        "PatientAge",
        "HospitalizationDate",
        "HasSummaryLog",
    ];

    /** Raw list returned from the server. */
    admissions: PatientAdmissionData[] = [];
    /** Department cards built from {@link admissions}. */
    departments: DepartmentGroup[] = [];

    /** Currently selected department whose admissions are shown in the detail panel. */
    selectedGroup: DepartmentGroup | null = null;

    /** Search filters that are forwarded to the server. */
    admissionNoFilter = "";
    patientNameFilter = "";

    /** Local, client-side filter used to search departments inside the section. */
    departSearch = "";

    /** Loader flags for the different async states. */
    loading = false;
    hasError = false;

    /** True while the record dialog data is being fetched for a row. */
    recordLoadingFor: string | null = null;

    constructor(private http: HttpClient, private dialog: MatDialog) {}

    ngOnInit(): void {
        this.loadAdmissions();
    }

    /** Total number of pending admissions across all departments. */
    get totalAdmissions(): number {
        return this.admissions.length;
    }

    /** Total input tokens consumed across all pending admissions. */
    get grandTotalInputTokens(): number {
        return this.admissions.reduce((sum, item) => sum + (item.TotalInputTokens || 0), 0);
    }

    /** Total output tokens generated across all pending admissions. */
    get grandTotalOutputTokens(): number {
        return this.admissions.reduce((sum, item) => sum + (item.TotalOutputTokens || 0), 0);
    }

    /** Total aggregated cost in USD across all pending admissions. */
    get grandTotalCostUSD(): number {
        return this.admissions.reduce((sum, item) => sum + (item.TotalCostUSD || 0), 0);
    }

    /** Departments filtered by the local search box (by department name). */
    get filteredDepartments(): DepartmentGroup[] {
        const term = this.departSearch.trim().toLowerCase();
        if (!term) {
            return this.departments;
        }
        return this.departments.filter((group) =>
            (group.departName || "").toLowerCase().includes(term)
        );
    }

    /** Fetch the pending admissions from the server applying the current filters. */
    loadAdmissions(preserveDepartment?: string): void {
        this.loading = true;
        this.hasError = false;
        this.selectedGroup = null;

        this.http
            .post(environment.url + "GetPendingAdmissions", {
                admissionNo: this.admissionNoFilter
                    ? this.admissionNoFilter.trim()
                    : null,
                patientName: this.patientNameFilter
                    ? this.patientNameFilter.trim()
                    : null,
            })
            .subscribe(
                (response) => {
                    console.log(response);
                    this.admissions = this.extractAdmissions(response);
                    this.departments = this.groupByDepartment(this.admissions);
                    this.selectedGroup = preserveDepartment
                        ? this.departments.find((group) => group.departName === preserveDepartment) || null
                        : null;
                    this.loading = false;
                },
                () => {
                    this.admissions = [];
                    this.departments = [];
                    this.selectedGroup = null;
                    this.hasError = true;
                    this.loading = false;
                }
            );
    }

    /**
     * Normalise the various shapes the server may return. The payload can arrive
     * either as a real array under `d`, or as a JSON-encoded string under `d`.
     */
    private extractArray<T>(response: any): T[] {
        let data = response && response["d"] !== undefined ? response["d"] : response;

        if (typeof data === "string") {
            try {
                data = JSON.parse(data);
            } catch {
                return [];
            }
        }

        return Array.isArray(data) ? data : [];
    }

    private extractAdmissions(response: any): PatientAdmissionData[] {
        return this.extractArray<PatientAdmissionData>(response);
    }

    /** Re-run the search with the current filters. */
    search(): void {
        this.loadAdmissions();
    }

    /** Clear the filters and reload the full list. */
    clearFilters(): void {
        this.admissionNoFilter = "";
        this.patientNameFilter = "";
        this.departSearch = "";
        this.loadAdmissions();
    }

    /** Clear only the local department search box. */
    clearDepartSearch(): void {
        this.departSearch = "";
    }

    /**
     * Toggle a department card. Collapses it when it is already open,
     * otherwise selects it and shows its admissions in the detail panel.
     */
    toggleDepartment(group: DepartmentGroup): void {
        if (this.selectedGroup === group) {
            this.selectedGroup = null;
            return;
        }

        group.loading = true;
        this.selectedGroup = group;

        // Give the user immediate visual feedback while the details render.
        setTimeout(() => {
            group.loading = false;
        }, 250);
    }

    /** Returns true when the given department card is currently expanded. */
    isSelected(group: DepartmentGroup): boolean {
        return this.selectedGroup === group;
    }

    patientsWithReport(group: DepartmentGroup): number {
        return group.admissions.filter((admission) =>
            String(admission.HasSummaryLog) === "1"
        ).length;
    }

    /**
     * Fetch the detailed records for a clicked admission row and open a dialog
     * showing them grouped into tabs by Category_Name.
     */
    openRecordDialog(row: PatientAdmissionData): void {
        if (!row || !row.AdmissionNo || this.recordLoadingFor) {
            return;
        }

        this.recordLoadingFor = row.AdmissionNo;

        this.http
            .post(environment.url + "GetPendingAdmissionsByAdmissionNo", {
                admissionNo: row.AdmissionNo,
            })
            .subscribe(
                (response) => {
                    const records =
                        this.extractArray<PatientAdmissionRecord>(response);
                    this.recordLoadingFor = null;
                    this.showRecordDialog(row, records);
                },
                () => {
                    this.recordLoadingFor = null;
                    this.showRecordDialog(row, []);
                }
            );
    }

    /** Open the record dialog with the given admission row and its records. */
    private showRecordDialog(
        row: PatientAdmissionData,
        records: PatientAdmissionRecord[]
    ): void {
        this.dialog.open(PendingAdmissionRecordDialogComponent, {
            width: "95vw",
            maxWidth: "95vw",
            autoFocus: false,
            data: {
                admissionNo: row.AdmissionNo,
                patientName: row.PatientName,
                patientAge: row.PatientAge,
                records: records,
                onSaved: () => this.loadAdmissions(row.DepartName),
            },
        });
    }

    /** trackBy helper to keep the cards stable across change detection. */
    trackByDepart(_index: number, group: DepartmentGroup): string {
        return group.departName;
    }

    /** trackBy helper for the admissions table rows. */
    trackByAdmission(_index: number, item: PatientAdmissionData): string {
        return item.AdmissionNo;
    }

    /** Build the department cards from a flat admissions list, sorted by patient count (desc). */
    private groupByDepartment(
        admissions: PatientAdmissionData[]
    ): DepartmentGroup[] {
        const map = new Map<string, PatientAdmissionData[]>();

        for (const admission of admissions) {
            const name = admission.DepartName || "ללא מחלקה";
            if (!map.has(name)) {
                map.set(name, []);
            }
            map.get(name).push(admission);
        }

        const groups: DepartmentGroup[] = [];
        map.forEach((list, departName) => {
            groups.push({ departName, admissions: list, loading: false });
        });

        return groups.sort(
            (a, b) =>
                b.admissions.length - a.admissions.length ||
                a.departName.localeCompare(b.departName, "he")
        );
    }
}
