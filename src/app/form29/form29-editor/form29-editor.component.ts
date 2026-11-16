import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
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
  stages: F29Stage[] = [
    { stageNo: 1, name: 'מנהל שירותי הרוקחות' },
    { stageNo: 2, name: 'יו"ר ועדת התרופות של המוסד הרפואי' },
    { stageNo: 3, name: 'מנהל המוסד או מוסמך מטעמו' },
  ];
  nextAction = '';
  contentHash = '';
  validity: { validFrom: string; validUntil: string } = null;
  versionNo = 1;
  signerName = '';
  nameConfirmed = false;
  decideReason = '';
  canSign = false;
  currentStage = 0;
  signingBlockedReason = '';
  ink = false;
  private drawing = false;
  private padSized = false;
  private lastX = 0;
  private lastY = 0;
  private token = 0;
  @ViewChild('pad') pad: ElementRef<HTMLCanvasElement>;

  readonly declarationLines = [
    'התכשיר חיוני ולא קיים תכשיר חלופי מתאים הרשום ומשווק בישראל לאותה מטרה.',
    'התועלת בשימוש בתכשיר עולה על הסיכון הכרוך בו.',
    'ההוראה לשימוש בתכשיר הנ"ל ולהתוויה המבוקשת היא של הרופא המטפל ובאחריותו הרפואית.',
  ];

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
        if (!this.signerName) this.signerName = ctx.employeeName || '';
        this.departmentId = ctx.departmentId || '';
        this.departmentName = ctx.departmentName || '';
        if (!this.requestId) {
          this.loading = false;
          this.canEdit = true;
          this.nextAction = 'אפשר לשמור טיוטה. ההגשה תיבדק מול הקטלוג.';
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
    var popup = window.open('', '_blank', 'width=860,height=900');
    if (!popup) {
      this.formError = 'הדפדפן חסם את חלון התצוגה המקדימה';
      return;
    }
    popup.document.write(this.printHtml());
    popup.document.close();
    var startPrint = function () {
      popup.focus();
      popup.print();
    };
    if (popup.document.readyState === 'complete') setTimeout(startPrint, 200);
    else popup.onload = startPrint;
  }

  exportPdf(): void {
    if (this.busy) return;
    this.busy = true;
    var frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.position = 'fixed';
    frame.style.left = '-10000px';
    frame.style.top = '0';
    frame.style.width = '794px';
    frame.style.height = '1123px';
    frame.style.border = '0';
    document.body.appendChild(frame);
    var doc = frame.contentDocument;
    var self = this;
    var finish = function (message: string) {
      self.busy = false;
      if (frame.parentNode) frame.parentNode.removeChild(frame);
      if (message) self.formError = message;
    };
    if (!doc) {
      finish('לא ניתן לייצא את ה-PDF');
      return;
    }
    doc.open();
    doc.write(this.printHtml());
    doc.close();
    setTimeout(function () {
      var body = doc.body;
      if (!body) {
        finish('לא ניתן לייצא את ה-PDF');
        return;
      }
      body.style.boxSizing = 'border-box';
      body.style.width = '794px';
      body.style.padding = '12mm';
      var stack = doc.createElement('style');
      stack.textContent = '.sign{display:block}.sign-box{display:block;width:auto;margin:0 0 10px}';
      doc.head.appendChild(stack);
      frame.style.height = body.scrollHeight + 40 + 'px';
      var nodes = [].slice.call(body.querySelectorAll('h1, h2, p, .sign-box'));
      var pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      var pageWidth = pdf.internal.pageSize.getWidth();
      var pageHeight = pdf.internal.pageSize.getHeight();
      var margin = 10;
      var maxW = pageWidth - margin * 2;
      var limit = pageHeight - margin;
      var y = margin;
      var index = 0;
      var paint = function () {
        if (index >= nodes.length) {
          pdf.save('טופס-2-' + (self.requestId || 'טיוטה') + '.pdf');
          finish('');
          self.snack.open('הקובץ ירד למחשב', 'סגירה', { duration: 2500 });
          return;
        }
        var node = nodes[index++];
        html2canvas(node, { scale: 2, backgroundColor: '#ffffff' }).then(function (canvas) {
          if (!canvas.width || !canvas.height) {
            paint();
            return;
          }
          var h = (canvas.height * maxW) / canvas.width;
          if (h <= limit - margin && y + h > limit) {
            pdf.addPage();
            y = margin;
          }
          if (h > limit - margin) {
            if (y > margin) pdf.addPage();
            y = self.paintTall(pdf, canvas, maxW, pageHeight, margin);
          } else {
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', margin, y, maxW, h);
            y += h + 2;
          }
          paint();
        }).catch(function () {
          finish('לא ניתן לייצא את ה-PDF');
        });
      };
      paint();
    }, 250);
  }

  private paintTall(pdf: jsPDF, source: HTMLCanvasElement, maxW: number, pageHeight: number, margin: number): number {
    var pagePx = Math.floor((pageHeight - margin * 2) * (source.width / maxW));
    var ctx = source.getContext('2d');
    var yPx = 0;
    var first = true;
    var lastMm = margin;
    while (yPx < source.height - 1) {
      var ideal = Math.min(source.height, yPx + pagePx);
      var cut = ideal;
      if (ctx && ideal < source.height) {
        for (var row = ideal - 2; row > yPx + 24; row--) {
          if (this.rowBlank(ctx, source.width, row)) {
            cut = row;
            break;
          }
        }
      }
      if (cut <= yPx) cut = ideal;
      var sliceH = cut - yPx;
      var slice = document.createElement('canvas');
      slice.width = source.width;
      slice.height = sliceH;
      var sliceCtx = slice.getContext('2d');
      sliceCtx.fillStyle = '#ffffff';
      sliceCtx.fillRect(0, 0, slice.width, slice.height);
      sliceCtx.drawImage(source, 0, yPx, source.width, sliceH, 0, 0, source.width, sliceH);
      if (!first) pdf.addPage();
      first = false;
      lastMm = (sliceH * maxW) / source.width;
      pdf.addImage(slice.toDataURL('image/jpeg', 0.95), 'JPEG', margin, margin, maxW, lastMm);
      yPx = cut;
    }
    return margin + lastMm + 2;
  }

  private rowBlank(ctx: CanvasRenderingContext2D, width: number, row: number): boolean {
    var data = ctx.getImageData(0, row, width, 1).data;
    var ink = 0;
    var samples = 0;
    for (var i = 0; i < data.length; i += 16) {
      samples++;
      if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) ink++;
    }
    return samples > 0 && ink / samples < 0.02;
  }

  canAct(stageNo: number): boolean {
    return this.status === 'PENDING' && this.canSign && this.currentStage === stageNo;
  }

  signClass(stageNo: number): string {
    var approval = this.approvalFor(stageNo);
    if (approval && approval.decision === 'SIGNED') return 'f29-sign-signed';
    if (approval && approval.decision === 'RETURNED') return 'f29-sign-returned';
    if (approval && approval.decision === 'REJECTED') return 'f29-sign-rejected';
    if (this.canAct(stageNo)) return 'f29-sign-current';
    return 'f29-sign-waiting';
  }

  sign(): void {
    if (!this.nameConfirmed) {
      this.formError = 'יש לאשר את שם המאשר';
      return;
    }
    if (!this.ink) {
      this.formError = 'יש לצייר חתימה לפני האישור';
      return;
    }
    var canvas = this.pad && this.pad.nativeElement;
    if (!canvas) return;
    this.act('SIGNED', canvas.toDataURL('image/png'));
  }

  sendBack(): void {
    if (!(this.decideReason || '').trim()) {
      this.formError = 'להחזרה נדרש נימוק';
      return;
    }
    this.act('RETURNED', '');
  }

  rejectRequest(): void {
    if (!(this.decideReason || '').trim()) {
      this.formError = 'לדחייה נדרש נימוק';
      return;
    }
    this.act('REJECTED', '');
  }

  signatureSrc(approval: F29Approval): SafeUrl | string {
    var raw = (approval && approval.signatureImage) || '';
    if (!/^[A-Za-z0-9+/=]+$/.test(raw)) return '';
    return this.sanitizer.bypassSecurityTrustUrl('data:image/png;base64,' + raw);
  }

  penDown(event: PointerEvent): void {
    var canvas = this.pad && this.pad.nativeElement;
    if (!canvas) return;
    if (!this.padSized) this.sizePad();
    canvas.setPointerCapture(event.pointerId);
    this.drawing = true;
    var point = this.penPoint(event, canvas);
    this.lastX = point.x;
    this.lastY = point.y;
  }

  penMove(event: PointerEvent): void {
    if (!this.drawing) return;
    var canvas = this.pad && this.pad.nativeElement;
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var point = this.penPoint(event, canvas);
    ctx.strokeStyle = '#1d2b43';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
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
    var canvas = this.pad && this.pad.nativeElement;
    if (canvas && canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  }

  clearPad(): void {
    this.sizePad();
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
    if (stageNo === 2) return 'יו"ר ועדת התרופות של המוסד הרפואי';
    if (stageNo === 3) return 'מנהל המוסד או מוסמך מטעמו';
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
    this.canSign = !!row.canSign;
    this.currentStage = row.currentStage || 0;
    this.signingBlockedReason = row.signingBlockedReason || '';
    this.ink = false;
    this.padSized = false;
    this.nameConfirmed = false;
    this.decideReason = '';
    if (this.canSign) setTimeout(() => this.sizePad(), 0);
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
    this.canSign = false;
    this.currentStage = 0;
    this.signingBlockedReason = '';
    this.ink = false;
    this.padSized = false;
    this.nameConfirmed = false;
    this.decideReason = '';
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

  private flowParts(label: string, value: string): string {
    var esc = function (raw: string) {
      return (raw || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };
    var text = value || '';
    if (!text) return '<p class="flow">' + esc(label) + '</p>';
    var html = '';
    var first = true;
    while (text.length) {
      var take = text;
      if (text.length > 280) {
        var cut = text.lastIndexOf(' ', 280);
        if (cut < 60) cut = 280;
        take = text.substring(0, cut);
        text = text.substring(cut).replace(/^\s+/, '');
      } else {
        text = '';
      }
      html += '<p class="flow">' + (first ? esc(label) : '') + esc(take) + '</p>';
      first = false;
    }
    return html;
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
        var signed = approval && approval.decision === 'SIGNED';
        var image = signed ? this.safePng(approval.signatureImage) : '';
        var drawn = image
          ? '<img alt="חתימה" src="data:image/png;base64,' + image + '"/>'
          : '<div class="blank"></div>';
        var name = signed ? e(approval.actorName) : '';
        var date = signed ? e(approval.decidedOn || '') : '';
        return '<div class="sign-box"><strong>' + e(this.stageTitle(stage.stageNo)) + '</strong>'
          + '<p>שם המאשר: ' + name + '</p><p>חתימה:</p>' + drawn
          + '<p>תאריך: ' + date + '</p></div>';
      })
      .join('');
    return (
      '<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>טופס 2 — טיוטה</title><style>' +
      '@page{size:A4;margin:16mm}html,body{height:auto;overflow:visible}' +
      'body{font-family:Segoe UI,Arial,sans-serif;color:#111;margin:0;background:#fff}' +
      'h1{font-size:20px;margin:0}h1,h2,.banner,.keep,.sign,.sign-box{break-inside:avoid;page-break-inside:avoid}' +
      '.flow{break-inside:auto;page-break-inside:auto;overflow:visible;overflow-wrap:break-word}' +
      '.banner{border:2px solid #111;padding:8px;font-weight:700;margin:12px 0}' +
      '.sign{display:table;width:100%;border-collapse:separate;border-spacing:12px 0;margin-top:24px}' +
      '.sign-box{display:table-cell;width:33%;vertical-align:top;border:1px solid #111;padding:8px;font-size:13px;overflow:visible}' +
      '.sign-box img{display:block;max-width:100%;height:auto;max-height:120px}.blank{height:70px;border-bottom:1px solid #111}' +
      '</style></head><body><h1>טופס 2 · בקשה מוסדית לאישור שימוש בתכשיר</h1>' +
      '<p class="keep">שם המוסד הרפואי: ' + e(this.facilityName || '') + '</p><p class="keep">מחלקה: ' + e(this.departmentName) + '</p>' +
      '<p class="keep">שם התכשיר, צורתו ודרך המתן: ' + e(this.drugName) + ' · ' + e(this.doseForm) + ' · ' + e(this.drugRoute) + '</p>' +
      this.flowParts('הרכב (חומרים פעילים כמות/ריכוז): ', this.composition) +
      '<p class="keep">שם היצרן וארץ הייצור: ' + e(this.manufacturer) + ' · ' + e(this.originCountry) + '</p>' +
      this.flowParts('שם התוויה המבוקשת: ', this.indication) +
      this.flowParts('הנימוקים: ', this.rationale) +
      '<p class="keep">כמות כוללת דרושה (לשנה): ' + e(this.totalQty) + ' ' + e(this.qtyUnit) + '</p>' +
      '<h2>אני הח"מ מצהיר בזה כי:</h2>' + this.declarationLines.map(function (line) { return '<p class="flow">' + e(line) + '</p>'; }).join('') +
      '<h2>נא לסמן את המתאים:</h2>' +
      '<p class="keep">' + mark(this.inBasket) + ' התכשיר כלול בסל שירותי הבריאות שלפי חוק בריאות ממלכתי, אך אינו רשום בפנקס התכשירים הרפואיים בישראל.</p>' +
      '<p class="keep">' + mark(this.offLabel) + ' התכשיר רשום בפנקס התכשירים הרפואיים בישראל אך לא להתוויה המבוקשת. <span dir="ltr">Off Label</span></p>' +
      '<p class="keep">' + mark(this.foreignOn()) + ' התכשיר רשום במשרד הבריאות של אחת הארצות המוכרות המפורטות להלן ומקובל בה להתוויה המבוקשת:</p>' +
      '<p class="keep">' + mark(this.westEurope) + ' מערב אירופה (שם הארץ: ' + e(this.westEuropeName) + ') &nbsp; ' +
      mark(this.usa) + ' ארה"ב &nbsp; ' + mark(this.canada) + ' קנדה &nbsp; ' + mark(this.australia) + ' אוסטרליה &nbsp; ' + mark(this.japan) + ' יפן</p>' +
      '<p class="keep">גרסת נוסח: ' + e(this.templateVersion()) + '</p><div class="sign">' + signs + '</div>' +
      // '<p class="banner">טיוטה — לא מסמך מאושר. חתימה מצוירת אינה חתימה דיגיטלית מאושרת.</p></body></html>'
      '</body></html>'
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

  private act(decision: string, signaturePng: string): void {
    if (this.busy || !this.canSign || !this.currentStage) return;
    this.busy = true;
    this.formError = '';
    this.form29.decide(this.requestId, this.currentStage, decision, this.decideReason, this.rowVer, this.signerName, signaturePng).subscribe(
      (row) => {
        this.busy = false;
        this.applyRow(row);
        this.snack.open(decision === 'SIGNED' ? 'החתימה נשמרה' : 'ההחלטה נשמרה', 'סגירה', { duration: 2500 });
      },
      (err) => this.fail(err)
    );
  }

  private sizePad(): void {
    var canvas = this.pad && this.pad.nativeElement;
    if (!canvas) return;
    var ratio = window.devicePixelRatio || 1;
    var width = canvas.clientWidth || 640;
    var height = 180;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    this.ink = false;
    this.drawing = false;
    this.padSized = true;
  }

  private penPoint(event: PointerEvent, canvas: HTMLCanvasElement): { x: number; y: number } {
    var rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private safePng(value: string): string {
    var raw = value || '';
    return /^[A-Za-z0-9+/=]+$/.test(raw) ? raw : '';
  }
}
