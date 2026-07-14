import { Component, Inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { environment } from "src/environments/environment";
import { ConfirmationDialogService } from "../../confirmation-dialog/confirmation-dialog.service";
import { ca } from "date-fns/locale";
import { stringify } from "querystring";

/**
 * A single detailed admission record as returned by
 * `GetPendingAdmissionsByAdmissionNo` (PatientAdmissionData).
 */
export interface PatientAdmissionRecord {
    Row_ID: string;
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


    rowId: number | null = null;
    rating: number | null = null;
    reviewerFeedback = "";
    reviewSaved = false;

    private copyResetTimer: any = null;
    private summaryCopyResetTimer: any = null;

    constructor(
        public dialogRef: MatDialogRef<PendingAdmissionRecordDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: RecordDialogData,
        private http: HttpClient,
        private confirmationDialogService: ConfirmationDialogService
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
        this.rowId = null;
        this.rating = null;
        this.reviewerFeedback = "";
        this.reviewSaved = false;

        this.dialogRef.updateSize("100vw", "100vh");
        this.dialogRef.addPanelClass("record-dialog-fullscreen");

        this.http
            .post(environment.url + "GetOccupationalTherapySummary", {
                rawPatientData: prompt,
                admissionNo: this.data.admissionNo,
                patientName: this.data.patientName,
                username: localStorage.getItem('loginUserName'),
            })
            .subscribe(
                (response) => {
                    const parsed = this.extractSummaryObject(response);
                    this.summaryText = parsed.text;
                    this.rowId = parsed.rowId;
                    this.summaryLoading = false;
                },
                () => {
                    this.summaryLoading = false;
                    this.summaryError = "אירעה שגיאה בעת יצירת הסיכום. נסה שוב.";
                }
            );
    }



    private extractSummaryObject(response: any): { text: string; rowId: number | null } {
        let data = response && response["d"] !== undefined ? response["d"] : response;

        if (typeof data === "string") {
            try {
                data = JSON.parse(data);
            } catch {
                return { text: data, rowId: null };
            }
        }

        if (data && typeof data === "object") {
            return {
                text: typeof data.text === "string" ? data.text : "",
                rowId: typeof data.rowId === "number" ? data.rowId : null,
            };
        }

        return { text: String(data ?? ""), rowId: null };
    }


    saveEditedSummary(): void {
        if (!this.rowId || !this.summaryText) {
            return;
        }
        this.http
            .post(environment.url + "UpdateEditedSummary", {
                rowId: this.rowId,
                editedSummary: this.summaryText,
            })
            .subscribe();
    }

    saveReview(): void {
        console.log("saveReview clicked");
        console.log("rowId =", this.rowId);
        console.log("rating =", this.rating);
        if (!this.rowId || this.rating == null) {
            return;
        }
        const feedbackJson = JSON.stringify({ feedback: this.reviewerFeedback });

        this.http
            .post(environment.url + "UpdateReview", {
                rowId: this.rowId,
                rating: this.rating,
                feedbackJson: feedbackJson,
                reviewerName: "System", // replace with actual logged-in user if available
            })
            .subscribe(() => {
                this.reviewSaved = true;
            });
    }


    /** Retry generating the summary after a failure. */
    retrySummary(): void {
        this.generateSummary();
    }

    /** Close the AI summary side panel and restore the dialog width. */
    closeSummaryPanel(): void {
        this.summaryPanelOpen = false;
        this.summaryError = "";
        this.dialogRef.removePanelClass("record-dialog-fullscreen");
        this.dialogRef.updateSize("720px");
    }

    /** Copy the (possibly edited) AI summary text to the clipboard. */
    copySummary(): void {
        if (!this.summaryText) {
            return;
        }

        const admissionNo = this.data.admissionNo || "לא צוין";
        this.confirmationDialogService
            .confirm(
                "אישור העתקה",
                `האם אתה בטוח שברצונך להעתיק את הסיכום עבור אשפוז ${admissionNo}?`
            )
            .then((confirmed) => {
                if (confirmed) {
                    this.writeToClipboard(this.summaryText, "summary");
                }
            })
            .catch(() => {
                // Dialog dismissed; do nothing.
            });
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
    jsonToXml(data) {
        const escape = (str) =>
            String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
        const sanitizeTag = (name) =>
            String(name).replace(/[^a-zA-Z0-9_\-.]/g, '_').replace(/^([^a-zA-Z_])/, '_$1');
        let xml = '';
        for (const [propertyName, records] of Object.entries(data)) {
            const tag = sanitizeTag(propertyName);
            xml += `  <${tag}>\n`;
            if (Array.isArray(records)) {
                for (const record of records) {
                    // Each entry may be a single item or a group of items
                    // belonging to the same record.
                    const items = Array.isArray(record) ? record : [record];
                    
                    for (const item of items) {
                        const childTag = sanitizeTag(item.categoryName);
                        xml += '      <${childTag}>\n';
                        xml += `        ${escape(item.content)}\n`;
                        xml += '      </${childTag}>\n';
                    }
                    
                }
            }
            xml += `  </${tag}>\n`;
        }
        xml += '';
        return xml;
       /* const escape = (str) =>
            String(str)
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&apos;');
          const sanitizeTag = (name) =>
            String(name).replace(/[^a-zA-Z0-9_\-.]/g, '_').replace(/^([^a-zA-Z_])/, '_$1');
          let xml = '';
          for (const [propertyName, items] of Object.entries(data)) {
            const tag = sanitizeTag(propertyName);
            xml += `  <${tag}>\n`;
            if (Array.isArray(items)) {
              for (const item of items) {
                const childTag = sanitizeTag(item.categoryName);
                xml += `    <${childTag}>${escape(item.content)}</${childTag}>\n`;
              }
            }
            xml += `  </${tag}>\n`;
          }
          xml += '';
          return xml;*/
         /* const escape = (str) =>
            String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
        const sanitizeTag = (name) =>
            String(name).replace(/[^a-zA-Z0-9_\-.]/g, '_').replace(/^([^a-zA-Z_])/, '_$1');
        let xml = '';
        for (const [propertyName, items] of Object.entries(data)) {
            const tag = sanitizeTag(propertyName);
            xml += `  <${tag}>\n`;
            if (Array.isArray(items)) {
                for (const item of items) {
                    const childTag = sanitizeTag(item.categoryName);
                    xml += `    <${childTag}>${escape(item.content)}</${childTag}>\n`;
                }
            }
            xml += `  </${tag}>\n`;
        }
        xml += '';
        return xml;*/
    }

    /**
     * Build the structured category data used to generate the XML prompt.
     *
     * For each configured section this maps the matching Hebrew category to an
     * array of "record groups". Every record found for that category produces
     * its own group of items, so ALL records are included (not only the first).
     */
    private buildCategoryData(): { [section: string]: { categoryName: string; content: string }[][] } {
        // Section -> Hebrew category name + the fields to extract from each record.
        const sectionConfig: {
            key: string;
            hebrewName: string;
            fields: { name: string; source: keyof PatientAdmissionRecord }[];
        }[] = [
            {
                key: "FollowUpNotes",
                hebrewName: "מעקב ריפוי בעיסוק",
                fields: [
                    { name: "FollowUpNoteId", source: "Row_ID" },
                    { name: "FollowUpDateTime", source: "Record_Date" },
                    { name: "FollowUpContent", source: "Record_Text" },
                ],
            },
            {
                key: "AdmissionEvaluationSummary",
                hebrewName: 'ריפוי בעיסוק - קבלה/סיכום "הערכה בקבלה"',
                fields: [
                    { name: "AdmissionEvaluationSummaryContent", source: "Record_Text" },
                    { name: "AdmissionEvaluationDateTime", source: "Record_Date" },
                ],
            },
            {
                key: "TreatmentPlanAndGoals",
                hebrewName: "תכנית טיפול ויעדים מדידים - ריפוי בעיסוק",
                fields: [
                    { name: "TreatmentPlanAndGoalsContent", source: "Record_Text" },
                    { name: "TreatmentPlanAndGoalsDateTime", source: "Record_Date" },
                ],
            },
            {
                key: "PatientEducation",
                hebrewName: "הדרכת מטופלים",
                fields: [
                    { name: "PatientEducationContent", source: "Record_Text" },
                    { name: "PatientEducationDateTime", source: "Record_Date" },
                ],
            },
            {
                key: "CognitiveAssessments",
                hebrewName: "הערכות קוגניטיביות ריפוי בעיסוק",
                fields: [
                    { name: "CognitiveAssessmentsContent", source: "Record_Text" },
                    { name: "CognitiveAssessmentsDateTime", source: "Record_Date" },
                ],
            },
            {
                key: "MotorAssessments",
                hebrewName: "הערכות מוטוריות",
                fields: [
                    { name: "MotorAssessmentsContent", source: "Record_Text" },
                    { name: "MotorAssessmentsDateTime", source: "Record_Date" },
                ],
            },
            {
                key: "LastMeetingSummary",
                hebrewName: "סיכום ישיבת צוות",
                fields: [
                    { name: "LastMeetingSummaryContent", source: "Record_Text" },
                    { name: "LastMeetingSummaryDateTime", source: "Record_Date" },
                ],
            },
        ];

        const result: { [section: string]: { categoryName: string; content: string }[][] } = {};
        for (const section of sectionConfig) {
            const category = this.categories.find(
                (c) => c.categoryName === section.hebrewName
            );
            const records = (category && category.records) || [];
            result[section.key] = records.map((record) =>
                section.fields.map((field) => ({
                    categoryName: field.name,
                    content: (record[field.source] as string) || "",
                }))
            );
        }
        return result;
    }

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
            `אבחנות: ${this.diagnoses.length > 0 ? this.diagnoses.join(", ") : "לא צוינו"
            }`
        );
        lines.push("");
        lines.push("### תיעוד ותצפיות");
        const cat2 = this.buildCategoryData();
        console.log("this.cat2 json", cat2);
        console.log("this.cat2 xml", this.jsonToXml(cat2));
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

        // lines.push("");
        // lines.push("### מבנה הסיכום הנדרש");
        // lines.push(
        //     "בנה את התשובה לפי הסעיפים הבאים בדיוק, כולל האימוג'ים והכותרות:"
        // );
        // lines.push("");
        // lines.push("🎯 תמונת מצב נוכחית (עדכון סטטוס)");
        // lines.push(
        //     "מהו העיסוק המרכזי שתרגלנו השבוע? (למשל: לבוש, כתיבה, התארגנות)"
        // );
        // lines.push(
        //     "מה השתנה בתפקוד? (רמת העצמאות: עצמאי לחלוטין, זקוק להכוונה מילולית, או זקוק לעזרה פיזית חלקית)"
        // );
        // lines.push("");
        // lines.push("💡 נקודות לדיון בישיבת הצוות (תצפיות וממצאים)");
        // lines.push("הצלחות השבוע: במה המטופל הצליח להתקדם?");
        // lines.push(
        //     "אתגרים ומגבלות: מהם הקשיים שעלו השבוע בביצוע המשימות?"
        // );
        // lines.push(
        //     "השפעת הסביבה: כיצד מצבו הרגשי, הקוגניטיבי או הפיזי השפיעו על התפקוד היומיומי?"
        // );
        // lines.push("");
        // lines.push("🛠️ כלים והתאמות בשימוש");
        // lines.push(
        //     "אביזרי עזר: באילו עזרים המטופל משתמש כעת? (למשל: סד, התאמות ארגונומיות, כלי כתיבה מותאמים)"
        // );
        // lines.push(
        //     "הדרכת צוות / משפחה: אילו דגשים חשוב להעביר לצוות המחלקה / למשפחה כדי לשמר את התפקוד?"
        // );
        // lines.push("");
        // lines.push("🚀 תוכנית טיפול לשבוע הבא");
        // lines.push(
        //     "מטרות לטווח הקצר: מה נרצה להשיג בשבוע הקרוב? (למשל: שיפור טווח תנועה, הפחתת זמן התארגנות בבוקר)"
        // );
        // lines.push(
        //     "דרכי פעולה (התערבות): באילו שיטות נשתמש כדי להשיג את המטרות?"
        // );
        //return this.jsonToXml(cat2);
        //return lines.join("\n");
        return JSON.stringify(cat2);
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
