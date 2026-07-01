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

    /**
     * Diagnoses for this admission. The `Diagnosis` column holds the same
     * `', '`-separated value on every record of an admission, so it is taken
     * from the last record and split into individual items.
     */
    diagnoses: string[] = [];

    /** Whether the generated prompt was just copied (drives the button label). */
    promptCopied = false;

    private copyResetTimer: any = null;

    constructor(
        public dialogRef: MatDialogRef<PendingAdmissionRecordDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: RecordDialogData
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
     * Compose the "perfect prompt" from the admission's data: patient details,
     * diagnoses and all recorded notes grouped by category. The prompt asks the
     * model to produce the fixed weekly team-meeting summary template.
     */
    buildPrompt(): string {
        const lines: string[] = [];

        lines.push(
            "אתה מרפא בעיסוק בכיר. על סמך נתוני המטופל שלהלן, כתוב 'סיכום ישיבת צוות שבועית עבור תפקוד מטופל' בעברית."
        );
        lines.push(
            "הקפד על שפה מקצועית, תמציתית ומבוססת על הנתונים בלבד. אין להמציא מידע שאינו מופיע בנתונים."
        );
        lines.push("");
        lines.push("### פרטי המטופל");
        lines.push(`מספר אשפוז: ${this.data.admissionNo || "לא צוין"}`);
        lines.push(`שם המטופל: ${this.data.patientName || "לא צוין"}`);
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
    private writeToClipboard(text: string): void {
        const done = () => this.flagCopied();

        if (
            typeof navigator !== "undefined" &&
            navigator.clipboard &&
            navigator.clipboard.writeText
        ) {
            navigator.clipboard.writeText(text).then(done, () =>
                this.fallbackCopy(text)
            );
            return;
        }

        this.fallbackCopy(text);
    }

    /** Legacy clipboard copy using a temporary textarea element. */
    private fallbackCopy(text: string): void {
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
            this.flagCopied();
        } catch {
            // Clipboard access is unavailable; nothing more we can do here.
        }
    }

    /** Show the "copied" confirmation on the button for a short while. */
    private flagCopied(): void {
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
