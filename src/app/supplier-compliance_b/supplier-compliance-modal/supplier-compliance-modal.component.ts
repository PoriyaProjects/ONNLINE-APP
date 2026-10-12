import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DocumentHistoryEntry, Supplier, SupplierOptions, SupplierUpsert, emptySupplier } from '../supplier-compliance.models';
import { SupplierComplianceService } from '../supplier-compliance.service';
import {
  ACTION_ACCENT, buildTimeline, computeSupplierAnalysis, docChecklistState,
  normalizeDocValue, reviewAge,
} from '../supplier-compliance-analysis';

// Every form field rendered as a <select>, so a null coming back from the API doesn't leave
// the control blank instead of showing "— לא נבחר —".
const DROPDOWN_FIELDS: (keyof SupplierUpsert)[] = [
  'status', 'nature', 'connectionType', 'authenticationMethod', 'securityMeasures',
  'isoCertified', 'systemType', 'ndaSigned', 'cloudCommitteeFormStatus',
  'infosecQuestionnaireDocStatus', 'procurementTechQuestionnaireStatus',
  'businessContinuityRisk', 'dataSensitivityRisk', 'financialRisk', 'likelihoodRisk',
  'reviewType', 'reviewStatus', 'riskScore', 'hativaApproved', 'isCloudProduct',
];

// The four document-status fields, which share the docStatus option list and are the ones
// still holding legacy "1"/"0" values in the database.
const DOC_FIELDS: (keyof SupplierUpsert)[] = [
  'ndaSigned', 'cloudCommitteeFormStatus',
  'infosecQuestionnaireDocStatus', 'procurementTechQuestionnaireStatus',
  'isoCertified',
];

interface ChecklistRow {
  label: string;
  state: 'ok' | 'bad' | 'na';
  value?: string | null;
}

@Component({
  selector: 'app-supplier-compliance-modal',
  templateUrl: './supplier-compliance-modal.component.html',
  styleUrls: ['./supplier-compliance-modal.component.scss'],
})
export class SupplierComplianceModalComponent implements OnInit {
  @Input() supplier: Supplier | null = null;
  @Input() options!: SupplierOptions;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Supplier>();

  form: SupplierUpsert = emptySupplier();
  saving = false;
  errorMessage = '';

  // Document status audit log. Stays empty for a new supplier (nothing to show yet) and on a
  // deployment where the history table has not been created — in both cases the panel renders
  // its empty state rather than an error.
  documentHistory: DocumentHistoryEntry[] = [];
  documentHistoryTruncated = false;

  constructor(private supplierService: SupplierComplianceService) {}

  ngOnInit(): void {
    this.form = this.supplier ? { ...(this.supplier as any) } : emptySupplier();
    // The spread above is shallow, so extraDocuments would still point at the dashboard's own
    // array — editing a status here would leak back into the list even on cancel.
    this.form.extraDocuments = (this.form.extraDocuments || []).map((d) => ({
      ...d,
      status: normalizeDocValue(d.status) || '',
    }));
    this.normalizeDropdownValues();
    this.loadDocumentHistory();
  }

  // Best-effort: the log is supplementary, so a failure to load it leaves the panel empty
  // instead of blocking the card the user actually opened.
  private loadDocumentHistory(): void {
    if (!this.supplier) return;
    this.supplierService.getDocumentHistory(this.supplier.id).subscribe({
      next: (res) => {
        this.documentHistory = res.entries || [];
        this.documentHistoryTruncated = res.truncated || false;
      },
      error: () => {
        this.documentHistory = [];
        this.documentHistoryTruncated = false;
      },
    });
  }

  statusText(value: string | null): string {
    return value && value.trim() ? value : 'לא נבחר';
  }

  changedByText(value: string | null): string {
    return value && value.trim() ? value : 'לא ידוע';
  }

  private normalizeDropdownValues(): void {
    const form = this.form as any;
    for (const field of DROPDOWN_FIELDS) {
      if (form[field] == null) form[field] = '';
    }
    for (const field of DOC_FIELDS) {
      form[field] = normalizeDocValue(this.form[field] as any) || '';
    }
  }

  // Keeps a value that isn't in the option list selectable instead of rendering blank.
  withCurrent(list: string[], value: string | null | undefined): string[] {
    return value && list.indexOf(value) < 0 ? [...list, value] : list;
  }

  get isNew(): boolean {
    return !this.supplier;
  }

  get analysis() {
    return computeSupplierAnalysis(this.form, this.supplier ? this.supplier.isCriticalSupplier : null);
  }

  get actionAccent(): string {
    return ACTION_ACCENT[this.analysis.recommendedActionLevel];
  }

  get checklist(): ChecklistRow[] {
    const docRow = (label: string, value: string | null | undefined): ChecklistRow => {
      const state = docChecklistState(value);
      return { label, state, value: value || undefined };
    };
    const filled = (v: string | null | undefined) => !!(v || '').trim();

    const rows: ChecklistRow[] = [
      { label: 'שם איש קשר', state: filled(this.form.contactPerson) ? 'ok' : 'bad', value: this.form.contactPerson || undefined },
      { label: 'כתובת אימייל', state: filled(this.form.email) ? 'ok' : 'bad', value: this.form.email || undefined },
      { label: "מס' טלפון נייד", state: filled(this.form.phone) ? 'ok' : 'bad', value: this.form.phone || undefined },
      { label: 'תאור השרות / מוצר', state: filled(this.form.service) ? 'ok' : 'bad' },
      docRow('טופס NDA', this.form.ndaSigned),
      docRow('שאלון אבטחת מידע', this.form.infosecQuestionnaireDocStatus),
      docRow('שאלון הכנסת רכש וטכנולוגיות רפואיות חדשות', this.form.procurementTechQuestionnaireStatus),
      docRow('טופס ועדת ענן', this.form.cloudCommitteeFormStatus),
    ];
    (this.form.extraDocuments || []).forEach((d) => rows.push(docRow(d.label, d.status)));
    return rows;
  }

  get timeline() {
    return buildTimeline(this.form.notes);
  }

  get age() {
    return reviewAge(this.form.lastReviewDate);
  }

  get statusBlockClass(): string {
    if (this.form.status === 'פעיל') return 'is-active';
    if (this.form.status === 'לא פעיל') return 'is-inactive';
    return '';
  }

  get cloudBlockClass(): string {
    return this.form.isCloudProduct === '1' ? 'is-yes' : '';
  }

  get hativaBlockClass(): string {
    return this.form.hativaApproved === '1' ? 'is-yes' : '';
  }

  // Custom protocol link (registered client-side via a .reg handler) that opens the supplier's
  // document folder directly in Explorer. Null until the supplier has a name and a folder base
  // path is configured on the server.
  get folderLink(): string | null {
    const basePath = this.options.supplierFoldersBasePath;
    const name = this.form.name ? this.form.name.trim() : '';
    if (!basePath || !name) return null;
    return `onnline-open://${encodeURIComponent(`${basePath}\\${name}`)}`;
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  close(): void {
    this.closed.emit();
  }

  save(): void {
    if (!this.form.name.trim()) {
      this.errorMessage = 'שם הספק הוא שדה חובה';
      return;
    }
    this.errorMessage = '';
    this.saving = true;

    const payload = this.toPayload();
    const req$ = this.supplier
      ? this.supplierService.update(this.supplier.id, payload)
      : this.supplierService.create(payload);
    req$.subscribe({
      next: (result) => {
        this.saving = false;
        this.saved.emit(result);
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.errorMessage = describeSaveError(err);
      },
    });
  }

  // <input type="date"> writes '' — not null — when the user clears it, and the server's
  // DateOnly? model binder rejects '' outright with a 400.
  private toPayload(): SupplierUpsert {
    const blankToNull = (v: string | null | undefined) => ((v || '').trim() || null);
    return {
      ...this.form,
      lastReviewDate: blankToNull(this.form.lastReviewDate),
      nextReviewDate: blankToNull(this.form.nextReviewDate),
    };
  }
}

// Reporting every failure as "check the connection" hid real, fixable input problems behind a
// network error — most visibly the nvarchar(10) columns rejecting "משרד הבריאות".
function describeSaveError(err: HttpErrorResponse): string {
  if (err.status === 0) return 'שמירה נכשלה — יש לבדוק את החיבור לשרת';

  if (err.error && typeof err.error.error === 'string') return `שמירה נכשלה — ${err.error.error}`;

  const fields = err.error ? err.error.errors : null;
  if (fields && typeof fields === 'object') {
    const values: string[][] = Object.keys(fields).map((k) => fields[k]);
    const first = values.filter((m) => m && m.length)[0];
    if (first) return `שמירה נכשלה — ${first[0]}`;
  }

  return `שמירה נכשלה (שגיאה ${err.status})`;
}
