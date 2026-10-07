import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    OnDestroy,
    OnInit,
    ViewChild,
} from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { MatSort } from "@angular/material/sort";
import { MatTableDataSource } from "@angular/material/table";
import { Subscription } from "rxjs";
import * as XLSX from "xlsx";
import { environment } from "src/environments/environment";
import { parseAsmxPayload } from "../../utils/pci-asmx.util";

export interface PciRealtimeRow {
    [key: string]: string;
}

interface PciRealtimeStat {
    name: string;
    thisMonth: number;
    lastMonth: number;
    total: number;
}

const PREFERRED_COLS = [
    "מקרה",
    "מספר מטופל",
    "תאריך",
    "שעת התחלה",
    "שעת סיום",
    "מספר חדר",
    "סיום חתך",
    "שעת יציאה",
    "שם רופא",
    "תיאור",
];

@Component({
    selector: "app-pci-realtime",
    templateUrl: "./pci-realtime.component.html",
    styleUrls: ["./pci-realtime.component.css"],
})
export class PciRealtimeComponent implements OnInit, AfterViewInit, OnDestroy {
    dataSource = new MatTableDataSource<PciRealtimeRow>([]);
    displayedColumns: string[] = [];
    filterValue = "";
    isLoading = false;
    loadError = "";
    doctorStats: PciRealtimeStat[] = [];
    surgeryStats: PciRealtimeStat[] = [];
    roomStats: PciRealtimeStat[] = [];

    @ViewChild(MatSort) sort?: MatSort;

    private sub?: Subscription;

    constructor(
        private http: HttpClient,
        private cdr: ChangeDetectorRef,
    ) {}

    ngOnInit(): void {
        this.load();
    }

    ngAfterViewInit(): void {
        this.bindSort();
    }

    ngOnDestroy(): void {
        this.sub?.unsubscribe();
    }

    load(force = false): void {
        if (this.isLoading) {
            return;
        }
        if (!force && this.dataSource.data.length) {
            return;
        }
        this.isLoading = true;
        this.loadError = "";
        const url =
            environment.url + "GetPicDetailedDataCombined?dparam=0";
        this.sub?.unsubscribe();
        this.sub = this.http.get(url, { responseType: "text" }).subscribe(
            (raw) => {
                const rows = this.parseRows(parseAsmxPayload(raw));
                this.displayedColumns = this.pickColumns(rows);
                this.dataSource.data = rows;
                this.buildSummaries(rows);
                this.isLoading = false;
                this.cdr.detectChanges();
                this.bindSort();
            },
            () => {
                this.loadError = "שגיאה בטעינת נתוני זמן אמת";
                this.isLoading = false;
                this.cdr.markForCheck();
            },
        );
    }

    applyFilter(): void {
        this.dataSource.filterPredicate = (row, filter) =>
            Object.values(row).some((v) =>
                (v || "").toLowerCase().includes(filter),
            );
        this.dataSource.filter = this.filterValue.trim().toLowerCase();
    }

    exportToExcel(): void {
        const data = this.dataSource.filteredData;
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "ביצועים");
        XLSX.writeFile(wb, "pci-realtime-pic.xlsx");
    }

    formatCell(value: string): string {
        return value || "";
    }

    private bindSort(): void {
        if (!this.sort) {
            return;
        }
        this.dataSource.sort = this.sort;
        this.dataSource.sortingDataAccessor = (item, prop) => {
            const v = item[prop] || "";
            if (/^\d{2}-\d{2}-\d{4}$/.test(v)) {
                const [d, m, y] = v.split("-").map(Number);
                return new Date(y, m - 1, d).getTime();
            }
            return v.toLowerCase();
        };
    }

    private pickColumns(rows: PciRealtimeRow[]): string[] {
        const keys = rows.length ? Object.keys(rows[0]) : PREFERRED_COLS.slice();
        const preferred = PREFERRED_COLS.filter((c) => keys.indexOf(c) >= 0);
        const rest = keys.filter((c) => preferred.indexOf(c) < 0);
        return preferred.length ? preferred.concat(rest) : keys;
    }

    private parseRows(payload: unknown): PciRealtimeRow[] {
        if (!payload) {
            return [];
        }
        if (typeof payload === "string") {
            try {
                payload = JSON.parse(payload);
            } catch {
                return [];
            }
        }
        if (Array.isArray(payload)) {
            return payload.map((row) => this.flattenObject(row));
        }
        const obj = payload as { cols?: any[]; rows?: any[] };
        if (Array.isArray(obj.cols) && Array.isArray(obj.rows)) {
            const labels = obj.cols.map(
                (c, i) =>
                    (c && (c.label || c.id) ? String(c.label || c.id) : "")
                        .trim() || `col${i}`,
            );
            const mapped = obj.rows.map((row) => {
                const out: PciRealtimeRow = {};
                const cells = row && row.c ? row.c : [];
                labels.forEach((label, i) => {
                    out[label] = this.formatValue(cells[i] && cells[i].v, i);
                });
                return out;
            });
            mapped.reverse();
            return mapped;
        }
        return [];
    }

    private flattenObject(row: any): PciRealtimeRow {
        const out: PciRealtimeRow = {};
        if (!row || typeof row !== "object") {
            return out;
        }
        Object.keys(row).forEach((k, i) => {
            out[k] = this.formatValue(row[k], i);
        });
        return out;
    }

    private formatValue(value: any, idx: number): string {
        if (value == null || value === "") {
            return "";
        }
        if (value instanceof Date) {
            return isNaN(value.getTime()) ? "" : this.formatDate(value);
        }
        if (typeof value === "number" && idx !== 1) {
            return String(value);
        }
        if (typeof value === "string") {
            const ms = /\/Date\((-?\d+)\)\//.exec(value);
            if (ms) {
                return this.formatDate(new Date(Number(ms[1])));
            }
            const g = /^Date\((\d+),(\d+),(\d+)\)$/.exec(value);
            if (g) {
                return this.formatDate(
                    new Date(Number(g[1]), Number(g[2]), Number(g[3])),
                );
            }
            if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
                const d = new Date(value);
                return isNaN(d.getTime()) ? value : this.formatDate(d);
            }
            if (/^\d{1,2}:\d{2}(:\d{2})?/.test(value)) {
                const p = value.split(":");
                return `${p[0].padStart(2, "0")}:${p[1]}`;
            }
            return value;
        }
        return String(value);
    }

    private formatDate(date: Date): string {
        const d = date.getDate().toString().padStart(2, "0");
        const m = (date.getMonth() + 1).toString().padStart(2, "0");
        return `${d}-${m}-${date.getFullYear()}`;
    }

    private buildSummaries(rows: PciRealtimeRow[]): void {
        this.doctorStats = this.groupStats(rows, "שם רופא", "לא ידוע");
        this.surgeryStats = this.groupStats(rows, "תיאור", "סוג לא ידוע");
        this.roomStats = this.groupStats(rows, "מספר חדר", "חדר לא ידוע");
    }

    private groupStats(
        rows: PciRealtimeRow[],
        key: string,
        emptyLabel: string,
    ): PciRealtimeStat[] {
        const now = new Date();
        const thisM = now.getMonth();
        const thisY = now.getFullYear();
        const prev = new Date(thisY, thisM - 1, 1);
        const map: { [n: string]: PciRealtimeStat } = {};
        for (const row of rows) {
            const name = (row[key] || "").trim() || emptyLabel;
            const date = this.parseDate(row["תאריך"] || row["SF_DATE"]);
            if (!date || isNaN(date.getTime())) {
                continue;
            }
            if (!map[name]) {
                map[name] = { name, thisMonth: 0, lastMonth: 0, total: 0 };
            }
            map[name].total++;
            if (date.getFullYear() === thisY && date.getMonth() === thisM) {
                map[name].thisMonth++;
            } else if (
                date.getFullYear() === prev.getFullYear() &&
                date.getMonth() === prev.getMonth()
            ) {
                map[name].lastMonth++;
            }
        }
        return Object.keys(map)
            .map((k) => map[k])
            .sort((a, b) => b.total - a.total);
    }

    private parseDate(value: string): Date {
        if (!value) {
            return new Date(NaN);
        }
        const [d, m, y] = value.split("-").map(Number);
        return new Date(y, m - 1, d);
    }
}
