import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Inject, OnDestroy, OnInit, TemplateRef, ViewChild, HostBinding, ChangeDetectorRef } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { Observable, Subscription } from 'rxjs';
import { finalize, map, startWith } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ConfirmationDialogService } from "../../../../confirmation-dialog/confirmation-dialog.service";
import { applySurgeryDialogSize, SURGERY_SELECT_PANEL_CLASS, SURGERY_SELECT_PANEL_WIDE_CLASS } from '../../shared/surgeries-dialog-sizing';
import { SurgeryBillingAiService } from '../../shared/surgery-billing-ai.service';
import { BillingPipelineLookupResult } from '../../shared/billing-pipeline.models';

@Component({
  selector: 'app-manage-single-surgery',
  templateUrl: './manage-single-surgery.component.html',
  styleUrls: ['../../styles/components/manage-single-surgery.css']
})
export class ManageSingleSurgeryComponent implements OnInit, OnDestroy {

  @HostBinding('class.surgery-dialog-root') readonly surgeryDialogRoot = true;
  readonly surgerySelectPanelClass = SURGERY_SELECT_PANEL_CLASS;
  readonly surgerySelectPanelWideClass = SURGERY_SELECT_PANEL_WIDE_CLASS;

  horizontalPosition: MatSnackBarHorizontalPosition = 'start';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';
  surgeonsList: any[] = [];
  filteredOptions: Observable<any[]>;
  surgeriesCtrl = new FormControl('');
  surgeriesList: any[] = [];
  servicesList: any[] = [];
  dashboard_date: any;
  card_date: any;
  current_date: any;
  now = new Date();
  surgeryFilteredNotes: any[] = [];
  surgeryFilteredNotesRequest: any[] = [];
  surgeriesFixedNotes: any[] = [];
  filteredOptionssurgeries: Observable<any[]>;
  filteredOptionsservices: Observable<any[]>;
  @ViewChild('modalContent', { static: true }) modalContent: TemplateRef<any>;
  displayedColumns = ['code', 'name', 'side', 'grossPrice'];
  surgeryGrossPrice: number | null = null;
  surgeryGrossPriceIsEstimated = false;
  surgeryGrossPriceIsAiRecommended = false;
  surgeryAiPriceLoading = false;
  surgeryProcedures: any[] = [];
  displayedColumns1 = ['name'];
  displayedColumns2 = ['name', 'code', 'tool'];
  private intervalId: any;
  private aiPriceLookupSub?: Subscription;

  constructor(
    public datePipe: DatePipe,
    private _snackBar: MatSnackBar,
    private http: HttpClient,
    public fb: FormBuilder,
    public dialog: MatDialog,
    private confirmationDialogService: ConfirmationDialogService,
    private surgeryBillingAiService: SurgeryBillingAiService,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<ManageSingleSurgeryComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  SurgeryFormGroup: FormGroup = this.fb.group({});
  SurgeryDepartments = [];
  SurgeryRoomsList = [];
  patientsList = [{
    PM_ROW_ID: "",
    PM_CASE_NUMBER: "",
    SurgeriesCalendarIDFK: "",
    PM_PATIENT_GENDER: "",
    PM_LAST_NAME: "",
    PM_FIRST_NAME: "",
    PM_DOB: "",
    PM_PATIENT_ID: "",
    RECORD_EXISTS: "",
  }];

  ngOnInit(): void {
    applySurgeryDialogSize(this.dialogRef);
    this.applyEndTimeFromServerOrDurationFallback(this.data.event);

    // Initialize the time and start updating it every second
    this.updateTime();
    this.intervalId = setInterval(() => {
      this.updateTime();
    }, 1000); // Update every second
    this.dashboard_date = this.data.timeOpened;
    this.card_date = this.now;
    this.getSurgeryDepartmentsList();
    this.buildFormGroup();
    this.surgeryProcedures = this.buildProcedurePriceRows(this.data.event.SurgeriesCalendar_Susgeries);
    this.initSurgeryPriceState();
    this.SurgeryRoomsList = this.data.event.RoomsList;
    this.filteredOptionssurgeries = this.surgeriesCtrl.valueChanges.pipe(
      startWith(''),
      map(value => {
        const name = typeof value === 'string' ? value : value?.S_SERVICE_VAL;
        return name ? this._filter2(name as string) : this.surgeriesList.slice();
      }),
    );
  }

  ngOnDestroy(): void {
    this.aiPriceLookupSub?.unsubscribe();
    // Clear the interval when the component is destroyed
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  updateTime(): void {
    this.current_date = new Date();
  }

  /** Prefer API EndTime; only if missing or 00:00 derive end from ArrivalTime + Duration (minutes). */
  private applyEndTimeFromServerOrDurationFallback(event: any): void {
    if (!event) {
      return;
    }
    const endRaw = event.EndTime;
    const endStr = endRaw != null ? String(endRaw).trim() : '';
    if (endStr !== '' && endStr !== '00:00') {
      return;
    }
    const arrival = event.ArrivalTime;
    if (!arrival) {
      return;
    }
    const datePart = event.ArrivalDate ? String(event.ArrivalDate).split(' ')[0] : '1970-01-01';
    const base = new Date(`${datePart}T${arrival}`);
    const totalMinutes = this.getFallbackDurationMinutes(event);
    if (totalMinutes <= 0) {
      return;
    }
    base.setMinutes(base.getMinutes() + totalMinutes);
    event.EndTime = `${base.getHours().toString().padStart(2, '0')}:${base.getMinutes().toString().padStart(2, '0')}`;
  }

  private getFallbackDurationMinutes(event: any): number {
    const d = Number(event?.Duration);
    if (Number.isFinite(d) && d > 0) {
      return d;
    }
    const avg = event?.AvgDauration;
    if (typeof avg !== 'string' || !avg.trim()) {
      return 0;
    }
    const parts = avg.split(':').map(Number);
    if (parts.length < 2 || parts.some((p) => !Number.isFinite(p))) {
      return 0;
    }
    return parts[0] * 60 + parts[1];
  }

  /** Display span between ArrivalTime and EndTime (same as shown above); EndTime is disabled — use getRawValue. */
  formatDurationBetweenStartAndEnd(): string {
    if (!this.SurgeryFormGroup) {
      return '';
    }
    const raw = this.SurgeryFormGroup.getRawValue();
    const startMin = this.parseClockToMinutes(raw?.ArrivalTime);
    const endMin = this.parseClockToMinutes(raw?.EndTime);
    if (startMin === null || endMin === null) {
      return '';
    }
    let diff = endMin - startMin;
    if (diff < 0) {
      diff += 24 * 60;
    }
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private parseClockToMinutes(value: any): number | null {
    if (value == null) {
      return null;
    }
    const s = String(value).trim();
    if (!s || s === '00:00') {
      return null;
    }
    const match = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) {
      return null;
    }
    const hh = Number(match[1]);
    const mm = Number(match[2]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) {
      return null;
    }
    return hh * 60 + mm;
  }

  private parsePriceValue(value: any): number | null {
    const price = parseFloat(value);
    return Number.isFinite(price) && price > 0 ? price : null;
  }

  /** Catalog price for a single procedure row — never inherit the parent surgery total. */
  private getProcedureCatalogPrice(procedure: any): number | null {
    return this.parsePriceValue(procedure?.GrossPrice);
  }

  private buildProcedurePriceRows(procedures: any[] | null | undefined): any[] {
    return (procedures ?? []).map((procedure) => {
      const catalogPrice = this.getProcedureCatalogPrice(procedure);
      return {
        ...procedure,
        displayGrossPrice: catalogPrice != null ? this.formatGrossPrice(catalogPrice) : null,
        isEstimatedPrice: this.isEstimatedPriceFlag(procedure?.IsEstimatedPrice),
      };
    });
  }

  /**
   * Billing rule: one charge per surgery slot — the highest catalog price among procedures.
   * Falls back to the calendar event GrossPrice only when no procedure prices exist.
   */
  private computeSurgeryBillingPrice(
    event: any,
    procedureRows: any[] = this.buildProcedurePriceRows(event?.SurgeriesCalendar_Susgeries),
  ): { price: number | null; isEstimated: boolean } {
    let maxPrice: number | null = null;
    let isEstimated = false;

    procedureRows.forEach((procedure) => {
      const catalogPrice = this.getProcedureCatalogPrice(procedure);
      if (catalogPrice == null) {
        return;
      }
      if (maxPrice == null || catalogPrice > maxPrice) {
        maxPrice = catalogPrice;
        isEstimated = this.isEstimatedPriceFlag(procedure?.IsEstimatedPrice);
      } else if (catalogPrice === maxPrice && this.isEstimatedPriceFlag(procedure?.IsEstimatedPrice)) {
        isEstimated = true;
      }
    });

    if (maxPrice != null) {
      return { price: maxPrice, isEstimated };
    }

    const eventPrice = this.parsePriceValue(event?.GrossPrice);
    return {
      price: eventPrice,
      isEstimated: this.isEstimatedPriceFlag(event?.IsEstimatedPrice),
    };
  }

  formatGrossPrice(value: number): string {
    return Math.round(value).toLocaleString('he-IL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  /** Matches chaimc: show extra fields unless SD_ROW_ID is explicitly empty string. */
  showAdditionalSurgeryDetails(): boolean {
    const sdRowId = this.SurgeryFormGroup?.get('SurgeryRequestDepartments')?.value?.SD_ROW_ID;
    return sdRowId != '';
  }

  private isEstimatedPriceFlag(value: any): boolean {
    return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
  }

  private isAiRecommendedPriceFlag(value: any): boolean {
    return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
  }

  private initSurgeryPriceState(): void {
    const aiBilling = this.resolveAiBillingResult(this.data.event);
    if (aiBilling) {
      this.applyAiBillingResult(aiBilling);
      return;
    }

    const billing = this.computeSurgeryBillingPrice(this.data.event, this.surgeryProcedures);
    this.surgeryGrossPrice = billing.price;
    this.surgeryGrossPriceIsEstimated = billing.isEstimated;
    this.surgeryGrossPriceIsAiRecommended = false;

    if (billing.price != null) {
      return;
    }

    if (this.data?.aiPriceLoading || this.shouldLookupAiPriceInDialog()) {
      this.startAiPriceLookup();
    }
  }

  private shouldLookupAiPriceInDialog(): boolean {
    return !!environment.billingPipelineMode
      && this.surgeryBillingAiService.canLookupSurgery(this.data.event);
  }

  private applyAiBillingResult(result: BillingPipelineLookupResult): void {
    this.surgeryGrossPrice = result.price;
    this.surgeryGrossPriceIsEstimated = true;
    this.surgeryGrossPriceIsAiRecommended = true;
    this.data.event.IsAiRecommendedPrice = true;
    this.data.event.GrossPrice = String(result.price);
    this.data.event.AiRecommendedServiceCode = result.serviceCode;
    this.data.event.AiRecommendedDrgCodes = result.drgCodes;
    this.data.event.AiRecommendedIcd9Codes = result.icd9Codes;
  }

  private startAiPriceLookup(): void {
    if (!this.shouldLookupAiPriceInDialog()) {
      return;
    }

    this.surgeryAiPriceLoading = true;
    this.aiPriceLookupSub?.unsubscribe();
    this.aiPriceLookupSub = this.surgeryBillingAiService.lookupFromSurgery(
      this.data.event,
      this.data.event?.start ?? this.data.event?.ArrivalDate
    ).pipe(
      finalize(() => {
        this.surgeryAiPriceLoading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (result) => {
        this.applyAiBillingResult(result);
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  private resolveAiBillingResult(event: any): BillingPipelineLookupResult | null {
    if (this.isAiRecommendedPriceFlag(event?.IsAiRecommendedPrice)) {
      const price = this.parsePriceValue(event?.GrossPrice);
      if (price != null) {
        return {
          serviceCode: String(event?.AiRecommendedServiceCode ?? '').trim(),
          price,
          icd9Codes: Array.isArray(event?.AiRecommendedIcd9Codes) ? event.AiRecommendedIcd9Codes.map(String) : [],
          drgCodes: Array.isArray(event?.AiRecommendedDrgCodes) ? event.AiRecommendedDrgCodes.map(String) : [],
        };
      }
    }

    if (!environment.billingPipelineMode) {
      return null;
    }

    return this.surgeryBillingAiService.getCachedForSurgery(event, event?.start ?? event?.ArrivalDate);
  }

  getSurgeryPriceBadgeLabel(): string {
    if (this.surgeryGrossPriceIsAiRecommended) {
      return 'מחירון ניתוח (הומלץ ע"י AI)';
    }
    if (this.surgeryGrossPriceIsEstimated) {
      return 'מחירון ניתוח (משוער)';
    }
    return 'מחירון ניתוח';
  }

  getSurgeryPriceBadgeTooltip(): string {
    if (this.surgeryGrossPriceIsAiRecommended) {
      return 'מחיר וקוד שירות שהומלצו ע"י AI לפי שם הניתוח והפרוצדורות';
    }
    if (this.surgeryGrossPriceIsEstimated) {
      return 'מחיר משוער — לא הוזן קוד שירות אמיתי';
    }
    return '';
  }

  getResolvedServiceCodeInfo(): { code: string; label: string } | null {
    const aiResult = this.resolveAiBillingResult(this.data?.event);
    const drgCode = this.pickPrimaryDrgCode(aiResult?.drgCodes ?? this.data?.event?.AiRecommendedDrgCodes);
    if (this.surgeryGrossPriceIsAiRecommended) {
      const code = drgCode || String(aiResult?.serviceCode ?? this.data?.event?.AiRecommendedServiceCode ?? '').trim();
      if (code) {
        return { code, label: 'קוד שירות מומלץ ע"י AI' };
      }
    }

    const scheduledCode = this.getScheduledServiceCode();
    if (scheduledCode) {
      return { code: scheduledCode, label: 'קוד שירות בזימון לניתוח' };
    }

    if (this.surgeryGrossPriceIsEstimated) {
      const estimatedCode = String(aiResult?.serviceCode ?? this.data?.event?.AiRecommendedServiceCode ?? '').trim();
      if (estimatedCode) {
        return { code: estimatedCode, label: 'קוד שירות משוער' };
      }
    }

    return null;
  }

  private pickPrimaryDrgCode(drgCodes: string[] | null | undefined): string | null {
    if (!Array.isArray(drgCodes)) {
      return null;
    }

    const code = drgCodes
      .map((value) => String(value ?? '').trim())
      .find((value) => value && value.toLowerCase() !== 'null');
    return code || null;
  }

  private getScheduledServiceCode(): string | null {
    const services = this.data?.event?.SurgeriesCalendar_Service ?? [];
    for (const service of services) {
      const code = String(service?.ServiceCode ?? service?.Surgery_Code ?? '').trim();
      if (code) {
        return code;
      }
    }
    return null;
  }

  displayFnSurgery(surgery: any): string {
    delete surgery.__type;
    return surgery && surgery.S_SERVICE_VAL ? surgery.S_SERVICE_VAL : '';
  }

  displayFnService(service: any): string {
    delete service.__type;
    return service && service ? service : '';
  }

  displayFnSurgeon(user: any): string {
    let fullName = user;
    if (user !== "") {
      fullName = user;
    }
    return fullName && fullName ? fullName : '';
  }

  private _filter(name: string): any[] {
    const filterValue = name.toLowerCase();

    return this.surgeonsList.filter(option => option.toLowerCase().includes(filterValue) || option.toLowerCase().includes(filterValue));
  }

  private _filter2(name: string): any[] {
    const filterValue = name.toLowerCase();

    return this.surgeriesList.filter(option => option.S_SERVICE_VAL.toLowerCase().includes(filterValue));
  }

  private _filter3(name: string): any[] {
    const filterValue = name.toLowerCase();

    return this.servicesList.filter(option => option.S_SERVICE_VAL.toLowerCase().includes(filterValue));
  }

  buildFormGroup() {
    const patient = this.data.event.SurgeryPatientDetails ?? {};
    const department = this.data.event.SurgeryRequestDepartments ?? {};
    const reason = this.data.event.SurgeryTypeReason ?? {};
    const reasonRequest = this.data.event.SurgeryTypeReasonRequest ?? {};

    this.SurgeryFormGroup = this.fb.group({
      SurgeryPatientDetails: this.fb.group({
        PM_ROW_ID: new FormControl(patient.PM_ROW_ID, null),
        PM_PATIENT_ID: new FormControl(patient.PM_PATIENT_ID, Validators.required),
        PM_CASE_NUMBER: new FormControl(patient.PM_CASE_NUMBER, null),
        PM_FIRST_NAME: new FormControl(patient.PM_FIRST_NAME, Validators.required),
        PM_LAST_NAME: new FormControl(patient.PM_LAST_NAME, Validators.required),
        PM_PATIENT_GENDER: new FormControl(patient.PM_PATIENT_GENDER, null),
        PM_DOB: new FormControl(patient.PM_DOB, null),
        SurgeriesCalendarIDFK: new FormControl(patient.SurgeriesCalendarIDFK, null),
        RECORD_EXISTS: new FormControl(patient.RECORD_EXISTS, null)
      }),
      SurgeryRequestDepartments: this.fb.group({
        SD_Priority: new FormControl(department.SD_Priority, null),
        SD_ROW_ID: new FormControl(department.SD_ROW_ID, null),
        S_DEPARTMENT: new FormControl(department.S_DEPARTMENT, null),
        S_DEPARTMENT_NAME: new FormControl(department.S_DEPARTMENT_NAME, null),
        S_DEPARTMENT_SHORT_DESC: new FormControl(department.S_DEPARTMENT_SHORT_DESC, null)
      }),
      SurgeriesCalendar_Susgeries: this.calendarPatientSurgeriesForm(),
      SurgeriesCalendar_Service: this.calendarPatientServicesForm(),
      SurgeriesCalendar_Tools: this.calendarPatientToolsForm(),
      DoctorSurgeon: new FormControl(this.data.event.DoctorSurgeon, null),
      Urgency: new FormControl(this.data.event.Urgency, null),
      Duration: new FormControl(this.data.event.Duration, null),
      AvgDauration: new FormControl(this.data.event.AvgDauration, null),
      NoteType: new FormControl(this.data.event.NoteType, null),
      NoteTypeRequest: new FormControl(this.data.event.NoteTypeRequest, null),
      SurgeryTypeReasonRequest: new FormControl(reasonRequest.Row_ID, null),
      SurgeryTypeReason: new FormControl(reason.Row_ID, null),
      SurgeryReasonNoteRequest: new FormControl(this.data.event.SurgeryReasonNoteRequest, null),
      SurgeryReasonNote: new FormControl(this.data.event.SurgeryReasonNote, null),
      AdditionalDetails: this.buildAdditionalFormGroupByDepartment(this.data.event.AdditionalDetails ?? {}),
      Row_ID: new FormControl(this.data.event.Row_ID, Validators.required),
      ArrivalDate: new FormControl(this.data.event.start, Validators.required),
      ArrivalTime: new FormControl(this.data.event.ArrivalTime, Validators.required),
      SurgeryRoom: new FormControl(this.data.event.SurgeryRoom, Validators.required),
      SurgeryRoomName: new FormControl(this.data.event.SurgeryRoomName, Validators.required),
      EndTime: new FormControl({ value: this.data.event.EndTime, disabled: true }, null),
      LastUpdateUserName: new FormControl({ value: localStorage.getItem('loginUserName'), disabled: true }, null),
    });
    this.initializeNoteReasonFilters();
    this.surgeriesCtrl.setValue(this.SurgeryFormGroup.controls['SurgeriesCalendar_Susgeries'].value);
    // this.calculateSurgeryDuration('endTime');
    this.enableDisableSurgeryNameSelect();
  }

  calendarPatientSurgeriesForm() {
    let Services = new FormArray([]);
    (this.data.event.SurgeriesCalendar_Susgeries ?? []).forEach(element => {
      Services.push(this.fb.group({
        Row_ID: element.Row_ID,
        Surgery_Name: element.Surgery_Name,
        Surgery_Code: element.Surgery_Code,
        Side: element.Side,
        SurgeriesCalendarIDFK: element.SurgeriesCalendarIDFK,
        ServiceNameIDFK: element.ServiceNameIDFK,
        Duration: element.Duration,
        Depart: element.Depart,
        GrossPrice: element.GrossPrice
      }))
    });
    return Services;
  }

  calendarPatientServicesForm() {
    let Services = new FormArray([]);
    (this.data.event.SurgeriesCalendar_Service ?? []).forEach(element => {
      Services.push(this.fb.group({
        Row_ID: element.Row_ID,
        ServiceNameIDFK: element.ServiceNameIDFK,
        ServiceCode: element.ServiceCode,
        Service_Name: element.Service_Name,
        SurgeriesCalendarIDFK: element.SurgeriesCalendarIDFK
      }))
    });
    return Services;
  }

  calendarPatientToolsForm() {
    let Tools = new FormArray([]);
    (this.data.event.SurgeriesCalendar_Tools ?? []).forEach(element => {
      Tools.push(this.fb.group({
        Row_ID: element.Row_ID,
        Tool_Name: element.Tool_Name,
        Tool_Code: element.Tool_Code,
        Tool_Need: element.Tool_Need,
        SurgeriesCalendarIDFK: element.SurgeriesCalendarIDFK
      }))
    });
    return Tools;
  }


  buildAdditionalFormGroupByDepartment(details) {
    let x: FormGroup;
    x = this.fb.group({
      LAP_OR_OPEN: new FormControl(details.LAP_OR_OPEN, null),
      SIDE: new FormControl(details.SIDE, null),
      LEYING_POSITION: new FormControl(details.LEYING_POSITION, null),
      ISOLATION: new FormControl(details.ISOLATION, null),
      BLOOD_BANK: new FormControl(details.BLOOD_BANK, null),
      NOTE: new FormControl(details.NOTE, null),
      TOOLS: new FormControl(details.TOOLS, null),
      ANESTHESIA: new FormControl(details.ANESTHESIA, null),
      DIMOT: new FormControl(details.DIMOT, null),
      HOSPITALIZATION: new FormControl(details.HOSPITALIZATION, null),
    });
    if (details.ISOLATION == "1") {
      this.dialog.open(this.modalContent, { width: '60%' });
    }
    return x;
  }

  stringToArray(commaSeparatedString: string): string[] {
    return commaSeparatedString.split(',');
  }

  selectedRequestedDepartment(departmentRowID) {
    let department = this.SurgeryDepartments.filter(x => x.S_DEPARTMENT == departmentRowID);
    delete department[0].__type;
    this.SurgeryFormGroup.controls['SurgeryRequestDepartments'].setValue(department[0]);
  }

  getSurgeriesByRequestedDepartment(department) {
    this.http
      .post(environment.url + "GetAllSurgeriesCalendar_SusgeriesByRequestingDepartment", {
        _requestingDepartmentCode: department[0].S_DEPARTMENT
      })
      .subscribe((Response) => {
        this.surgeriesList = Response["d"];
      });
  }


  getServicesByRequestedDepartment() {
    this.http
      .post(environment.url + "GetAllServicesServicesNameByRequestingDepartment", {})
      .subscribe((Response) => {
        this.servicesList = Response["d"];
      });
  }

  selectedSurgeryRoom(surgeryRoomRowID) {
    this.SurgeryFormGroup.controls['SurgeryRoom'].setValue(surgeryRoomRowID);
  }

  selectedSurgeryServiceName() {
    if (this.surgeriesCtrl.value != "") {
      setTimeout(() => {
        this.SurgeryFormGroup.controls['SurgeriesCalendar_Susgeries'].setValue(this.surgeriesCtrl.value);
        // this.calculateSurgeryDuration('duration');
      }, 500);
    }
  }


  enableDisableSurgeryNameSelect() {
    if (this.SurgeryFormGroup.controls['ArrivalTime'].value == "" || this.SurgeryFormGroup.controls['ArrivalDate'].value == "" || this.SurgeryFormGroup.controls['ArrivalDate'].value == null) {
      this.surgeriesCtrl.disable();
    } else {
      this.surgeriesCtrl.enable();
    }
  }

  calculateSurgeryDuration(type) {
    try {
      let datefordiff = this.datePipe.transform(this.SurgeryFormGroup.value.ArrivalDate, 'yyyy-MM-dd');
      let before = new Date(datefordiff + ' ' + this.SurgeryFormGroup.value.ArrivalTime);
      let after = new Date(datefordiff + ' ' + this.SurgeryFormGroup.getRawValue().EndTime);
      let diff = Math.abs(after.getTime() - before.getTime());//difference in time
      if (type == 'endTime') {
        // let hours = Math.floor((diff % 86400000) / 3600000);//hours
        // let minutes = Math.round(((diff % 86400000) % 3600000) / 60000);//minutes
        // let minutes = Math.round((diff % 86400000) / 60000);//minutes
        // this.SurgeryFormGroup.controls['SurgeriesCalendar_Susgeries']['controls'].Duration.setValue(minutes);
        if (this.SurgeryFormGroup.controls['Duration'].value != "") after.setTime(before.getTime() + (parseInt(this.SurgeryFormGroup.controls['Duration'].value) * 60 * 1000));
        this.SurgeryFormGroup.controls['EndTime'].setValue(this.datePipe.transform(after, 'HH:mm'));
      } else {
        after.setTime(before.getTime() + diff);
        this.SurgeryFormGroup.controls['EndTime'].setValue(this.datePipe.transform(after, 'HH:mm'));
      }
    } catch (err) {
      console.log("Error in converting date: calculateSurgeryDuration");
    }
  }

  // checkIfPatientExists() {
  //   if (this.SurgeryFormGroup.value.SurgeryPatientDetails.PM_PATIENT_ID == "") {
  //     this.openSnackBar("לא הקלדת ת.ז של מטופל");
  //   } else {
  //     this.http
  //       .post(environment.url + "GetSurgeryCalendarPatientDetailsByIdNumber", {
  //         IDNumber: this.SurgeryFormGroup.value.SurgeryPatientDetails.PM_PATIENT_ID
  //       })
  //       .subscribe((Response) => {
  //         this.patientsList = Response["d"];
  //         if (this.patientsList.length == 0) {
  //           this.openSnackBar("מטופל לא נמצא, הקלד ידנית");
  //         } else {
  //           let patientDetails = {
  //             PM_ROW_ID: this.patientsList[0].PM_ROW_ID,
  //             PM_CASE_NUMBER: this.patientsList[0].PM_CASE_NUMBER,
  //             PM_MOVE_DEPART_SEODE: this.patientsList[0].PM_MOVE_DEPART_SEODE,
  //             PM_PATIENT_GENDER: this.patientsList[0].PM_PATIENT_GENDER,
  //             PM_LAST_NAME: this.patientsList[0].PM_LAST_NAME,
  //             PM_FIRST_NAME: this.patientsList[0].PM_FIRST_NAME,
  //             PM_DOB: this.patientsList[0].PM_DOB,
  //             PM_PATIENT_ID: this.patientsList[0].PM_PATIENT_ID,
  //             RECORD_EXISTS: this.patientsList[0].RECORD_EXISTS,
  //           }
  //           this.SurgeryFormGroup.controls['SurgeryPatientDetails'].setValue(patientDetails);
  //         }
  //       });
  //   }
  // }

  checkAutoCompleteSelection() {
    if (this.surgeriesCtrl.value.S_ROW_ID == undefined) {
      this.openSnackBar("לבחור ניתוח מתוך הרשימה ולא הקלדה ידנית");
      return false;
    }
    return true;
  }

  choosenReasonNotCommitSurgeryRequest(value) {
    this.surgeryFilteredNotesRequest = this.surgeriesFixedNotes.filter(x => x.Type === value && x.Section === 'מחלקה מנתחת');
  }

  private initializeNoteReasonFilters(): void {
    const reason = this.data?.event?.SurgeryTypeReason;
    const reasonRequest = this.data?.event?.SurgeryTypeReasonRequest;
    const roomType = reason?.Type ?? this.data?.event?.NoteType;
    const requestType = reasonRequest?.Type ?? this.data?.event?.NoteTypeRequest;

    if (roomType) {
      this.choosenReasonNotCommitSurgery(roomType);
    }
    if (requestType) {
      this.choosenReasonNotCommitSurgeryRequest(requestType);
    }
  }

  setSurgeryTypeReasonRequestObject() {
    let index = this.SurgeryFormGroup.value.SurgeryTypeReasonRequest;
    let object = this.surgeryFilteredNotesRequest.filter(x => x.Row_ID == index)[0];
    if (object !== undefined) this.SurgeryFormGroup.controls['SurgeryTypeReasonRequest'].setValue(object);
  }

  choosenReasonNotCommitSurgery(value) {
    this.surgeryFilteredNotes = this.surgeriesFixedNotes.filter(x => x.Type === value && x.Section === 'חדר ניתוח');
  }

  setSurgeryTypeReasonObject() {
    let index = this.SurgeryFormGroup.value.SurgeryTypeReason;
    let object = this.surgeryFilteredNotes.filter(x => x.Row_ID == index)[0];
    if (object !== undefined) this.SurgeryFormGroup.controls['SurgeryTypeReason'].setValue(object);
  }


  deleteCancelNote(value) {
    if (value === 'surgeryrequest') {
      this.SurgeryFormGroup.controls['SurgeryTypeReasonRequest'].setValue(null);
      this.SurgeryFormGroup.controls['NoteTypeRequest'].setValue(null);
      this.SurgeryFormGroup.controls['SurgeryReasonNoteRequest'].setValue(null);
    } else {
      this.SurgeryFormGroup.controls['SurgeryTypeReason'].setValue(null);
      this.SurgeryFormGroup.controls['NoteType'].setValue(null);
      this.SurgeryFormGroup.controls['SurgeryReasonNote'].setValue(null);
    }
  }

  getSurgeryDepartmentsList() {
    this.http
      .post(environment.url + "GetSurgeriesServicesNames", {
      })
      .subscribe((Response) => {
        // get the requested departments list only if its new or the day is empty of surgeries
        this.surgeriesFixedNotes = Response["d"].surgeriesFixedNotes;
        // get the surgeries by the department code on edit view
        if (this.data.event.SurgeryRequestDepartments != undefined) {
          this.SurgeryDepartments = [this.data.event.SurgeryRequestDepartments];
          this.selectedRequestedDepartment(this.data.event.SurgeryRequestDepartments.S_DEPARTMENT);
        } else {
          this.SurgeryDepartments = Response["d"].surgeryRequestDepartments;
        }
        this.surgeonsList = Response["d"].surgeonsList;
        this.initializeNoteReasonFilters();
      });
  }

  saveSurgeryDetails() {
    try {
      this.SurgeryFormGroup.controls['ArrivalDate'].setValue(this.datePipe.transform(this.SurgeryFormGroup.value.ArrivalDate, 'yyyy-MM-dd'));
    } catch (err) {
      this.openSnackBar("שדות לא מולאו");
    }
    if (!this.SurgeryFormGroup.invalid) {
      this.confirmationDialogService
        .confirm("נא לאשר..", "האם אתה בטוח ...? ")
        .then((confirmed) => {
          console.log("User confirmed:", confirmed);
          if (confirmed) {
            this.setSurgeryTypeReasonObject();
            this.setSurgeryTypeReasonRequestObject();
            this.http
              .post(environment.url + "SubmitNewOrUpdateCalendarSurgeryRecord", {
                surgeryFormData: this.SurgeryFormGroup.getRawValue()
              })
              .subscribe((Response) => {
                if (Response["d"] == "Saved") {
                  this.openSnackBar("נשמר בהצלחה");
                  this.dialogRef.close(Response["d"]);
                } else if (Response["d"] == "Exists") {
                  this.openSnackBar("לא נשמר, מתוכנן ניתוח באותו מקום באותו זמן");
                } else {
                  this.openSnackBar("משהו השתבש, לא נשמר!");
                }
              });
          } else {
          }
        })
        .catch(() =>
          console.log(
            "User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)"
          )
        );
    } else {
      this.openSnackBar("שכחת למלא שדה חובה");
    }
  }

  openSnackBar(message) {
    this._snackBar.open(message, 'X', {
      duration: 3000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }

}
