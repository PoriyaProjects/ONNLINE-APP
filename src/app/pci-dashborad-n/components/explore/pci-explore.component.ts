import {
    ChangeDetectorRef,
    Component,
    EventEmitter,
    Input,
    OnChanges,
    OnDestroy,
    Output,
    SimpleChanges,
} from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Subscription } from "rxjs";
import { environment } from "src/environments/environment";
import { parseAsmxPayload, unwrapAsmxArray } from "../../utils/pci-asmx.util";
import {
    PciExploreGrain,
    PciExploreMetric,
    PciExplorePeriodRow,
    PciExploreRawRow,
} from "./pci-explore.models";

@Component({
    selector: "app-pci-explore",
    templateUrl: "./pci-explore.component.html",
    styleUrls: ["./pci-explore.component.css"],
})
export class PciExploreComponent implements OnChanges, OnDestroy {
    @Input() filterParams: { [key: string]: string } = {};
    @Input() filterKey = "";
    @Input() monthlyFallback: any[] = [];
    @Input() isDark = false;
    @Output() dataReady = new EventEmitter<void>();

    grain: PciExploreGrain = "week";
    metric: PciExploreMetric = "count";
    fromDate = "";
    toDate = "";

    isLoading = false;
    loadError = "";
    usedMonthlyFallback = false;
    rangeNotice = "";

    rows: PciExplorePeriodRow[] = [];
    insights: string[] = [];

    chartType: "ColumnChart" | "LineChart" = "ColumnChart";
    chartColumns: any[] = ["תקופה", "ערך"];
    chartData: any[][] = [];
    chartOptions: any = {};
    chartEpoch = 0;
    readonly chartHeight = "100%";
    private readonly tooltipCol = {
        type: "string",
        role: "tooltip",
        p: { html: true },
    };

    private sub?: Subscription;
    private readonly heMonths = [
        "ינואר",
        "פברואר",
        "מרץ",
        "אפריל",
        "מאי",
        "יוני",
        "יולי",
        "אוגוסט",
        "ספטמבר",
        "אוקטובר",
        "נובמבר",
        "דצמבר",
    ];
    private readonly heWeekdays = [
        "ראשון",
        "שני",
        "שלישי",
        "רביעי",
        "חמישי",
        "שישי",
        "שבת",
    ];

    constructor(
        private http: HttpClient,
        private cdr: ChangeDetectorRef,
    ) {
        const to = new Date();
        const from = new Date();
        from.setDate(from.getDate() - 90);
        this.toDate = this.toInputDate(to);
        this.fromDate = this.toInputDate(from);
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.filterKey) {
            this.reload();
        }
    }

    ngOnDestroy(): void {
        if (this.sub) {
            this.sub.unsubscribe();
        }
    }

    setGrain(grain: PciExploreGrain): void {
        if (this.grain === grain) {
            return;
        }
        this.grain = grain;
        this.reload();
    }

    setMetric(metric: PciExploreMetric): void {
        if (this.metric === metric) {
            return;
        }
        this.metric = metric;
        this.applyMetricView();
        this.dataReady.emit();
        this.cdr.detectChanges();
    }

    onRangeChange(): void {
        this.reload();
    }

    get metricUnit(): string {
        switch (this.metric) {
            case "duration":
                return "דקות";
            case "utilization":
                return "צינתורים ליום-חדר";
            case "types":
                return "כמות לפי סוג";
            default:
                return "צינתורים";
        }
    }

    get grainLabel(): string {
        if (this.grain === "day") {
            return "יומי";
        }
        if (this.grain === "week") {
            return "שבועי";
        }
        return "חודשי";
    }

    get maxMonths(): number {
        if (this.grain === "day") {
            return 4;
        }
        if (this.grain === "week") {
            return 6;
        }
        return 12;
    }

    formatDuration(min: number): string {
        if (min == null || !isFinite(min)) {
            return "—";
        }
        const m = Math.round(min);
        const h = Math.floor(m / 60);
        const r = m % 60;
        return h > 0 ? h + ":" + (r < 10 ? "0" : "") + r : m + " דק׳";
    }

    formatNum(n: number): string {
        if (n == null || !isFinite(n)) {
            return "0";
        }
        return Math.round(n).toLocaleString("he-IL");
    }

    formatUtil(n: number): string {
        if (n == null || !isFinite(n)) {
            return "—";
        }
        return n.toLocaleString("he-IL", {
            maximumFractionDigits: 2,
            minimumFractionDigits: 0,
        });
    }

    private clampRange(): void {
        const to = this.parseDate(this.toDate);
        const from = this.parseDate(this.fromDate);
        if (!to || !from) {
            this.rangeNotice = "";
            return;
        }
        let start = from;
        let end = to;
        if (start.getTime() > end.getTime()) {
            const swap = start;
            start = end;
            end = swap;
        }
        const minStart = this.addCalendarMonths(end, -this.maxMonths);
        let clamped = false;
        if (start.getTime() < minStart.getTime()) {
            start = minStart;
            clamped = true;
        }
        this.fromDate = this.toInputDate(start);
        this.toDate = this.toInputDate(end);
        this.rangeNotice = clamped
            ? `טווח ${this.grainLabel} מוגבל ל־${this.maxMonths} חודשים. מתאריך עודכן אוטומטית.`
            : "";
    }

    private addCalendarMonths(d: Date, delta: number): Date {
        const last = new Date(d.getFullYear(), d.getMonth() + delta + 1, 0).getDate();
        const day = Math.min(d.getDate(), last);
        return new Date(d.getFullYear(), d.getMonth() + delta, day);
    }

    private reload(): void {
        this.clampRange();
        if (!this.fromDate || !this.toDate) {
            return;
        }
        if (this.sub) {
            this.sub.unsubscribe();
        }
        this.isLoading = true;
        this.loadError = "";
        this.usedMonthlyFallback = false;
        this.chartData = [];
        this.rows = [];
        this.insights = [];
        this.dataReady.emit();

        const body = {
            ...(this.filterParams || {}),
            fromDate: this.fromDate,
            toDate: this.toDate,
            grain: this.grain,
        };

        this.sub = this.http
            .post(environment.url + "GetExploreSeries_pci_dashborad", body)
            .subscribe(
                (raw) => {
                    const list = unwrapAsmxArray(parseAsmxPayload(raw)) as PciExploreRawRow[];
                    this.rows = this.aggregate(list);
                    this.markOutliers();
                    this.buildInsights();
                    this.applyMetricView();
                    this.isLoading = false;
                    this.dataReady.emit();
                    this.cdr.detectChanges();
                },
                () => {
                    if (this.grain === "month" && this.monthlyFallback && this.monthlyFallback.length) {
                        this.rows = this.fromMonthlyFallback();
                        this.markOutliers();
                        this.buildInsights();
                        this.applyMetricView();
                        this.usedMonthlyFallback = true;
                        this.loadError = "";
                    } else {
                        this.rows = [];
                        this.insights = [];
                        this.chartData = [];
                        this.loadError =
                            "לא ניתן לטעון תחקור מהשרת. יש לעדכן את WebService ב-GetExploreSeries_pci_dashborad.";
                    }
                    this.isLoading = false;
                    this.dataReady.emit();
                    this.cdr.detectChanges();
                },
            );
    }

    private aggregate(raw: PciExploreRawRow[]): PciExplorePeriodRow[] {
        const map = new Map<string, PciExplorePeriodRow>();
        (raw || []).forEach((r) => {
            const start = this.parseDate(r.PeriodStart || r.periodStart);
            if (!start) {
                return;
            }
            const key = this.toInputDate(start);
            let row = map.get(key);
            if (!row) {
                row = {
                    periodStart: start,
                    label: this.periodLabel(start),
                    count: 0,
                    avgDurationMin: 0,
                    uniqueRooms: 0,
                    uniqueDays: 0,
                    utilization: 0,
                    byType: {},
                    isHighOutlier: false,
                    isLowOutlier: false,
                };
                map.set(key, row);
            }
            const count = Number(r.Count != null ? r.Count : r.count) || 0;
            const dur = Number(
                r.AvgDurationMin != null ? r.AvgDurationMin : r.avgDurationMin,
            ) || 0;
            const rooms = Number(
                r.UniqueRooms != null ? r.UniqueRooms : r.uniqueRooms,
            ) || 0;
            const days = Number(
                r.UniqueDays != null ? r.UniqueDays : r.uniqueDays,
            ) || 0;
            const type = String(r.SurgeryType || r.surgeryType || "אחר").trim() || "אחר";
            const prevCount = row.count;
            row.count += count;
            row.avgDurationMin =
                row.count > 0
                    ? (row.avgDurationMin * prevCount + dur * count) / row.count
                    : 0;
            row.uniqueRooms = Math.max(row.uniqueRooms, rooms);
            row.uniqueDays = Math.max(row.uniqueDays, days);
            row.byType[type] = (row.byType[type] || 0) + count;
        });
        const rows = Array.from(map.values()).sort(
            (a, b) => a.periodStart.getTime() - b.periodStart.getTime(),
        );
        rows.forEach((row) => {
            const denom = Math.max(1, row.uniqueDays) * Math.max(1, row.uniqueRooms);
            row.utilization = row.count / denom;
        });
        return rows;
    }

    private fromMonthlyFallback(): PciExplorePeriodRow[] {
        const from = this.parseDate(this.fromDate);
        const to = this.parseDate(this.toDate);
        if (!from || !to) {
            return [];
        }
        return (this.monthlyFallback || [])
            .map((r) => {
                const year = Number((r as any).Year != null ? (r as any).Year : (r as any).year);
                const month = Number((r as any).Month != null ? (r as any).Month : (r as any).month);
                const count = Number((r as any).Count != null ? (r as any).Count : (r as any).count) || 0;
                if (!year || !month) {
                    return null;
                }
                const start = new Date(year, month - 1, 1);
                if (start < new Date(from.getFullYear(), from.getMonth(), 1) || start > to) {
                    return null;
                }
                const row: PciExplorePeriodRow = {
                    periodStart: start,
                    label: this.periodLabel(start),
                    count,
                    avgDurationMin: 0,
                    uniqueRooms: 0,
                    uniqueDays: 0,
                    utilization: 0,
                    byType: {},
                    isHighOutlier: false,
                    isLowOutlier: false,
                };
                return row;
            })
            .filter((r) => !!r) as PciExplorePeriodRow[];
    }

    private markOutliers(): void {
        const values = this.rows.map((r) => r.count);
        if (values.length < 4) {
            return;
        }
        const mean = values.reduce((s, v) => s + v, 0) / values.length;
        const variance =
            values.reduce((s, v) => s + (v - mean) * (v - mean), 0) / values.length;
        const std = Math.sqrt(variance);
        if (std < 0.0001) {
            return;
        }
        this.rows.forEach((r) => {
            const z = (r.count - mean) / std;
            r.isHighOutlier = z >= 1.5;
            r.isLowOutlier = z <= -1.5;
        });
    }

    private buildInsights(): void {
        const insights: string[] = [];
        if (!this.rows.length) {
            this.insights = ["אין נתונים בטווח ובפילטרים שנבחרו."];
            return;
        }
        const sorted = [...this.rows].sort((a, b) => b.count - a.count);
        const peak = sorted[0];
        const low = sorted[sorted.length - 1];
        const total = this.rows.reduce((s, r) => s + r.count, 0);
        const avg = total / this.rows.length;
        insights.push(
            `בטווח שנבחר בוצעו ${this.formatNum(total)} צינתורים ב־${this.rows.length} תקופות ${this.grainLabel}ות (ממוצע ${this.formatNum(avg)} לתקופה).`,
        );
        insights.push(
            `השיא: ${peak.label} עם ${this.formatNum(peak.count)} צינתורים.`,
        );
        if (low && low !== peak) {
            insights.push(
                `השפל: ${low.label} עם ${this.formatNum(low.count)} צינתורים.`,
            );
        }
        const highs = this.rows.filter((r) => r.isHighOutlier);
        const lows = this.rows.filter((r) => r.isLowOutlier);
        if (highs.length) {
            insights.push(
                "תקופות חריגות כלפי מעלה: " +
                    highs.map((r) => r.label).join(", ") +
                    ".",
            );
        }
        if (lows.length) {
            insights.push(
                "תקופות חריגות כלפי מטה: " +
                    lows.map((r) => r.label).join(", ") +
                    ".",
            );
        }
        if (this.grain === "day") {
            const byWd: { [k: number]: { n: number; c: number } } = {};
            this.rows.forEach((r) => {
                const d = r.periodStart.getDay();
                if (!byWd[d]) {
                    byWd[d] = { n: 0, c: 0 };
                }
                byWd[d].n += 1;
                byWd[d].c += r.count;
            });
            let bestD = 0;
            let bestAvg = -1;
            Object.keys(byWd).forEach((k) => {
                const d = Number(k);
                const avgD = byWd[d].c / byWd[d].n;
                if (avgD > bestAvg) {
                    bestAvg = avgD;
                    bestD = d;
                }
            });
            if (bestAvg >= 0) {
                insights.push(
                    `יום השבוע העמוס ביותר בטווח: ${this.heWeekdays[bestD]} (ממוצע ${this.formatNum(bestAvg)} צינתורים).`,
                );
            }
        }
        const durRows = this.rows.filter((r) => r.avgDurationMin > 0);
        if (durRows.length) {
            const durPeak = [...durRows].sort(
                (a, b) => b.avgDurationMin - a.avgDurationMin,
            )[0];
            insights.push(
                `משך צינתור ממוצע הארוך ביותר: ${durPeak.label} (${this.formatDuration(durPeak.avgDurationMin)}).`,
            );
        }
        this.insights = insights;
    }

    private applyMetricView(): void {
        const textColor = this.isDark ? "#e5e7eb" : "#0f172a";
        const gridColor = this.isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.12)";
        this.chartOptions = {
            backgroundColor: "transparent",
            legend: { position: this.metric === "types" ? "top" : "none", textStyle: { color: textColor, fontSize: 11 } },
            chartArea: { left: 56, right: 16, top: this.metric === "types" ? 40 : 16, bottom: 72, width: "88%", height: "70%" },
            hAxis: {
                textStyle: { color: textColor, fontSize: 10 },
                slantedText: this.rows.length > 8,
                slantedTextAngle: 45,
            },
            vAxis: {
                textStyle: { color: textColor, fontSize: 11 },
                gridlines: { color: gridColor },
                minValue: 0,
                title: this.metricUnit,
                titleTextStyle: { color: textColor, fontSize: 11 },
            },
            colors: ["#2563eb", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4"],
            isStacked: this.metric === "types",
            focusTarget: "category",
            aggregationTarget: "category",
            crosshair: {
                trigger: "both",
                orientation: "vertical",
                color: "#64748b",
                opacity: 0.35,
            },
            tooltip: { isHtml: true, trigger: "focus", ignoreBounds: true },
            lineWidth: 3,
            pointSize: 5,
        };

        if (this.metric === "types") {
            const types = this.collectTypes();
            this.chartType = "ColumnChart";
            this.chartColumns = ["תקופה"].concat(types).concat([this.tooltipCol]);
            this.chartData = this.rows.map((r) => {
                const vals = types.map((t) => r.byType[t] || 0);
                return [r.label].concat(vals).concat([this.typesTooltipHtml(r, types, vals)]);
            });
            this.chartEpoch++;
            return;
        }

        this.chartType = this.grain === "day" ? "LineChart" : "ColumnChart";
        let label = "צינתורים";
        this.chartData = this.rows.map((r) => {
            let v = r.count;
            let display = this.formatNum(v);
            if (this.metric === "duration") {
                v = Math.round(r.avgDurationMin * 10) / 10;
                label = "משך ממוצע (דק׳)";
                display = this.formatDuration(v);
            } else if (this.metric === "utilization") {
                v = Math.round(r.utilization * 100) / 100;
                label = "צינתורים ליום-חדר";
                display = this.formatUtil(v);
            }
            return [r.label, v, this.valueTooltipHtml(r, label, display)];
        });
        this.chartColumns = ["תקופה", { type: "number", label: label }, this.tooltipCol];
        this.chartEpoch++;
    }

    private valueTooltipHtml(row: PciExplorePeriodRow, valueLabel: string, valueText: string): string {
        return this.wrapTooltipHtml(
            row.label,
            valueText,
            valueLabel + " — " + this.tooltipHint(row),
        );
    }

    private typesTooltipHtml(row: PciExplorePeriodRow, types: string[], vals: number[]): string {
        const lines = types
            .map((t, i) => {
                if (!vals[i]) {
                    return "";
                }
                return `<div style="display:flex;justify-content:space-between;gap:14px;margin-top:4px;font-size:12px;opacity:.9">
                    <span>${this.escapeHtml(t)}</span><span>${this.escapeHtml(this.formatNum(vals[i]))}</span>
                </div>`;
            })
            .join("");
        return this.wrapTooltipHtml(
            row.label,
            this.formatNum(row.count),
            "פיצול לפי סוג צינתור בתקופה" + lines,
        );
    }

    private tooltipHint(row: PciExplorePeriodRow): string {
        if (this.metric === "duration") {
            return "משך צינתור ממוצע בתקופה";
        }
        if (this.metric === "utilization") {
            return "צינתורים ליום-חדר בתקופה";
        }
        if (row.isHighOutlier) {
            return "כמות צינתורים — תקופה חריגה כלפי מעלה";
        }
        if (row.isLowOutlier) {
            return "כמות צינתורים — תקופה חריגה כלפי מטה";
        }
        return "כמות צינתורים בתקופה";
    }

    private wrapTooltipHtml(title: string, value: string, hint: string): string {
        return `<div style="direction:rtl;text-align:right;background:#0f172a;color:#f8fafc;border:1px solid rgba(148,163,184,.4);border-radius:12px;padding:12px 14px;min-width:180px;max-width:280px;box-shadow:0 12px 32px rgba(15,23,42,.45);font-family:Arial,sans-serif">
            <div style="font-size:12px;color:#94a3b8;margin-bottom:4px">${this.escapeHtml(title)}</div>
            <div style="font-size:24px;font-weight:800;line-height:1.15;letter-spacing:-0.02em">${this.escapeHtml(value)}</div>
            <div style="font-size:12px;color:#cbd5e1;margin-top:6px;line-height:1.35">${hint}</div>
        </div>`;
    }

    private escapeHtml(s: string): string {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    private collectTypes(): string[] {
        const set: { [k: string]: number } = {};
        this.rows.forEach((r) => {
            Object.keys(r.byType).forEach((t) => {
                set[t] = (set[t] || 0) + r.byType[t];
            });
        });
        return Object.keys(set).sort((a, b) => set[b] - set[a]);
    }

    private periodLabel(d: Date): string {
        const dd = d.getDate();
        const mm = d.getMonth() + 1;
        const yy = String(d.getFullYear()).slice(-2);
        if (this.grain === "month") {
            return this.heMonths[d.getMonth()] + " " + d.getFullYear();
        }
        if (this.grain === "week") {
            return "שבוע " + dd + "/" + mm + "/" + yy;
        }
        return dd + "/" + mm + "/" + yy;
    }

    private toInputDate(d: Date): string {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return y + "-" + m + "-" + day;
    }

    private parseDate(v: any): Date | null {
        if (v == null || v === "") {
            return null;
        }
        if (v instanceof Date && !isNaN(v.getTime())) {
            return new Date(v.getFullYear(), v.getMonth(), v.getDate());
        }
        if (typeof v === "number" && isFinite(v)) {
            const n = new Date(v);
            return isNaN(n.getTime())
                ? null
                : new Date(n.getFullYear(), n.getMonth(), n.getDate());
        }
        const s = String(v).trim();
        const msft = s.match(/\/Date\((-?\d+)(?:[+-]\d+)?\)\//);
        if (msft) {
            const n = new Date(Number(msft[1]));
            return isNaN(n.getTime())
                ? null
                : new Date(n.getFullYear(), n.getMonth(), n.getDate());
        }
        const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (iso) {
            return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
        }
        const d = new Date(s);
        return isNaN(d.getTime())
            ? null
            : new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
}
