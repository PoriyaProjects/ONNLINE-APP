import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Form29Service } from '../form29.service';

@Component({
  selector: 'app-form29-form3',
  templateUrl: './form29-form3.component.html',
  styleUrls: ['./form29-form3.component.scss'],
})
export class Form29Form3Component implements OnInit {
  // Section numbers under the title are small on the photograph and still need a visual check.
  readonly title = 'טופס הוראת רופא לשימוש בתכשיר שאינו רשום במוסד רפואי – למטופל פרטני';
  readonly referenceNote = 'לצרף האסמכתאות הרפואיות (ספרות, מאמרים וכיו"ב)';
  readonly declarationLines = [
    'הטיפול בתכשיר הוא חיוני ולא קיים תכשיר חלופי מתאים הרשום ומשווק בישראל לאותה מטרה, או שהתכשיר החלופי המשווק אינו מתאים למטופל/לטיפול (ככל שנדרש לפי ההוראה הנוגעת לעניין בהודעה).',
    'התועלת בשימוש בתכשיר עולה על הסיכון הכרוך בו.',
    'הסברתי למטופל את משמעות הטיפול בתכשיר/התוויה שאינה רשומה (לפי העניין), והוא נתן, בכתב, מרצונו החופשי, את הסכמתו מדעת לטיפול.',
    'ההוראה לשימוש בתכשיר הנ"ל ולהתוויה המבוקשת היא באחריותי הרפואית.',
  ];
  readonly footerLines = [
    'תוקף האישור לא יעלה על 6 חודשים.',
    'מגיש האישור יזין את הטופס במערכת המקוונת לתכשירי 29 (בכפוף לאישור הוועדה להסכמת המנהל)',
    'אישור זה אינו אישור לשחרור התכשיר מהמכס',
  ];
  readonly stages = [
    { stageNo: 1, title: 'מנהל שירותי הרוקחות' },
    { stageNo: 2, title: 'יושב ראש ועדת התרופות' },
    { stageNo: 3, title: 'מנהל או מוסמך מטעמו' },
  ];

  loading = false;
  busy = false;
  loadError = '';
  formError = '';
  fields: any = {};
  requestId = 0;
  rowVer = '';
  status = 'DRAFT';
  statusLabel = 'טיוטה';
  canEdit = true;
  versionNo = 1;
  facilityName = '';
  departmentName = '';
  employeeName = '';
  idQuery = '';
  patientId = '';
  patientName = '';
  patientNumber = '';
  ageValue = '';
  sex = '';
  verified = false;
  drugQuery = '';
  drugHits: any[] = [];
  drugCode = '';
  drugName = '';
  doseForm = '';
  drugRoute = '';
  composition = '';
  manufacturer = '';
  originCountry = '';
  registeredIndications = '';
  indication = '';
  rationale = '';
  dose = '';
  doseUnit = '';
  dosesPerDay = '';
  scheduleText = '';
  duration = '';
  durationUnit = 'DAYS';
  totalQty = '';
  qtyUnit = '';
  calcNote = '';
  notRegistered = false;
  offLabel = false;
  foreignMark = false;
  westEurope = false;
  westEuropeName = '';
  usa = false;
  canada = false;
  australia = false;
  japan = false;
  otherCountry = false;
  otherCountryName = '';
  licenseNo = '';
  specialty = '';
  phone = '';
  consentDeclared = false;
  doctorName = '';
  files: any[] = [];
  approvals: any[] = [];
  canSign = false;
  currentStage = 0;
  nextAction = '';
  signerName = '';
  decideReason = '';
  ink = false;
  private drawing = false;
  private lastX = 0;
  private lastY = 0;
  @ViewChild('pad') pad: ElementRef<HTMLCanvasElement>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private form29: Form29Service,
    private snack: MatSnackBar,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      var id = params.get('requestId');
      this.open(!id || id === 'new' ? 0 : +id);
    });
  }

  open(id: number): void {
    this.loading = true;
    this.loadError = '';
    this.requestId = id || 0;
    this.form29.context().subscribe(
      (ctx) => {
        this.employeeName = (ctx && ctx.employeeName) || '';
        this.facilityName = (ctx && ctx.facilityName) || '';
        this.departmentName = (ctx && ctx.departmentName) || '';
        if (!this.doctorName) this.doctorName = this.employeeName;
        if (!this.signerName) this.signerName = this.employeeName;
        if (!this.requestId) {
          this.loading = false;
          setTimeout(() => this.sizePad(), 0);
          return;
        }
        this.form29.get3(this.requestId).subscribe(
          (row) => {
            this.apply(row);
            this.loading = false;
          },
          (err) => this.failLoad(err)
        );
      },
      (err) => this.failLoad(err)
    );
  }

  lookup(): void {
    this.busy = true;
    this.form29.lookupPatient(this.idQuery).subscribe(
      (row) => {
        this.busy = false;
        this.patientId = row.patientId || '';
        this.patientName = row.patientName || '';
        this.patientNumber = row.patientNumber || '';
        this.ageValue = row.ageValue ? String(row.ageValue) : '';
        this.sex = row.sex || '';
        this.verified = !!row.verified;
        this.snack.open('המטופל אומת', 'סגירה', { duration: 2000 });
      },
      (err) => this.fail(err)
    );
  }

  searchDrugs(): void {
    if ((this.drugQuery || '').trim().length < 2) return;
    this.form29.searchDrugs(this.drugQuery).subscribe(
      (hits) => { this.drugHits = hits || []; },
      (err) => this.fail(err)
    );
  }

  chooseDrug(hit: any): void {
    this.drugCode = hit.drugCode || '';
    this.drugName = hit.drugNameHe || hit.drugName || '';
    this.doseForm = hit.doseForm || '';
    this.drugRoute = hit.route || '';
    this.composition = hit.composition || '';
    this.manufacturer = hit.manufacturer || '';
    this.originCountry = hit.originCountry || '';
    this.registeredIndications = hit.registeredIndications || '';
    this.drugHits = [];
    this.form29.getDrug(this.drugCode).subscribe(
      (row) => {
        this.registeredIndications = (row && row.registeredIndications) || this.registeredIndications;
        if (!this.originCountry) this.originCountry = (row && row.originCountry) || '';
      },
      () => {}
    );
  }

  suggestQty(): void {
    this.calcNote = '';
    if ((this.scheduleText || '').trim()) {
      this.calcNote = 'מינון משתנה או לפי הצורך דורש בדיקת רוקחות. יש למלא את הכמות ידנית.';
      return;
    }
    var dose = this.num(this.dose);
    var perDay = this.num(this.dosesPerDay);
    var days = this.durationDays();
    if (!dose || !perDay || !days || this.doseUnit !== this.qtyUnit) {
      this.calcNote = 'אין חישוב אוטומטי כשהיחידות או לוח הזמנים אינם קבועים. יש למלא את הכמות ידנית.';
      return;
    }
    if (days > 186) {
      this.calcNote = 'תוקף האישור לא יעלה על 6 חודשים.';
      return;
    }
    this.totalQty = String(Math.round(dose * perDay * days * 1000) / 1000);
    this.calcNote = 'חישוב ללוח זמנים קבוע: ' + this.totalQty + ' ' + (this.qtyUnit || '');
  }

  save(): void {
    if (!this.canEdit || this.busy) return;
    this.busy = true;
    this.form29.saveDraft3(this.payload()).subscribe(
      (row) => {
        this.busy = false;
        this.apply(row);
        this.snack.open('הטיוטה נשמרה', 'סגירה', { duration: 2500 });
        if (this.requestId) this.router.navigate(['/form29/patient', this.requestId], { replaceUrl: true });
      },
      (err) => this.fail(err)
    );
  }

  submit(): void {
    if (this.busy) return;
    var png = this.exportPad();
    if (!png) {
      this.formError = 'יש לצייר את חתימת הרופא';
      return;
    }
    this.busy = true;
    var body = this.payload();
    body.signaturePng = png;
    body.doctorName = this.doctorName;
    this.form29.submit3(body).subscribe(
      (row) => {
        this.busy = false;
        this.apply(row);
        this.snack.open('הבקשה הוגשה', 'סגירה', { duration: 2500 });
      },
      (err) => this.fail(err)
    );
  }

  onFile(event: any): void {
    var file = event.target.files && event.target.files[0];
    if (!file || !this.requestId) return;
    var reader = new FileReader();
    reader.onload = () => {
      var text = String(reader.result || '');
      var marker = text.indexOf(',');
      this.form29.addFile(this.requestId, file.name, marker >= 0 ? text.substring(marker + 1) : text).subscribe(
        () => this.open(this.requestId),
        (err) => this.fail(err)
      );
    };
    reader.readAsDataURL(file);
  }

  sign(decision: string): void {
    if (!this.canSign || this.busy) return;
    var png = decision === 'SIGNED' ? this.exportPad() : '';
    if (decision === 'SIGNED' && !png) {
      this.formError = 'יש לצייר חתימה';
      return;
    }
    this.busy = true;
    this.form29.decide3(this.requestId, this.currentStage, decision, this.decideReason, this.rowVer, this.signerName, png).subscribe(
      (row) => {
        this.busy = false;
        this.apply(row);
        this.snack.open('ההחלטה נשמרה', 'סגירה', { duration: 2500 });
      },
      (err) => this.fail(err)
    );
  }

  approval(stageNo: number): any {
    return (this.approvals || []).filter((row) => +row.stageNo === stageNo)[0];
  }

  signedImage(stageNo: number): string {
    var row = this.approval(stageNo);
    return row && row.signatureImage ? row.signatureImage : '';
  }

  signatureSrc(row: any): SafeUrl {
    return this.sanitizer.bypassSecurityTrustUrl('data:image/png;base64,' + ((row && row.signatureImage) || ''));
  }

  show(name: string): string {
    return (this.fields && this.fields[name]) || '';
  }

  print(): void {
    var win = window.open('', '_blank');
    if (!win) return;
    win.document.open();
    win.document.write(this.printHtml());
    win.document.close();
  }

  penDown(event: PointerEvent): void {
    var canvas = this.pad && this.pad.nativeElement;
    if (!canvas) return;
    canvas.setPointerCapture(event.pointerId);
    var point = this.point(event, canvas);
    this.drawing = true;
    this.lastX = point.x;
    this.lastY = point.y;
  }

  penMove(event: PointerEvent): void {
    if (!this.drawing) return;
    var canvas = this.pad.nativeElement;
    var point = this.point(event, canvas);
    var ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1d2b43';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.lastX, this.lastY);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    this.lastX = point.x;
    this.lastY = point.y;
    this.ink = true;
  }

  penUp(event: PointerEvent): void {
    this.drawing = false;
  }

  clearPad(): void {
    this.sizePad();
  }

  private apply(row: any): void {
    this.requestId = +row.requestId || this.requestId;
    this.rowVer = row.rowVer || '';
    this.status = row.status || 'DRAFT';
    this.statusLabel = row.statusLabel || this.status;
    this.canEdit = !!row.canEdit;
    this.versionNo = row.versionNo || 1;
    this.facilityName = row.facilityName || this.facilityName;
    this.departmentName = row.departmentName || this.departmentName;
    this.patientId = row.patientId || '';
    this.patientName = row.patientName || '';
    this.patientNumber = row.patientNumber || '';
    this.ageValue = row.ageValue || '';
    this.sex = row.sex || '';
    this.verified = !!this.patientId;
    this.drugCode = row.drugCode || '';
    this.drugName = row.drugName || '';
    this.doseForm = row.doseForm || '';
    this.drugRoute = row.route || '';
    this.composition = row.composition || '';
    this.manufacturer = row.manufacturer || '';
    this.originCountry = row.originCountry || '';
    this.indication = row.indication || '';
    this.rationale = row.rationale || '';
    this.dose = row.dose || '';
    this.doseUnit = row.doseUnit || '';
    this.dosesPerDay = row.dosesPerDay || '';
    this.scheduleText = row.scheduleText || '';
    this.duration = row.duration || '';
    this.durationUnit = row.durationUnit || 'DAYS';
    this.totalQty = row.totalQty || '';
    this.qtyUnit = row.qtyUnit || '';
    this.licenseNo = row.licenseNo || '';
    this.specialty = row.specialty || '';
    this.phone = row.phone || '';
    this.consentDeclared = !!row.consentDeclared;
    this.doctorName = row.doctorName || this.employeeName;
    this.files = row.files || [];
    this.approvals = row.approvals || [];
    this.canSign = !!row.canSign;
    this.currentStage = row.currentStage || 0;
    this.nextAction = row.nextAction || '';
    this.restoreMarks(row);
    this.fields = {};
    this.formError = '';
    if (this.canEdit || this.canSign) setTimeout(() => this.sizePad(), 0);
  }

  private restoreMarks(row: any): void {
    var status = row.israelStatus || '';
    var countries = [];
    try { countries = row.countriesJson ? JSON.parse(row.countriesJson) : []; } catch (e) { countries = []; }
    var has = (code: string) => countries.some((item) => item && item.code === code);
    this.notRegistered = status === 'NOT_REGISTERED' || has('NOT_REGISTERED');
    this.offLabel = status === 'OFF_LABEL';
    this.westEurope = has('WESTERN_EUROPE');
    this.westEuropeName = (countries.filter((item) => item && item.code === 'WESTERN_EUROPE')[0] || {}).name || '';
    this.usa = has('US');
    this.canada = has('CA');
    this.australia = has('AU');
    this.japan = has('JP');
    this.otherCountry = has('OTHER');
    this.otherCountryName = (countries.filter((item) => item && item.code === 'OTHER')[0] || {}).name || '';
    this.foreignMark = !!row.foreignRegistered;
  }

  private payload(): any {
    return {
      requestId: this.requestId || 0,
      rowVer: this.rowVer,
      patientId: this.patientId,
      patientName: this.patientName,
      patientNumber: this.patientNumber,
      ageValue: this.ageValue,
      ageUnit: 'YEARS',
      sex: this.sex,
      drugCode: this.drugCode,
      originCountry: this.originCountry,
      indication: this.indication,
      rationale: this.rationale,
      dose: this.dose,
      doseUnit: this.doseUnit,
      dosesPerDay: this.dosesPerDay,
      scheduleText: this.scheduleText,
      duration: this.duration,
      durationUnit: this.durationUnit,
      totalQty: this.totalQty,
      qtyUnit: this.qtyUnit,
      notRegistered: this.notRegistered,
      offLabel: this.offLabel,
      foreignMark: this.foreignMark,
      westEurope: this.westEurope,
      westEuropeName: this.westEuropeName,
      usa: this.usa,
      canada: this.canada,
      australia: this.australia,
      japan: this.japan,
      otherCountry: this.otherCountry,
      otherCountryName: this.otherCountryName,
      licenseNo: this.licenseNo,
      specialty: this.specialty,
      phone: this.phone,
      consentDeclared: this.consentDeclared,
      doctorName: this.doctorName,
    };
  }

  private durationDays(): number {
    var value = this.num(this.duration);
    if (!value) return 0;
    return this.durationUnit === 'MONTHS' ? value * 30 : value;
  }

  private num(value: string): number {
    var parsed = parseFloat(value);
    return isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  private exportPad(): string {
    if (!this.ink || !this.pad) return '';
    return this.pad.nativeElement.toDataURL('image/png');
  }

  private sizePad(): void {
    var canvas = this.pad && this.pad.nativeElement;
    if (!canvas) return;
    var ratio = window.devicePixelRatio || 1;
    var width = canvas.clientWidth || 640;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(160 * ratio);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, 160);
    this.ink = false;
  }

  private point(event: PointerEvent, canvas: HTMLCanvasElement): { x: number; y: number } {
    var rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private fail(err: any): void {
    this.busy = false;
    this.loading = false;
    this.fields = (err && err.fields) || {};
    this.formError = (err && err.message) || 'אירעה שגיאה';
    this.snack.open(this.formError, 'סגירה', { duration: 4000 });
  }

  private failLoad(err: any): void {
    this.loading = false;
    this.loadError = (err && err.message) || 'אירעה שגיאה';
  }

  private printHtml(): string {
    var e = (value: string) => (value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    var box = (on: boolean) => (on ? '[x]' : '[ ]');
    var doctor = this.approval(0);
    var signs = this.stages.map((stage) => {
      var row = this.approval(stage.stageNo);
      var signed = row && row.decision === 'SIGNED';
      var image = signed && row.signatureImage ? '<img alt="חתימה" src="data:image/png;base64,' + row.signatureImage + '"/>' : '<div class="blank"></div>';
      return '<div class="sign-box"><strong>' + e(stage.title) + '</strong><p>שם המאשר וחתימתו: ' + (signed ? e(row.actorName) : '') + '</p>' + image + '<p>תאריך: ' + (signed ? e(row.decidedOn) : '') + '</p></div>';
    }).join('');
    var doctorImage = doctor && doctor.signatureImage ? '<img alt="חתימת הרופא" src="data:image/png;base64,' + doctor.signatureImage + '"/>' : '<div class="blank"></div>';
    var approved = this.stages.every((stage) => {
      var row = this.approval(stage.stageNo);
      return row && row.decision === 'SIGNED';
    }) && doctor && doctor.decision === 'SIGNED';
    return '<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>טופס 3</title><style>' +
      'body{font-family:Segoe UI,Arial,sans-serif;color:#111;margin:16px}h1{font-size:20px}.banner{border:2px solid #111;padding:8px;font-weight:700}' +
      '.sign{display:table;width:100%}.sign-box{display:table-cell;width:33%;border:1px solid #111;padding:8px;vertical-align:top}.blank{height:60px;border-bottom:1px solid #111}img{max-width:100%;max-height:90px}' +
      '</style></head><body><h1>טופס 3</h1><p>' + e(this.title) + '</p><p>(סעיפים 3(ב)(2)(א)-1(ב), 3(ד)(4) ו-10(ב)(2)(א))</p>' +
      (approved ? '' : '<p class="banner">טיוטה — אינו אישור</p>') +
      '<p>שם המטופל: ' + e(this.patientName) + ' · מספר זהות: ' + e(this.patientId) + ' · גיל: ' + e(this.ageValue) + ' · מין: ' + e(this.sex) + '</p>' +
      '<p>שם המוסד הרפואי: ' + e(this.facilityName) + ' · מחלקה: ' + e(this.departmentName) + '</p>' +
      '<p>שם התכשיר, צורתו ודרך המתן: ' + e(this.drugName) + ' · ' + e(this.doseForm) + ' · ' + e(this.drugRoute) + '</p>' +
      '<p>הרכב (חומרים פעילים כמות/ריכוז): ' + e(this.composition) + '</p>' +
      '<p>שם היצרן וארץ הייצור: ' + e(this.manufacturer) + ' · ' + e(this.originCountry) + '</p>' +
      '<p>ההתוויה המבוקשת: ' + e(this.indication) + '</p><p>הנימוקים לכך: ' + e(this.rationale) + '</p>' +
      '<p>' + e(this.referenceNote) + '</p>' +
      '<p>מנה: ' + e(this.dose) + ' ' + e(this.doseUnit) + ' · משך הטיפול: ' + e(this.duration) + ' ' + e(this.durationUnit) + '</p>' +
      '<p>תדירות מתן התכשיר: ' + e(this.dosesPerDay) + ' · ' + e(this.scheduleText) + '</p>' +
      '<p>כמות כוללת דרושה (שלא תעלה על כמות צריכה ל- 6 חודשים): ' + e(this.totalQty) + ' ' + e(this.qtyUnit) + '</p>' +
      '<h2>הצהרת הרופא: אני הח"מ מצהיר ומתחייב כדלקמן:</h2>' +
      this.declarationLines.map((line) => '<p>' + e(line) + '</p>').join('') +
      '<p>כמו כן, אני מצהיר ומתחייב כדלקמן (סמן את המתאים):</p>' +
      '<p>' + box(this.notRegistered) + ' התכשיר אינו רשום בפנקס התכשירים הרפואיים בישראל.</p>' +
      '<p>' + box(this.offLabel) + ' התכשיר רשום בפנקס התכשירים הרפואיים בישראל אך לא להתוויה המבוקשת <span dir="ltr">(Off Label)</span>.</p>' +
      '<p>' + box(this.foreignMark) + ' התכשיר רשום במשרד הבריאות של אחת מהמדינות המוכרות המפורטות להלן ומקובל בה להתוויה המבוקשת:</p>' +
      '<p>' + box(this.westEurope) + ' מערב אירופה (שם הארץ): ' + e(this.westEuropeName) + ' ' + box(this.usa) + ' ארה"ב ' + box(this.canada) + ' קנדה ' + box(this.australia) + ' אוסטרליה ' + box(this.japan) + ' יפן</p>' +
      '<p>' + box(this.otherCountry) + ' אחר, שם הארץ: ' + e(this.otherCountryName) + '</p>' +
      '<p>שם הרופא: ' + e(this.doctorName) + ' · מספר רישיון: ' + e(this.licenseNo) + ' · התמחות הרופא: ' + e(this.specialty) + '</p>' +
      '<p>מספר טלפון לבירורים: ' + e(this.phone) + '</p><p>חתימת הרופא:</p>' + doctorImage +
      '<p>תאריך: ' + (doctor ? e(doctor.decidedOn) : '') + '</p><h2>אישורי המוסד הרפואי:</h2><div class="sign">' + signs + '</div>' +
      this.footerLines.map((line) => '<p>' + e(line) + '</p>').join('') +
      '<p>ארכוב לתיק המטופל ודיווח חיצוני: ממתין. לא דווח כהושלם.</p></body></html>';
  }
}
