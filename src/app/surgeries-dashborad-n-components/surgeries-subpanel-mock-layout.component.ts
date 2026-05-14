import { ChangeDetectionStrategy, Component, Input } from "@angular/core";

export interface SurgerySubpanelMockRow {
    entity: string;
    c1: string;
    c2: string;
    c3: string;
}

@Component({
    selector: "app-surgeries-subpanel-mock-layout",
    templateUrl: "./surgeries-subpanel-mock-layout.component.html",
    styleUrls: ["./surgeries-subpanel-shell.css"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurgeriesSubpanelMockLayoutComponent {
    /** Unique suffix for mat-button-toggle-group name attributes */
    @Input() formUid = "mock";

    @Input() pageTitle = "";

    /** כותרת משנה תחת כותרת הפאנל */
    @Input() scopeHint = "";

    @Input() chartHeading = "";

    @Input() periodCaption = "";

    @Input() tablePanelTitle = "";

    @Input() tableExtraTitle = "";

    @Input() tableExtraBody = "";

    chartTypeIcon = "bar_chart";

    mainView = "count";

    periodView = "year";

    readonly demoRows: SurgerySubpanelMockRow[] = [
        { entity: "ישות לדוגמה", c1: "—", c2: "—", c3: "—" },
        { entity: "שורה נוספת", c1: "—", c2: "—", c3: "—" },
        { entity: "…", c1: "—", c2: "—", c3: "—" },
    ];

    readonly mockYears: { y: string; v: string; sub: string }[] = [
        { y: "2023", v: "—", sub: "ללא נתונים" },
        { y: "2024", v: "—", sub: "ללא נתונים" },
        { y: "2025", v: "—", sub: "ללא נתונים" },
        { y: "2026", v: "—", sub: "ללא נתונים" },
    ];

    onMainViewChange(value: string): void {
        this.mainView = value;
    }

    onPeriodViewChange(value: string): void {
        this.periodView = value;
    }
}
