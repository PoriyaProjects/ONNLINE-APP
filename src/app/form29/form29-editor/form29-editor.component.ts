import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { F29Approval, F29Context, F29Country, F29DrugHit, F29FileMeta, F29Request, F29Stage } from '../form29.models';
import { Form29Service } from '../form29.service';

@Component({
  selector: 'app-form29-editor',
  templateUrl: './form29-editor.component.html',
  styleUrls: ['./form29-editor.component.scss'],
})
export class Form29EditorComponent implements OnInit {
  loading = true;
  busy = false;
  loadError = '';
  formError = '';
  fields: { [key: string]: string } = {};
  context: F29Context = null;
  requestId = 0;
  rowVer = '';
  canEdit = true;
  status = 'DRAFT';
  statusLabel = 'טיוטה';
  saved = false;
  facilityId = '';
  facilityName = '';
  departmentId = '';
  departmentName = '';
  drugQuery = '';
  drugHits: F29DrugHit[] = [];
  drugCode = '';
  drugName = '';
  drugNameEn = '';
  registrationHolder = '';
  registeredIndications = '';
  healthBasket = '';
  registrationDate = '';
  veterinaryUse = '';
  duplicateCount = 0;
  doseForm = '';
  drugRoute = '';
  strength = '';
  composition = '';
  manufacturer = '';
  originCountry = '';
  snapshotComplete = false;
  indication = '';
  rationale = '';
  totalQty = '';
  qtyUnit = '';
  inBasket = false;
  offLabel = false;
  foreignMark = false;
  westEurope = false;
  westEuropeName = '';
  usa = false;
  canada = false;
  australia = false;
  japan = false;
  israelStatus = '';
  foreignValue = '';
  countries: F29Country[] = [];
  files: F29FileMeta[] = [];
  approvals: F29Approval[] = [];
  stages: F29Stage[] = [];
  nextAction = '';
  contentHash = '';
  validity: { validFrom: string; validUntil: string } = null;
  versionNo = 1;
  private token = 0;

  readonly declarationLines = [
    'התכשיר חיוני ולא קיים תכשיר חלופי מתאים הרשום ומשווק בישראל לאותה מטרה.',
    'התועלת בשימוש בתכשיר עולה על הסיכון הכרוך בו.',
    'ההוראה לשימוש בתכשיר הנ"ל ולהתוויה המבוקשת היא של הרופא המטפל ובאחריותו הרפואית.',
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private form29: Form29Service,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      var id = params.get('requestId');
      this.open(!id || id === 'new' ? 0 : +id);
    });
  }

  open(id: number): void {
    var token = ++this.token;
    this.loading = true;
    this.loadError = '';
    this.formError = '';
    this.fields = {};
    this.requestId = id || 0;
    if (!this.requestId) this.reset();
    this.form29.context().subscribe(
      (ctx) => {
        if (token !== this.token) return;
        this.context = ctx;
        this.stages = ctx.stages || [];
        this.facilityId = ctx.facilityId || '';
        this.facilityName = ctx.facilityName || '';
        this.departmentId = ctx.departmentId || '';
        this.departmentName = ctx.departmentName || '';
        if (!this.requestId) {
          this.loading = false;
          this.canEdit = true;
          this.nextAction = ctx.facilityVerified
            ? 'אפשר לשמור טיוטה. ההגשה תיבדק מול הקטלוג והשיוך המוסדי.'
            : 'אפשר לשמור טיוטה. ההגשה חסומה: שיוך מוסדי לא אומת.';
          return;
        }
        this.form29.get(this.requestId).subscribe(
          (row) => {
            if (token !== this.token) return;
            this.applyRow(row);
            this.loading = false;
          },
          (err) => this.failLoad(token, err)
        );
      },
      (err) => this.failLoad(token, err)
    );
  }

  save(): void {
    if (!this.canEdit || this.busy) return;
    this.busy = true;
    this.form29.saveDraft(this.payload()).subscribe(
      (row) => {
        this.busy = false;
        this.saved = true;
        this.applyRow(row);
        this.snack.open('הטיוטה נשמרה', 'סגירה', { duration: 2500 });
        if (this.requestId) this.router.navigate(['/form29', this.requestId], { replaceUrl: true });
      },
      (err) => this.fail(err)
    );
  }

  submit(): void {
    if (!this.canEdit || this.busy) return;
    this.busy = true;
    this.form29.saveDraft(this.payload()).subscribe(
      (saved) => {
        this.applyRow(saved);
        this.form29.submit(this.payload()).subscribe(
          (row) => {
            this.busy = false;
            this.applyRow(row);
            this.snack.open('הבקשה הוגשה', 'סגירה', { duration: 2500 });
            this.router.navigate(['/form29', this.requestId], { replaceUrl: true });
          },
          (err) => this.fail(err)
        );
      },
      (err) => this.fail(err)
    );
  }

  search(): void {
    this.form29.searchDrugs(this.drugQuery).subscribe(
      (items) => {
        this.drugHits = items;
        if (!items.length) this.formError = 'לא נמצאו תכשירים';
      },
      (err) => this.fail(err)
    );
  }

  chooseDrug(hit: F29DrugHit): void {
    this.drugCode = hit.drugCode || '';
    this.drugName = hit.drugNameHe || hit.drugName || '';
    this.doseForm = hit.doseForm || '';
    this.drugRoute = hit.route || '';
    this.strength = '';
    this.composition = hit.composition || '';
    this.manufacturer = hit.manufacturer || '';
    this.originCountry = '';
    this.snapshotComplete = !!hit.snapshotComplete;
    this.applyReference(hit);
    this.drugHits = [];
  }

  addCountry(): void {
    this.countries.push({ code: '', name: '', region: '' });
  }

  removeCountry(index: number): void {
    this.countries.splice(index, 1);
  }

  onFile(event: Event): void {
    var input = event.target as HTMLInputElement;
    var file = input.files && input.files[0];
    if (!file || !this.requestId) {
      this.formError = 'שמרו טיוטה לפני צירוף קובץ';
      input.value = '';
      return;
    }
    var reader = new FileReader();
    reader.onload = () => {
      var raw = String(reader.result || '');
      var comma = raw.indexOf(',');
      var content = comma >= 0 ? raw.substring(comma + 1) : raw;
      this.form29.addFile(this.requestId, file.name, content).subscribe(
        (saved) => {
          this.files.push({ fileId: saved.fileId, fileName: saved.fileName, kind: 'REFERENCE', addedAt: '' });
          input.value = '';
        },
        (err) => this.fail(err)
      );
    };
    reader.readAsDataURL(file);
  }

  download(file: F29FileMeta): void {
    this.form29.file(file.fileId).subscribe(
      (res) => {
        var binary = atob(res.contentBase64 || '');
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        var blob = new Blob([bytes], { type: res.contentType || 'application/octet-stream' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = res.fileName || file.fileName || 'file';
        link.click();
        URL.revokeObjectURL(url);
      },
      (err) => this.fail(err)
    );
  }

  preview(): void {
    var popup = window.open('', '_blank', 'noopener,width=860,height=900');
    if (!popup) {
      this.formError = 'הדפדפן חסם את חלון התצוגה המקדימה';
      return;
    }
    popup.document.write(this.printHtml());
    popup.document.close();
    popup.focus();
    popup.print();
  }

  scrollTo(id: string): void {
    var el = document.getElementById(id);
    if (!el) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  show(name: string): string {
    return this.fields && this.fields[name] ? this.fields[name] : '';
  }

  missing(value: string): string {
    return value ? value : 'לא זמין בקטלוג המאומת';
  }

  approvalFor(stageNo: number): F29Approval {
    for (var i = 0; i < this.approvals.length; i++) {
      if (this.approvals[i].stageNo === stageNo) return this.approvals[i];
    }
    return null;
  }

  stageTitle(stageNo: number): string {
    if (stageNo === 1) return 'מנהל שירותי הרוקחות';
    if (stageNo === 2) return 'יו"ר ועדת התרופות של המוסד הרפואי, שמו וחתימתו';
    if (stageNo === 3) return 'מנהל או מוסמך מטעמו';
    return '';
  }

  decisionLabel(decision: string): string {
    if (decision === 'SIGNED') return 'נחתם';
    if (decision === 'RETURNED') return 'הוחזר';
    if (decision === 'REJECTED') return 'נדחה';
    return '';
  }

  foreignOn(): boolean {
    return this.foreignMark || this.westEurope || this.usa || this.canada || this.australia || this.japan;
  }

  private israelStatusForSave(): string {
    if (this.inBasket) return 'IN_BASKET_NOT_REGISTERED';
    if (this.offLabel) return 'OFF_LABEL';
    return '';
  }

  private countriesForSave(): F29Country[] {
    var list: F29Country[] = [];
    if (this.westEurope) list.push({ code: 'WESTERN_EUROPE', name: this.westEuropeName || '', region: 'WESTERN_EUROPE' });
    if (this.usa) list.push({ code: 'US', name: '', region: '' });
    if (this.canada) list.push({ code: 'CA', name: '', region: '' });
    if (this.australia) list.push({ code: 'AU', name: '', region: '' });
    if (this.japan) list.push({ code: 'JP', name: '', region: '' });
    if (this.inBasket && this.offLabel) list.push({ code: 'OFF_LABEL', name: '', region: '' });
    return list;
  }

  private restoreMarks(): void {
    this.inBasket = this.israelStatus === 'IN_BASKET_NOT_REGISTERED';
    this.offLabel = this.israelStatus === 'OFF_LABEL';
    this.westEurope = false;
    this.westEuropeName = '';
    this.usa = false;
    this.canada = false;
    this.australia = false;
    this.japan = false;
    var rows = this.countries || [];
    for (var i = 0; i < rows.length; i++) {
      var code = ((rows[i].code || '') + '').toUpperCase();
      var region = ((rows[i].region || '') + '').toUpperCase();
      if (code === 'OFF_LABEL') this.offLabel = true;
      else if (code === 'WESTERN_EUROPE' || region === 'WESTERN_EUROPE') {
        this.westEurope = true;
        this.westEuropeName = rows[i].name || '';
      } else if (code === 'US' || code === 'USA') this.usa = true;
      else if (code === 'CA' || code === 'CANADA') this.canada = true;
      else if (code === 'AU' || code === 'AUSTRALIA') this.australia = true;
      else if (code === 'JP' || code === 'JAPAN') this.japan = true;
    }
    this.foreignMark = this.foreignValue === 'true' || this.westEurope || this.usa || this.canada || this.australia || this.japan;
  }

  private payload(): object {
    return {
      requestId: this.requestId || 0,
      rowVer: this.rowVer || '',
      departmentId: this.departmentId || '',
      drugCode: this.drugCode || '',
      indication: this.indication || '',
      rationale: this.rationale || '',
      totalQty: this.totalQty === '' ? null : this.totalQty,
      qtyUnit: this.qtyUnit || '',
      israelStatus: this.israelStatusForSave(),
      foreignRegistered: this.foreignOn(),
      countries: this.countriesForSave(),
    };
  }

  private applyRow(row: F29Request): void {
    this.requestId = row.requestId;
    this.rowVer = row.rowVer || '';
    this.canEdit = !!row.canEdit;
    this.status = row.status || 'DRAFT';
    this.statusLabel = row.statusLabel || this.status;
    this.saved = true;
    this.versionNo = row.versionNo || 1;
    this.indication = row.indication || '';
    this.rationale = row.rationale || '';
    this.totalQty = row.totalQty || '';
    this.qtyUnit = row.qtyUnit || '';
    this.israelStatus = row.israelStatus || '';
    this.foreignValue = row.foreignRegistered === true ? 'true' : row.foreignRegistered === false ? 'false' : '';
    this.countries = row.countries || [];
    this.restoreMarks();
    this.files = row.files || [];
    this.approvals = row.approvals || [];
    this.stages = row.stages || this.stages;
    this.nextAction = row.nextAction || '';
    this.contentHash = row.contentHash || '';
    this.validity = row.validity || null;
    this.drugCode = row.drugCode || '';
    this.drugName = row.drugName || '';
    this.doseForm = row.doseForm || '';
    this.drugRoute = row.route || '';
    this.strength = row.strength || '';
    this.composition = row.composition || '';
    this.manufacturer = row.manufacturer || '';
    this.originCountry = row.originCountry || '';
    this.snapshotComplete = !!row.drugSnapshotComplete;
    this.loadReference(this.drugCode);
    if (!this.canEdit) {
      this.departmentId = row.departmentId || '';
      this.departmentName = row.departmentName || '';
      this.facilityId = row.facilityId || '';
      this.facilityName = row.facilityName || '';
    }
    this.fields = {};
    this.formError = '';
  }

  private reset(): void {
    this.rowVer = '';
    this.canEdit = true;
    this.status = 'DRAFT';
    this.statusLabel = 'טיוטה';
    this.saved = false;
    this.drugQuery = '';
    this.drugHits = [];
    this.drugCode = '';
    this.drugName = '';
    this.clearReference();
    this.doseForm = '';
    this.drugRoute = '';
    this.strength = '';
    this.composition = '';
    this.manufacturer = '';
    this.originCountry = '';
    this.snapshotComplete = false;
    this.indication = '';
    this.rationale = '';
    this.totalQty = '';
    this.qtyUnit = '';
    this.inBasket = false;
    this.offLabel = false;
    this.foreignMark = false;
    this.westEurope = false;
    this.westEuropeName = '';
    this.usa = false;
    this.canada = false;
    this.australia = false;
    this.japan = false;
    this.israelStatus = '';
    this.foreignValue = '';
    this.countries = [];
    this.files = [];
    this.approvals = [];
    this.contentHash = '';
    this.validity = null;
    this.versionNo = 1;
  }

  private fail(err: any): void {
    this.busy = false;
    this.loading = false;
    this.fields = (err && err.fields) || {};
    this.formError = (err && err.message) || 'אירעה שגיאה';
    this.snack.open(this.formError, 'סגירה', { duration: 4000 });
  }

  private failLoad(token: number, err: any): void {
    if (token !== this.token) return;
    this.loading = false;
    this.loadError = (err && err.message) || 'אירעה שגיאה';
  }

  private printHtml(): string {
    var e = (value: string) =>
      (value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    var mark = (on: boolean) => (on ? '[x]' : '[ ]');
    var signs = (this.stages || [])
      .map((stage) => {
        var approval = this.approvalFor(stage.stageNo);
        var who = approval ? e(approval.actorName) + ' · ' + e(approval.decidedAt) : 'לא נחתם';
        return '<div><strong>' + e(stage.name) + '</strong><br>' + who + '</div>';
      })
      .join('');
    return (
      '<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>טופס 2 — טיוטה</title><style>' +
      'body{font-family:Segoe UI,Arial,sans-serif;color:#111;margin:24px;background:#fff}h1{font-size:20px;margin:0}' +
      '.banner{border:2px solid #111;padding:8px;font-weight:700;margin:12px 0}.line{border-bottom:1px solid #111;min-height:22px;margin:4px 0 10px}' +
      '.sign{display:flex;gap:16px;margin-top:24px}.sign div{flex:1;border-top:1px solid #111;padding-top:6px;font-size:13px}' +
      '</style></head><body><p class="banner">טיוטה — לא מסמך מאושר</p><h1>טופס 2 · בקשה מוסדית לאישור שימוש בתכשיר</h1>' +
      '<p>שם המוסד הרפואי: ' + e(this.facilityName || '') + '</p><p>מחלקה: ' + e(this.departmentName) + '</p>' +
      '<p>שם התכשיר, צורתו ודרך המתן: ' + e(this.drugName) + ' · ' + e(this.doseForm) + ' · ' + e(this.drugRoute) + '</p>' +
      '<p>הרכב (חומרים פעילים כמות/ריכוז): ' + e(this.composition) + '</p>' +
      '<p>שם היצרן וארץ הייצור: ' + e(this.manufacturer) + ' · ' + e(this.originCountry) + '</p>' +
      '<p>שם התוויה המבוקשת: ' + e(this.indication) + '</p><p>הנימוקים: ' + e(this.rationale) + '</p>' +
      '<p>כמות כוללת דרושה (לשנה): ' + e(this.totalQty) + ' ' + e(this.qtyUnit) + '</p>' +
      '<h2>אני הח"מ מצהיר בזה כי:</h2><p>' + this.declarationLines.map(function (line) { return e(line); }).join('<br>') + '</p>' +
      '<h2>נא לסמן את המתאים:</h2>' +
      '<p>' + mark(this.inBasket) + ' התכשיר כלול בסל שירותי הבריאות שלפי חוק בריאות ממלכתי, אך אינו רשום בפנקס התכשירים הרפואיים בישראל.</p>' +
      '<p>' + mark(this.offLabel) + ' התכשיר רשום בפנקס התכשירים הרפואיים בישראל אך לא להתוויה המבוקשת. <span dir="ltr">Off Label</span></p>' +
      '<p>' + mark(this.foreignOn()) + ' התכשיר רשום במשרד הבריאות של אחת הארצות המוכרות המפורטות להלן ומקובל בה להתוויה המבוקשת:</p>' +
      '<p>' + mark(this.westEurope) + ' מערב אירופה (שם הארץ: ' + e(this.westEuropeName) + ') &nbsp; ' +
      mark(this.usa) + ' ארה"ב &nbsp; ' + mark(this.canada) + ' קנדה &nbsp; ' + mark(this.australia) + ' אוסטרליה &nbsp; ' + mark(this.japan) + ' יפן</p>' +
      '<p>גרסת נוסח: ' + e(this.templateVersion()) + '</p><div class="sign">' + signs + '</div>' +
      '<p class="banner">טיוטה — לא מסמך מאושר. אין כאן חתימה מוסדית.</p></body></html>'
    );
  }

  declarationText(): string {
    if (this.context && this.context.declarationText) return this.context.declarationText;
    return 'נוסח להשלמה ואישור הרוקחות';
  }

  templateVersion(): string {
    return (this.context && this.context.templateVersion) || 'REVIEW-UNAPPROVED';
  }

  signingReason(): string {
    return (this.context && this.context.signingBlockedReason) || 'חתימה חיה מושבתת עד לאישור מוסדי.';
  }

  loadReference(code: string): void {
    if (!code) {
      this.clearReference();
      return;
    }
    this.form29.getDrug(code).subscribe(
      (hit) => this.applyReference(hit),
      () => {}
    );
  }

  applyReference(hit: F29DrugHit): void {
    this.drugNameEn = (hit && hit.drugNameEn) || '';
    this.registrationHolder = (hit && hit.registrationHolder) || '';
    this.registeredIndications = (hit && hit.registeredIndications) || '';
    this.healthBasket = (hit && hit.healthBasket) || '';
    this.registrationDate = (hit && hit.registrationDate) || '';
    this.veterinaryUse = (hit && hit.veterinaryUse) || '';
    this.duplicateCount = (hit && hit.duplicateCount) || 0;
  }

  clearReference(): void {
    this.drugNameEn = '';
    this.registrationHolder = '';
    this.registeredIndications = '';
    this.healthBasket = '';
    this.registrationDate = '';
    this.veterinaryUse = '';
    this.duplicateCount = 0;
  }
}
