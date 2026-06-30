import { Component, OnInit } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "src/environments/environment";

/** Single pending-admission record as returned by the server (PatientAdmissionData). */
export interface PatientAdmissionData {
    AdmissionNo: string;
    PatientName: string;
    PatientAge: number | null;
    HospitalizationDate: string;
    DepartName: string;
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
    ];

    /** Raw list returned from the server. */
    admissions: PatientAdmissionData[] = [];
    /** Department cards built from {@link admissions}. */
    departments: DepartmentGroup[] = [];

    /** Currently expanded department (null when none is selected). */
    selectedDepart: string | null = null;

    /** Search filters that are forwarded to the server. */
    admissionNoFilter = "";
    patientNameFilter = "";

    /** Loader flags for the different async states. */
    loading = false;
    hasError = false;

    constructor(private http: HttpClient) {}

    ngOnInit(): void {
        this.loadAdmissions();
    }

    /** Total number of pending admissions across all departments. */
    get totalAdmissions(): number {
        return this.admissions.length;
    }

    /** Fetch the pending admissions from the server applying the current filters. */
    loadAdmissions(): void {
        this.loading = true;
        this.hasError = false;
        this.selectedDepart = null;

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
                    const data = (response && response["d"]) || [];
                    this.admissions = Array.isArray(data) ? data : [];
                    this.departments = this.groupByDepartment(this.admissions);
                    this.loading = false;
                },
                () => {
                    this.admissions = [];
                    this.departments = [];
                    this.hasError = true;
                    this.loading = false;
                }
            );
    }

    /** Re-run the search with the current filters. */
    search(): void {
        this.loadAdmissions();
    }

    /** Clear the filters and reload the full list. */
    clearFilters(): void {
        this.admissionNoFilter = "";
        this.patientNameFilter = "";
        this.loadAdmissions();
    }

    /**
     * Toggle a department card. Collapses it when it is already open,
     * otherwise opens it while showing a short loader for a smooth UX.
     */
    toggleDepartment(group: DepartmentGroup): void {
        if (this.selectedDepart === group.departName) {
            this.selectedDepart = null;
            return;
        }

        group.loading = true;
        this.selectedDepart = group.departName;

        // Give the user immediate visual feedback while the details render.
        setTimeout(() => {
            group.loading = false;
        }, 250);
    }

    /** Returns true when the given department card is currently expanded. */
    isSelected(group: DepartmentGroup): boolean {
        return this.selectedDepart === group.departName;
    }

    /** trackBy helper to keep the cards stable across change detection. */
    trackByDepart(_index: number, group: DepartmentGroup): string {
        return group.departName;
    }

    /** trackBy helper for the admissions table rows. */
    trackByAdmission(_index: number, item: PatientAdmissionData): string {
        return item.AdmissionNo;
    }

    /** Build the department cards from a flat admissions list, sorted by name. */
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

        return groups.sort((a, b) =>
            a.departName.localeCompare(b.departName, "he")
        );
    }
}
