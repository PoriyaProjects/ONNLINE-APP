import { Component, Inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { environment } from "src/environments/environment";

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

    /**
     * Diagnoses for this admission. The `Diagnosis` column holds the same
     * `', '`-separated value on every record of an admission, so it is taken
     * from the last record and split into individual items.
     */
    diagnoses: string[] = [];

    /** Whether the generated prompt was just copied (drives the button label). */
    promptCopied = false;

    /** Whether the AI summary side panel is open (splits the dialog in two). */
    summaryPanelOpen = false;
    /** True while the summary is being generated on the server. */
    summaryLoading = false;
    /** Error message shown if the summary request fails. */
    summaryError = "";
    /** The editable AI-generated summary text returned from Bedrock. */
    summaryText = "";
    /** Whether the generated summary was just copied (drives the button label). */
    summaryCopied = false;

    private copyResetTimer: any = null;
    private summaryCopyResetTimer: any = null;

    constructor(
        public dialogRef: MatDialogRef<PendingAdmissionRecordDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: RecordDialogData,
        private http: HttpClient
    ) {
        const records = (data && data.records) || [];
        this.categories = this.groupByCategory(records);
        this.diagnoses = this.extractDiagnoses(records);
    }

    /** Close the dialog. */
    close(): void {
        this.dialogRef.close();
    }

    /**
     * Build a structured Hebrew prompt for Bedrock that asks for a weekly team
     * meeting summary of the patient's functioning, then copy it to the
     * clipboard so it can be pasted into the AI assistant.
     */
    copyPrompt(): void {
        const prompt = this.buildPrompt();
        this.writeToClipboard(prompt);
    }

    /**
     * Build the prompt and POST it to the server, which forwards it to Bedrock
     * and returns the generated weekly team-meeting summary. Opens the side
     * panel and shows a progress bar until the response arrives.
     */
    generateSummary(): void {
        if (this.summaryLoading) {
            return;
        }

        const prompt = this.buildPrompt();

        this.summaryPanelOpen = true;
        this.summaryLoading = true;
        this.summaryError = "";
        this.summaryText = "";

        // Widen the dialog so the two panes have room to breathe.
        this.dialogRef.updateSize("1120px");

        this.http
            .post(environment.url + "GetOccupationalTherapySummary", {
                rawPatientData: prompt,
            })
            .subscribe(
                (response) => {
                    this.summaryText = this.extractSummary(response);
                    this.summaryLoading = false;
                },
                () => {
                    this.summaryLoading = false;
                    this.summaryError =
                        "אירעה שגיאה בעת יצירת הסיכום. נסה שוב.";
                }
            );
    }

    /** Retry generating the summary after a failure. */
    retrySummary(): void {
        this.generateSummary();
    }

    /** Close the AI summary side panel and restore the dialog width. */
    closeSummaryPanel(): void {
        this.summaryPanelOpen = false;
        this.summaryError = "";
        this.dialogRef.updateSize("720px");
    }

    /** Copy the (possibly edited) AI summary text to the clipboard. */
    copySummary(): void {
        if (!this.summaryText) {
            return;
        }
        this.writeToClipboard(this.summaryText, "summary");
    }

    /**
     * Normalise the server response into a plain string. ASP.NET web methods
     * wrap the payload under `d`; the value may also be a JSON-encoded string.
     */
    private extractSummary(response: any): string {
        let data =
            response && response["d"] !== undefined ? response["d"] : response;

        if (typeof data === "string") {
            const trimmed = data.trim();
            if (
                (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
                (trimmed.startsWith("[") && trimmed.endsWith("]"))
            ) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (parsed && typeof parsed.text === "string") {
                        return parsed.text;
                    }
                } catch {
                    // Not JSON, fall through and return the raw string.
                }
            }
            return data;
        }

        if (data == null) {
            return "";
        }

        return typeof data === "object" && typeof data.text === "string"
            ? data.text
            : String(data);
    }

    /**
     * Compose the "perfect prompt" from the admission's data: patient details,
     * diagnoses and all recorded notes grouped by category. The prompt asks the
     * model to produce the fixed weekly team-meeting summary template.
     */
    buildPrompt(): string {
        const lines: string[] = [];

        // lines.push(
        //     "אתה מרפא בעיסוק בכיר. על סמך נתוני המטופל שלהלן, כתוב 'סיכום ישיבת צוות שבועית עבור תפקוד מטופל' בעברית."
        // );
        // lines.push(
        //     "הקפד על שפה מקצועית, תמציתית ומבוססת על הנתונים בלבד. אין להמציא מידע שאינו מופיע בנתונים."
        // );
        lines.push("");
        lines.push("### פרטי המטופל");
        lines.push(`מספר אשפוז: ${this.data.admissionNo || "לא צוין"}`);
        lines.push(
            `גיל: ${this.data.patientAge != null ? this.data.patientAge : "לא צוין"}`
        );
        lines.push(
            `אבחנות: ${
                this.diagnoses.length > 0 ? this.diagnoses.join(", ") : "לא צוינו"
            }`
        );
        lines.push("");
        lines.push("### תיעוד ותצפיות");

        if (this.categories.length === 0) {
            lines.push("אין תיעוד זמין.");
        } else {
            for (const category of this.categories) {
                lines.push("");
                lines.push(`## ${category.categoryName}`);
                for (const record of category.records) {
                    const meta = [
                        record.Record_Date,
                        record.Record_Time,
                        record.Record_Employee,
                    ]
                        .filter((part) => part && part.trim().length > 0)
                        .join(" | ");
                    const text = (record.Record_Text || "").trim();
                    if (!text && !meta) {
                        continue;
                    }
                    lines.push(meta ? `- [${meta}] ${text}` : `- ${text}`);
                }
            }
        }

        lines.push("");
        lines.push("### מבנה הסיכום הנדרש");
        lines.push(
            "בנה את התשובה לפי הסעיפים הבאים בדיוק, כולל האימוג'ים והכותרות:"
        );
        lines.push("");
        lines.push("🎯 תמונת מצב נוכחית (עדכון סטטוס)");
        lines.push(
            "מהו העיסוק המרכזי שתרגלנו השבוע? (למשל: לבוש, כתיבה, התארגנות)"
        );
        lines.push(
            "מה השתנה בתפקוד? (רמת העצמאות: עצמאי לחלוטין, זקוק להכוונה מילולית, או זקוק לעזרה פיזית חלקית)"
        );
        lines.push("");
        lines.push("💡 נקודות לדיון בישיבת הצוות (תצפיות וממצאים)");
        lines.push("הצלחות השבוע: במה המטופל הצליח להתקדם?");
        lines.push(
            "אתגרים ומגבלות: מהם הקשיים שעלו השבוע בביצוע המשימות?"
        );
        lines.push(
            "השפעת הסביבה: כיצד מצבו הרגשי, הקוגניטיבי או הפיזי השפיעו על התפקוד היומיומי?"
        );
        lines.push("");
        lines.push("🛠️ כלים והתאמות בשימוש");
        lines.push(
            "אביזרי עזר: באילו עזרים המטופל משתמש כעת? (למשל: סד, התאמות ארגונומיות, כלי כתיבה מותאמים)"
        );
        lines.push(
            "הדרכת צוות / משפחה: אילו דגשים חשוב להעביר לצוות המחלקה / למשפחה כדי לשמר את התפקוד?"
        );
        lines.push("");
        lines.push("🚀 תוכנית טיפול לשבוע הבא");
        lines.push(
            "מטרות לטווח הקצר: מה נרצה להשיג בשבוע הקרוב? (למשל: שיפור טווח תנועה, הפחתת זמן התארגנות בבוקר)"
        );
        lines.push(
            "דרכי פעולה (התערבות): באילו שיטות נשתמש כדי להשיג את המטרות?"
        );

        return lines.join("\n");
    }

    /** trackBy helper for the category tabs. */
    trackByCategory(_index: number, group: CategoryGroup): string {
        return group.categoryName;
    }

    /** Copy text to the clipboard, with a fallback for older browsers. */
    private writeToClipboard(text: string, target: "prompt" | "summary" = "prompt"): void {
        const done = () => this.flagCopied(target);

        if (
            typeof navigator !== "undefined" &&
            navigator.clipboard &&
            navigator.clipboard.writeText
        ) {
            navigator.clipboard.writeText(text).then(done, () =>
                this.fallbackCopy(text, target)
            );
            return;
        }

        this.fallbackCopy(text, target);
    }

    /** Legacy clipboard copy using a temporary textarea element. */
    private fallbackCopy(text: string, target: "prompt" | "summary" = "prompt"): void {
        try {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.setAttribute("readonly", "");
            textarea.style.position = "absolute";
            textarea.style.left = "-9999px";
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
            this.flagCopied(target);
        } catch {
            // Clipboard access is unavailable; nothing more we can do here.
        }
    }

    /** Show the "copied" confirmation on the relevant button for a short while. */
    private flagCopied(target: "prompt" | "summary" = "prompt"): void {
        if (target === "summary") {
            this.summaryCopied = true;
            if (this.summaryCopyResetTimer) {
                clearTimeout(this.summaryCopyResetTimer);
            }
            this.summaryCopyResetTimer = setTimeout(() => {
                this.summaryCopied = false;
            }, 2000);
            return;
        }

        this.promptCopied = true;
        if (this.copyResetTimer) {
            clearTimeout(this.copyResetTimer);
        }
        this.copyResetTimer = setTimeout(() => {
            this.promptCopied = false;
        }, 2000);
    }

    /**
     * Extract the list of diagnoses for the admission. The `Diagnosis` column is
     * identical on every record of the same AdmissionNo, so the value is read
     * from the last record and split on `', '` into individual diagnoses.
     */
    private extractDiagnoses(records: PatientAdmissionRecord[]): string[] {
        if (!records || records.length === 0) {
            return [];
        }

        const lastRecord = records[records.length - 1];
        const raw = (lastRecord && lastRecord.Diagnosis) || "";

        const seen = new Set<string>();
        return raw
            .split(", ")
            .map((item) => item.trim())
            .filter((item) => {
                if (item.length === 0 || seen.has(item)) {
                    return false;
                }
                seen.add(item);
                return true;
            });
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
